// Welcome page — shown when no project is active.
import React from 'react';
import { I } from './icons.jsx';

export default function WelcomePage({ projects, onNewProject, onSelectProject, narrowSidebar, sidebarOpen, onToggleSidebar }) {
  return (
    <main style={wpStyles.page}>
      {narrowSidebar && (
        <button style={wpStyles.menuBtn} onClick={onToggleSidebar} title={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      )}
      <div style={wpStyles.center}>
        <div style={wpStyles.logoWrap}>
          <I.Logo size={48} />
        </div>
        <h1 style={wpStyles.title}>What will you build today?</h1>
        <p style={wpStyles.sub}>
          ProjektLLM is your AI workspace for project managers.<br />
          Organize knowledge, chat with your documents, and ship faster.
        </p>

        <button style={wpStyles.primaryBtn} onClick={onNewProject}>
          {I.Plus}<span>Create a new project</span>
        </button>

        {projects.length > 0 && (
          <>
            <div style={wpStyles.divider}>
              <span style={wpStyles.dividerLine} />
              <span className="mono" style={wpStyles.dividerText}>or pick up where you left off</span>
              <span style={wpStyles.dividerLine} />
            </div>
            <div style={wpStyles.projectList}>
              {projects.map(p => (
                <button key={p.id} style={wpStyles.projectCard} onClick={() => onSelectProject(p.id)}>
                  <span style={{ ...wpStyles.cardGlyph, background: p.color }} className="mono">{p.glyph}</span>
                  <div style={wpStyles.cardText}>
                    <div style={wpStyles.cardName}>{p.name}</div>
                    <div className="mono" style={wpStyles.cardMeta}>{p.chats.length} chats</div>
                  </div>
                  {I.ChevRight}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const wpStyles = {
  menuBtn: {
    position: "fixed", top: 12, left: 12, zIndex: 50,
    width: 36, height: 36, borderRadius: 9,
    display: "grid", placeItems: "center",
    color: "var(--ink-2)", background: "var(--surface)",
    border: "1px solid var(--line)", transition: "background 120ms",
  },
  page: {
    flex: 1, height: "100%", overflow: "auto",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)",
  },
  center: {
    display: "flex", flexDirection: "column", alignItems: "center",
    maxWidth: 420, padding: "40px 24px", textAlign: "center",
  },
  logoWrap: {
    marginBottom: 20,
    width: 64, height: 64, borderRadius: 18,
    background: "var(--surface)", border: "1px solid var(--line)",
    display: "grid", placeItems: "center",
  },
  title: {
    fontSize: 28, fontWeight: 650, letterSpacing: -0.5,
    color: "var(--ink)", margin: "0 0 12px",
  },
  sub: {
    fontSize: 14, lineHeight: 1.65,
    color: "var(--ink-3)", margin: "0 0 28px",
  },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 28px", borderRadius: 12,
    background: "var(--ink)", color: "var(--bg)",
    fontSize: 14, fontWeight: 500, cursor: "pointer",
    transition: "transform 80ms, box-shadow 120ms",
  },
  divider: {
    display: "flex", alignItems: "center", gap: 12,
    margin: "32px 0 16px", width: "100%",
  },
  dividerLine: { flex: 1, height: 1, background: "var(--line)" },
  dividerText: { fontSize: 10.5, color: "var(--ink-3)", whiteSpace: "nowrap" },
  projectList: {
    display: "flex", flexDirection: "column", gap: 6,
    width: "100%", marginTop: 4,
  },
  projectCard: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 14px", borderRadius: 12,
    background: "var(--surface)", border: "1px solid var(--line)",
    color: "var(--ink)", textAlign: "left", width: "100%",
    transition: "border-color 120ms, background 120ms",
  },
  cardGlyph: {
    width: 32, height: 32, borderRadius: 10,
    display: "grid", placeItems: "center",
    fontSize: 12, fontWeight: 600, color: "white", flexShrink: 0,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: 500, marginBottom: 2 },
  cardMeta: { fontSize: 11, color: "var(--ink-3)" },
};
