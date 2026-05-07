// Right-side artifact viewer panel — code / preview modes.
// Supports text (md, html, etc.) and binary (docx, xlsx, pdf) formats.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { I } from './icons.jsx';
import { generateDocx, generateXlsx, generatePdf, extractUploadedFile } from './api.js';

// Binary file types that can't be previewed as text
const BINARY_EXTS = ["docx", "xlsx", "pdf"];

export default function ArtifactPanel({ artifact, onClose }) {
  const [tab, setTab] = useState("preview");
  const [downloading, setDownloading] = useState(false);
  const [viewerState, setViewerState] = useState(null); // null | "loading" | { type, url|content|sheets }
  const viewerRef = useViewer(artifact, tab, setViewerState);

  // Resize state — drag handle on the left edge
  const [panelWidth, setPanelWidth] = useState(null);
  const [dragHover, setDragHover] = useState(false);
  const dragRef = useRef(false);
  const defaultWidth = Math.min(Math.max(window.innerWidth * 0.5, 420), 800);
  const finalWidth = panelWidth ?? defaultWidth;

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    dragRef.current = true;
    const startX = e.clientX;
    const startW = finalWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const newW = Math.max(320, Math.min(startW - (ev.clientX - startX), window.innerWidth * 0.85));
      setPanelWidth(newW);
    };
    const onUp = () => {
      dragRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [finalWidth]);

  // Clamp on window resize
  useEffect(() => {
    const onResize = () => {
      setPanelWidth(w => w ? Math.min(w, window.innerWidth * 0.85) : null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const ext = artifact.filename.includes(".") ? artifact.filename.split(".").pop() : "md";
  const isBinary = BINARY_EXTS.includes(ext);
  const isPreviewable = ["md", "markdown", "html", "svg", "txt"].includes(ext);

  const download = () => {
    if (isBinary) {
      downloadBinary();
    } else {
      const blob = new Blob([artifact.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = artifact.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadBinary = async () => {
    setDownloading(true);
    try {
      let blob;
      if (ext === "docx") {
        blob = await generateDocx(artifact.filename.replace('.docx', ''), artifact.content);
      } else if (ext === "xlsx") {
        const parseXlsxContent = (raw) => {
          try {
            return JSON.parse(raw);
          } catch {
            const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
            return JSON.parse(cleaned);
          }
        };
        try {
          const data = parseXlsxContent(artifact.content);
          const sheets = Array.isArray(data) ? data : data.sheets || [data];
          blob = await generateXlsx(artifact.filename.replace('.xlsx', ''), sheets);
        } catch {
          alert("Cannot generate XLSX: content is not valid JSON");
          setDownloading(false);
          return;
        }
      } else if (ext === "pdf") {
        blob = await generatePdf(artifact.filename.replace('.pdf', ''), artifact.content);
      }
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = artifact.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Binary download failed:", err);
    }
    setDownloading(false);
  };

  return (
    <aside style={{ ...panelStyles.panel, width: finalWidth }}>
      {/* Drag resize handle */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
          cursor: "col-resize", zIndex: 20,
          background: dragHover ? "var(--accent)" : "transparent",
          opacity: dragHover ? 0.5 : 0,
          transition: "opacity 120ms",
        }}
        onMouseDown={handleResizeMouseDown}
        onMouseEnter={() => setDragHover(true)}
        onMouseLeave={() => setDragHover(false)}
      />
      <div style={panelStyles.header}>
        <div style={panelStyles.headerLeft}>
          <span style={panelStyles.fileIcon}>{I.File}</span>
          <span style={panelStyles.filename}>{artifact.filename}</span>
          <span style={panelStyles.badge}>{ext}</span>
        </div>
        <div style={panelStyles.headerActions}>
          <button style={panelStyles.iconBtn} onClick={download} title={isBinary ? `Generate & download ${ext.toUpperCase()}` : "Download"}>
            {downloading ? I.Loader || "…" : I.Download}
          </button>
          <button style={panelStyles.iconBtn} onClick={onClose} title="Close">{I.Close}</button>
        </div>
      </div>

      <div style={panelStyles.tabs}>
        {isBinary ? (
          <>
            <button style={{ ...panelStyles.tab, ...(tab === "preview" ? panelStyles.tabActive : {}) }}
              onClick={() => setTab("preview")}>
              Source
            </button>
            <button style={{ ...panelStyles.tab, ...(tab === "viewer" ? panelStyles.tabActive : {}) }}
              onClick={() => setTab("viewer")}>
              Viewer
            </button>
            <button style={{ ...panelStyles.tab, ...(tab === "code" ? panelStyles.tabActive : {}) }}
              onClick={() => setTab("code")}>
              Code
            </button>
          </>
        ) : (
          <>
            {isPreviewable && (
              <button style={{ ...panelStyles.tab, ...(tab === "preview" ? panelStyles.tabActive : {}) }}
                onClick={() => setTab("preview")}>
                Preview
              </button>
            )}
            <button style={{ ...panelStyles.tab, ...(tab === "code" ? panelStyles.tabActive : {}) }}
              onClick={() => setTab("code")}>
              Code
            </button>
          </>
        )}
      </div>

      <div style={panelStyles.body}>
        {tab === "preview" && isBinary ? (
          <div style={panelStyles.binaryInfo}>
            <div style={panelStyles.binaryIcon}>{I.File}</div>
            <span style={panelStyles.binaryTitle}>{artifact.filename}</span>
            <span style={panelStyles.binaryHint}>
              This is a {ext.toUpperCase()} document. Click download to generate the file.
            </span>
            <button style={panelStyles.genBtn} onClick={downloadBinary} disabled={downloading}>
              {I.Download} <span>{downloading ? "Generating…" : `Generate & Download ${ext.toUpperCase()}`}</span>
            </button>
            <div style={panelStyles.binaryMeta}>
              <span>Source content shown in the "Code" tab is used to generate this document.</span>
            </div>
          </div>
        ) : tab === "viewer" && isBinary ? (
          viewerState === null || viewerState === "loading" ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)" }} className="mono">Generating preview…</div>
          ) : viewerState.type === "pdf" ? (
            <iframe src={viewerState.url} style={{ width: "100%", height: "100%", border: "none" }} title="PDF viewer" />
          ) : viewerState.type === "docx" ? (
            <div style={{ padding: 24, fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{viewerState.content}</div>
          ) : viewerState.type === "xlsx" ? (
            <div style={{ padding: 16, overflow: "auto" }}>
              {viewerState.sheets.map((s, si) => (
                <div key={si} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }} className="mono">{s.name}</div>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }} className="mono">
                    <tbody>
                      {[s.headers, ...s.rows].map((r, ri) => (
                        <tr key={ri} style={{ background: ri === 0 ? "var(--bg-2)" : (ri % 2 ? "transparent" : "var(--bg-2)") }}>
                          {r.map((c, ci) => (
                            <td key={ci} style={{ padding: "7px 10px", borderBottom: "1px solid var(--line)", fontWeight: ri === 0 ? 600 : 400, color: ri === 0 ? "var(--ink)" : "var(--ink-2)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : viewerState.type === "error" ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--bad)" }} className="mono">
              Preview failed: {viewerState.message}
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)" }} className="mono">Preview not available.</div>
          )
        ) : tab === "preview" && isPreviewable ? (
          <div style={panelStyles.preview}>
            {ext === "md" || ext === "markdown" ? (
              <MarkdownPreview text={artifact.content} />
            ) : (
              <div className="mono" style={panelStyles.raw}>{artifact.content}</div>
            )}
          </div>
        ) : (
          <pre style={panelStyles.codeBlock} className="mono">{artifact.content}</pre>
        )}
      </div>
    </aside>
  );
}

// Generate viewable content for binary artifact types (pdf, docx, xlsx)
function useViewer(artifact, tab, setViewerState) {
  const disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    const ext = artifact.filename.includes(".") ? artifact.filename.split(".").pop() : "md";
    if (tab !== "viewer" || !["docx","xlsx","pdf"].includes(ext)) return;

    setViewerState("loading");

    (async () => {
      try {
        if (ext === "pdf") {
          const blob = await generatePdf(artifact.filename.replace(".pdf", ""), artifact.content);
          if (disposed.current) return;
          setViewerState({ type: "pdf", url: URL.createObjectURL(blob) });
        } else if (ext === "docx") {
          const blob = await generateDocx(artifact.filename.replace(".docx", ""), artifact.content);
          if (disposed.current) return;
          const file = new File([blob], artifact.filename, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
          const result = await extractUploadedFile(file);
          if (disposed.current) return;
          setViewerState({ type: "docx", content: result.text });
        } else if (ext === "xlsx") {
          let data;
          try {
            data = JSON.parse(artifact.content);
          } catch {
            // Try stripping markdown fences if LLM wrapped JSON in ```json ... ```
            const cleaned = artifact.content
              .replace(/^```(?:json)?\s*/m, '')
              .replace(/\s*```$/m, '')
              .trim();
            data = JSON.parse(cleaned);
          }
          const sheets = Array.isArray(data) ? data : data.sheets || [data];
          const blob = await generateXlsx(artifact.filename.replace(".xlsx", ""), sheets);
          if (disposed.current) return;
          const file = new File([blob], artifact.filename, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const result = await extractUploadedFile(file);
          if (disposed.current) return;
          // Parse tab-separated output into sheets
          const parsed = parseXlsxText(result.text);
          setViewerState({ type: "xlsx", sheets: parsed });
        }
      } catch (err) {
        console.error("Artifact preview failed:", err);
        if (!disposed.current) setViewerState({ type: "error", message: err.message || String(err) });
      }
    })();

    return () => { disposed.current = true; };
  }, [artifact.filename, artifact.content, tab, setViewerState]);
}

function parseXlsxText(text) {
  const blocks = text.split("\n\n");
  const sheets = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter(l => l.trim());
    if (!lines.length) continue;
    const headerMatch = lines[0].match(/^=== Sheet: (.+) ===$/);
    if (headerMatch) {
      const name = headerMatch[1];
      const dataLines = lines.slice(1);
      if (dataLines.length) {
        const headers = dataLines[0].split("\t");
        const rows = dataLines.slice(1).map(l => l.split("\t"));
        sheets.push({ name, headers, rows });
      }
    } else if (sheets.length === 0) {
      // No sheet headers — single sheet
      const headers = lines[0].split("\t");
      const rows = lines.slice(1).map(l => l.split("\t"));
      sheets.push({ name: "Sheet1", headers, rows });
    }
  }
  return sheets.length ? sheets : [{ name: "Sheet1", headers: [], rows: [] }];
}

function renderKatexMd(formula, displayMode) {
  try {
    if (window.katex) {
      return window.katex.renderToString(formula, { throwOnError: false, displayMode });
    }
  } catch {}
  return displayMode ? `<div style="text-align:center;padding:8px 0;font-family:monospace;font-size:13px">${formula}</div>` : `<code>${formula}</code>`;
}

function MarkdownPreview({ text }) {
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
    out.push(<Tag key={"l" + out.length} style={mdStyles.list}>
      {listBuf.map((it, i) => <li key={i} style={mdStyles.li}><InlineMd text={it} /></li>)}
    </Tag>);
    listBuf = null; listType = null;
  };

  const flushTable = (rowIdx) => {
    if (!inTable || !tableHeaders) return;
    out.push(
      <div key={"t" + rowIdx} style={mdStyles.tableWrap}>
        <table style={mdStyles.table} className="mono">
          <thead>
            <tr>{tableHeaders.map((h, i) => <th key={i} style={mdStyles.th}><InlineMd text={h} /></th>)}</tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri}>{row.map((c, ci) => <td key={ci} style={mdStyles.td}><InlineMd text={c} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false; tableHeaders = null; tableRows = [];
  };

  const splitRow = (line) => line.split("|").filter((_, i, a) => i > 0 && i < a.length - 1 || (i === 0 && a.length > 2)).map(s => s.trim()).filter(Boolean);

  lines.forEach((raw, idx) => {
    const cm = raw.match(/^```(\w*)/);
    if (cm) {
      flushList(); flushTable(idx);
      if (inCode) {
        out.push(<pre key={idx} style={mdStyles.pre} className="mono"><code>{codeBuf.join("\n")}</code></pre>);
        codeBuf = []; codeLang = ""; inCode = false;
      } else { inCode = true; codeLang = cm[1] || ""; }
      return;
    }
    if (inCode) { codeBuf.push(raw); return; }

    // Display math
    if (raw.trim() === "$$" || raw.startsWith("$$")) {
      if (!inMath) {
        flushList(); flushTable(idx);
        inMath = true;
        mathBuf = [];
        if (raw.trim() !== "$$" || raw.indexOf("$$") < raw.lastIndexOf("$$")) {
          const inner = raw.slice(raw.indexOf("$$") + 2);
          if (inner.endsWith("$$")) {
            mathBuf.push(inner.slice(0, -2));
            out.push(<div key={idx} style={{ textAlign: "center", padding: "8px 0", overflowX: "auto" }}
              dangerouslySetInnerHTML={{ __html: renderKatexMd(mathBuf.join("\n"), true) }} />);
            inMath = false;
            mathBuf = [];
          } else {
            mathBuf.push(inner);
          }
        }
      } else {
        const r = raw.trim();
        if (r.endsWith("$$") && r !== "$$") {
          mathBuf.push(r.slice(0, -2));
        }
        out.push(<div key={idx} style={{ textAlign: "center", padding: "8px 0", overflowX: "auto" }}
          dangerouslySetInnerHTML={{ __html: renderKatexMd(mathBuf.join("\n"), true) }} />);
        inMath = false;
        mathBuf = [];
      }
      return;
    }
    if (inMath) { mathBuf.push(raw); return; }

    // Table detection
    if (raw.startsWith("|") && raw.endsWith("|")) {
      const next = lines[idx + 1];
      if (next && /^\|[\s\-:|]+\|$/.test(next) && !inTable) {
        flushList(); flushTable(idx);
        inTable = true;
        tableHeaders = splitRow(raw);
        return;
      }
      if (inTable) {
        if (/^\|[\s\-:|]+\|$/.test(raw)) return; // skip separator
        const cells = splitRow(raw);
        if (cells.length) { tableRows.push(cells); return; }
        flushTable(idx);
        return;
      }
    }
    if (inTable) { flushTable(idx); }

    const line = raw;
    if (/^### /.test(line))      { flushList(); out.push(<h3 key={idx} style={mdStyles.h3}><InlineMd text={line.slice(4)} /></h3>); return; }
    if (/^## /.test(line))       { flushList(); out.push(<h2 key={idx} style={mdStyles.h2}><InlineMd text={line.slice(3)} /></h2>); return; }
    if (/^# /.test(line))        { flushList(); out.push(<h1 key={idx} style={mdStyles.h1}><InlineMd text={line.slice(2)} /></h1>); return; }
    if (/^> /.test(line))        { flushList(); out.push(<blockquote key={idx} style={mdStyles.bq}><InlineMd text={line.slice(2)} /></blockquote>); return; }
    if (/^[-*_]{3,}\s*$/.test(line)) { flushList(); out.push(<hr key={idx} style={mdStyles.hr} />); return; }
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
    else out.push(<p key={idx} style={mdStyles.p}><InlineMd text={line} /></p>);
  });
  if (inCode && codeBuf.length) {
    out.push(<pre key="end" style={mdStyles.pre} className="mono"><code>{codeBuf.join("\n")}</code></pre>);
  }
  if (inMath && mathBuf.length) {
    out.push(<div key="unclosedmath" style={{ textAlign: "center", padding: "8px 0", overflowX: "auto" }}
      dangerouslySetInnerHTML={{ __html: renderKatexMd(mathBuf.join("\n"), true) }} />);
  }
  flushTable("end");
  flushList();
  return <div>{out}</div>;
}

function InlineMd({ text }) {
  // First pass: replace math with placeholders so they don't interfere with markdown parsing
  const mathBlocks = [];
  let processed = text;
  // Display math $$...$$ (may be inline)
  processed = processed.replace(/\$\$([^$]|\$(?!\$))+\$\$/g, (match) => {
    mathBlocks.push({ type: 'display', formula: match.slice(2, -2) });
    return `\x00MATH${mathBlocks.length - 1}\x00`;
  });
  // Inline math $...$
  processed = processed.replace(/\$([^$]|\$(?!\$))+\$/g, (match) => {
    mathBlocks.push({ type: 'inline', formula: match.slice(1, -1) });
    return `\x00MATH${mathBlocks.length - 1}\x00`;
  });

  const parts = [];
  let i = 0, key = 0;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let m;
  while ((m = re.exec(processed)) !== null) {
    if (m.index > i) pushPlain(processed.slice(i, m.index));
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={key++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) parts.push(<code key={key++} style={mdStyles.code} className="mono">{t.slice(1, -1)}</code>);
    else parts.push(<em key={key++}>{t.slice(1, -1)}</em>);
    i = m.index + t.length;
  }
  if (i < processed.length) pushPlain(processed.slice(i));
  return <>{parts}</>;

  function pushPlain(s) {
    // Restore math placeholders in plain text segments
    let last = 0;
    const placeholderRe = /\x00MATH(\d+)\x00/g;
    let pm;
    while ((pm = placeholderRe.exec(s)) !== null) {
      if (pm.index > last) parts.push(s.slice(last, pm.index));
      const mb = mathBlocks[parseInt(pm[1])];
      if (mb) {
        parts.push(<span key={key++} dangerouslySetInnerHTML={{
          __html: renderKatexMd(mb.formula, mb.type === 'display')
        }} />);
      }
      last = pm.index + pm[0].length;
    }
    if (last < s.length) parts.push(s.slice(last));
  }
}

const panelStyles = {
  panel: {
    flexShrink: 0, height: "100%", position: "relative",
    background: "var(--bg)", borderLeft: "1px solid var(--line)",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    padding: "12px 20px", borderBottom: "1px solid var(--line)", flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  fileIcon: { color: "var(--ink-3)", display: "grid", placeItems: "center", flexShrink: 0 },
  filename: { fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badge: {
    fontSize: 10, color: "var(--accent-ink)", background: "var(--accent-soft)",
    padding: "2px 6px", borderRadius: 999, letterSpacing: 0.4, flexShrink: 0,
  },
  headerActions: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  iconBtn: { width: 30, height: 30, borderRadius: 7, display: "grid", placeItems: "center", color: "var(--ink-3)" },
  tabs: {
    display: "flex", gap: 0, borderBottom: "1px solid var(--line)",
    padding: "0 12px", flexShrink: 0, background: "var(--bg-2)",
  },
  tab: {
    padding: "8px 14px", fontSize: 12.5, color: "var(--ink-3)", fontWeight: 500,
    borderBottom: "2px solid transparent", marginBottom: -1, transition: "color 120ms, border-color 120ms",
  },
  tabActive: { color: "var(--ink)", borderBottomColor: "var(--accent)" },
  body: { flex: 1, overflow: "auto", background: "var(--bg)" },
  preview: { padding: "20px 24px", fontSize: 14, lineHeight: 1.65, color: "var(--ink)" },
  raw: { whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 },
  codeBlock: {
    padding: 16, margin: 0, fontSize: 12.5, lineHeight: 1.6,
    whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--ink)",
  },
  binaryInfo: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 12, padding: 48, textAlign: "center",
  },
  binaryIcon: {
    width: 48, height: 48, borderRadius: 14,
    display: "grid", placeItems: "center", fontSize: 24,
    background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-3)",
  },
  binaryTitle: { fontSize: 16, fontWeight: 600, color: "var(--ink)" },
  binaryHint: { fontSize: 13, color: "var(--ink-2)", maxWidth: 300, lineHeight: 1.5 },
  binaryMeta: { fontSize: 11, color: "var(--ink-3)", maxWidth: 320, lineHeight: 1.4, marginTop: 8, padding: "8px 12px", background: "var(--bg-2)", borderRadius: 8 },
  genBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    background: "var(--accent)", color: "white", border: "none",
  },
};

const mdStyles = {
  h1: { fontSize: 20, fontWeight: 600, margin: "16px 0 8px" },
  h2: { fontSize: 16, fontWeight: 600, margin: "14px 0 6px" },
  h3: { fontSize: 14, fontWeight: 600, margin: "12px 0 4px" },
  hr: { margin: "16px 0", border: "none", borderTop: "1.5px solid var(--line)", height: 0 },
  p: { margin: "0 0 10px", lineHeight: 1.7 },
  list: { margin: "4px 0 10px", paddingLeft: 22 },
  li: { margin: "0 0 4px", lineHeight: 1.65 },
  bq: { margin: "10px 0", padding: "8px 14px", borderLeft: "3px solid var(--accent)", background: "var(--bg-2)", borderRadius: "0 8px 8px 0", color: "var(--ink-2)" },
  code: { fontSize: 12.5, padding: "1px 5px", background: "var(--bg-3)", borderRadius: 5, color: "var(--ink)" },
  pre: { padding: 14, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflowX: "auto", margin: "8px 0", fontSize: 12.5, lineHeight: 1.55 },
  tableWrap: { overflowX: "auto", margin: "8px 0" },
  table: { borderCollapse: "collapse", fontSize: 13, width: "100%" },
  th: { padding: "6px 10px", border: "1px solid var(--line)", background: "var(--bg-2)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "6px 10px", border: "1px solid var(--line)", whiteSpace: "nowrap" },
};
