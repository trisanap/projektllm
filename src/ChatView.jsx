// Centered chat column — message list, streaming, composer.
import React, { useState, useEffect, useRef } from 'react';
import { I } from './icons.jsx';
import { listMessages, streamCompletion, patchChat, deleteChat, createArtifact, webSearch, deleteMessage, listProjectMembers } from './api.js';

// Consistent per-user colors for collaborative chat
const USER_COLORS = [
  "oklch(0.62 0.18 290)", // iris
  "oklch(0.58 0.14 155)", // forest
  "oklch(0.58 0.18 245)", // cobalt
  "oklch(0.74 0.15 70)",  // amber
  "oklch(0.55 0.18 10)",  // rose
  "oklch(0.55 0.15 200)", // teal
  "oklch(0.60 0.18 340)", // pink
  "oklch(0.50 0.14 100)", // olive
];

function userColor(uid) {
  if (!uid) return USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash |= 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export default function ChatView({ project, chat, knowledgeOpen, onToggleKnowledge, knowledgePosition, onCyclePosition, narrow, onBackToProject, settings, onOpenSettings, onRefreshProject, onViewArtifact, isAdmin, sidebarOpen, onToggleSidebar, narrowSidebar, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamReasoning, setStreamReasoning] = useState("");
  const reasoningRef = useRef("");
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [artifactMode, setArtifactMode] = useState(false);
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const abortRef = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef(null);
  const [members, setMembers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIdx, setMentionIdx] = useState(-1); // cursor index where @ was typed
  const [mentionSel, setMentionSel] = useState(0);
  const saveTitle = async (title) => {
    setEditingTitle(false);
    if (title && title !== chat.title) {
      await patchChat(chat.id, { title });
      onRefreshProject();
    }
  };

  // Load messages when chat changes
  useEffect(() => {
    setMessages([]);
    setStreaming(false);
    setStreamText("");
    if (chat?.id) {
      setLoading(true);
      listMessages(chat.id)
        .then(msgs => setMessages(msgs.map(m => {
          const msg = {
            ...m,
            time: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : m.time || m.created_at,
          };
          if (m.role === "assistant" && (m.content?.includes("[artifact:") || m.content?.includes("```"))) {
            const { artifacts, remaining } = parseArtifacts(m.content);
            if (artifacts.length) return { ...msg, content: remaining || "", artifacts };
          }
          return msg;
        })))
        .catch(() => setMessages([]))
        .finally(() => setLoading(false));
    }
  }, [chat?.id]);

  // Autoscroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamText]);

  // Fetch project members for @mentions
  useEffect(() => {
    if (project?.id) {
      listProjectMembers(project.id)
        .then(setMembers)
        .catch(() => setMembers([]));
    }
  }, [project?.id]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(220, ta.scrollHeight) + "px";
  }, [input]);

  const currentModel = settings ? {
    ollama: settings.ollama_model,
    openai: settings.openai_model,
    deepseek: settings.deepseek_model,
  }[settings.provider] || settings.ollama_model : null;

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || abortRef.current || !chat?.id) return;

    const userMsg = {
      id: "m" + Date.now(),
      role: "user",
      content: text,
      time: now(),
      user_id: user?.id,
      username: user?.username,
      display_name: user?.display_name || user?.username,
    };
    setMessages(m => [...m, userMsg]);
    setInput("");
    const shouldStream = settings?.stream !== false;
    if (shouldStream) {
      setStreaming(true);
      setStreamText("");
      setStreamReasoning("");
      reasoningRef.current = "";
      setReasoningOpen(true);
    }

    // Perform web search if enabled
    let webSearchContext = null;
    if (webSearchOn) {
      try {
        const searchRes = await webSearch(text);
        if (searchRes.results?.length) {
          webSearchContext = "[Web search results]\n" +
            searchRes.results.map((r, i) =>
              `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`
            ).join("\n") +
            "\n[/Web search results]\n\n" +
            "Use the search results above to inform your answer. Cite sources where relevant.";
        }
      } catch {}
    }

    const extra = {};
    extra.artifact_mode = true; // always on
    if (webSearchContext) extra.web_search_context = webSearchContext;
    if (settings?.temperature != null) extra.temperature = settings.temperature;
    if (settings?.max_tokens) extra.max_tokens = settings.max_tokens;

    const controller = new AbortController();
    abortRef.current = controller;

    await streamCompletion(
      chat.id,
      text,
      currentModel,
      (token, full) => setStreamText(full),
      (full) => {
        const { artifacts, remaining } = parseArtifacts(full);
        setMessages(m => [...m, {
          id: "m" + Date.now(),
          role: "assistant",
          model: currentModel || "Multi-provider",
          time: now(),
          content: remaining || (artifacts.length ? "" : full),
          artifacts: artifacts.length ? artifacts : undefined,
          reasoning: reasoningRef.current || undefined,
        }]);
        setStreamText("");
        setStreamReasoning("");
        setStreaming(false);
        abortRef.current = null;
        // Auto-save artifacts to project knowledge base
        if (artifacts.length) {
          Promise.all(artifacts.map(a =>
            createArtifact(project.id, a.filename, a.content).catch(() => {})
          )).finally(() => onRefreshProject?.(project.id));
        } else {
          onRefreshProject?.(project.id);
        }
      },
      (err) => {
        setMessages(m => [...m, {
          id: "m" + Date.now(),
          role: "assistant",
          model: currentModel || "Multi-provider",
          time: now(),
          content: `*Error: ${err}*`,
          error: true,
          reasoning: reasoningRef.current || undefined,
        }]);
        setStreamText("");
        setStreamReasoning("");
        setStreaming(false);
        abortRef.current = null;
      },
      controller.signal,
      extra,
      (text) => { reasoningRef.current += text; setStreamReasoning(reasoningRef.current); }
    );
  };

  const stopStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (streamText) {
      setMessages(m => [...m, {
        id: "m" + Date.now(),
        role: "assistant",
        model: currentModel || "Multi-provider",
        time: now(),
        content: streamText + "\n\n*[stopped by user]*",
        stopped: true,
      }]);
    }
    setStreamText("");
    setStreaming(false);
  };

  const deleteMsg = async (mid) => {
    if (!chat?.id) return;
    try {
      await deleteMessage(chat.id, mid);
      setMessages(msgs => msgs.filter(m => m.id !== mid));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const onInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    // @mention detection
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionIdx(cursor - atMatch[0].length);
      setMentionQuery(atMatch[1].toLowerCase());
      setShowMentions(true);
      setMentionSel(0);
    } else {
      setShowMentions(false);
      setMentionIdx(-1);
      setMentionQuery("");
    }
  };

  const insertMention = (m) => {
    if (mentionIdx < 0) return;
    const before = input.slice(0, mentionIdx);
    const after = input.slice(taRef.current?.selectionStart || mentionIdx);
    // Remove the @query that was typed, insert @username
    const afterCleaned = after.replace(/^@\w*/, "");
    const newVal = before + "@" + m.username + " " + afterCleaned;
    setInput(newVal);
    setShowMentions(false);
    setMentionIdx(-1);
    setMentionQuery("");
    taRef.current?.focus();
  };

  const onKey = (e) => {
    // Handle mention picker keyboard nav
    if (showMentions) {
      const filtered = members.filter(m =>
        m.username.toLowerCase().includes(mentionQuery) ||
        (m.display_name || "").toLowerCase().includes(mentionQuery)
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSel(prev => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSel(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[mentionSel]) {
          insertMention(filtered[mentionSel]);
          setMentionSel(0);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        setMentionIdx(-1);
        setMentionQuery("");
        return;
      }
    }

    const enterSends = settings?.enter_to_send !== false;
    if (e.key === "Enter") {
      if (enterSends && !e.shiftKey) {
        e.preventDefault();
        send();
      } else if (!enterSends && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        send();
      }
    }
  };

  const positionLabel = { left: "Knowledge: left", right: "Knowledge: right", inline: "Knowledge: inline" }[knowledgePosition];

  const msgFontSize = settings?.chat_font_size || 14;
  const fontSizeStyle = msgFontSize !== 14 ? { fontSize: msgFontSize } : {};

  return (
    <main style={chStyles.column}>
      <header style={chStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, overflow: "hidden" }}>
          {narrowSidebar && (
            <button style={chStyles.menuBtn} onClick={onToggleSidebar} title={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
              {I.Menu}
            </button>
          )}
          <button style={chStyles.backBtn} onClick={onBackToProject} title={`Back to ${project.name}`}>
            <span style={{ ...chStyles.dotProj, background: project.color }} />
            {!narrow && <span style={chStyles.backLabel}>{project.name}</span>}
            <span style={chStyles.crumbSep}>/</span>
          </button>
          {editingTitle
            ? <input
                ref={titleRef}
                defaultValue={chat.title}
                style={chStyles.titleInput}
                onKeyDown={e => { if (e.key === "Enter") saveTitle(e.target.value); if (e.key === "Escape") setEditingTitle(false); }}
                onBlur={e => saveTitle(e.target.value)}
                autoFocus
              />
            : <h1 style={chStyles.title} onClick={() => setEditingTitle(true)} title="Click to rename">{chat.title}</h1>}
          {chat.pinned && !narrow && <span style={chStyles.pinChip} className="mono">{I.Pin} PINNED</span>}
        </div>
        <div style={chStyles.headerActions}>
          {!narrow && (
            <button style={chStyles.headerBtn} onClick={onCyclePosition} title="Cycle knowledge panel position">
              <span style={chStyles.posDots}>
                <span style={{ ...chStyles.posDot, opacity: knowledgePosition === "left" ? 1 : 0.3 }} />
                <span style={{ ...chStyles.posDot, opacity: knowledgePosition === "inline" ? 1 : 0.3 }} />
                <span style={{ ...chStyles.posDot, opacity: knowledgePosition === "right" ? 1 : 0.3 }} />
              </span>
              <span className="mono" style={{ fontSize: 11 }}>{positionLabel}</span>
            </button>
          )}
          <button style={chStyles.headerBtn} onClick={onToggleKnowledge} title={knowledgeOpen ? "Hide knowledge" : "Show knowledge"}>
            {I.Book}{!narrow && <span>{knowledgeOpen ? "Hide" : "Show"} knowledge</span>}
          </button>
          <ChatMenu chat={chat} projectId={project.id} onBack={onBackToProject} onRefresh={onRefreshProject} />
        </div>
      </header>

      {knowledgePosition === "inline" && knowledgeOpen && <InlineKnowledge project={project} />}

      <div ref={scrollRef} style={chStyles.scrollArea}>
        <div style={{ ...chStyles.messagesInner, ...fontSizeStyle }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }} className="mono">
              Loading messages…
            </div>
          )}
          {!loading && messages.length === 0 && !streaming && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }} className="mono">
              Start a conversation with {project.name}
            </div>
          )}
          {!loading && messages.length > 0 && <DateDivider label={formatDateLabel()} />}
          {messages.map((msg, mi) => <Message key={msg.id} msg={msg} projectId={project.id} onViewArtifact={onViewArtifact} onDelete={deleteMsg} onRetry={mi > 0 && messages[mi-1]?.role === "user" ? () => { setMessages(msgs => msgs.slice(0, mi)); setInput(messages[mi-1].content); taRef.current?.focus(); } : undefined} user={user} />)}
          {streaming && (
            <Message msg={{
              id: "stream",
              role: "assistant",
              model: currentModel || "Multi-provider",
              time: now(),
              content: streamText,
              streaming: true,
              reasoning: streamReasoning || undefined,
            }} projectId={project.id} onViewArtifact={onViewArtifact} />
          )}
        </div>
      </div>

      <div style={chStyles.composerWrap}>
        <div style={chStyles.composer}>
          <textarea ref={taRef} value={input} onChange={onInputChange}
            onKeyDown={onKey} placeholder={`Message ${project.name}…   (${settings?.enter_to_send !== false ? "Shift+Enter" : "Ctrl+Enter"} for newline)`}
            style={chStyles.textarea} rows={1} />
          {showMentions && (
            <MentionDropdown
              members={members}
              query={mentionQuery}
              selected={mentionSel}
              onSelect={insertMention}
            />
          )}
          <div style={chStyles.composerBot}>
            <button style={{ ...chStyles.toggleBtn, ...(webSearchOn ? chStyles.toggleBtnActive : {}) }}
              onClick={() => setWebSearchOn(w => !w)} title="Toggle web search">
              {I.Globe}<span>Search</span>
            </button>
            <span style={{ flex: 1 }} />
            {streaming ? (
              <button style={chStyles.stopBtn} onClick={stopStream}>
                {I.Stop}<span>Stop</span>
              </button>
            ) : (
              <button style={{ ...chStyles.sendBtn, ...(input.trim() ? null : chStyles.sendBtnDisabled) }}
                onClick={send} disabled={!input.trim()}>
                {I.ArrowUp}
              </button>
            )}
          </div>
        </div>
        <div style={chStyles.composerHint} className="mono">
          ProjektLLM grounds answers in this project's knowledge. Verify before shipping.
        </div>
      </div>
    </main>
  );
}

function DateDivider({ label }) {
  return (
    <div style={chStyles.divider}>
      <span style={chStyles.dividerLine} />
      <span className="mono" style={chStyles.dividerLabel}>{label}</span>
      <span style={chStyles.dividerLine} />
    </div>
  );
}

function Message({ msg, projectId, onViewArtifact, onRetry, onDelete, user }) {
  if (msg.role === "user") {
    const isOwn = !msg.user_id || msg.user_id === user?.id;
    return <UserMessage msg={msg} onDelete={onDelete} user={user} isOwn={isOwn} />;
  }
  return <AssistantMessage msg={msg} projectId={projectId} onViewArtifact={onViewArtifact} onRetry={onRetry} onDelete={onDelete} />;
}

function UserMessage({ msg, onDelete, user, isOwn }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const senderName = msg.display_name || msg.username || "User";
  const initials = senderName.slice(0, 2).toUpperCase();
  const color = userColor(msg.user_id);

  if (isOwn) {
    // Own message — right aligned
    return (
      <div style={chStyles.userRow}>
        <div style={chStyles.userHead}>
          <div style={chStyles.userHeadInner}>
            <div style={chStyles.userAvatar} className="mono">{initials}</div>
            <span style={chStyles.userDisplayName}>{senderName}</span>
          </div>
          <span className="mono" style={chStyles.userMeta}>{msg.time}</span>
        </div>
        <div style={chStyles.userBubble}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button style={chStyles.collapseToggle} onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expand" : "Collapse"}>
              {collapsed ? I.ChevRight : I.ChevDown}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!collapsed && <div style={chStyles.userText}>{msg.content}</div>}
            </div>
            {onDelete && (
              <button style={chStyles.userActionBtn} onClick={() => { setDeleting(true); onDelete(msg.id); }} title="Delete" disabled={deleting}>
                {deleting ? I.Loader || "…" : I.Trash}
              </button>
            )}
            <button style={chStyles.userActionBtn} onClick={copy} title="Copy">
              {copied ? I.Check : I.Copy}
            </button>
          </div>
          {!collapsed && msg.attachments && (
            <div style={chStyles.attachRow}>
              {msg.attachments.map((a, i) => (
                <div key={i} style={chStyles.attachChip}>
                  {I.File}
                  <span className="mono" style={{ fontSize: 11 }}>{a.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Other user's message — left aligned (like WhatsApp received)
  return (
    <div style={chStyles.otherRow}>
      <div style={chStyles.otherHead}>
        <div style={{ ...chStyles.otherAvatar, background: color }} className="mono">{initials}</div>
        <span style={chStyles.otherName}>{senderName}</span>
        <span className="mono" style={chStyles.userMeta}>{msg.time}</span>
      </div>
      <div style={chStyles.otherBody}>
        <div style={chStyles.otherBubble}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button style={chStyles.collapseToggle} onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expand" : "Collapse"}>
              {collapsed ? I.ChevRight : I.ChevDown}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!collapsed && <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{msg.content}</div>}
            </div>
            <button style={chStyles.userActionBtn} onClick={copy} title="Copy">
              {copied ? I.Check : I.Copy}
            </button>
          </div>
          {!collapsed && msg.attachments && (
            <div style={chStyles.attachRow}>
              {msg.attachments.map((a, i) => (
                <div key={i} style={chStyles.attachChip}>
                  {I.File}
                  <span className="mono" style={{ fontSize: 11 }}>{a.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ msg, projectId, onViewArtifact, onRetry, onDelete }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const hasArtifacts = msg.artifacts && msg.artifacts.length > 0;

  return (
    <div style={chStyles.aiRow}>
      <div style={chStyles.aiHead}>
        <div style={chStyles.aiAvatar}>
          <I.Logo size={18} />
        </div>
        <div style={chStyles.aiHeadText}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>ProjektLLM</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginLeft: 8 }}>
            {msg.model || "Multi-provider"} · {msg.time}
          </span>
        </div>
      </div>
      <div style={chStyles.aiBody}>
        {msg.reasoning && (
          <div style={{ marginBottom: msg.content ? 12 : 0 }}>
            <ThinkingBlock text={msg.reasoning} title="Thought" />
          </div>
        )}
        {msg.content && <Markdown text={msg.content} />}
        {hasArtifacts && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: msg.content ? 12 : 0 }}>
            {msg.artifacts.map((a, i) => (
              <ArtifactChip key={i} artifact={a} onView={onViewArtifact} />
            ))}
          </div>
        )}
        {msg.streaming && <span style={chStyles.caret} />}
      </div>
      {msg.citations && (
        <div style={chStyles.citeRow}>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>CITED</span>
          {msg.citations.map((c, i) => (
            <span key={i} style={chStyles.citeChip} className="mono">
              {I.File}
              <span>{c.file}</span>
              <span style={{ color: "var(--ink-3)" }}>· {c.page}</span>
            </span>
          ))}
        </div>
      )}
      {!msg.streaming && (
        <div style={chStyles.aiActions}>
          {msg.error && onRetry && (
            <button style={chStyles.aiActionBtn} onClick={onRetry}>
              {I.Refresh}<span>Retry</span>
            </button>
          )}
          {onDelete && (
            <button style={chStyles.aiActionBtn} onClick={() => onDelete(msg.id)} title="Delete">
              {I.Trash}
            </button>
          )}
          <button style={chStyles.aiActionBtn} onClick={copy}>
            {copied ? I.Check : I.Copy}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ChatMenu({ chat, projectId, onBack, onRefresh }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const rename = async () => {
    const title = prompt("Rename chat", chat.title);
    if (!title || title === chat.title) return;
    try {
      await patchChat(chat.id, { title });
      onRefresh?.(projectId);
    } catch (err) { console.error("Rename failed:", err); }
    setOpen(false);
  };

  const togglePin = async () => {
    try {
      await patchChat(chat.id, { pinned: !chat.pinned });
      onRefresh?.(projectId);
    } catch (err) { console.error("Pin failed:", err); }
    setOpen(false);
  };

  const remove = async () => {
    if (!confirm("Delete this chat?")) return;
    try {
      await deleteChat(chat.id);
      onRefresh?.(projectId);
      onBack?.();
    } catch (err) { console.error("Delete failed:", err); }
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button style={chStyles.iconBtn} onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title="More">{I.More}</button>
      {open && (
        <div ref={menuRef} style={{ position: "absolute", top: "100%", right: 0, zIndex: 100, minWidth: 150, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 9, boxShadow: "var(--shadow-lg)", padding: 4 }} onClick={e => e.stopPropagation()}>
          <button style={chMenuStyles.item} onClick={togglePin}>
            <span style={{ color: chat.pinned ? "var(--accent)" : "var(--ink-3)", display: "grid", placeItems: "center" }}>{I.Pin}</span>
            <span>{chat.pinned ? "Unpin" : "Pin"}</span>
          </button>
          <button style={chMenuStyles.item} onClick={rename}>{I.Edit}<span>Rename</span></button>
          <button style={chMenuStyles.item} onClick={remove}>{I.Trash}<span>Delete</span></button>
        </div>
      )}
    </div>
  );
}

const chMenuStyles = {
  item: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 12.5, color: "var(--ink-2)", textAlign: "left", borderRadius: 6 },
};

// Render math with KaTeX (loaded via CDN)
function renderKatex(formula, displayMode) {
  try {
    if (window.katex) {
      return window.katex.renderToString(formula, { throwOnError: false, displayMode });
    }
  } catch {}
  return displayMode ? `<div style="text-align:center;padding:8px 0;font-family:monospace;font-size:13px">${formula}</div>` : `<code>${formula}</code>`;
}

// Tiny Markdown renderer with code block, math, and table support
function Markdown({ text }) {
  const lines = (text || "").split("\n");
  const out = [];
  let listBuf = null;
  let listType = null;
  let inCode = false;
  let codeLang = "";
  let codeBuf = [];
  let inTable = false;
  let tableHeaders = null;
  let tableRows = [];
  let inMath = false;
  let mathBuf = [];

  const flushList = () => {
    if (!listBuf) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    out.push(<Tag key={"l" + out.length} style={chStyles.list}>
      {listBuf.map((it, i) => <li key={i} style={chStyles.li}><InlineMd text={it} /></li>)}
    </Tag>);
    listBuf = null; listType = null;
  };

  const splitRow = (line) => line.split("|").filter((_, i, a) => i > 0 && i < a.length - 1 || (i === 0 && a.length > 2)).map(s => s.trim()).filter(Boolean);

  const flushTable = (rowIdx) => {
    if (!inTable || !tableHeaders) return;
    out.push(
      <div key={"t" + rowIdx} style={chStyles.tableWrap}>
        <table style={chStyles.table} className="mono">
          <thead>
            <tr>{tableHeaders.map((h, i) => <th key={i} style={chStyles.th}><InlineMd text={h} /></th>)}</tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri}>{row.map((c, ci) => <td key={ci} style={chStyles.td}><InlineMd text={c} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false; tableHeaders = null; tableRows = [];
  };

  lines.forEach((raw, idx) => {
    // Fenced code block handling
    const codeMatch = raw.match(/^```(\w*)/);
    if (codeMatch) {
      flushList();
      if (inCode) {
        out.push(
          <div key={idx} style={chStyles.codeBlock}>
            {codeLang && <div style={chStyles.codeLang} className="mono">{codeLang}</div>}
            <pre style={chStyles.pre}><code className="mono">{codeBuf.join("\n")}</code></pre>
          </div>
        );
        codeBuf = [];
        codeLang = "";
        inCode = false;
      } else {
        inCode = true;
        codeLang = codeMatch[1] || "";
      }
      return;
    }
    if (inCode) {
      codeBuf.push(raw);
      return;
    }

    // Display math — $$ on its own line or $$...$$ inline
    if (raw.trim() === "$$" || raw.startsWith("$$")) {
      if (!inMath) {
        flushList();
        inMath = true;
        mathBuf = [];
        // If the line has content after $$, capture it
        if (raw.trim() !== "$$" || raw.indexOf("$$") < raw.lastIndexOf("$$")) {
          const inner = raw.slice(raw.indexOf("$$") + 2);
          if (inner.endsWith("$$")) {
            mathBuf.push(inner.slice(0, -2));
            out.push(<div key={idx} style={{ textAlign: "center", padding: "8px 0", overflowX: "auto" }}
              dangerouslySetInnerHTML={{ __html: renderKatex(mathBuf.join("\n"), true) }} />);
            inMath = false;
            mathBuf = [];
          } else {
            mathBuf.push(inner);
          }
        }
      } else {
        // Closing math
        const r = raw.trim();
        if (r.endsWith("$$") && r !== "$$") {
          mathBuf.push(r.slice(0, -2));
        }
        out.push(<div key={idx} style={{ textAlign: "center", padding: "8px 0", overflowX: "auto" }}
          dangerouslySetInnerHTML={{ __html: renderKatex(mathBuf.join("\n"), true) }} />);
        inMath = false;
        mathBuf = [];
      }
      return;
    }
    if (inMath) {
      mathBuf.push(raw);
      return;
    }

    const line = raw;

    // Table detection
    if (line.startsWith("|") && line.endsWith("|")) {
      const next = lines[idx + 1];
      if (next && /^\|[\s\-:|]+\|$/.test(next) && !inTable) {
        flushList();
        inTable = true;
        tableHeaders = splitRow(line);
        return;
      }
      if (inTable) {
        if (/^\|[\s\-:|]+\|$/.test(line)) return;
        const cells = splitRow(line);
        if (cells.length) { tableRows.push(cells); return; }
        flushTable(idx);
        return;
      }
    }
    if (inTable) { flushTable(idx); }

    if (/^# /.test(line))        { flushList(); out.push(<h1 key={idx} style={chStyles.h1}><InlineMd text={line.slice(2)} /></h1>); return; }
    if (/^## /.test(line))       { flushList(); out.push(<h2 key={idx} style={chStyles.h2}><InlineMd text={line.slice(3)} /></h2>); return; }
    if (/^### /.test(line))      { flushList(); out.push(<h3 key={idx} style={chStyles.h3}><InlineMd text={line.slice(4)} /></h3>); return; }
    if (/^[-*_]{3,}\s*$/.test(line)) { flushList(); out.push(<hr key={idx} style={chStyles.hr} />); return; }
    if (/^> /.test(line))        { flushList(); out.push(<blockquote key={idx} style={chStyles.bq}><InlineMd text={line.slice(2)} /></blockquote>); return; }
    let m;
    if ((m = line.match(/^(\d+)\.\s+(.*)/))) {
      if (listType !== "ol") { flushList(); listBuf = []; listType = "ol"; }
      listBuf.push(m[2]); return;
    }
    if (/^[-*]\s+/.test(line)) {
      if (listType !== "ul") { flushList(); listBuf = []; listType = "ul"; }
      listBuf.push(line.replace(/^[-*]\s+/, "")); return;
    }
    flushList();
    if (line.trim() === "") out.push(<div key={idx} style={{ height: 8 }} />);
    else out.push(<p key={idx} style={chStyles.p}><InlineMd text={line} /></p>);
  });

  // Close any unclosed code block
  if (inCode && codeBuf.length) {
    out.push(
      <div key="unclosed" style={chStyles.codeBlock}>
        <pre style={chStyles.pre}><code className="mono">{codeBuf.join("\n")}</code></pre>
      </div>
    );
  }

  // Close any unclosed math block
  if (inMath && mathBuf.length) {
    out.push(<div key="unclosedmath" style={{ textAlign: "center", padding: "8px 0", overflowX: "auto" }}
      dangerouslySetInnerHTML={{ __html: renderKatex(mathBuf.join("\n"), true) }} />);
  }

  flushList();
  return <div>{out}</div>;
}

function InlineMd({ text }) {
  // First pass: replace math with placeholders so they don't interfere with markdown parsing
  const mathBlocks = [];
  let processed = text;
  processed = processed.replace(/\$\$([^$]|\$(?!\$))+\$\$/g, (match) => {
    mathBlocks.push({ type: 'display', formula: match.slice(2, -2) });
    return `\x00MATH${mathBlocks.length - 1}\x00`;
  });
  processed = processed.replace(/\$([^$]|\$(?!\$))+\$/g, (match) => {
    mathBlocks.push({ type: 'inline', formula: match.slice(1, -1) });
    return `\x00MATH${mathBlocks.length - 1}\x00`;
  });

  const parts = [];
  let i = 0, key = 0;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let m;
  while ((m = re.exec(processed)) !== null) {
    if (m.index > i) pushPlain(processed.slice(i, m.index));
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={key++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) parts.push(<code key={key++} style={chStyles.code} className="mono">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) { const br = t.indexOf("]("); if (br > 0) parts.push(<a key={key++} href={t.slice(br + 2, -1)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{t.slice(1, br)}</a>); }
    else parts.push(<em key={key++}>{t.slice(1, -1)}</em>);
    i = m.index + t.length;
  }
  if (i < processed.length) pushPlain(processed.slice(i));
  return <>{parts}</>;

  function pushPlain(s) {
    let last = 0;
    const placeholderRe = /\x00MATH(\d+)\x00/g;
    let pm;
    while ((pm = placeholderRe.exec(s)) !== null) {
      if (pm.index > last) parts.push(linkify(s.slice(last, pm.index), key));
      const mb = mathBlocks[parseInt(pm[1])];
      if (mb) {
        parts.push(<span key={key++} dangerouslySetInnerHTML={{
          __html: renderKatex(mb.formula, mb.type === 'display')
        }} />);
      }
      last = pm.index + pm[0].length;
    }
    if (last < s.length) parts.push(linkify(s.slice(last), key));
  }
}

/** Turn /api/uploads/... URLs into clickable links in plain text. */
function linkify(text, keyStart) {
  const urlRe = /(\/api\/uploads\/[^\s<)+]+)/g;
  const parts = [];
  let last = 0, m, key = keyStart || 0;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<a key={key++} href={m[1]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{m[1].split("/").pop()}</a>);
    last = urlRe.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function InlineKnowledge({ project }) {
  return (
    <div style={chStyles.inlineKb}>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.5 }}>KNOWLEDGE</span>
      <div style={chStyles.inlineKbStrip}>
        {(project.files || []).slice(0, 5).map(f => (
          <div key={f.id} style={chStyles.inlineKbChip}>
            {I.File}
            <span style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</span>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{f.size}</span>
          </div>
        ))}
        <button style={chStyles.inlineKbAdd}>{I.Plus}<span>Add</span></button>
      </div>
    </div>
  );
}

function now() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(date) {
  const d = date || new Date();
  const today = new Date();
  const diff = Math.round((today - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Artifact support
// ---------------------------------------------------------------------------

// Parse [artifact:filename.ext]content[/artifact] blocks from AI responses.
// Also extract long fenced code blocks (```lang\n...\n```) as artifacts.
function parseArtifacts(text) {
  const artifacts = [];
  let lastIndex = 0;
  const parts = [];

  // Collect all artifact boundaries (explicit + code-block) so we can merge them
  let ranges = [];

  // 1. Explicit [artifact:filename]...[/artifact] blocks
  const artRe = /\[artifact:([^\]]+)\]\n?([\s\S]*?)\n?\[\/artifact\]/g;
  let m;
  while ((m = artRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length, filename: m[1].trim(), content: m[2], _src: 'artifact' });
  }

  // 2. Fenced code blocks (```lang\n...\n```) that are long enough to be artifacts
  // Uses a line-by-line state machine with backtick-length tracking (CommonMark-compatible)
  const fenceExt = (lang) => {
    const l = lang.toLowerCase();
    if (l === "markdown" || l === "md") return "md";
    if (l === "python" || l === "py") return "py";
    if (l === "javascript" || l === "js") return "js";
    if (l === "typescript" || l === "ts") return "ts";
    if (l === "html") return "html";
    if (l === "css") return "css";
    if (l === "json") return "json";
    if (l === "yaml" || l === "yml") return "yml";
    if (l === "bash" || l === "sh") return "sh";
    if (l === "sql") return "sql";
    if (l === "xml") return "xml";
    return "md";
  };
  const lines = text.split('\n');
  // Precompute line start positions for accurate fence boundary calculation
  const linePos = [0];
  for (let i = 0; i < lines.length - 1; i++) linePos.push(linePos[i] + lines[i].length + 1);
  const lineEnd = (i) => i < lines.length - 1 ? linePos[i + 1] : text.length;

  const fenceOpen = /^(`{3,})\s*(\w*)/;
  let fenceDepth = 0;
  let fenceStart = -1;
  let fenceLang = '';
  let fenceBackticks = '';
  let fenceContent = [];
  for (let i = 0; i < lines.length; i++) {
    const fl = fenceOpen.exec(lines[i]);
    if (fl) {
      const bt = fl[1];
      if (fenceDepth === 0) {
        // Opening fence at top level
        fenceDepth = 1;
        fenceStart = linePos[i];
        fenceLang = fl[2];
        fenceBackticks = bt;
        fenceContent = [];
      } else if (bt.length >= fenceBackticks.length) {
        // Closing fence (matches or exceeds opening backtick count)
        const content = fenceContent.join('\n').trim();
        if (content.length > 200) {
          ranges.push({
            start: fenceStart,
            end: lineEnd(i),
            filename: `document.${fenceExt(fenceLang)}`,
            content,
          });
        }
        fenceDepth = 0;
      } else {
        // Shorter fence inside — treat as content
        fenceContent.push(lines[i]);
      }
    } else if (fenceDepth > 0) {
      fenceContent.push(lines[i]);
    }
  }

  // Merge consecutive ranges with the same filename
  // Handles nested fences: when the model wraps content in ``` and the content itself contains ```,
  // the parser produces separate ranges for each fragment. This merges them back into one.
  const merged = [];
  for (const r of ranges) {
    const prev = merged[merged.length - 1];
    if (prev && prev.filename === r.filename) {
      // Reconstruct full content from original text, stripping outer fences
      const combined = text.slice(prev.start, r.end).trim();
      const cl = combined.split('\n');
      if (cl[0].startsWith('```')) cl.shift();
      if (cl.length && cl[cl.length - 1].startsWith('```')) cl.pop();
      prev.content = cl.join('\n').trim();
      prev.end = r.end;
    } else {
      merged.push({ ...r });
    }
  }
  ranges = merged;

  // Sort by position and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const r of ranges) {
    if (r.end <= cursor) continue; // already covered
    if (r.start < cursor) continue; // overlaps previous
    if (r.start > lastIndex) {
      parts.push(text.slice(lastIndex, r.start));
    }
    artifacts.push({ filename: r.filename, content: r.content });
    lastIndex = r.end;
    cursor = r.end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return { artifacts, remaining: parts.join("").trim() };
}

function MentionDropdown({ members, query, selected, onSelect }) {
  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(query) ||
    (m.display_name || "").toLowerCase().includes(query)
  );
  if (!filtered.length) return null;
  return (
    <div style={chStyles.mentionWrap}>
      {filtered.map((m, i) => (
        <button
          key={m.id}
          style={{
            ...chStyles.mentionItem,
            ...(i === selected ? chStyles.mentionItemActive : {}),
          }}
          onClick={() => onSelect(m)}
          onMouseEnter={() => {}} // handled by keyboard nav
        >
          <div style={{ ...chStyles.mentionAvatar, background: userColor(m.id) }} className="mono">
            {(m.display_name || m.username).slice(0, 2).toUpperCase()}
          </div>
          <span style={chStyles.mentionName}>{m.display_name || m.username}</span>
          <span style={chStyles.mentionUser}>@{m.username}</span>
        </button>
      ))}
    </div>
  );
}

function ThinkingBlock({ text, title }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={chStyles.thinkWrap}>
      <button style={chStyles.thinkToggle} onClick={() => setOpen(o => !o)}>
        <span style={{ transform: open ? "rotate(90deg)" : "none", display: "grid", placeItems: "center", fontSize: 10, transition: "transform 120ms" }}>{I.ChevRight}</span>
        <span style={chStyles.thinkLabel}>{title || "Thinking"}</span>
        <span style={chStyles.thinkTime} className="mono">···</span>
      </button>
      {open && (
        <div style={chStyles.thinkContent}>{text}</div>
      )}
    </div>
  );
}

function ArtifactChip({ artifact, onView }) {
  const ext = artifact.filename.includes(".") ? artifact.filename.split(".").pop() : "md";
  const snippet = artifact.content.replace(/#+\s*/, "").replace(/\n.*/, "").slice(0, 65).trim();
  return (
    <button style={chipStyles.row} onClick={() => onView(artifact)} title={`View ${artifact.filename}`}>
      <span style={chipStyles.icon}>{I.File}</span>
      <span style={chipStyles.name}>{artifact.filename}</span>
      <span style={chipStyles.badge}>{ext}</span>
      {snippet && <span style={chipStyles.snippet}>{snippet}…</span>}
      <span style={chipStyles.arrow}>{I.ChevRight}</span>
    </button>
  );
}

const chipStyles = {
  row: {
    display: "flex", alignItems: "center", gap: 8, width: "100%",
    padding: "7px 10px", borderRadius: 9, textAlign: "left",
    background: "var(--surface)", border: "1px solid var(--line)",
    color: "var(--ink)", cursor: "pointer",
    transition: "border-color 120ms, background 120ms",
  },
  icon: { color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 },
  name: { fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badge: {
    fontSize: 10, color: "var(--accent-ink)", background: "var(--accent-soft)",
    padding: "1px 6px", borderRadius: 999, letterSpacing: 0.4, flexShrink: 0,
  },
  snippet: {
    fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0,
    marginLeft: 2,
  },
  arrow: { color: "var(--ink-3)", display: "grid", placeItems: "center", flexShrink: 0 },
};

const chStyles = {
  column: { flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" },
  header: { display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--line)", background: "var(--bg)", flexShrink: 0, minWidth: 0 },
  dotProj: { width: 8, height: 8, borderRadius: 999, flexShrink: 0 },
  backBtn: { display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 6, color: "var(--ink-3)", fontSize: 12, flexShrink: 0, transition: "background 120ms, color 120ms", cursor: "pointer" },
  backLabel: { maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  crumbSep: { color: "var(--ink-3)", margin: "0 2px" },
  title: { fontSize: 15, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, cursor: "pointer" },
  titleInput: { fontSize: 15, fontWeight: 600, margin: 0, padding: "2px 6px", border: "1px solid var(--accent)", borderRadius: 4, background: "transparent", color: "var(--ink)", outline: "none", fontFamily: "inherit", minWidth: 60, width: "auto" },
  pinChip: { fontSize: 10, color: "var(--accent-ink)", background: "var(--accent-soft)", padding: "3px 7px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4, letterSpacing: 0.4 },
  headerActions: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  headerBtn: { display: "flex", alignItems: "center", gap: 7, height: 30, minWidth: 30, padding: "0 10px", borderRadius: 8, fontSize: 12, color: "var(--ink-2)", border: "1px solid var(--line)", background: "var(--surface)", transition: "background 120ms", whiteSpace: "nowrap", flexShrink: 0, justifyContent: "center" },
  iconBtn: { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--ink-2)" },
  menuBtn: { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--ink-3)", flexShrink: 0, transition: "background 120ms, color 120ms" },
  iconBtnSm: { width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", color: "var(--ink-3)" },
  posDots: { display: "inline-flex", gap: 2, alignItems: "center" },
  posDot: { width: 4, height: 4, borderRadius: 999, background: "var(--ink-2)" },
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
  messagesInner: { maxWidth: 760, margin: "0 auto", padding: "32px 32px 16px", display: "flex", flexDirection: "column", gap: 28 },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "0 0 8px" },
  dividerLine: { flex: 1, height: 1, background: "var(--line)" },
  dividerLabel: { fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.6 },
  userRow: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, animation: "fadeIn 200ms ease-out" },
  userHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 2 },
  userHeadInner: { display: "flex", alignItems: "center", gap: 6 },
  userAvatar: { width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, var(--accent), oklch(0.66 0.17 18))", color: "white", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 600, flexShrink: 0 },
  userDisplayName: { fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)" },
  userBubble: { maxWidth: "85%", background: "var(--accent-soft)", color: "var(--accent-ink)", padding: "12px 16px", borderRadius: "18px 18px 6px 18px", border: "1px solid var(--accent-soft)" },
  // Other user's message (left-aligned)
  otherRow: { display: "flex", flexDirection: "column", gap: 4, animation: "fadeIn 200ms ease-out" },
  otherHead: { display: "flex", alignItems: "center", gap: 8, paddingLeft: 0 },
  otherAvatar: { width: 24, height: 24, borderRadius: 7, color: "white", display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 600, flexShrink: 0 },
  otherName: { fontSize: 12, fontWeight: 600, color: "var(--ink-2)" },
  otherBody: { padding: "0 0 0 0" },
  otherBubble: { maxWidth: "85%", background: "var(--surface)", color: "var(--ink)", padding: "12px 16px", borderRadius: "6px 18px 18px 18px", border: "1px solid var(--line)" },
  // Mention dropdown
  mentionWrap: { position: "absolute", bottom: "100%", left: 12, right: 12, maxHeight: 200, overflowY: "auto", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", zIndex: 50, marginBottom: 4 },
  mentionItem: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", textAlign: "left", fontSize: 13, color: "var(--ink)", transition: "background 80ms", cursor: "pointer" },
  mentionItemActive: { background: "var(--accent-soft)" },
  mentionAvatar: { width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", fontSize: 9, fontWeight: 600, flexShrink: 0, color: "white" },
  mentionName: { fontWeight: 500 },
  mentionUser: { fontSize: 11, color: "var(--ink-3)", marginLeft: 4 },
  userText: { fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" },
  userMeta: { fontSize: 10.5, color: "var(--ink-3)" },
  attachRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  attachChip: { display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-2)" },
  aiRow: { display: "flex", flexDirection: "column", gap: 8, animation: "fadeIn 200ms ease-out" },
  aiHead: { display: "flex", alignItems: "center", gap: 10 },
  aiAvatar: { width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)" },
  aiHeadText: { display: "flex", alignItems: "baseline" },
  aiBody: { padding: "0 0 0 38px", color: "var(--ink)", fontSize: 14 },
  caret: { display: "inline-block", width: 8, height: 14, background: "var(--accent)", marginLeft: 2, verticalAlign: "-2px", animation: "blink 900ms steps(2) infinite", borderRadius: 1 },
  citeRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "0 0 0 38px" },
  citeChip: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 11, color: "var(--ink-2)" },
  aiActions: { display: "flex", gap: 4, padding: "0 0 0 32px" },
  aiActionBtn: { display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, fontSize: 11.5, color: "var(--ink-3)", transition: "background 120ms, color 120ms" },
  userActionBtn: { width: 24, height: 24, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: 12, transition: "color 120ms, background 120ms", verticalAlign: "middle", flexShrink: 0 },
  collapseToggle: { width: 20, height: 20, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: 12, flexShrink: 0, transition: "color 120ms" },
  h1: { fontSize: 22, fontWeight: 700, margin: "16px 0 8px", letterSpacing: -0.3, color: "var(--ink)" },
  h2: { fontSize: 17, fontWeight: 600, margin: "14px 0 6px", letterSpacing: -0.2, color: "var(--ink)" },
  h3: { fontSize: 14.5, fontWeight: 600, margin: "12px 0 4px", color: "var(--ink-2)" },
  hr: { margin: "16px 0", border: "none", borderTop: "1.5px solid var(--line)", height: 0 },
  p: { margin: "0 0 8px", lineHeight: 1.65 },
  list: { margin: "4px 0 8px", paddingLeft: 22 },
  li: { margin: "0 0 4px", lineHeight: 1.6 },
  bq: { margin: "8px 0", padding: "8px 12px", borderLeft: "3px solid var(--accent)", background: "var(--bg-2)", borderRadius: "0 8px 8px 0", color: "var(--ink-2)" },
  code: { fontSize: 12.5, padding: "1px 5px", background: "var(--bg-3)", borderRadius: 5, color: "var(--ink)" },
  codeBlock: { margin: "8px 0", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" },
  thinkWrap: {
    margin: "0 0 12px 0", background: "var(--bg-2)", border: "1px solid var(--line)",
    borderRadius: 10, overflow: "hidden",
  },
  thinkToggle: {
    display: "flex", alignItems: "center", gap: 6, width: "100%",
    padding: "8px 12px", fontSize: 12, color: "var(--ink-3)", textAlign: "left",
    background: "var(--bg-3)", borderBottom: "1px solid var(--line)",
    cursor: "pointer",
  },
  thinkLabel: { fontWeight: 500, color: "var(--ink-2)" },
  thinkTime: { fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" },
  thinkContent: {
    padding: "12px 14px", fontSize: 12.5, lineHeight: 1.65,
    color: "var(--ink-3)", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto",
  },
  codeLang: { padding: "4px 12px", fontSize: 10.5, color: "var(--ink-3)", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", letterSpacing: 0.4 },
  pre: { padding: 14, margin: 0, background: "var(--surface)", fontSize: 12.5, lineHeight: 1.55, overflowX: "auto" },
  tableWrap: { overflowX: "auto", margin: "8px 0" },
  table: { borderCollapse: "collapse", fontSize: 13, width: "100%" },
  th: { padding: "6px 10px", border: "1px solid var(--line)", background: "var(--bg-2)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "6px 10px", border: "1px solid var(--line)", whiteSpace: "nowrap" },
  composerWrap: { padding: "12px 24px 16px", background: "linear-gradient(to top, var(--bg) 70%, transparent)" },
  composer: { maxWidth: 760, margin: "0 auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: "10px 12px 8px", boxShadow: "var(--shadow-md)", transition: "border-color 160ms, box-shadow 160ms", position: "relative" },
  composerTop: { display: "flex", alignItems: "center", gap: 4, marginBottom: 4 },
  textarea: { width: "100%", minHeight: 24, padding: "6px 4px", border: 0, background: "transparent", outline: "none", resize: "none", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" },
  composerBot: { display: "flex", alignItems: "center", gap: 6 },
  modelChip: { display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", background: "var(--bg-2)", borderRadius: 8, color: "var(--ink-2)", cursor: "pointer" },
  modelDot: { width: 7, height: 7, borderRadius: 999, background: "var(--good)", boxShadow: "0 0 0 3px var(--good-soft)" },
  toggleBtn: { display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 7, fontSize: 11.5, color: "var(--ink-3)", transition: "color 120ms, background 120ms" },
  toggleBtnActive: { color: "var(--accent-ink)", background: "var(--accent-soft)" },
  sendBtn: { width: 36, height: 36, borderRadius: 10, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", transition: "transform 120ms, opacity 120ms" },
  sendBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  stopBtn: { display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", borderRadius: 10, background: "var(--ink)", color: "var(--bg)", fontSize: 12, fontWeight: 500 },
  composerHint: { maxWidth: 760, margin: "8px auto 0", fontSize: 10.5, color: "var(--ink-3)", textAlign: "center", letterSpacing: 0.2 },
  inlineKb: { padding: "10px 24px", borderBottom: "1px solid var(--line)", background: "var(--bg-2)", display: "flex", flexDirection: "column", gap: 6 },
  inlineKbStrip: { display: "flex", flexWrap: "wrap", gap: 6 },
  inlineKbChip: { display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-2)" },
  inlineKbAdd: { display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", border: "1px dashed var(--line-2)", borderRadius: 8, color: "var(--ink-3)", fontSize: 12 },
};
