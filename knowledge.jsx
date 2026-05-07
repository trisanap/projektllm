// Knowledge / project context panel. Shows project meta, instructions, files, and a recent chats list.
const { useState: useStateK, useRef: useRefK } = React;

const KIND_META = {
  pdf:  { icon: "FilePdf",     tint: "oklch(0.94 0.05 30)",   ink: "oklch(0.50 0.18 30)" },
  md:   { icon: "File",        tint: "oklch(0.94 0.04 250)",  ink: "oklch(0.46 0.16 250)" },
  csv:  { icon: "Spreadsheet", tint: "oklch(0.94 0.04 155)",  ink: "oklch(0.42 0.14 155)" },
  txt:  { icon: "File",        tint: "oklch(0.94 0.02 80)",   ink: "oklch(0.45 0.05 80)" },
  png:  { icon: "Image",       tint: "oklch(0.94 0.04 300)",  ink: "oklch(0.48 0.16 300)" },
  default: { icon: "File", tint: "oklch(0.94 0.005 80)", ink: "oklch(0.45 0.01 80)" },
};
function kmeta(k) { return KIND_META[k] || KIND_META.default; }

function KnowledgePanel({ project, files, onUpload, onRemove, onClose, position }) {
  const [dragOver, setDragOver] = useStateK(false);
  const [openFile, setOpenFile] = useStateK(null);
  const [tab, setTab] = useStateK("knowledge");
  const fileInputRef = useRefK(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (dropped.length) onUpload(dropped.map(f => ({
      id: "f" + Math.random().toString(36).slice(2,7),
      name: f.name,
      kind: (f.name.split(".").pop() || "txt").toLowerCase(),
      size: humanSize(f.size),
      added: "just now",
      tokens: Math.round(f.size / 4),
    })));
  };
  const handlePicker = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) onUpload(picked.map(f => ({
      id: "f" + Math.random().toString(36).slice(2,7),
      name: f.name,
      kind: (f.name.split(".").pop() || "txt").toLowerCase(),
      size: humanSize(f.size),
      added: "just now",
      tokens: Math.round(f.size / 4),
    })));
    e.target.value = "";
  };

  const totalTokens = files.reduce((s, f) => s + (f.tokens || 0), 0);
  const tokenPct = Math.min(100, (totalTokens / 128000) * 100);

  return (
    <aside style={{ ...kpStyles.panel, ...(position === "left" ? kpStyles.panelLeft : kpStyles.panelRight) }}>
      <div style={kpStyles.header}>
        <div style={kpStyles.headerTop}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ ...kpStyles.glyph, background: project.color }} className="mono">{project.glyph}</span>
            <div style={{ minWidth: 0 }}>
              <div style={kpStyles.projectName}>{project.name}</div>
              <div style={kpStyles.projectSub} className="mono">
                {project.chats.length} chats · {files.length} files
              </div>
            </div>
          </div>
          <button style={kpStyles.iconBtn} onClick={onClose} title="Hide panel">{I.Close}</button>
        </div>
        <div style={kpStyles.tabs}>
          {[
            { k: "knowledge", label: "Knowledge", count: files.length },
            { k: "instructions", label: "Instructions" },
            { k: "about", label: "About" },
          ].map(t => (
            <button key={t.k}
              style={{ ...kpStyles.tab, ...(tab === t.k ? kpStyles.tabActive : null) }}
              onClick={() => setTab(t.k)}
            >
              {t.label}
              {t.count != null && <span style={kpStyles.tabCount} className="mono">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === "knowledge" && (
        <div style={kpStyles.body}>
          <div
            style={{ ...kpStyles.dropZone, ...(dragOver ? kpStyles.dropZoneActive : null) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span style={kpStyles.dropIcon}>{I.Upload}</span>
            <div style={kpStyles.dropTitle}>Drop files to attach</div>
            <div style={kpStyles.dropSub} className="mono">
              .pdf, .md, .csv, .txt — up to 25 MB each
            </div>
            <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handlePicker} />
          </div>

          <div style={kpStyles.tokenBar}>
            <div style={kpStyles.tokenBarHead}>
              <span className="mono" style={{ color: "var(--ink-2)", fontSize: 11 }}>
                CONTEXT BUDGET
              </span>
              <span className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>
                {totalTokens.toLocaleString()} / 128k
              </span>
            </div>
            <div style={kpStyles.tokenTrack}>
              <div style={{ ...kpStyles.tokenFill, width: tokenPct + "%" }} />
            </div>
          </div>

          <div style={kpStyles.fileList}>
            {files.map(f => {
              const m = kmeta(f.kind);
              return (
                <button key={f.id} style={kpStyles.fileRow} onClick={() => setOpenFile(f)}>
                  <span style={{ ...kpStyles.fileIcon, background: m.tint, color: m.ink }}>
                    {I[m.icon]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={kpStyles.fileName}>{f.name}</div>
                    <div style={kpStyles.fileMeta} className="mono">
                      {f.size} · {f.tokens.toLocaleString()} tok · {f.added}
                    </div>
                  </div>
                  <span style={kpStyles.fileMore} onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}>
                    {I.Trash}
                  </span>
                </button>
              );
            })}
            {!files.length && (
              <div style={kpStyles.empty} className="mono">No files yet.</div>
            )}
          </div>
        </div>
      )}

      {tab === "instructions" && (
        <div style={kpStyles.body}>
          <div style={kpStyles.instLabel} className="mono">SYSTEM PROMPT</div>
          <textarea defaultValue={project.instructions} style={kpStyles.instArea} />
          <div style={kpStyles.instFoot}>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
              Applied to every chat in this project
            </span>
            <button style={kpStyles.saveBtn}>{I.Check}<span>Save</span></button>
          </div>
        </div>
      )}

      {tab === "about" && (
        <div style={kpStyles.body}>
          <div style={kpStyles.aboutBlock}>
            <div style={kpStyles.aboutLabel} className="mono">DESCRIPTION</div>
            <p style={kpStyles.aboutText}>{project.description}</p>
          </div>
          <div style={kpStyles.aboutBlock}>
            <div style={kpStyles.aboutLabel} className="mono">RECENT CHATS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {project.chats.slice(0, 5).map(c => (
                <div key={c.id} style={kpStyles.recentRow}>
                  {c.pinned ? <span style={{ color: "var(--accent)" }}>{I.Pin}</span> : <span style={kpStyles.recentDot} />}
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{c.updated}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={kpStyles.aboutBlock}>
            <div style={kpStyles.aboutLabel} className="mono">STATS</div>
            <div style={kpStyles.statGrid}>
              <Stat label="Files" value={files.length} />
              <Stat label="Tokens" value={`${(totalTokens / 1000).toFixed(1)}k`} />
              <Stat label="Chats" value={project.chats.length} />
              <Stat label="Last activity" value="12m" />
            </div>
          </div>
        </div>
      )}

      {openFile && <FileViewer file={openFile} onClose={() => setOpenFile(null)} />}
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div style={kpStyles.stat}>
      <div style={kpStyles.statValue} className="mono">{value}</div>
      <div style={kpStyles.statLabel} className="mono">{label}</div>
    </div>
  );
}

// File preview modal — shows a fake preview matched to file kind.
function FileViewer({ file, onClose }) {
  const m = kmeta(file.kind);
  return (
    <div style={kpStyles.viewerScrim} onClick={onClose}>
      <div style={kpStyles.viewer} onClick={e => e.stopPropagation()}>
        <div style={kpStyles.viewerHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...kpStyles.fileIcon, background: m.tint, color: m.ink }}>{I[m.icon]}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }} className="mono">
                {file.size} · {file.tokens.toLocaleString()} tokens · added {file.added}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={kpStyles.viewerBtn}>{I.Download}<span>Download</span></button>
            <button style={kpStyles.iconBtn} onClick={onClose}>{I.Close}</button>
          </div>
        </div>
        <div style={kpStyles.viewerBody}>
          {file.kind === "csv" && <CsvPreview />}
          {file.kind === "md"  && <MdPreview name={file.name} />}
          {file.kind === "pdf" && <PdfPreview name={file.name} />}
          {file.kind === "txt" && <TxtPreview />}
          {!["csv","md","pdf","txt"].includes(file.kind) && <TxtPreview />}
        </div>
      </div>
    </div>
  );
}

function CsvPreview() {
  const rows = [
    ["competitor","price/mo","ctx_window","streaming","knowledge"],
    ["Vercel AI SDK","$20","128k","yes","no"],
    ["Supabase Studio","$25","32k","yes","limited"],
    ["LangSmith","$39","100k","yes","yes"],
    ["OpenWebUI","free","varies","yes","yes"],
    ["ProjektLLM","$15","128k","yes","yes"],
  ];
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }} className="mono">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i === 0 ? "var(--bg-2)" : (i % 2 ? "transparent" : "var(--bg-2)") }}>
            {r.map((c, j) => (
              <td key={j} style={{
                padding: "8px 12px",
                borderBottom: "1px solid var(--line)",
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "var(--ink)" : "var(--ink-2)",
              }}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function MdPreview({ name }) {
  return (
    <div style={{ padding: 24, fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
      <h2 style={{ fontSize: 18, marginTop: 0 }}>Launch Brief — Q3 2026</h2>
      <p>Single source of truth for the v4.2 release. Owners noted inline. Decisions go in `# Decisions` only.</p>
      <h3 style={{ fontSize: 14, marginTop: 20 }}>Pillars</h3>
      <ol>
        <li><strong>Ship knowledge.</strong> Per-project file attachments with citations.</li>
        <li><strong>Make it cheap.</strong> Default to DeepSeek v4 Flash; reroute heavy queries.</li>
        <li><strong>Stay local-first.</strong> No telemetry by default, even on cloud SKUs.</li>
      </ol>
      <h3 style={{ fontSize: 14 }}>Out of scope</h3>
      <p>Image gen, agents, mobile native. All deferred to 4.3.</p>
    </div>
  );
}
function PdfPreview({ name }) {
  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {[1,2,3,4].map(p => (
        <div key={p} style={{
          aspectRatio: "8.5 / 11",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: 16,
          fontSize: 9,
          color: "var(--ink-3)",
          display: "flex", flexDirection: "column", gap: 6,
        }} className="mono">
          <div style={{ fontWeight: 600, color: "var(--ink-2)", fontSize: 10 }}>Page {p}</div>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 2,
              width: (60 + Math.sin(i + p) * 30) + "%",
              background: "var(--line)",
              opacity: 0.7 - i * 0.02,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}
function TxtPreview() {
  return (
    <pre style={{
      padding: 24, fontSize: 12, lineHeight: 1.7,
      color: "var(--ink-2)", whiteSpace: "pre-wrap", margin: 0,
    }} className="mono">{`[2025-04-12 · session B-114 · 26m]
> "I made three empty projects before I realized the files attach to one. The folders icon made me think they were like Drive folders."

[2025-04-13 · session B-118 · 31m]
> "Streaming feels slow on the long PDF. Almost like it's printing one word per render."

[2025-04-15 · session B-122 · 19m]
> "I want to drop a CSV mid-thread without restarting. Right now I have to leave."

[2025-04-18 · session B-127 · 42m]
> "The cite-as-you-go stuff is the killer feature. Don't ship without it."`}</pre>
  );
}

function humanSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const kpStyles = {
  panel: {
    width: 320, flexShrink: 0,
    height: "100%",
    background: "var(--bg-2)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  panelLeft:  { borderRight: "1px solid var(--line)" },
  panelRight: { borderLeft: "1px solid var(--line)" },
  header: { padding: "14px 14px 0", borderBottom: "1px solid var(--line)" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 },
  glyph: {
    width: 30, height: 30, borderRadius: 9,
    display: "grid", placeItems: "center",
    fontSize: 11, fontWeight: 600, color: "white",
    flexShrink: 0,
  },
  projectName: { fontSize: 14, fontWeight: 600, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  projectSub: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 7,
    display: "grid", placeItems: "center",
    color: "var(--ink-3)",
    transition: "background 120ms, color 120ms",
  },
  tabs: { display: "flex", gap: 2, marginTop: 4 },
  tab: {
    padding: "8px 12px",
    fontSize: 12.5, color: "var(--ink-3)",
    fontWeight: 500,
    display: "flex", alignItems: "center", gap: 6,
    borderBottom: "2px solid transparent",
    transition: "color 120ms, border-color 120ms",
    marginBottom: -1,
  },
  tabActive: { color: "var(--ink)", borderBottomColor: "var(--accent)" },
  tabCount: {
    fontSize: 10, color: "var(--ink-3)",
    background: "var(--bg-3)", padding: "0 5px", borderRadius: 999,
  },
  body: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  dropZone: {
    border: "1.5px dashed var(--line-2)",
    borderRadius: 12,
    padding: "20px 14px",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 160ms, background 160ms, transform 160ms",
  },
  dropZoneActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-soft)",
    transform: "scale(1.01)",
  },
  dropIcon: { display: "inline-grid", placeItems: "center", color: "var(--accent)", marginBottom: 6 },
  dropTitle: { fontSize: 13, fontWeight: 500 },
  dropSub: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 4, letterSpacing: 0.2 },

  tokenBar: {},
  tokenBarHead: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  tokenTrack: { height: 6, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" },
  tokenFill: {
    height: "100%",
    background: "linear-gradient(90deg, var(--accent), oklch(0.66 0.17 18))",
    borderRadius: 999,
    transition: "width 240ms",
  },

  fileList: { display: "flex", flexDirection: "column", gap: 4 },
  fileRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 8px",
    borderRadius: 9,
    textAlign: "left",
    transition: "background 120ms",
    color: "var(--ink)",
  },
  fileIcon: {
    width: 30, height: 30, borderRadius: 8,
    display: "grid", placeItems: "center",
    flexShrink: 0,
  },
  fileName: {
    fontSize: 12.5, fontWeight: 500,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  fileMeta: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 },
  fileMore: {
    width: 24, height: 24, borderRadius: 6,
    display: "grid", placeItems: "center",
    color: "var(--ink-3)",
    opacity: 0.6,
    transition: "opacity 120ms, background 120ms",
  },
  empty: { padding: 16, textAlign: "center", fontSize: 11, color: "var(--ink-3)" },

  instLabel: { fontSize: 10.5, color: "var(--ink-2)", letterSpacing: 0.6 },
  instArea: {
    width: "100%", minHeight: 220,
    padding: 12,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    fontSize: 12.5, lineHeight: 1.6,
    resize: "vertical", outline: "none",
    fontFamily: "inherit",
  },
  instFoot: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  saveBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 10px", borderRadius: 8,
    background: "var(--ink)", color: "var(--bg)",
    fontSize: 12, fontWeight: 500,
  },

  aboutBlock: { display: "flex", flexDirection: "column", gap: 6 },
  aboutLabel: { fontSize: 10.5, color: "var(--ink-2)", letterSpacing: 0.6 },
  aboutText: { fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 },
  recentRow: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 4px",
    fontSize: 12.5, color: "var(--ink-2)",
  },
  recentDot: { width: 4, height: 4, borderRadius: 999, background: "var(--line-2)", marginLeft: 5, marginRight: 1, flexShrink: 0 },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
  stat: {
    background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: 10, padding: "10px 12px",
  },
  statValue: { fontSize: 18, fontWeight: 600, color: "var(--ink)" },
  statLabel: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 2, letterSpacing: 0.4 },

  viewerScrim: {
    position: "fixed", inset: 0,
    background: "oklch(0.18 0.01 260 / 0.5)",
    backdropFilter: "blur(6px)",
    display: "grid", placeItems: "center",
    zIndex: 100,
    animation: "fadeIn 160ms ease-out",
  },
  viewer: {
    width: "min(800px, 92vw)",
    maxHeight: "84vh",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 16,
    boxShadow: "var(--shadow-lg)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    animation: "pop 200ms cubic-bezier(0.2, 0.8, 0.2, 1.05)",
  },
  viewerHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid var(--line)",
  },
  viewerBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 10px", borderRadius: 8,
    fontSize: 12, color: "var(--ink-2)",
    border: "1px solid var(--line)",
  },
  viewerBody: { flex: 1, overflow: "auto", background: "var(--bg-2)" },
};

window.KnowledgePanel = KnowledgePanel;
