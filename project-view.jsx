// Project overview page: header + chat list. Knowledge panel sits beside it (handled by App).
const { useState: useStateP } = React;

function ProjectView({ project, onOpenChat, onNewChat, onEnterInstructions, knowledgeOpen, onToggleKnowledge, knowledgePosition, onCyclePosition, narrow }) {
  const [query, setQuery] = useStateP("");
  const [sort, setSort] = useStateP("recent");

  const positionLabel = { left: "Knowledge: left", right: "Knowledge: right", inline: "Knowledge: inline" }[knowledgePosition];

  const filtered = project.chats
    .filter(c => !query.trim() || c.title.toLowerCase().includes(query.toLowerCase()))
    .slice()
    .sort((a, b) => {
      if (sort === "pinned") return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (sort === "alpha") return a.title.localeCompare(b.title);
      return 0; // recent (already in order)
    });

  const totalTokens = project.files.reduce((s, f) => s + (f.tokens || 0), 0);

  return (
    <main style={pvStyles.column} data-screen-label="ProjectView">
      {/* Top bar (matches chat view chrome) */}
      <header style={pvStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, overflow: "hidden" }}>
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
        </div>
      </header>

      {/* Inline knowledge strip when needed */}
      {knowledgePosition === "inline" && knowledgeOpen && (
        <div style={pvStyles.inlineKb}>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.5 }}>KNOWLEDGE</span>
          <div style={pvStyles.inlineKbStrip}>
            {project.files.slice(0, 6).map(f => (
              <div key={f.id} style={pvStyles.inlineKbChip}>
                {I.File}
                <span style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scroll area */}
      <div style={pvStyles.scrollArea}>
        <div style={pvStyles.inner}>
          {/* Hero */}
          <section style={pvStyles.hero}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <span style={{ ...pvStyles.heroGlyph, background: project.color }} className="mono">{project.glyph}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={pvStyles.heroEyebrow}>PROJECT</div>
                <h2 style={pvStyles.heroTitle}>{project.name}</h2>
                <p style={pvStyles.heroDesc}>{project.description}</p>
              </div>
            </div>
            <div style={pvStyles.heroStats}>
              <HeroStat label="Chats" value={project.chats.length} />
              <HeroStat label="Files" value={project.files.length} />
              <HeroStat label="Context" value={`${(totalTokens / 1000).toFixed(1)}k`} sub="of 128k" />
              <HeroStat label="Last activity" value="12m" sub="ago" />
            </div>
            <div style={pvStyles.heroActions}>
              <button style={pvStyles.primaryBtn} onClick={onNewChat}>
                {I.ChatPlus}<span>New chat</span>
              </button>
              <button style={pvStyles.ghostBtn} onClick={onEnterInstructions}>
                {I.Edit}<span>Edit instructions</span>
              </button>
            </div>
          </section>

          {/* Instructions preview */}
          <section style={pvStyles.section}>
            <div style={pvStyles.sectionHead}>
              <h3 style={pvStyles.sectionTitle}>Instructions</h3>
              <button style={pvStyles.linkBtn} onClick={onEnterInstructions}>
                Edit{I.ChevRight}
              </button>
            </div>
            <div style={pvStyles.instCard}>
              <p style={pvStyles.instText}>{project.instructions || <span style={{ color: "var(--ink-3)" }}>No instructions set. Click edit to add a system prompt for every chat in this project.</span>}</p>
            </div>
          </section>

          {/* Chats list */}
          <section style={pvStyles.section}>
            <div style={pvStyles.sectionHead}>
              <h3 style={pvStyles.sectionTitle}>
                Chats <span className="mono" style={pvStyles.countDim}>{project.chats.length}</span>
              </h3>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={pvStyles.searchWrap}>
                  <span style={pvStyles.searchIcon}>{I.Search}</span>
                  <input
                    style={pvStyles.searchInput}
                    placeholder="Filter chats…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <SortMenu value={sort} onChange={setSort} />
              </div>
            </div>

            <div style={pvStyles.chatGrid}>
              <button style={pvStyles.newChatCard} onClick={onNewChat}>
                <span style={pvStyles.newChatIcon}>{I.Plus}</span>
                <div>
                  <div style={pvStyles.newChatTitle}>Start a new chat</div>
                  <div style={pvStyles.newChatSub} className="mono">grounded in {project.files.length} files</div>
                </div>
              </button>

              {filtered.map(c => (
                <button key={c.id} style={pvStyles.chatCard} onClick={() => onOpenChat(c.id)}>
                  <div style={pvStyles.chatCardHead}>
                    {c.pinned ? <span style={{ color: "var(--accent)" }}>{I.Pin}</span> : <span style={pvStyles.chatCardDot} />}
                    <span className="mono" style={pvStyles.chatCardTime}>{c.updated}</span>
                    <span style={{ flex: 1 }} />
                    <span style={pvStyles.chatCardMore}>{I.More}</span>
                  </div>
                  <div style={pvStyles.chatCardTitle}>{c.title}</div>
                  <div style={pvStyles.chatCardPreview} className="mono">
                    {fakePreview(c.title)}
                  </div>
                  <div style={pvStyles.chatCardFoot}>
                    <span className="mono" style={pvStyles.chatCardModel}>
                      <span style={pvStyles.modelDotSm} />
                      DeepSeek v4 Flash
                    </span>
                    <span style={pvStyles.chatCardOpen}>
                      Open{I.ChevRight}
                    </span>
                  </div>
                </button>
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
  const [open, setOpen] = useStateP(false);
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

function fakePreview(title) {
  // tiny deterministic snippet so cards aren't identical
  const snippets = [
    "Pulled signal from 63 beta sessions. Three surfaces dominate…",
    "Drafted a 180-word memo to engineering. Three priorities ranked…",
    "Side-by-side: pricing tier, context window, streaming, knowledge…",
    "5-touch sequence with subject lines and CTA copy variants…",
    "Top 7 risks with owner + likelihood + mitigation, ASCII table…",
    "Hybrid retrieval is cheaper if recall budget < 0.85 — see math…",
    "Sweep: 256 / 512 / 1024 chunks. 512 wins on recall@10…",
  ];
  let h = 0; for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return snippets[h % snippets.length];
}

const pvStyles = {
  column: { flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" },

  header: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 20px",
    borderBottom: "1px solid var(--line)",
    background: "var(--bg)",
    flexShrink: 0,
    minWidth: 0,
  },
  dotProj: { width: 8, height: 8, borderRadius: 999 },
  crumbTitle: {
    fontSize: 15, fontWeight: 600, margin: 0,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    minWidth: 0,
  },
  crumbSep: {
    fontSize: 10, color: "var(--ink-3)",
    background: "var(--bg-3)",
    padding: "2px 6px", borderRadius: 999,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  headerActions: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  headerBtn: {
    display: "flex", alignItems: "center", gap: 7,
    height: 30, minWidth: 30, padding: "0 10px",
    borderRadius: 8,
    fontSize: 12, color: "var(--ink-2)",
    border: "1px solid var(--line)",
    background: "var(--surface)",
    whiteSpace: "nowrap", flexShrink: 0,
    justifyContent: "center",
  },
  posDots: { display: "inline-flex", gap: 2, alignItems: "center" },
  posDot: { width: 4, height: 4, borderRadius: 999, background: "var(--ink-2)" },

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
    borderRadius: 8, color: "var(--ink-2)",
  },

  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
  inner: {
    maxWidth: 880, margin: "0 auto",
    padding: "32px 32px 48px",
    display: "flex", flexDirection: "column", gap: 28,
  },

  hero: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 18,
    padding: 24,
    display: "flex", flexDirection: "column", gap: 20,
    boxShadow: "var(--shadow-sm)",
    animation: "fadeIn 220ms ease-out",
  },
  heroGlyph: {
    width: 56, height: 56, borderRadius: 14,
    display: "grid", placeItems: "center",
    color: "white", fontSize: 18, fontWeight: 600,
    flexShrink: 0,
  },
  heroEyebrow: { fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.6, marginBottom: 4 },
  heroTitle: { fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: -0.4 },
  heroDesc: { fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "8px 0 0" },

  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    paddingTop: 4,
    borderTop: "1px solid var(--line)",
    paddingTop: 16,
  },
  heroStat: {
    padding: "8px 12px",
    background: "var(--bg-2)",
    borderRadius: 10,
  },
  heroStatVal: { fontSize: 20, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.3 },
  heroStatSub: { fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginLeft: 1 },
  heroStatLabel: { fontSize: 10.5, color: "var(--ink-3)", letterSpacing: 0.4, marginTop: 2 },

  heroActions: { display: "flex", gap: 8 },
  primaryBtn: {
    display: "flex", alignItems: "center", gap: 8,
    height: 40, padding: "0 16px", borderRadius: 12,
    background: "var(--ink)", color: "var(--bg)",
    fontSize: 13, fontWeight: 500,
    transition: "transform 80ms",
  },
  ghostBtn: {
    display: "flex", alignItems: "center", gap: 8,
    height: 40, padding: "0 14px", borderRadius: 12,
    border: "1px solid var(--line)",
    background: "transparent", color: "var(--ink-2)",
    fontSize: 13, fontWeight: 500,
  },

  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: -0.1 },
  countDim: { fontSize: 12, color: "var(--ink-3)", marginLeft: 4 },
  linkBtn: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "var(--ink-3)",
    transition: "color 120ms",
  },

  instCard: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: "14px 16px",
  },
  instText: { fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 },

  searchWrap: { position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "grid", placeItems: "center", pointerEvents: "none" },
  searchInput: {
    height: 30, padding: "0 10px 0 28px",
    background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: 8, fontSize: 12, outline: "none",
    width: 160,
  },

  sortBtn: {
    display: "flex", alignItems: "center", gap: 6,
    height: 30, padding: "0 10px",
    background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: 8, color: "var(--ink-2)",
  },
  sortMenu: {
    position: "absolute", right: 0, top: "calc(100% + 4px)",
    minWidth: 160,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    boxShadow: "var(--shadow-md)",
    padding: 4,
    zIndex: 20,
    animation: "pop 140ms ease-out",
  },
  sortItem: {
    width: "100%",
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 8px",
    fontSize: 12.5, color: "var(--ink-2)",
    borderRadius: 6, textAlign: "left",
  },
  sortItemActive: { background: "var(--bg-2)", color: "var(--ink)" },

  chatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 10,
  },
  chatCard: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: 14,
    textAlign: "left",
    display: "flex", flexDirection: "column", gap: 8,
    transition: "transform 120ms, border-color 120ms, box-shadow 120ms",
    color: "var(--ink)",
    cursor: "pointer",
  },
  chatCardHead: { display: "flex", alignItems: "center", gap: 6 },
  chatCardDot: { width: 5, height: 5, borderRadius: 999, background: "var(--line-2)" },
  chatCardTime: { fontSize: 10.5, color: "var(--ink-3)" },
  chatCardMore: { color: "var(--ink-3)", display: "grid", placeItems: "center", opacity: 0.5 },
  chatCardTitle: { fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, letterSpacing: -0.1 },
  chatCardPreview: {
    fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  chatCardFoot: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    paddingTop: 4, marginTop: "auto",
  },
  chatCardModel: { display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--ink-3)" },
  modelDotSm: { width: 5, height: 5, borderRadius: 999, background: "var(--good)" },
  chatCardOpen: {
    display: "flex", alignItems: "center", gap: 2,
    fontSize: 11, color: "var(--accent-ink)", fontWeight: 500,
  },

  newChatCard: {
    background: "var(--accent-soft)",
    border: "1.5px dashed var(--accent)",
    borderRadius: 14,
    padding: 14,
    display: "flex", alignItems: "center", gap: 12,
    color: "var(--accent-ink)",
    textAlign: "left",
    minHeight: 132,
  },
  newChatIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: "var(--accent)", color: "white",
    display: "grid", placeItems: "center",
    flexShrink: 0,
  },
  newChatTitle: { fontSize: 14, fontWeight: 600 },
  newChatSub: { fontSize: 11, color: "var(--accent-ink)", opacity: 0.75, marginTop: 2 },

  emptyState: {
    gridColumn: "1 / -1",
    padding: 32, textAlign: "center",
    color: "var(--ink-3)", fontSize: 12,
  },
};

window.ProjectView = ProjectView;
