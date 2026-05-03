// Centered chat column — message list, streaming, composer.
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

function ChatView({ project, chat, knowledgeOpen, onToggleKnowledge, knowledgePosition, onCyclePosition, narrow, onBackToProject }) {
  const [messages, setMessages] = useStateC(window.ACTIVE_THREAD);
  const [input, setInput] = useStateC("");
  const [streaming, setStreaming] = useStateC(false);
  const [streamText, setStreamText] = useStateC("");
  const streamRef = useRefC(null);
  const scrollRef = useRefC(null);
  const taRef = useRefC(null);

  // Reset thread on chat change.
  useEffectC(() => {
    setMessages(window.ACTIVE_THREAD);
    setInput("");
    setStreaming(false);
    setStreamText("");
    if (streamRef.current) clearInterval(streamRef.current);
  }, [chat?.id, project?.id]);

  // Autoscroll
  useEffectC(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamText]);

  // Auto-resize textarea
  useEffectC(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(220, ta.scrollHeight) + "px";
  }, [input]);

  const send = () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg = {
      id: "m" + Date.now(),
      role: "user",
      content: text,
      time: now(),
    };
    setMessages(m => [...m, userMsg]);
    setInput("");
    startStream();
  };

  const startStream = () => {
    setStreaming(true);
    setStreamText("");
    const target = window.STREAM_REPLY;
    let i = 0;
    streamRef.current = setInterval(() => {
      i += 4 + Math.floor(Math.random() * 6);
      if (i >= target.length) {
        clearInterval(streamRef.current);
        setStreamText(target);
        setMessages(m => [...m, {
          id: "m" + Date.now(),
          role: "assistant",
          model: "DeepSeek v4 Flash",
          time: now(),
          content: target,
        }]);
        setStreamText("");
        setStreaming(false);
      } else {
        setStreamText(target.slice(0, i));
      }
    }, 28);
  };

  const stopStream = () => {
    if (streamRef.current) clearInterval(streamRef.current);
    if (streamText) {
      setMessages(m => [...m, {
        id: "m" + Date.now(),
        role: "assistant",
        model: "DeepSeek v4 Flash",
        time: now(),
        content: streamText + "\n\n*[stopped by user]*",
        stopped: true,
      }]);
    }
    setStreamText("");
    setStreaming(false);
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const positionLabel = { left: "Knowledge: left", right: "Knowledge: right", inline: "Knowledge: inline" }[knowledgePosition];

  return (
    <main style={chStyles.column}>
      {/* Header */}
      <header style={chStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, overflow: "hidden" }}>
          <button
            style={chStyles.backBtn}
            onClick={onBackToProject}
            title={`Back to ${project.name}`}
          >
            <span style={{ ...chStyles.dotProj, background: project.color }} />
            {!narrow && <span style={chStyles.backLabel}>{project.name}</span>}
            <span style={chStyles.crumbSep}>/</span>
          </button>
          <h1 style={chStyles.title}>{chat.title}</h1>
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
          <button style={chStyles.iconBtn} title="More">{I.More}</button>
        </div>
      </header>

      {/* Inline knowledge strip */}
      {knowledgePosition === "inline" && knowledgeOpen && <InlineKnowledge project={project} />}

      {/* Messages */}
      <div ref={scrollRef} style={chStyles.scrollArea}>
        <div style={chStyles.messagesInner}>
          <DateDivider label="Today · 10:42" />
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {streaming && (
            <Message msg={{
              id: "stream",
              role: "assistant",
              model: "DeepSeek v4 Flash",
              time: now(),
              content: streamText,
              streaming: true,
            }} />
          )}
        </div>
      </div>

      {/* Composer */}
      <div style={chStyles.composerWrap}>
        <div style={chStyles.composer}>
          <div style={chStyles.composerTop}>
            <button style={chStyles.composerChip}>
              {I.Attach}<span>Attach from knowledge</span>
            </button>
            <button style={chStyles.composerChip}>
              {I.Sparkle}<span>Use template</span>
            </button>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
              {input.length} chars
            </span>
          </div>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Message ${project.name}…   (Shift+Enter for newline)`}
            style={chStyles.textarea}
            rows={1}
          />
          <div style={chStyles.composerBot}>
            <div style={chStyles.modelChip}>
              <span style={chStyles.modelDot} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>DeepSeek v4 Flash</span>
              {I.ChevDown}
            </div>
            <span style={{ flex: 1 }} />
            <button style={chStyles.iconBtnSm} title="Voice">{I.Mic}</button>
            {streaming ? (
              <button style={chStyles.stopBtn} onClick={stopStream}>
                {I.Stop}<span>Stop</span>
              </button>
            ) : (
              <button style={{ ...chStyles.sendBtn, ...(input.trim() ? null : chStyles.sendBtnDisabled) }} onClick={send} disabled={!input.trim()}>
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

function Message({ msg }) {
  if (msg.role === "user") return <UserMessage msg={msg} />;
  return <AssistantMessage msg={msg} />;
}

function UserMessage({ msg }) {
  return (
    <div style={chStyles.userRow}>
      <div style={chStyles.userBubble}>
        <div style={chStyles.userText}>{msg.content}</div>
        {msg.attachments && (
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
      <div style={chStyles.userMeta} className="mono">{msg.time}</div>
    </div>
  );
}

function AssistantMessage({ msg }) {
  const [copied, setCopied] = useStateC(false);
  const copy = () => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div style={chStyles.aiRow}>
      <div style={chStyles.aiHead}>
        <div style={chStyles.aiAvatar}>
          <I.Logo size={18} />
        </div>
        <div style={chStyles.aiHeadText}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>ProjektLLM</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginLeft: 8 }}>
            {msg.model || "DeepSeek v4 Flash"} · {msg.time}
          </span>
        </div>
      </div>
      <div style={chStyles.aiBody}>
        <Markdown text={msg.content} />
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
          <button style={chStyles.aiActionBtn} onClick={copy}>
            {copied ? I.Check : I.Copy}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button style={chStyles.aiActionBtn}>{I.Refresh}<span>Regenerate</span></button>
          <button style={chStyles.aiActionBtn}>{I.Thumb}<span>Helpful</span></button>
        </div>
      )}
    </div>
  );
}

// Tiny Markdown renderer (headings, bold, italic, lists, blockquote, code).
function Markdown({ text }) {
  const lines = (text || "").split("\n");
  const out = [];
  let listBuf = null;
  let listType = null;

  const flushList = () => {
    if (!listBuf) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    out.push(<Tag key={"l" + out.length} style={chStyles.list}>
      {listBuf.map((it, i) => <li key={i} style={chStyles.li}><InlineMd text={it} /></li>)}
    </Tag>);
    listBuf = null; listType = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw;
    if (/^### /.test(line))      { flushList(); out.push(<h3 key={idx} style={chStyles.h3}><InlineMd text={line.slice(4)} /></h3>); return; }
    if (/^## /.test(line))       { flushList(); out.push(<h2 key={idx} style={chStyles.h2}><InlineMd text={line.slice(3)} /></h2>); return; }
    if (/^# /.test(line))        { flushList(); out.push(<h1 key={idx} style={chStyles.h1}><InlineMd text={line.slice(2)} /></h1>); return; }
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
  flushList();
  return <div>{out}</div>;
}

function InlineMd({ text }) {
  // Replace **bold**, *italic*, `code`
  const parts = [];
  let i = 0, key = 0;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) parts.push(text.slice(i, m.index));
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={key++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) parts.push(<code key={key++} style={chStyles.code} className="mono">{t.slice(1, -1)}</code>);
    else parts.push(<em key={key++}>{t.slice(1, -1)}</em>);
    i = m.index + t.length;
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

function InlineKnowledge({ project }) {
  return (
    <div style={chStyles.inlineKb}>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.5 }}>KNOWLEDGE</span>
      <div style={chStyles.inlineKbStrip}>
        {project.files.slice(0, 5).map(f => (
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

const chStyles = {
  column: {
    flex: 1, minWidth: 0,
    height: "100%",
    display: "flex", flexDirection: "column",
    background: "var(--bg)",
  },
  header: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 20px",
    borderBottom: "1px solid var(--line)",
    background: "var(--bg)",
    flexShrink: 0,
    minWidth: 0,
  },
  dotProj: { width: 8, height: 8, borderRadius: 999, flexShrink: 0 },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "4px 6px",
    borderRadius: 6,
    color: "var(--ink-3)",
    fontSize: 12,
    flexShrink: 0,
    transition: "background 120ms, color 120ms",
    cursor: "pointer",
  },
  backLabel: { maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  crumbSep: { color: "var(--ink-3)", margin: "0 2px" },
  title: {
    fontSize: 15, fontWeight: 600, margin: 0,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    minWidth: 0,
  },
  pinChip: {
    fontSize: 10, color: "var(--accent-ink)",
    background: "var(--accent-soft)",
    padding: "3px 7px", borderRadius: 999,
    display: "inline-flex", alignItems: "center", gap: 4,
    letterSpacing: 0.4,
  },
  headerActions: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  headerBtn: {
    display: "flex", alignItems: "center", gap: 7,
    height: 30, minWidth: 30, padding: "0 10px",
    borderRadius: 8,
    fontSize: 12, color: "var(--ink-2)",
    border: "1px solid var(--line)",
    background: "var(--surface)",
    transition: "background 120ms",
    whiteSpace: "nowrap",
    flexShrink: 0,
    justifyContent: "center",
  },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    display: "grid", placeItems: "center",
    color: "var(--ink-2)",
  },
  iconBtnSm: {
    width: 32, height: 32, borderRadius: 9,
    display: "grid", placeItems: "center",
    color: "var(--ink-3)",
  },
  posDots: { display: "inline-flex", gap: 2, alignItems: "center" },
  posDot: { width: 4, height: 4, borderRadius: 999, background: "var(--ink-2)" },

  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
  messagesInner: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "32px 32px 16px",
    display: "flex", flexDirection: "column", gap: 28,
  },

  divider: { display: "flex", alignItems: "center", gap: 10, margin: "0 0 8px" },
  dividerLine: { flex: 1, height: 1, background: "var(--line)" },
  dividerLabel: { fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.6 },

  userRow: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, animation: "fadeIn 200ms ease-out" },
  userBubble: {
    maxWidth: "85%",
    background: "var(--accent-soft)",
    color: "var(--accent-ink)",
    padding: "12px 16px",
    borderRadius: "18px 18px 6px 18px",
    border: "1px solid var(--accent-soft)",
  },
  userText: { fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" },
  userMeta: { fontSize: 10.5, color: "var(--ink-3)" },
  attachRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  attachChip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "4px 8px",
    background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: 6, color: "var(--ink-2)",
  },

  aiRow: { display: "flex", flexDirection: "column", gap: 8, animation: "fadeIn 200ms ease-out" },
  aiHead: { display: "flex", alignItems: "center", gap: 10 },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 9,
    display: "grid", placeItems: "center",
    background: "var(--surface)", border: "1px solid var(--line)",
  },
  aiHeadText: { display: "flex", alignItems: "baseline" },
  aiBody: { padding: "0 0 0 38px", color: "var(--ink)", fontSize: 14 },
  caret: {
    display: "inline-block", width: 8, height: 14,
    background: "var(--accent)", marginLeft: 2, verticalAlign: "-2px",
    animation: "blink 900ms steps(2) infinite",
    borderRadius: 1,
  },
  citeRow: {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
    padding: "0 0 0 38px",
  },
  citeChip: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 8px",
    background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: 6, fontSize: 11, color: "var(--ink-2)",
  },
  aiActions: { display: "flex", gap: 4, padding: "0 0 0 32px" },
  aiActionBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 10px",
    borderRadius: 7,
    fontSize: 11.5, color: "var(--ink-3)",
    transition: "background 120ms, color 120ms",
  },

  // markdown
  h1: { fontSize: 20, fontWeight: 600, margin: "12px 0 8px" },
  h2: { fontSize: 16, fontWeight: 600, margin: "12px 0 6px" },
  h3: { fontSize: 14, fontWeight: 600, margin: "12px 0 4px" },
  p: { margin: "0 0 8px", lineHeight: 1.65 },
  list: { margin: "4px 0 8px", paddingLeft: 22 },
  li: { margin: "0 0 4px", lineHeight: 1.6 },
  bq: {
    margin: "8px 0", padding: "8px 12px",
    borderLeft: "3px solid var(--accent)",
    background: "var(--bg-2)",
    borderRadius: "0 8px 8px 0",
    color: "var(--ink-2)",
  },
  code: {
    fontSize: 12.5,
    padding: "1px 5px",
    background: "var(--bg-3)",
    borderRadius: 5,
    color: "var(--ink)",
  },

  composerWrap: {
    padding: "12px 24px 16px",
    background: "linear-gradient(to top, var(--bg) 70%, transparent)",
  },
  composer: {
    maxWidth: 760, margin: "0 auto",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 18,
    padding: "10px 12px 8px",
    boxShadow: "var(--shadow-md)",
    transition: "border-color 160ms, box-shadow 160ms",
  },
  composerTop: { display: "flex", alignItems: "center", gap: 4, marginBottom: 4 },
  composerChip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "4px 9px",
    borderRadius: 7,
    fontSize: 11.5, color: "var(--ink-3)",
    transition: "color 120ms, background 120ms",
  },
  textarea: {
    width: "100%",
    minHeight: 24,
    padding: "6px 4px",
    border: 0,
    background: "transparent",
    outline: "none",
    resize: "none",
    fontSize: 14, lineHeight: 1.55,
    color: "var(--ink)",
  },
  composerBot: { display: "flex", alignItems: "center", gap: 6 },
  modelChip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 9px",
    background: "var(--bg-2)",
    borderRadius: 8,
    color: "var(--ink-2)",
    cursor: "pointer",
  },
  modelDot: {
    width: 7, height: 7, borderRadius: 999,
    background: "var(--good)",
    boxShadow: "0 0 0 3px var(--good-soft)",
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    background: "var(--accent)", color: "white",
    display: "grid", placeItems: "center",
    transition: "transform 120ms, opacity 120ms",
  },
  sendBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  stopBtn: {
    display: "flex", alignItems: "center", gap: 6,
    height: 36, padding: "0 12px", borderRadius: 10,
    background: "var(--ink)", color: "var(--bg)",
    fontSize: 12, fontWeight: 500,
  },
  composerHint: {
    maxWidth: 760, margin: "8px auto 0",
    fontSize: 10.5, color: "var(--ink-3)",
    textAlign: "center", letterSpacing: 0.2,
  },

  inlineKb: {
    padding: "10px 24px",
    borderBottom: "1px solid var(--line)",
    background: "var(--bg-2)",
    display: "flex", flexDirection: "column", gap: 6,
  },
  inlineKbStrip: { display: "flex", flexWrap: "wrap", gap: 6 },
  inlineKbChip: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "5px 10px",
    background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--ink-2)",
  },
  inlineKbAdd: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "5px 9px",
    border: "1px dashed var(--line-2)",
    borderRadius: 8,
    color: "var(--ink-3)", fontSize: 12,
  },
};

window.ChatView = ChatView;
