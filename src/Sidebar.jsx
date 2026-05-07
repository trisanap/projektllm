// Left sidebar: workspace, projects (expandable to show chats), settings.
import React, { useState, useEffect } from 'react';
import { I } from './icons.jsx';

export default function Sidebar({ projects, activeProjectId, activeChatId, onSelectProject, onSelectChat, onNewChat, onNewProject, theme, onToggleTheme, onOpenSettings, settings, onRefreshProjects, onRefreshProject, onGoHome, user, onOpenShare, onClose, onCollapse }) {
  const [expanded, setExpanded] = useState({});
  const [query, setQuery] = useState("");

  // Expand active project
  useEffect(() => {
    if (activeProjectId) setExpanded(p => ({ ...p, [activeProjectId]: true }));
  }, [activeProjectId]);

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  };

  const filtered = !query.trim() ? projects : projects
    .map(p => ({
      ...p,
      _matchProject: p.name.toLowerCase().includes(query.toLowerCase()),
      _matchChats: p.chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase())),
    }))
    .filter(p => p._matchProject || p._matchChats.length);

  return (
    <aside style={sbStyles.sidebar}>
      <div style={sbStyles.brand} onClick={onGoHome} role="button" title="Home">
        <div style={sbStyles.brandLeft}>
          <I.Logo size={22} />
          <div>
            <div style={sbStyles.brandName}>ProjektLLM</div>
            <div style={sbStyles.brandSub} className="mono">v0.4 · {user?.display_name || user?.username || "personal"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button style={sbStyles.iconBtn} title="Toggle theme" onClick={onToggleTheme}>
            {theme === "dark" ? I.Sun : I.Moon}
          </button>
          {onCollapse && (
            <button style={sbStyles.iconBtn} title="Collapse sidebar" onClick={onCollapse}>
              {I.Menu}
            </button>
          )}
          {onClose && (
            <button style={sbStyles.iconBtn} title="Close sidebar" onClick={onClose}>
              {I.Close}
            </button>
          )}
        </div>
      </div>

      <div style={sbStyles.searchWrap}>
        <span style={sbStyles.searchIcon}>{I.Search}</span>
        <input style={sbStyles.search} placeholder="Search projects & chats…" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" name="search-query" />
        <kbd style={sbStyles.kbd} className="mono">⌘K</kbd>
      </div>

      <div style={sbStyles.actions}>
        <button style={sbStyles.actionPrimary} onClick={onNewProject} title="New project">
          {I.Plus}<span>New project</span>
        </button>
      </div>

      <div style={sbStyles.scrollArea}>
        <div style={sbStyles.sectionLabel}>
          <span className="mono">PROJECTS</span>
          <span style={sbStyles.count} className="mono">{projects.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.map(p => {
            const isActive = p.id === activeProjectId;
            const isOpen = expanded[p.id] || (query && p._matchChats?.length);
            const rawChats = query ? (p._matchChats || []) : (p.chats || []);
            const chatsToShow = [...rawChats].sort((a, b) => {
              const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
              if (pinDiff !== 0) return pinDiff;
              return (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "");
            });
            return (
              <div key={p.id}>
                <div style={sbStyles.projectRowWrap}>
                  <button style={{ ...sbStyles.projectRow, ...(isActive ? sbStyles.projectRowActive : null) }} onClick={() => onSelectProject(p.id)}>
                    <span style={{ ...sbStyles.chev, transform: isOpen ? "rotate(90deg)" : "none" }} onClick={(e) => toggleExpand(p.id, e)} role="button">{I.ChevRight}</span>
                    <span style={{ ...sbStyles.projectGlyph, background: p.color }} className="mono">{p.glyph}</span>
                    <span style={sbStyles.projectName}>{p.name}</span>
                  </button>
                </div>
                {isOpen && (
                  <div style={sbStyles.chatList}>
                    {chatsToShow.map(c => {
                      const active = isActive && c.id === activeChatId;
                      return (
                        <div key={c.id} style={sbStyles.chatRowWrap}>
                          <button style={{ ...sbStyles.chatRow, ...(active ? sbStyles.chatRowActive : null) }} onClick={() => onSelectChat(p.id, c.id)}>
                            {c.pinned ? <span style={sbStyles.pinDot}>{I.Pin}</span> : <span style={sbStyles.chatDot} />}
                            <span style={sbStyles.chatTitle}>{c.title}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={sbStyles.footer}>
        <div style={sbStyles.modelChip} onClick={onOpenSettings}>
          <span style={sbStyles.modelDot} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={sbStyles.modelName}>{settings ? ({
  ollama: settings.ollama_model,
  openai: settings.openai_model,
  deepseek: settings.deepseek_model,
}[settings.provider] || settings.ollama_model || "Multi-provider") : "ProjektLLM"}</div>
            <div style={sbStyles.modelSub} className="mono">{settings ? settings.provider : "multi-provider"}</div>
          </div>
          {I.ChevDown}
        </div>
        <div style={sbStyles.footerRow}>
          <button style={sbStyles.footerBtn} onClick={onOpenSettings}>{I.Settings}<span>Settings</span></button>
          <div style={sbStyles.userChip} title={user?.display_name || user?.username || "User"}>
            <div style={sbStyles.avatar} className="mono">
              {user?.display_name?.slice(0,2).toUpperCase() || user?.username?.slice(0,2).toUpperCase() || "?"}
            </div>
            <span style={sbStyles.userName}>{user?.display_name || user?.username || "User"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

const sbStyles = {
  sidebar: { width: 280, flexShrink: 0, height: "100%", background: "var(--bg-2)", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" },
  brand: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px 10px", gap: 10, cursor: "pointer" },
  brandLeft: { display: "flex", alignItems: "center", gap: 10 },
  brandName: { fontSize: 14, fontWeight: 600, letterSpacing: -0.1 },
  brandSub: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 1, letterSpacing: 0.2 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--ink-2)", transition: "background 120ms" },
  searchWrap: { margin: "0 12px 10px", position: "relative" },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "grid", placeItems: "center", pointerEvents: "none" },
  search: { width: "100%", height: 34, padding: "0 38px 0 32px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, outline: "none", transition: "border-color 120ms, box-shadow 120ms" },
  kbd: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--ink-3)", border: "1px solid var(--line)", borderRadius: 5, padding: "1px 5px", background: "var(--bg-2)" },
  actions: { display: "flex", gap: 6, padding: "0 12px 12px" },
  actionPrimary: { flex: 1, height: 34, borderRadius: 10, background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 500, transition: "transform 80ms" },
  actionGhost: { width: 34, height: 34, borderRadius: 10, border: "1px dashed var(--line-2)", color: "var(--ink-2)", display: "grid", placeItems: "center" },
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 12px" },
  sectionLabel: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px 8px", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.6, fontWeight: 500 },
  count: { color: "var(--ink-3)", fontSize: 10.5 },
  projectRowWrap: { position: "relative", display: "flex", alignItems: "center" },
  projectRow: { flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 9, textAlign: "left", color: "var(--ink)", transition: "background 120ms", minWidth: 0 },
  projectRowActive: { background: "var(--surface)", boxShadow: "var(--shadow-sm)" },
  projectActions: { position: "relative", flexShrink: 0, paddingRight: 4 },
  moreBtn: { width: 26, height: 26, borderRadius: 6, display: "grid", placeItems: "center", color: "var(--ink-3)", opacity: 0.6 },
  chev: { width: 16, height: 16, display: "grid", placeItems: "center", color: "var(--ink-3)", transition: "transform 160ms", flexShrink: 0 },
  projectGlyph: { width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, color: "white", flexShrink: 0 },
  projectName: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chatList: { paddingLeft: 18, paddingTop: 2, paddingBottom: 4, display: "flex", flexDirection: "column", gap: 1 },
  chatRowWrap: { position: "relative", display: "flex", alignItems: "center", borderRadius: 7 },
  chatRow: { flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "5px 8px 5px 6px", borderRadius: 7, fontSize: 12.5, color: "var(--ink-2)", textAlign: "left", transition: "background 120ms, color 120ms", minWidth: 0 },
  chatRowActive: { background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 500 },
  chatActions: { position: "relative", flexShrink: 0, paddingRight: 2 },
  moreBtnSm: { width: 22, height: 22, borderRadius: 5, display: "grid", placeItems: "center", color: "var(--ink-3)", opacity: 0.5 },
  chatDot: { width: 4, height: 4, borderRadius: 999, background: "var(--line-2)", flexShrink: 0, marginLeft: 6, marginRight: 2 },
  pinDot: { color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 },
  chatTitle: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chatRowAdd: { width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 6px", borderRadius: 7, fontSize: 12, color: "var(--ink-3)", textAlign: "left", fontStyle: "italic" },
  menu: { position: "absolute", top: "100%", right: 0, zIndex: 100, minWidth: 140, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 9, boxShadow: "var(--shadow-lg)", padding: 4, overflow: "hidden" },
  menuItem: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 12.5, color: "var(--ink-2)", textAlign: "left", borderRadius: 6, transition: "background 120ms" },
  footer: { borderTop: "1px solid var(--line)", padding: 10, display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-2)" },
  modelChip: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink-2)", cursor: "pointer" },
  modelDot: { width: 8, height: 8, borderRadius: 999, background: "var(--good)", boxShadow: "0 0 0 3px var(--good-soft)" },
  modelName: { fontSize: 12.5, color: "var(--ink)", fontWeight: 500 },
  modelSub: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 },
  footerRow: { display: "flex", alignItems: "center", gap: 6 },
  footerBtn: { flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, color: "var(--ink-2)", fontSize: 12.5 },
  userChip: { display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end", minWidth: 0 },
  avatar: { width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), oklch(0.66 0.17 18))", color: "white", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 },
  userName: { fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
};
