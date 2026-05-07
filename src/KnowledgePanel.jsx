// Knowledge / project context panel.
import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { I } from './icons.jsx';
import { uploadFile, deleteFile, getFilePreviewUrl, fetchViewData, fetchFileText, fetchWithAuth } from './api.js';

const KIND_META = {
  pdf:  { icon: "FilePdf",     tint: "oklch(0.94 0.05 30)",   ink: "oklch(0.50 0.18 30)" },
  md:   { icon: "File",        tint: "oklch(0.94 0.04 250)",  ink: "oklch(0.46 0.16 250)" },
  csv:  { icon: "Spreadsheet", tint: "oklch(0.94 0.04 155)",  ink: "oklch(0.42 0.14 155)" },
  txt:  { icon: "File",        tint: "oklch(0.94 0.02 80)",   ink: "oklch(0.45 0.05 80)" },
  docx: { icon: "File",        tint: "oklch(0.94 0.05 220)",  ink: "oklch(0.44 0.18 220)" },
  xlsx: { icon: "Spreadsheet", tint: "oklch(0.94 0.05 130)",  ink: "oklch(0.40 0.16 130)" },
  png:  { icon: "Image",       tint: "oklch(0.94 0.04 300)",  ink: "oklch(0.48 0.16 300)" },
  default: { icon: "File", tint: "oklch(0.94 0.005 80)", ink: "oklch(0.45 0.01 80)" },
};
function kmeta(k) { return KIND_META[k] || KIND_META.default; }

export default function KnowledgePanel({ project, files, onUpload, onRemove, onClose, position }) {
  const [dragOver, setDragOver] = useState(false);
  const [openFile, setOpenFile] = useState(null);
  const [tab, setTab] = useState("knowledge");
  const fileInputRef = useRef(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    for (const f of dropped) {
      try {
        const result = await uploadFile(project.id, f);
        onUpload(result);
      } catch (err) { console.error('Upload failed', err); }
    }
  };

  const handlePicker = async (e) => {
    const picked = Array.from(e.target.files || []);
    for (const f of picked) {
      try {
        const result = await uploadFile(project.id, f);
        onUpload(result);
      } catch (err) { console.error('Upload failed', err); }
    }
    e.target.value = "";
  };

  const handleRemove = async (fid) => {
    try {
      await deleteFile(fid);
      onRemove(fid);
    } catch (err) { console.error('Delete failed', err); }
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
              <div style={kpStyles.projectSub} className="mono">{project.chats?.length || 0} chats · {files.length} files</div>
            </div>
          </div>
          <button style={kpStyles.iconBtn} onClick={onClose} title="Hide panel">{I.Close}</button>
        </div>
        <div style={kpStyles.tabs}>
          {[{ k: "knowledge", label: "Knowledge", count: files.length }, { k: "instructions", label: "Instructions" }, { k: "about", label: "About" }].map(t => (
            <button key={t.k} style={{ ...kpStyles.tab, ...(tab === t.k ? kpStyles.tabActive : null) }} onClick={() => setTab(t.k)}>
              {t.label}
              {t.count != null && <span style={kpStyles.tabCount} className="mono">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === "knowledge" && (
        <div style={kpStyles.body}>
          <div style={{ ...kpStyles.dropZone, ...(dragOver ? kpStyles.dropZoneActive : null) }}
               onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
               onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
            <span style={kpStyles.dropIcon}>{I.Upload}</span>
            <div style={kpStyles.dropTitle}>Drop files to attach</div>
            <div style={kpStyles.dropSub} className="mono">.pdf, .md, .csv, .txt — up to 25 MB each</div>
            <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handlePicker} />
          </div>

          <div style={kpStyles.tokenBar}>
            <div style={kpStyles.tokenBarHead}>
              <span className="mono" style={{ color: "var(--ink-2)", fontSize: 11 }}>CONTEXT BUDGET</span>
              <span className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{totalTokens.toLocaleString()} / 128k</span>
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
                  <span style={{ ...kpStyles.fileIcon, background: m.tint, color: m.ink }}>{I[m.icon]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={kpStyles.fileName}>{f.name}</div>
                    <div style={kpStyles.fileMeta} className="mono">{f.size} · {f.tokens?.toLocaleString()} tok · {f.added_at || f.added}</div>
                  </div>
                  <span style={kpStyles.fileMore} onClick={(e) => { e.stopPropagation(); handleRemove(f.id); }}>{I.Trash}</span>
                </button>
              );
            })}
            {!files.length && <div style={kpStyles.empty} className="mono">No files yet.</div>}
          </div>
        </div>
      )}

      {tab === "instructions" && (
        <div style={kpStyles.body}>
          <div style={kpStyles.instLabel} className="mono">SYSTEM PROMPT</div>
          <textarea defaultValue={project.instructions} style={kpStyles.instArea} />
          <div style={kpStyles.instFoot}>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>Applied to every chat in this project</span>
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
              {(project.chats || []).slice(0, 5).map(c => (
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
              <Stat label="Chats" value={project.chats?.length || 0} />
              <Stat label="Last activity" value="—" />
            </div>
          </div>
        </div>
      )}

      {openFile && <FileViewer file={openFile} projectId={project.id} onClose={() => setOpenFile(null)} />}
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

function FileViewer({ file, projectId, onClose }) {
  const m = kmeta(file.kind);

  const download = async () => {
    try {
      const url = getFilePreviewUrl(file.id);
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("File download failed:", err);
    }
  };

  return (
    <div style={kpStyles.viewerScrim} onClick={onClose}>
      <div style={kpStyles.viewer} onClick={e => e.stopPropagation()}>
        <div style={kpStyles.viewerHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...kpStyles.fileIcon, background: m.tint, color: m.ink }}>{I[m.icon]}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }} className="mono">{file.size} · {file.tokens?.toLocaleString()} tokens · added {file.added_at || file.added}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={kpStyles.viewerBtn} onClick={download}>{I.Download}<span>Download</span></button>
            <button style={kpStyles.iconBtn} onClick={onClose}>{I.Close}</button>
          </div>
        </div>
        <div style={kpStyles.viewerBody}>
          {file.kind === "csv"  && <CsvPreview fileId={file.id} />}
          {file.kind === "md"   && <MdPreview fileId={file.id} />}
          {file.kind === "pdf"  && <PdfPreview fileId={file.id} />}
          {file.kind === "txt"  && <TxtPreview fileId={file.id} />}
          {file.kind === "docx" && <DocxPreview fileId={file.id} />}
          {file.kind === "xlsx" && <XlsxPreview fileId={file.id} />}
          {!["csv","md","pdf","txt","docx","xlsx"].includes(file.kind) && <TxtPreview fileId={file.id} />}
        </div>
      </div>
    </div>
  );
}

function CsvPreview({ fileId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  React.useEffect(() => {
    fetchFileText(fileId)
      .then(text => {
        const lines = text.split("\n").filter(l => l.trim());
        const rows = lines.map(l => {
          const cells = [];
          let cur = "", inQ = false;
          for (const ch of l) {
            if (ch === '"') { inQ = !inQ; continue; }
            if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; continue; }
            cur += ch;
          }
          cells.push(cur.trim());
          return cells;
        });
        setData(rows);
      })
      .catch(() => setErr(true));
  }, [fileId]);

  if (err)     return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Failed to load preview.</div>;
  if (!data)   return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Loading…</div>;
  if (!data.length) return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Empty file.</div>;

  return (
    <div style={{ padding: 16, overflow: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }} className="mono">
        <tbody>
          {data.map((r, i) => (
            <tr key={i} style={{ background: i === 0 ? "var(--bg-2)" : (i % 2 ? "transparent" : "var(--bg-2)") }}>
              {r.map((c, j) => (
                <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "var(--ink)" : "var(--ink-2)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MdPreview({ fileId }) {
  const [content, setContent] = useState(null);
  const [err, setErr] = useState(false);
  React.useEffect(() => {
    fetchFileText(fileId)
      .then(setContent)
      .catch(() => setErr(true));
  }, [fileId]);

  if (err)     return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Failed to load preview.</div>;
  if (!content) return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Loading…</div>;

  return (
    <div className="md-preview" style={{ padding: "20px 24px", fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
      <ReactMarkdown
        components={{
          h1: ({children}) => <h1 style={mdStyles.h1}>{children}</h1>,
          h2: ({children}) => <h2 style={mdStyles.h2}>{children}</h2>,
          h3: ({children}) => <h3 style={mdStyles.h3}>{children}</h3>,
          p: ({children}) => <p style={mdStyles.p}>{children}</p>,
          ul: ({children}) => <ul style={mdStyles.ul}>{children}</ul>,
          ol: ({children}) => <ol style={mdStyles.ol}>{children}</ol>,
          li: ({children}) => <li style={mdStyles.li}>{children}</li>,
          blockquote: ({children}) => <blockquote style={mdStyles.bq}>{children}</blockquote>,
          code: ({node, className, children, ...props}) => {
            const isInline = !className;
            if (isInline) return <code style={mdStyles.code} className="mono">{children}</code>;
            return (
              <div style={mdStyles.preWrap}>
                <pre style={mdStyles.pre} className="mono"><code>{children}</code></pre>
              </div>
            );
          },
          a: ({href, children}) => <a href={href} style={mdStyles.a} target="_blank" rel="noreferrer">{children}</a>,
          strong: ({children}) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          em: ({children}) => <em>{children}</em>,
        }}
      >{content}</ReactMarkdown>
    </div>
  );
}

const mdStyles = {
  h1: { fontSize: 24, fontWeight: 700, margin: "20px 0 8px", letterSpacing: -0.3, color: "var(--ink)" },
  h2: { fontSize: 19, fontWeight: 600, margin: "18px 0 6px", letterSpacing: -0.2, color: "var(--ink)" },
  h3: { fontSize: 16, fontWeight: 600, margin: "14px 0 4px", color: "var(--ink)" },
  p: { margin: "0 0 10px", lineHeight: 1.7, color: "var(--ink-2)" },
  ul: { margin: "4px 0 10px", paddingLeft: 22 },
  ol: { margin: "4px 0 10px", paddingLeft: 22 },
  li: { margin: "0 0 4px", lineHeight: 1.65, color: "var(--ink-2)" },
  bq: { margin: "8px 0", padding: "8px 14px", borderLeft: "3px solid var(--accent)", background: "var(--bg-2)", borderRadius: "0 8px 8px 0", color: "var(--ink-2)" },
  code: { fontSize: 12.5, padding: "1px 5px", background: "var(--bg-3)", borderRadius: 5, color: "var(--ink)" },
  preWrap: { margin: "8px 0", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" },
  pre: { padding: 14, margin: 0, fontSize: 12.5, lineHeight: 1.55, overflowX: "auto" },
  a: { color: "var(--accent)", textDecoration: "underline" },
};

function PdfPreview({ fileId }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  React.useEffect(() => {
    let disposed = false;
    fetchViewData(fileId)
      .then(d => fetchWithAuth(d.url))
      .then(r => {
        if (!r.ok) throw new Error('Auth failed');
        return r.blob();
      })
      .then(blob => {
        if (!disposed) setUrl(URL.createObjectURL(blob));
      })
      .catch(() => { if (!disposed) setErr(true); });
    return () => { disposed = true; };
  }, [fileId]);

  if (err)     return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Failed to load preview.</div>;
  if (!url)    return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Loading…</div>;

  return (
    <iframe
      src={url}
      style={{ flex: 1, width: "100%", border: "none" }}
      title="PDF preview"
    />
  );
}

function DocxPreview({ fileId }) {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(false);
  React.useEffect(() => {
    fetchViewData(fileId)
      .then(data => setDoc(data))
      .catch(() => setErr(true));
  }, [fileId]);

  if (err)     return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Failed to load preview.</div>;
  if (!doc)    return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Loading…</div>;
  if (!doc.paragraphs?.length) return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">No text content found.</div>;

  return (
    <div style={{ padding: 24, fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
      {doc.paragraphs.map((p, i) => {
        if (p.heading_level === 1) return <h1 key={i} style={docxStyles.h1}>{p.text}</h1>;
        if (p.heading_level === 2) return <h2 key={i} style={docxStyles.h2}>{p.text}</h2>;
        if (p.heading_level === 3) return <h3 key={i} style={docxStyles.h3}>{p.text}</h3>;
        if (p.heading_level > 3)  return <h4 key={i} style={docxStyles.h4}>{p.text}</h4>;
        return <p key={i} style={docxStyles.p}>{p.text}</p>;
      })}
    </div>
  );
}

const docxStyles = {
  h1: { fontSize: 22, fontWeight: 700, margin: "24px 0 8px", letterSpacing: -0.3, color: "var(--ink)" },
  h2: { fontSize: 18, fontWeight: 600, margin: "20px 0 6px", letterSpacing: -0.2, color: "var(--ink)" },
  h3: { fontSize: 15, fontWeight: 600, margin: "16px 0 4px", color: "var(--ink)" },
  h4: { fontSize: 13.5, fontWeight: 600, margin: "12px 0 4px", color: "var(--ink-2)" },
  p:  { margin: "0 0 8px", lineHeight: 1.7, color: "var(--ink-2)" },
};

function XlsxPreview({ fileId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [activeSheet, setActiveSheet] = useState(0);
  React.useEffect(() => {
    fetchViewData(fileId)
      .then(d => { setData(d); setActiveSheet(0); })
      .catch(() => setErr(true));
  }, [fileId]);

  if (err)     return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Failed to load preview.</div>;
  if (!data)   return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Loading…</div>;
  if (!data.sheets?.length) return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Empty spreadsheet.</div>;

  const sheet = data.sheets[activeSheet] || data.sheets[0];
  const allRows = sheet.headers?.length ? [sheet.headers, ...sheet.rows] : sheet.rows;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {data.sheets.length > 1 && (
        <div style={{ display: "flex", gap: 4, padding: "10px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0, overflowX: "auto" }}>
          {data.sheets.map((s, i) => (
            <button key={i} onClick={() => setActiveSheet(i)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: i === activeSheet ? "var(--ink)" : "transparent",
              color: i === activeSheet ? "var(--bg)" : "var(--ink-3)",
              border: i === activeSheet ? "none" : "1px solid var(--line)",
              transition: "background 120ms, color 120ms",
            }}>{s.name}</button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }} className="mono">
          <tbody>
            {allRows.map((r, i) => (
              <tr key={i} style={{ background: i === 0 ? "var(--bg-2)" : (i % 2 ? "transparent" : "var(--bg-2)") }}>
                {r.map((c, j) => (
                  <td key={j} style={{ padding: "7px 10px", borderBottom: "1px solid var(--line)", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "var(--ink)" : "var(--ink-2)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TxtPreview({ fileId }) {
  const [content, setContent] = useState(null);
  const [err, setErr] = useState(false);
  React.useEffect(() => {
    fetchFileText(fileId)
      .then(setContent)
      .catch(() => setErr(true));
  }, [fileId]);

  if (err)     return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Failed to load preview.</div>;
  if (!content) return <div style={{ padding: 24, color: "var(--ink-3)" }} className="mono">Loading…</div>;

  return (
    <pre style={{ padding: 24, fontSize: 12, lineHeight: 1.7, color: "var(--ink-2)", whiteSpace: "pre-wrap", margin: 0 }} className="mono">{content}</pre>
  );
}

const kpStyles = {
  panel: { width: 320, flexShrink: 0, height: "100%", background: "var(--bg-2)", display: "flex", flexDirection: "column", overflow: "hidden" },
  panelLeft:  { borderRight: "1px solid var(--line)" },
  panelRight: { borderLeft: "1px solid var(--line)" },
  header: { padding: "14px 14px 0", borderBottom: "1px solid var(--line)" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 },
  glyph: { width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "white", flexShrink: 0 },
  projectName: { fontSize: 14, fontWeight: 600, letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  projectSub: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 },
  iconBtn: { width: 28, height: 28, borderRadius: 7, display: "grid", placeItems: "center", color: "var(--ink-3)", transition: "background 120ms, color 120ms" },
  tabs: { display: "flex", gap: 2, marginTop: 4 },
  tab: { padding: "8px 12px", fontSize: 12.5, color: "var(--ink-3)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6, borderBottom: "2px solid transparent", transition: "color 120ms, border-color 120ms", marginBottom: -1 },
  tabActive: { color: "var(--ink)", borderBottomColor: "var(--accent)" },
  tabCount: { fontSize: 10, color: "var(--ink-3)", background: "var(--bg-3)", padding: "0 5px", borderRadius: 999 },
  body: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  dropZone: { border: "1.5px dashed var(--line-2)", borderRadius: 12, padding: "20px 14px", textAlign: "center", cursor: "pointer", transition: "border-color 160ms, background 160ms, transform 160ms" },
  dropZoneActive: { borderColor: "var(--accent)", background: "var(--accent-soft)", transform: "scale(1.01)" },
  dropIcon: { display: "inline-grid", placeItems: "center", color: "var(--accent)", marginBottom: 6 },
  dropTitle: { fontSize: 13, fontWeight: 500 },
  dropSub: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 4, letterSpacing: 0.2 },
  tokenBar: {},
  tokenBarHead: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  tokenTrack: { height: 6, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" },
  tokenFill: { height: "100%", background: "linear-gradient(90deg, var(--accent), oklch(0.66 0.17 18))", borderRadius: 999, transition: "width 240ms" },
  fileList: { display: "flex", flexDirection: "column", gap: 4 },
  fileRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 9, textAlign: "left", transition: "background 120ms", color: "var(--ink)" },
  fileIcon: { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 },
  fileName: { fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileMeta: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 },
  fileMore: { width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", color: "var(--ink-3)", opacity: 0.6, transition: "opacity 120ms, background 120ms" },
  empty: { padding: 16, textAlign: "center", fontSize: 11, color: "var(--ink-3)" },
  instLabel: { fontSize: 10.5, color: "var(--ink-2)", letterSpacing: 0.6 },
  instArea: { width: "100%", minHeight: 220, padding: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12.5, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit" },
  instFoot: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  saveBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "var(--ink)", color: "var(--bg)", fontSize: 12, fontWeight: 500 },
  aboutBlock: { display: "flex", flexDirection: "column", gap: 6 },
  aboutLabel: { fontSize: 10.5, color: "var(--ink-2)", letterSpacing: 0.6 },
  aboutText: { fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 },
  recentRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", fontSize: 12.5, color: "var(--ink-2)" },
  recentDot: { width: 4, height: 4, borderRadius: 999, background: "var(--line-2)", marginLeft: 5, marginRight: 1, flexShrink: 0 },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
  stat: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" },
  statValue: { fontSize: 18, fontWeight: 600, color: "var(--ink)" },
  statLabel: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 2, letterSpacing: 0.4 },
  viewerScrim: { position: "fixed", inset: 0, background: "oklch(0.18 0.01 260 / 0.5)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 100, animation: "fadeIn 160ms ease-out", padding: 16 },
  viewer: { width: "min(1200px, 95vw)", height: "min(95vh, 960px)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "pop 200ms cubic-bezier(0.2, 0.8, 0.2, 1.05)" },
  viewerHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" },
  viewerBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, fontSize: 12, color: "var(--ink-2)", border: "1px solid var(--line)" },
  viewerBody: { flex: 1, overflow: "auto", background: "var(--bg-2)", display: "flex", flexDirection: "column" },
};
