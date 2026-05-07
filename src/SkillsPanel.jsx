// Skills panel — browse, inspect, and run skills from the skills/ directory.
import React, { useState, useEffect, useRef } from 'react';
import { I } from './icons.jsx';
import { listSkills, getSkillKnowledge, runSkill, getSkillDownloadUrl, saveSkillOutputToProject } from './api.js';

export default function SkillsPanel({ projectId, onClose, onRefreshProject }) {
  const [skills, setSkills] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [knowledge, setKnowledge] = useState(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [runState, setRunState] = useState('idle'); // idle | running | done | error
  const [runResult, setRunResult] = useState(null);
  const produkRef = useRef(null);
  const bahanRef = useRef(null);
  const fileInputsRef = useRef({});

  // Form state
  const [form, setForm] = useState({});

  useEffect(() => {
    listSkills().then(setSkills).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openSkill = (skill) => {
    setActiveSkill(skill);
    setKnowledge(null);
    setRunState('idle');
    setRunResult(null);
    setForm({});
    // Initialize defaults
    const defaults = {};
    for (const [key, def] of Object.entries(skill.inputs || {})) {
      if (def.default) defaults[key] = def.default;
    }
    setForm(defaults);
    // Load first knowledge file
    if (skill.knowledge?.length > 0) {
      loadKnowledge(skill, skill.knowledge[0]);
    }
  };

  const loadKnowledge = async (skill, path) => {
    setKnowledgeLoading(true);
    setKnowledge(null);
    try {
      const data = await getSkillKnowledge(skill.name, path);
      setKnowledge(data);
    } catch (err) {
      setKnowledge({ content: `Failed to load: ${err.message}`, path });
    }
    setKnowledgeLoading(false);
  };

  const updateForm = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleRun = async () => {
    const s = activeSkill;
    // Validate required text inputs
    for (const [key, def] of Object.entries(s.inputs || {})) {
      if (def.required && !form[key]) {
        alert(`"${def.label}" is required`);
        return;
      }
    }
    // Validate required files
    if (!form._produk) {
      alert('Daftar Produk PDF is required');
      return;
    }
    if (!form._bahan) {
      alert('Daftar Bahan PDF is required');
      return;
    }

    const data = {
      ...form,
      produk: form._produk,
      bahan: form._bahan,
    };

    setRunState('running');
    setRunResult(null);
    try {
      const result = await runSkill(s.name, data);
      setRunResult(result);
      setRunState(result.success ? 'done' : 'error');
    } catch (err) {
      setRunResult({ success: false, stdout: '', stderr: err.message });
      setRunState('error');
    }
  };

  if (loading) {
    return (
      <aside style={styles.panel}>
        <div style={styles.header}>
          <span style={{ color: 'var(--ink-3)' }} className="mono">SKILLS</span>
          <button style={styles.closeBtn} onClick={onClose}>{I.Close}</button>
        </div>
        <div style={{ padding: 24, color: 'var(--ink-3)' }} className="mono">Loading skills…</div>
      </aside>
    );
  }

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        {activeSkill ? (
          <>
            <button style={styles.backBtn} onClick={() => setActiveSkill(null)}>{I.ChevLeft}</button>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 0.5 }}>SKILL</span>
          </>
        ) : (
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 0.5 }}>SKILLS</span>
        )}
        <span style={{ flex: 1 }} />
        <button style={styles.closeBtn} onClick={onClose}>{I.Close}</button>
      </div>

      {!activeSkill ? (
        <div style={styles.list}>
          {skills.length === 0 && (
            <div style={{ padding: 24, color: 'var(--ink-3)' }} className="mono">No skills found</div>
          )}
          {skills.map(s => (
            <button key={s.name} style={styles.card} onClick={() => openSkill(s)}>
              <div style={styles.cardIcon}>{I.Sparkle}</div>
              <div style={styles.cardBody}>
                <div style={styles.cardName}>{s.name}</div>
                <div style={styles.cardDesc}>{s.description}</div>
              </div>
              <span style={{ color: 'var(--ink-3)' }}>{I.ChevRight}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={styles.detail}>
          <SkillTabs
            skill={activeSkill}
            projectId={projectId}
            onRefreshProject={onRefreshProject}
            knowledge={knowledge}
            knowledgeLoading={knowledgeLoading}
            onLoadKnowledge={(p) => loadKnowledge(activeSkill, p)}
            form={form}
            onFormChange={updateForm}
            onRun={handleRun}
            runState={runState}
            runResult={runResult}
            produkRef={produkRef}
            bahanRef={bahanRef}
            fileInputsRef={fileInputsRef}
          />
        </div>
      )}
    </aside>
  );
}

function SkillTabs({
  skill, projectId, onRefreshProject, knowledge, knowledgeLoading, onLoadKnowledge,
  form, onFormChange, onRun, runState, runResult,
  produkRef, bahanRef, fileInputsRef,
}) {
  const [tab, setTab] = useState('doc');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={styles.tabRow}>
        <button style={{ ...styles.tab, ...(tab === 'doc' ? styles.tabActive : {}) }} onClick={() => setTab('doc')}>Docs</button>
        <button style={{ ...styles.tab, ...(tab === 'knowledge' ? styles.tabActive : {}) }} onClick={() => setTab('knowledge')}>Knowledge</button>
        <button style={{ ...styles.tab, ...(tab === 'run' ? styles.tabActive : {}) }} onClick={() => setTab('run')}>Run</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'doc' && (
          <div style={{ padding: 16, fontSize: 14, lineHeight: 1.6 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>{skill.name}</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--ink-3)', fontSize: 13 }}>{skill.description}</p>
            {knowledgeLoading ? (
              <div style={{ color: 'var(--ink-3)' }} className="mono">Loading…</div>
            ) : knowledge ? (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                {knowledge.content}
              </div>
            ) : (
              <div style={{ color: 'var(--ink-3)' }} className="mono">No documentation</div>
            )}
          </div>
        )}

        {tab === 'knowledge' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {(skill.knowledge || []).map(p => (
                <button key={p} style={styles.kbChip} onClick={() => onLoadKnowledge(p)}>
                  {p.endsWith('.md') ? I.Book : p.endsWith('.py') ? I.Code : I.File}
                  <span style={{ fontSize: 11 }}>{p}</span>
                </button>
              ))}
            </div>
            {knowledgeLoading ? (
              <div style={{ color: 'var(--ink-3)' }} className="mono">Loading…</div>
            ) : knowledge ? (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                {knowledge.content}
              </div>
            ) : (
              <div style={{ color: 'var(--ink-3)' }} className="mono">Select a knowledge file</div>
            )}
          </div>
        )}

        {tab === 'run' && (
          <div style={{ padding: 16 }}>
            {runState === 'done' || runState === 'error' ? (
              <RunOutput
                skill={skill}
                projectId={projectId}
                onRefreshProject={onRefreshProject}
                result={runResult}
                state={runState}
                onBack={() => { setRunState('idle'); setRunResult(null); }}
              />
            ) : (
              <RunForm
                skill={skill}
                form={form}
                onFormChange={onFormChange}
                onRun={onRun}
                running={runState === 'running'}
                produkRef={produkRef}
                bahanRef={bahanRef}
                fileInputsRef={fileInputsRef}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RunForm({ skill, form, onFormChange, onRun, running, fileInputsRef }) {
  const handleFile = (key, file) => {
    onFormChange('_' + key, file);
  };

  const inputKeys = Object.entries(skill.inputs || []);
  const fileKeys = Object.entries(skill.files || []);

  if (inputKeys.length === 0 && fileKeys.length === 0) {
    return <div style={{ color: 'var(--ink-3)' }} className="mono">No inputs required</div>;
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Run {skill.name}</h3>

      {/* File uploads */}
      {fileKeys.map(([key, def]) => (
        <div key={key} style={styles.field}>
          <label style={styles.label}>
            {def.label} {def.required && <span style={{ color: 'var(--ink-3)' }}>(required)</span>}
          </label>
          <FileUpload
            accept=".pdf"
            onFile={(f) => handleFile(key, f)}
            currentFile={form['_' + key]}
            inputRef={(el) => fileInputsRef.current[key] = el}
          />
        </div>
      ))}

      {/* Text inputs */}
      {inputKeys.map(([key, def]) => (
        <div key={key} style={styles.field}>
          <label style={styles.label}>
            {def.label}
            {def.required && <span style={{ color: 'var(--ink-3)' }}> *</span>}
          </label>
          {def.type === 'select' ? (
            <select
              style={styles.input}
              value={form[key] || def.default || ''}
              onChange={(e) => onFormChange(key, e.target.value)}
            >
              {(def.options || []).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              style={styles.input}
              type="text"
              placeholder={def.description || def.label}
              value={form[key] || ''}
              onChange={(e) => onFormChange(key, e.target.value)}
            />
          )}
          {def.description && <div style={styles.hint}>{def.description}</div>}
        </div>
      ))}

      <button
        style={{ ...styles.runBtn, ...(running ? styles.runBtnRunning : {}) }}
        onClick={onRun}
        disabled={running}
      >
        {running ? <>{I.Loader} Running…</> : <>{I.Play} Generate Report</>}
      </button>
    </div>
  );
}

function FileUpload({ accept, onFile, currentFile, inputRef }) {
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef(null);

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}), ...(currentFile ? styles.dropZoneDone : {}) }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={handlePick} />
      {currentFile ? (
        <span style={{ fontSize: 12 }}>{I.Check} {currentFile.name}</span>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{I.Upload} Drop or click to upload {accept}</span>
      )}
    </div>
  );
}

function RunOutput({ skill, projectId, onRefreshProject, result, state, onBack }) {
  const [saving, setSaving] = useState({});

  const downloadUrl = (fileName) => {
    if (!result?.work_dir) return '#';
    const workDirName = result.work_dir.split('/').pop();
    return getSkillDownloadUrl(skill.name, workDirName, fileName);
  };

  const saveToProject = async (fileName, displayName) => {
    if (!projectId) {
      alert('No project selected. Open skills from within a project to save files.');
      return;
    }
    setSaving(s => ({ ...s, [fileName]: 'saving' }));
    try {
      const workDirName = result.work_dir.split('/').pop();
      const savedFile = await saveSkillOutputToProject(skill.name, workDirName, projectId, fileName, displayName);
      setSaving(s => ({ ...s, [fileName]: 'saved' }));
      onRefreshProject?.(projectId);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
      setSaving(s => ({ ...s, [fileName]: 'error' }));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ ...styles.statusDot, background: state === 'done' ? 'var(--accent)' : '#e44' }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>
          {state === 'done' ? 'Report Generated' : 'Execution Failed'}
        </span>
      </div>

      {/* Output files */}
      {result?.output_files?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={styles.label}>Output Files</div>
          {result.output_files.map(f => (
            <div key={f.name} style={styles.downloadLinkRow}>
              <a
                href={downloadUrl(f.path)}
                style={styles.downloadLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {I.Download} <span>{f.name}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </a>
              {projectId && (
                <button
                  style={styles.saveBtn}
                  onClick={() => saveToProject(f.path, f.name)}
                  disabled={saving[f.name] === 'saving'}
                  title="Save to project files"
                >
                  {saving[f.name] === 'saved' ? I.Check : saving[f.name] === 'saving' ? I.Loader : I.Folder}
                  <span>{saving[f.name] === 'saved' ? 'Saved' : 'Save to project'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stdout */}
      {result?.stdout && (
        <div style={{ marginBottom: 12 }}>
          <div style={styles.label}>Output</div>
          <pre style={styles.pre}>{result.stdout}</pre>
        </div>
      )}

      {/* Stderr on error */}
      {result?.stderr && state === 'error' && (
        <div style={{ marginBottom: 12 }}>
          <div style={styles.label}>Errors</div>
          <pre style={{ ...styles.pre, borderColor: '#e44', color: '#e44' }}>{result.stderr}</pre>
        </div>
      )}

      <button style={styles.runBtn} onClick={onBack}>Run Again</button>
      <button style={{ ...styles.runBtn, marginLeft: 8, background: 'transparent', border: '1px solid var(--line)' }} onClick={() => navigator.clipboard?.writeText(result?.stdout || '')}>
        {I.Copy} Copy Log
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  panel: {
    width: '50vw', maxWidth: 800, minWidth: 420,
    height: '100%', borderLeft: '1px solid var(--line)',
    background: 'var(--bg)', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', borderBottom: '1px solid var(--line)',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--ink-3)', padding: 4, borderRadius: 6,
    display: 'flex', alignItems: 'center',
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--ink-2)', padding: 4, borderRadius: 6,
    display: 'flex', alignItems: 'center',
  },
  list: {
    flex: 1, overflow: 'auto', padding: 12,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  card: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', border: '1px solid var(--line)',
    borderRadius: 12, background: 'var(--surface)',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'var(--accent-soft)', color: 'var(--accent-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: 16,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: 600, fontSize: 14, marginBottom: 2 },
  cardDesc: { fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 },
  detail: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  tabRow: {
    display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0,
  },
  tab: {
    flex: 1, padding: '10px 12px', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', cursor: 'pointer',
    fontSize: 12, fontWeight: 500, color: 'var(--ink-3)',
    fontFamily: 'var(--font-mono)',
  },
  tabActive: {
    color: 'var(--accent)', borderBottomColor: 'var(--accent)',
  },
  field: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--ink-2)',
    fontFamily: 'var(--font-mono)',
  },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--line)', background: 'var(--surface)',
    color: 'var(--ink)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  },
  hint: { fontSize: 11, color: 'var(--ink-3)', marginTop: 2 },
  dropZone: {
    border: '1px dashed var(--line)', borderRadius: 8,
    padding: '12px 16px', cursor: 'pointer', textAlign: 'center',
    transition: 'all 0.15s',
  },
  dropZoneActive: {
    borderColor: 'var(--accent)', background: 'var(--accent-soft)',
    transform: 'scale(1.02)',
  },
  dropZoneDone: {
    borderStyle: 'solid', borderColor: 'var(--accent)',
    background: 'var(--accent-soft)',
  },
  runBtn: {
    marginTop: 8, padding: '10px 20px', borderRadius: 8,
    border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)',
    fontWeight: 600, fontSize: 13, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-mono)',
  },
  runBtnRunning: { opacity: 0.7, pointerEvents: 'none' },
  statusDot: {
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
  },
  pre: {
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.5,
    overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-mono)', color: 'var(--ink-2)',
  },
  downloadLinkRow: {
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
  },
  downloadLink: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--line)', flex: 1,
    textDecoration: 'none', color: 'var(--ink)', fontSize: 13,
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--line)', background: 'var(--surface)',
    color: 'var(--accent-ink)', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-mono)',
  },
  kbChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 6,
    border: '1px solid var(--line)', background: 'var(--surface)',
    cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)',
  },
};
