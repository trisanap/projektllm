// Project overview page: header + chat list.
import React, { useState, useEffect, useRef } from 'react';
import { I } from './icons.jsx';
import { patchProject, patchChat, deleteChat, duplicateProject } from './api.js';

export default function ProjectView({ project, onOpenChat, onNewChat, onEnterInstructions, knowledgeOpen, onToggleKnowledge, knowledgePosition, onCyclePosition, narrow, onRenameProject, onDeleteProject, onRefreshProject, onOpenShare, sidebarOpen, onToggleSidebar, narrowSidebar }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [editingInst, setEditingInst] = useState(false);
  const [instText, setInstText] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGlyph, setEditGlyph] = useState("");
  const [editColor, setEditColor] = useState("");

  const positionLabel = { left: "Knowledge: left", right: "Knowledge: right", inline: "Knowledge: inline" }[knowledgePosition];

  const filtered = (project.chats || [])
    .filter(c => !query.trim() || c.title.toLowerCase().includes(query.toLowerCase()))
    .slice()
    .sort((a, b) => {
      // Always pin first
      const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      if (sort === "alpha") return a.title.localeCompare(b.title);
      // Default (recent or pinned): newest first
      return (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "");
    });

  const totalTokens = (project.files || []).reduce((s, f) => s + (f.tokens || 0), 0);
  const lastActivity = (project.chats || []).reduce((latest, c) => {
    const t = c.updated_at || c.created_at;
    return t && t > latest ? t : latest;
  }, "");

  return (
    <main style={pvStyles.column}>
      <header style={pvStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, overflow: "hidden" }}>
          {narrowSidebar && (
            <button style={pvStyles.menuBtn} onClick={onToggleSidebar} title={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
              {I.Menu}
            </button>
          )}
          <span style={{ ...pvStyles.dotProj, background: project.color, flexShrink: 0 }} />
          <h1 style={pvStyles.crumbTitle}>{project.name}</h1>
          <span style={pvStyles.crumbSep} className="mono">PROJECT</span>
        </div>
        <div style={pvStyles.headerActions}>
          {!narrow && (
            <button style={pvStyles.headerBtn} onClick={onCyclePosition} title="Cycle knowledge panel position">
              <span style={pvStyles.posDots}>
                <span style={{ ...pvStyles.posDot, opacity: knowledgePosition === "left" ? 1 : 0.3 }} />
                <span style={{ ...pvStyles.posDot, opacity: knowledgePosition === "inline" ? 1 : 0.3 }} />
                <span style={{ ...pvStyles.posDot, opacity: knowledgePosition === "right" ? 1 : 0.3 }} />
              </span>
              <span className="mono" style={{ fontSize: 11 }}>{positionLabel}</span>
            </button>
          )}
          <button style={pvStyles.headerBtn} onClick={onToggleKnowledge} title={knowledgeOpen ? "Hide knowledge" : "Show knowledge"}>
            {I.Book}{!narrow && <span>{knowledgeOpen ? "Hide" : "Show"} knowledge</span>}
          </button>
          {onOpenShare && (
            <button style={pvStyles.headerBtn} onClick={onOpenShare} title="Share project">
              {I.Share}{!narrow && <span>Share</span>}
            </button>
          )}
        </div>
      </header>

      {knowledgePosition === "inline" && knowledgeOpen && (
        <div style={pvStyles.inlineKb}>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.5 }}>KNOWLEDGE</span>
          <div style={pvStyles.inlineKbStrip}>
            {(project.files || []).slice(0, 6).map(f => (
              <div key={f.id} style={pvStyles.inlineKbChip}>
                {I.File}
                <span style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={pvStyles.scrollArea}>
        <div style={pvStyles.inner}>
          <section style={pvStyles.hero}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <span style={{ ...pvStyles.heroGlyph, background: project.color }} className="mono">{project.glyph}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="mono" style={pvStyles.heroEyebrow}>PROJECT</div>
                  <ProjectMenu project={project} onRenameProject={onRenameProject} onDeleteProject={onDeleteProject} onRefreshProject={onRefreshProject} onOpenShare={onOpenShare}
                    onDuplicateProject={async (pid) => { try { await duplicateProject(pid); onRefreshProject?.(pid); } catch (err) { console.error("Duplicate failed:", err); } }}
                    onEditDetails={() => { setEditTitle(project.name); setEditDesc(project.description || ""); setEditGlyph(project.glyph || ""); setEditColor(project.color || ""); setEditOpen(true); }} />
                </div>
                <h2 style={pvStyles.heroTitle}>{project.name}</h2>
                <p style={pvStyles.heroDesc}>{project.description}</p>
              </div>
            </div>
            <div style={pvStyles.heroStats}>
              <HeroStat label="Chats" value={(project.chats || []).length} />
              <HeroStat label="Files" value={(project.files || []).length} />
              <HeroStat label="Context" value={`${(totalTokens / 1000).toFixed(1)}k`} sub="of 128k" />
              <HeroStat label="Last activity" value={lastActivity ? timeAgo(lastActivity) : "—"} />
            </div>
          </section>

          <section style={pvStyles.section}>
            <div style={pvStyles.sectionHead}>
              <h3 style={pvStyles.sectionTitle}>Instructions</h3>
              <button style={pvStyles.linkBtn} onClick={() => { setInstText(project.instructions || ""); setEditingInst(true); }}>
                Edit{I.ChevRight}
              </button>
            </div>
            {editingInst ? (
              <div style={pvStyles.instCard}>
                <textarea style={pvStyles.instTextarea} value={instText} onChange={e => setInstText(e.target.value)}
                  placeholder="System prompt for every chat in this project…" rows={4} />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                  <button style={pvStyles.cancelBtn} onClick={() => setEditingInst(false)}>Cancel</button>
                  <button style={pvStyles.saveInstBtn} onClick={async () => {
                    try {
                      await patchProject(project.id, { instructions: instText });
                      onRefreshProject?.(project.id);
                      setEditingInst(false);
                    } catch (err) { console.error("Failed to save instructions:", err); }
                  }}>Save</button>
                </div>
              </div>
            ) : (
              <div style={pvStyles.instCard}>
                <p style={pvStyles.instText}>{project.instructions || <span style={{ color: "var(--ink-3)" }}>No instructions set. Click edit to add a system prompt for every chat in this project.</span>}</p>
              </div>
            )}
          </section>

          <section style={pvStyles.section}>
            <div style={pvStyles.sectionHead}>
              <h3 style={pvStyles.sectionTitle}>
                Chats <span className="mono" style={pvStyles.countDim}>{(project.chats || []).length}</span>
              </h3>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={pvStyles.searchWrap}>
                  <span style={pvStyles.searchIcon}>{I.Search}</span>
                  <input style={pvStyles.searchInput} placeholder="Filter chats…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <SortMenu value={sort} onChange={setSort} />
              </div>
            </div>

            <div style={pvStyles.chatGrid}>
              <button style={pvStyles.newChatCard} onClick={onNewChat}>
                <span style={pvStyles.newChatIcon}>{I.Plus}</span>
                <div>
                  <div style={pvStyles.newChatTitle}>Start a new chat</div>
                  <div style={pvStyles.newChatSub} className="mono">grounded in {(project.files || []).length} files</div>
                </div>
              </button>

              {filtered.map(c => (
                <div key={c.id} style={pvStyles.chatCard} onClick={() => onOpenChat(c.id)}>
                  <div style={pvStyles.chatCardHead}>
                    {c.pinned ? <span style={{ color: "var(--accent)" }}>{I.Pin}</span> : <span style={pvStyles.chatCardDot} />}
                    <span className="mono" style={pvStyles.chatCardTime}>{timeAgo(c.updated_at || c.created_at)}</span>
                    <span style={{ flex: 1 }} />
                    <CardMenu chat={c} projectId={project.id} onRefresh={onRefreshProject} />
                  </div>
                  <div style={pvStyles.chatCardTitle}>{c.title}</div>
                  <div style={pvStyles.chatCardFoot}>
                    <span className="mono" style={pvStyles.chatCardMeta}>
                      {c.message_count || 0} msgs · {timeAgo(c.updated_at || c.created_at)}
                    </span>
                    <span style={pvStyles.chatCardOpen}>
                      Open{I.ChevRight}
                    </span>
                  </div>
                </div>
              ))}

              {!filtered.length && (
                <div style={pvStyles.emptyState} className="mono">
                  No chats match "{query}"
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {editOpen && (
        <EditProjectModal
          title={editTitle}
          description={editDesc}
          glyph={editGlyph}
          color={editColor}
          onTitleChange={setEditTitle}
          onDescriptionChange={setEditDesc}
          onGlyphChange={setEditGlyph}
          onColorChange={setEditColor}
          onSave={async () => {
            try {
              await patchProject(project.id, { name: editTitle, description: editDesc, glyph: editGlyph, color: editColor });
              onRefreshProject?.(project.id);
              setEditOpen(false);
            } catch (err) { console.error("Failed to update project:", err); }
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </main>
  );
}

function HeroStat({ label, value, sub }) {
  return (
    <div style={pvStyles.heroStat}>
      <div style={pvStyles.heroStatVal} className="mono">
        {value}
        {sub && <span style={pvStyles.heroStatSub}>{" " + sub}</span>}
      </div>
      <div style={pvStyles.heroStatLabel} className="mono">{label}</div>
    </div>
  );
}

function SortMenu({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const labels = { recent: "Most recent", pinned: "Pinned first", alpha: "A → Z" };
  return (
    <div style={{ position: "relative" }}>
      <button style={pvStyles.sortBtn} onClick={() => setOpen(o => !o)}>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>SORT</span>
        <span style={{ fontSize: 12 }}>{labels[value]}</span>
        {I.ChevDown}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={pvStyles.sortMenu}>
            {Object.entries(labels).map(([k, l]) => (
              <button key={k} style={{ ...pvStyles.sortItem, ...(k === value ? pvStyles.sortItemActive : null) }}
                onClick={() => { onChange(k); setOpen(false); }}>
                {k === value ? I.Check : <span style={{ width: 16 }} />}
                <span>{l}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ProjectMenu({ project, onRenameProject, onDeleteProject, onRefreshProject, onEditDetails, onDuplicateProject, onOpenShare }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button style={pvStyles.headerBtn} onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title="Project actions">
        {I.More}
      </button>
      {open && (
        <div ref={menuRef} style={pvStyles.menu} onClick={e => e.stopPropagation()}>
          <button style={pvStyles.menuItem} onClick={() => { onEditDetails?.(); setOpen(false); }}>
            {I.Edit}<span>Edit details</span>
          </button>
          <button style={pvStyles.menuItem} onClick={() => { onDuplicateProject?.(project.id); setOpen(false); }}>
            {I.Copy}<span>Duplicate</span>
          </button>
          {onOpenShare && (
            <button style={pvStyles.menuItem} onClick={() => { onOpenShare?.(); setOpen(false); }}>
              {I.Share}<span>Share</span>
            </button>
          )}
          <button style={pvStyles.menuItem} onClick={() => { onDeleteProject?.(project.id); setOpen(false); }}>
            {I.Trash}<span>Delete project</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CardMenu({ chat, projectId, onRefresh }) {
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
    } catch (err) { console.error("Delete failed:", err); }
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", zIndex: 5 }} onClick={e => e.stopPropagation()}>
      <span style={pvStyles.chatCardMore} onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>{I.More}</span>
      {open && (
        <div ref={menuRef} style={{ ...pvStyles.menu, right: 0, left: "auto", top: "100%" }} onClick={e => e.stopPropagation()}>
          <button style={pvStyles.menuItem} onClick={togglePin}>
            <span style={{ color: chat.pinned ? "var(--accent)" : "var(--ink-3)", display: "grid", placeItems: "center" }}>{I.Pin}</span>
            <span>{chat.pinned ? "Unpin" : "Pin"}</span>
          </button>
          <button style={pvStyles.menuItem} onClick={rename}>{I.Edit}<span>Rename</span></button>
          <button style={pvStyles.menuItem} onClick={remove}>{I.Trash}<span>Delete</span></button>
        </div>
      )}
    </div>
  );
}

const COLOR_PRESETS = [
  { name: "Coral", value: "oklch(0.68 0.18 35)" },
  { name: "Iris", value: "oklch(0.62 0.18 290)" },
  { name: "Forest", value: "oklch(0.58 0.14 155)" },
  { name: "Cobalt", value: "oklch(0.58 0.18 245)" },
  { name: "Amber", value: "oklch(0.74 0.15 70)" },
];

function EditProjectModal({ title, description, glyph, color, onTitleChange, onDescriptionChange, onGlyphChange, onColorChange, onSave, onClose }) {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>Edit details</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>{I.Close}</button>
        </div>
        <div style={modalStyles.body}>
          <label style={modalStyles.label}>Title</label>
          <input ref={inputRef} style={modalStyles.input} value={title}
            onChange={e => onTitleChange(e.target.value)} placeholder="Project title" />
          <label style={{ ...modalStyles.label, marginTop: 14 }}>Description</label>
          <textarea style={modalStyles.textarea} value={description}
            onChange={e => onDescriptionChange(e.target.value)} placeholder="Add a description…" rows={3} />
          <label style={{ ...modalStyles.label, marginTop: 14 }}>Avatar</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", color: "white", fontSize: 14, fontWeight: 600, background: color || "var(--accent)", flexShrink: 0 }} className="mono">
              {glyph?.slice(0, 2).toUpperCase() || "?"}
            </span>
            <input style={{ ...modalStyles.input, width: 60, textAlign: "center" }}
              value={glyph} onChange={e => onGlyphChange(e.target.value.slice(0, 2).toUpperCase())}
              placeholder="UP" maxLength={2} />
          </div>
          <label style={{ ...modalStyles.label, marginTop: 12 }}>Color</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLOR_PRESETS.map(p => (
              <button key={p.value} title={p.name}
                onClick={() => onColorChange(p.value)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: p.value, border: "none", cursor: "pointer", flexShrink: 0,
                  outline: color === p.value ? `3px solid ${p.value}` : "none",
                  outlineOffset: 2,
                  transition: "outline 120ms",
                }} />
            ))}
          </div>
        </div>
        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...modalStyles.saveBtn, ...(!title.trim() ? modalStyles.saveBtnDisabled : {}) }} onClick={onSave}
            disabled={!title.trim()}>Save</button>
        </div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: { position: "fixed", inset: 0, background: "oklch(0 0 0 / 0.35)", display: "grid", placeItems: "center", zIndex: 1000, animation: "fadeIn 120ms ease-out" },
  modal: { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-lg)", width: 420, maxWidth: "90vw", overflow: "hidden", animation: "pop 140ms ease-out" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" },
  title: { fontSize: 15, fontWeight: 600, margin: 0 },
  closeBtn: { width: 28, height: 28, borderRadius: 7, display: "grid", placeItems: "center", color: "var(--ink-3)" },
  body: { padding: "14px 18px" },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "var(--ink-2)", marginBottom: 5 },
  input: { width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--line)", borderRadius: 9, background: "var(--surface)", fontSize: 13, outline: "none", transition: "border-color 120ms" },
  textarea: { width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 9, background: "var(--surface)", fontSize: 13, lineHeight: 1.55, outline: "none", resize: "vertical", transition: "border-color 120ms" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 18px 16px" },
  cancelBtn: { height: 34, padding: "0 14px", borderRadius: 9, fontSize: 12.5, color: "var(--ink-2)" },
  saveBtn: { height: 34, padding: "0 18px", borderRadius: 9, fontSize: 12.5, fontWeight: 500, background: "var(--ink)", color: "var(--bg)" },
  saveBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
};

const pvStyles = {
  column: { flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" },
  header: { display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--line)", background: "var(--bg)", flexShrink: 0, minWidth: 0 },
  dotProj: { width: 8, height: 8, borderRadius: 999 },
  crumbTitle: { fontSize: 15, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
  crumbSep: { fontSize: 10, color: "var(--ink-3)", background: "var(--bg-3)", padding: "2px 6px", borderRadius: 999, letterSpacing: 0.5, flexShrink: 0 },
  headerActions: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  headerBtn: { display: "flex", alignItems: "center", gap: 7, height: 30, minWidth: 30, padding: "0 10px", borderRadius: 8, fontSize: 12, color: "var(--ink-2)", border: "1px solid var(--line)", background: "var(--surface)", whiteSpace: "nowrap", flexShrink: 0, justifyContent: "center" },
  menuBtn: { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--ink-3)", flexShrink: 0, transition: "background 120ms, color 120ms" },
  posDots: { display: "inline-flex", gap: 2, alignItems: "center" },
  posDot: { width: 4, height: 4, borderRadius: 999, background: "var(--ink-2)" },
  inlineKb: { padding: "10px 24px", borderBottom: "1px solid var(--line)", background: "var(--bg-2)", display: "flex", flexDirection: "column", gap: 6 },
  inlineKbStrip: { display: "flex", flexWrap: "wrap", gap: 6 },
  inlineKbChip: { display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-2)" },
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
  inner: { maxWidth: 880, margin: "0 auto", padding: "32px 32px 48px", display: "flex", flexDirection: "column", gap: 28 },
  hero: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: 24, display: "flex", flexDirection: "column", gap: 20, boxShadow: "var(--shadow-sm)", animation: "fadeIn 220ms ease-out" },
  heroGlyph: { width: 56, height: 56, borderRadius: 14, display: "grid", placeItems: "center", color: "white", fontSize: 18, fontWeight: 600, flexShrink: 0 },
  heroEyebrow: { fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.6, marginBottom: 4 },
  heroTitle: { fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: -0.4 },
  heroDesc: { fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "8px 0 0" },
  heroStats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 16, borderTop: "1px solid var(--line)" },
  heroStat: { padding: "8px 12px", background: "var(--bg-2)", borderRadius: 10 },
  heroStatVal: { fontSize: 20, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.3 },
  heroStatSub: { fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginLeft: 1 },
  heroStatLabel: { fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.4, marginTop: 2 },
  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: -0.1 },
  countDim: { fontSize: 12, color: "var(--ink-3)", marginLeft: 4 },
  linkBtn: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-3)", transition: "color 120ms" },
  instCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" },
  instText: { fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 },
  searchWrap: { position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "grid", placeItems: "center", pointerEvents: "none" },
  searchInput: { height: 30, padding: "0 10px 0 28px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, outline: "none", width: 160 },
  sortBtn: { display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-2)" },
  sortMenu: { position: "absolute", right: 0, top: "calc(100% + 4px)", minWidth: 160, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-md)", padding: 4, zIndex: 20, animation: "pop 140ms ease-out" },
  sortItem: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 12.5, color: "var(--ink-2)", borderRadius: 6, textAlign: "left" },
  sortItemActive: { background: "var(--bg-2)", color: "var(--ink)" },
  chatGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 },
  chatCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 8, transition: "transform 120ms, border-color 120ms, box-shadow 120ms", color: "var(--ink)", cursor: "pointer" },
  chatCardHead: { display: "flex", alignItems: "center", gap: 6 },
  chatCardDot: { width: 5, height: 5, borderRadius: 999, background: "var(--line-2)" },
  chatCardTime: { fontSize: 10.5, color: "var(--ink-3)" },
  chatCardMore: { color: "var(--ink-3)", display: "grid", placeItems: "center", opacity: 0.5, cursor: "pointer", padding: 4 },
  chatCardTitle: { fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, letterSpacing: -0.1 },
  chatCardMeta: { fontSize: 10.5, color: "var(--ink-3)" },
  chatCardFoot: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, marginTop: "auto" },
  chatCardOpen: { display: "flex", alignItems: "center", gap: 2, fontSize: 11, color: "var(--accent-ink)", fontWeight: 500 },
  newChatCard: { background: "var(--accent-soft)", border: "1.5px dashed var(--accent)", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12, color: "var(--accent-ink)", textAlign: "left", minHeight: 132 },
  newChatIcon: { width: 36, height: 36, borderRadius: 10, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", flexShrink: 0 },
  newChatTitle: { fontSize: 14, fontWeight: 600 },
  newChatSub: { fontSize: 11, color: "var(--accent-ink)", opacity: 0.75, marginTop: 2 },
  emptyState: { gridColumn: "1 / -1", padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 12 },
  menu: { position: "absolute", top: "100%", right: 0, zIndex: 100, minWidth: 140, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 9, boxShadow: "var(--shadow-lg)", padding: 4, overflow: "hidden" },
  menuItem: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 12.5, color: "var(--ink-2)", textAlign: "left", borderRadius: 6, transition: "background 120ms" },
  instTextarea: { width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", color: "var(--ink)", fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none" },
  cancelBtn: { padding: "6px 14px", borderRadius: 8, fontSize: 12.5, color: "var(--ink-2)" },
  saveInstBtn: { padding: "6px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: "var(--ink)", color: "var(--bg)" },
};
