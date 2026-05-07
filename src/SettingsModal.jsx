// Settings modal — claude.ai-style sidebar layout.
// Sections: General, API, Generation, Appearance, Memory.
import React, { useState } from 'react';
import { I as IconSet } from './icons.jsx';
import { getSettings, putSettings } from './api.js';

const I = IconSet;

const KeyIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 10l-7 7M8 12l-2 2" />
  </svg>
);

const InfoIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 9v5M10 7v.01" />
  </svg>
);

const TABS = [
  { key: "general",    label: "General",    icon: I.Settings },
  { key: "api",        label: "API Keys",    icon: KeyIcon },
  { key: "generation", label: "Parameters",  icon: I.Sparkle },
  { key: "appearance", label: "Appearance",  icon: I.Eye },
  { key: "memory",     label: "Memory",      icon: I.Book },
  { key: "about",      label: "About",       icon: InfoIcon },
];

export default function SettingsModal({ onClose, onSaved, isAdmin, onOpenAdmin, logout, user }) {
  const [tab, setTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Load current settings on mount
  const [form, setForm] = useState(null);
  React.useEffect(() => {
    getSettings().then(data => {
      setForm({
        // General
        display_name: data.display_name || "",
        avatar_initials: data.avatar_initials || "",
        llm_call_name: data.llm_call_name || "",
        // API
        provider: data.provider || "ollama",
        ollama_base: data.ollama_base || "http://localhost:11434",
        ollama_model: data.ollama_model || "llama3.2",
        openai_base: data.openai_base || "https://api.openai.com/v1",
        openai_key: "",
        openai_model: data.openai_model || "gpt-4o-mini",
        deepseek_key: "",
        deepseek_model: data.deepseek_model || "deepseek-chat",
        // Generation
        temperature: data.temperature ?? 0.7,
        max_tokens: data.max_tokens ?? 128000,
        stream: data.stream !== false,
        // Appearance
        chat_font_size: data.chat_font_size ?? 14,
        enter_to_send: data.enter_to_send !== false,
        // Memory
        memories: data.memories ?? [],
      });
    }).catch(() => {
      setForm({
        display_name: "",
        avatar_initials: "",
        llm_call_name: "",
        provider: "ollama",
        ollama_base: "http://localhost:11434",
        ollama_model: "llama3.2",
        openai_base: "https://api.openai.com/v1",
        openai_key: "",
        openai_model: "gpt-4o-mini",
        deepseek_key: "",
        deepseek_model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 128000,
        stream: true,
        chat_font_size: 14,
        enter_to_send: true,
        memories: [],
      });
    });
  }, []);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        display_name: form.display_name,
        avatar_initials: form.avatar_initials,
        llm_call_name: form.llm_call_name,
        provider: form.provider,
        temperature: form.temperature,
        max_tokens: form.max_tokens,
        stream: form.stream,
        chat_font_size: form.chat_font_size,
        enter_to_send: form.enter_to_send,
        memories: form.memories,
      };
      if (form.provider === "ollama") {
        payload.ollama_base = form.ollama_base;
        payload.ollama_model = form.ollama_model;
      } else if (form.provider === "openai") {
        payload.openai_base = form.openai_base;
        if (form.openai_key) payload.openai_key = form.openai_key;
        payload.openai_model = form.openai_model;
      } else if (form.provider === "deepseek") {
        if (form.deepseek_key) payload.deepseek_key = form.deepseek_key;
        payload.deepseek_model = form.deepseek_model;
      }
      await putSettings(payload);
      setSaved(true);
      setTimeout(() => { onSaved?.(); onClose(); }, 800);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  if (!form) return null;

  const initials = form.avatar_initials || form.display_name.slice(0, 2).toUpperCase() || "JS";

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Settings</h2>
          <button style={modalStyles.closeBtn} onClick={onClose}>{I.Close}</button>
        </div>

        <div style={modalStyles.bodyRow}>
          {/* Sidebar nav */}
          <nav style={modalStyles.nav}>
            {TABS.filter(t => isAdmin || (t.key !== "api" && t.key !== "generation")).map(t => (
              <button key={t.key}
                style={{ ...modalStyles.navItem, ...(tab === t.key ? modalStyles.navItemActive : {}) }}
                onClick={() => setTab(t.key)}>
                <span style={modalStyles.navIcon}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div style={modalStyles.content}>
            {tab === "general" && <GeneralTab form={form} set={set} initials={initials} isAdmin={isAdmin} onOpenAdmin={onOpenAdmin} logout={logout} user={user} onClose={onClose} />}
            {tab === "api" && <ApiTab form={form} set={set} />}
            {tab === "generation" && <GenerationTab form={form} set={set} />}
            {tab === "appearance" && <AppearanceTab form={form} set={set} />}
            {tab === "memory" && <MemoryTab form={form} set={set} />}
          {tab === "about" && <AboutTab />}

            {error && <div style={modalStyles.error}>{error}</div>}
          </div>
        </div>

        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{
            ...modalStyles.saveBtn,
            ...(saved ? modalStyles.savedBtn : {}),
          }} onClick={save} disabled={loading || saved}>
            {loading ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab panels ──────────────────────────────────────────────────────

function GeneralTab({ form, set, initials, isAdmin, onOpenAdmin, logout, user, onClose }) {
  return (
    <div style={tabStyles.panel}>
      <SectionTitle>Profile</SectionTitle>
      <SectionDesc>How you appear in the app and how the LLM addresses you.</SectionDesc>

      <div style={tabStyles.avatarRow}>
        <div style={tabStyles.avatar} className="mono">{initials}</div>
        <div style={{ flex: 1 }}>
          <Field label="Display name" value={form.display_name}
            onChange={v => set("display_name", v)} placeholder="Your name" />
          <Field label="Avatar initials" value={form.avatar_initials}
            onChange={v => set("avatar_initials", v)} placeholder={form.display_name?.slice(0,2).toUpperCase() || "JS"} />
        </div>
      </div>

      <Field label="What should the LLM call you?" value={form.llm_call_name}
        onChange={v => set("llm_call_name", v)} placeholder={form.display_name || "User"} />

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <SectionTitle>Account</SectionTitle>
        <SectionDesc>Manage your account and session.</SectionDesc>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {isAdmin && (
            <button style={tabStyles.accountBtn} onClick={() => { onClose(); onOpenAdmin(); }}>
              {I.Users}
              <span>Manage Users</span>
            </button>
          )}
          <button style={tabStyles.accountBtn} onClick={() => { onClose(); logout(); }}>
            {I.Logout}
            <span>Sign out{user ? ` (${user.display_name || user.username})` : ""}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiTab({ form, set }) {
  const providers = [
    { value: "ollama", label: "Ollama", desc: "Local models via Ollama" },
    { value: "openai", label: "OpenAI", desc: "OpenAI or compatible API" },
    { value: "deepseek", label: "DeepSeek", desc: "DeepSeek API" },
  ];

  return (
    <div style={tabStyles.panel}>
      <SectionTitle>API Keys</SectionTitle>
      <SectionDesc>Choose your LLM provider and configure access.</SectionDesc>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {providers.map(p => (
          <button key={p.value}
            onClick={() => set("provider", p.value)}
            style={{
              ...tabStyles.providerBtn,
              ...(form.provider === p.value ? tabStyles.providerBtnActive : {}),
            }}>
            <span style={{ fontWeight: form.provider === p.value ? 600 : 400 }}>{p.label}</span>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>{p.desc}</span>
          </button>
        ))}
      </div>

      {form.provider === "ollama" && (
        <>
          <Field label="Base URL" value={form.ollama_base}
            onChange={v => set("ollama_base", v)} placeholder="http://localhost:11434" />
          <Field label="Model" value={form.ollama_model}
            onChange={v => set("ollama_model", v)} placeholder="llama3.2" />
        </>
      )}

      {form.provider === "openai" && (
        <>
          <Field label="API Base URL" value={form.openai_base}
            onChange={v => set("openai_base", v)} placeholder="https://api.openai.com/v1" />
          <Field label="API Key" value={form.openai_key}
            onChange={v => set("openai_key", v)} placeholder="sk-…" type="password" />
          <Field label="Model" value={form.openai_model}
            onChange={v => set("openai_model", v)} placeholder="gpt-4o-mini" />
        </>
      )}

      {form.provider === "deepseek" && (
        <>
          <Field label="API Key" value={form.deepseek_key}
            onChange={v => set("deepseek_key", v)} placeholder="sk-…" type="password" />
          <Field label="Model" value={form.deepseek_model}
            onChange={v => set("deepseek_model", v)} placeholder="deepseek-chat" />
        </>
      )}
    </div>
  );
}

function GenerationTab({ form, set }) {
  return (
    <div style={tabStyles.panel}>
      <SectionTitle>Parameters</SectionTitle>
      <SectionDesc>Defaults for new conversations.</SectionDesc>

      <Row label="Temperature" value={form.temperature}>
        <input type="range" style={tabStyles.range}
          min="0" max="2" step="0.05" value={form.temperature}
          onChange={e => set("temperature", parseFloat(e.target.value))} />
      </Row>
      <Row label="Max response tokens">
        <input type="number" style={tabStyles.numInput} min={256} max={128000} step={256}
          value={form.max_tokens}
          onChange={e => set("max_tokens", parseInt(e.target.value) || 128000)} />
      </Row>
      <ToggleRow label="Stream responses" value={form.stream}
        onChange={v => set("stream", v)} />
    </div>
  );
}

function AppearanceTab({ form, set }) {
  return (
    <div style={tabStyles.panel}>
      <SectionTitle>Appearance</SectionTitle>
      <SectionDesc>Customise how the chat looks and behaves.</SectionDesc>

      <Row label="Chat font size" value={form.chat_font_size + "px"}>
        <input type="range" style={tabStyles.range}
          min="12" max="20" step="1" value={form.chat_font_size}
          onChange={e => set("chat_font_size", parseInt(e.target.value))} />
      </Row>
      <ToggleRow label="Enter to send" value={form.enter_to_send}
        onChange={v => set("enter_to_send", v)} />
      {!form.enter_to_send && (
        <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: -4, marginBottom: 4 }}>
          Ctrl+Enter to send, Enter for newline
        </div>
      )}
    </div>
  );
}

function MemoryTab({ form, set }) {
  const memories = form.memories || [];

  return (
    <div style={tabStyles.panel}>
      <SectionTitle>Memory</SectionTitle>
      <SectionDesc>Information the LLM remembers about you across conversations.</SectionDesc>

      {memories.length === 0 ? (
        <div style={tabStyles.emptyState} className="mono">
          No memories yet. Memories are created automatically as you chat.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {memories.map((mem, i) => (
            <div key={i} style={tabStyles.memRow}>
              <span style={tabStyles.memIcon}>{I.Book}</span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--ink-2)" }}>{mem.content || mem}</span>
              <button style={tabStyles.memDel}
                onClick={() => {
                  const next = [...memories];
                  next.splice(i, 1);
                  set("memories", next);
                }}
                title="Forget">{I.Close}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AboutTab() {
  return (
    <div style={tabStyles.panel}>
      <SectionTitle>About ProjektLLM</SectionTitle>
      <SectionDesc>An AI-powered project management workflow tool.</SectionDesc>

      <div style={aboutStyles.card}>
        <div style={aboutStyles.mark}>
          <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 7 C3 5.34315 4.34315 4 6 4 H9.5 L11 5.6 H18 C19.6569 5.6 21 6.94315 21 8.6 V9.5 H3 Z"
                  fill="oklch(0.68 0.18 35)" opacity="0.82"/>
            <path d="M3 8.6 C3 6.94315 4.34315 5.6 6 5.6 H18 C19.6569 5.6 21 6.94315 21 8.6 V18 C21 19.6569 19.6569 21 18 21 H6 C4.34315 21 3 19.6569 3 18 Z"
                  fill="oklch(0.68 0.18 35)"/>
            <rect x="6.4" y="9.4" width="11.2" height="9.2" rx="1.6" fill="white" opacity="0.96"/>
            <g transform="translate(12 14)" stroke="oklch(0.58 0.20 18)" stroke-width="1.5" stroke-linecap="round">
              <line x1="0" y1="-3" x2="0" y2="3"/>
              <line x1="-3" y1="0" x2="3" y2="0"/>
              <line x1="-2.1" y1="-2.1" x2="2.1" y2="2.1" opacity="0.55"/>
              <line x1="-2.1" y1="2.1" x2="2.1" y2="-2.1" opacity="0.55"/>
              <circle cx="0" cy="0" r="0.9" fill="oklch(0.58 0.20 18)" stroke="none"/>
            </g>
          </svg>
        </div>
        <div>
          <div style={aboutStyles.name}>ProjektLLM</div>
          <div className="mono" style={aboutStyles.version}>v0.4</div>
        </div>
      </div>

      <p style={aboutStyles.desc}>
        ProjektLLM is an open-source project that combines AI-powered chat with
        project management — grounded in your documents, files, and knowledge base.
      </p>

      <a href="https://github.com/trisanap/projektllm" target="_blank" rel="noopener noreferrer"
        style={aboutStyles.link}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z" />
        </svg>
        <span>trisanap/projektllm</span>
      </a>
    </div>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────

function SectionTitle({ children }) {
  return <div style={tabStyles.sectionTitle}>{children}</div>;
}

function SectionDesc({ children }) {
  return <div style={tabStyles.sectionDesc}>{children}</div>;
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={tabStyles.fieldLabel}>{label}</label>
      <input style={tabStyles.input} type={type} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Row({ label, value, children }) {
  return (
    <div style={tabStyles.row}>
      <span style={tabStyles.rowLabel}>{label}</span>
      <div style={tabStyles.rowControl}>{children}</div>
      {value != null && <span className="mono" style={tabStyles.rowValue}>{value}</span>}
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={tabStyles.row}>
      <span style={tabStyles.rowLabel}>{label}</span>
      <div style={{ flex: 1 }} />
      <button type="button" role="switch" aria-checked={!!value}
        style={{
          ...tabStyles.toggleTrack,
          background: value ? "var(--accent)" : "var(--line-2)",
        }}
        onClick={() => onChange(!value)}>
        <i style={{
          ...tabStyles.toggleThumb,
          transform: value ? "translateX(16px)" : "none",
        }} />
      </button>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const tabStyles = {
  panel: {
    display: "flex", flexDirection: "column", gap: 2,
    animation: "fadeIn 120ms ease-out",
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 2,
  },
  sectionDesc: {
    fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 16,
  },
  avatarRow: {
    display: "flex", gap: 14, alignItems: "flex-start",
    marginBottom: 4,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 12,
    background: "linear-gradient(135deg, var(--accent), oklch(0.66 0.17 18))",
    color: "white",
    display: "grid", placeItems: "center",
    fontSize: 14, fontWeight: 600, flexShrink: 0,
  },
  fieldLabel: {
    display: "block", fontSize: 12, fontWeight: 500,
    color: "var(--ink-3)", marginBottom: 4,
  },
  input: {
    width: "100%", height: 36, padding: "0 10px", borderRadius: 8,
    border: "1px solid var(--line)", background: "var(--surface)",
    fontSize: 13, color: "var(--ink)", outline: "none",
  },
  providerBtn: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "12px 8px", borderRadius: 10, border: "1px solid var(--line)",
    background: "var(--surface)", color: "var(--ink-2)", fontSize: 12, cursor: "pointer",
    transition: "border-color 120ms, background 120ms",
  },
  providerBtnActive: {
    borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)",
  },
  row: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "6px 0", minHeight: 32,
  },
  rowLabel: { fontSize: 13, color: "var(--ink-2)", flexShrink: 0 },
  rowControl: { flex: 1, display: "flex", justifyContent: "flex-end" },
  rowValue: {
    fontSize: 11, color: "var(--ink-3)", minWidth: 36, textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
  range: {
    width: "100%", maxWidth: 180, height: 4,
    appearance: "none", WebkitAppearance: "none",
    background: "var(--line)", borderRadius: 999, outline: "none",
    cursor: "pointer",
  },
  numInput: {
    width: 100, height: 32, padding: "0 8px", borderRadius: 7,
    border: "1px solid var(--line)", background: "var(--surface)",
    fontSize: 12.5, color: "var(--ink)", outline: "none",
    textAlign: "right", fontVariantNumeric: "tabular-nums",
  },
  toggleTrack: {
    position: "relative", width: 36, height: 20,
    border: 0, borderRadius: 999,
    cursor: "pointer", transition: "background 120ms", flexShrink: 0, padding: 0,
  },
  toggleThumb: {
    position: "absolute", top: 2, left: 2, width: 16, height: 16,
    borderRadius: "50%", background: "white",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transition: "transform 120ms",
  },
  accountBtn: {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    padding: "10px 12px", borderRadius: 9,
    background: "var(--surface)", border: "1px solid var(--line)",
    color: "var(--ink-2)", fontSize: 13, textAlign: "left",
    transition: "background 120ms",
  },
  emptyState: {
    padding: "32px 16px", textAlign: "center",
    fontSize: 11.5, color: "var(--ink-3)",
    background: "var(--surface)", border: "1px dashed var(--line-2)",
    borderRadius: 10,
  },
  memRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px",
    background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: 9,
  },
  memIcon: { color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 },
  memDel: {
    width: 24, height: 24, borderRadius: 6,
    display: "grid", placeItems: "center",
    color: "var(--ink-3)", flexShrink: 0, opacity: 0.5,
  },
};

const aboutStyles = {
  card: {
    display: "flex", alignItems: "center", gap: 14,
    padding: 16, background: "var(--surface)",
    border: "1px solid var(--line)", borderRadius: 12,
    marginBottom: 16,
  },
  mark: {
    width: 48, height: 48, borderRadius: 12,
    background: "var(--accent-soft)",
    display: "grid", placeItems: "center", flexShrink: 0,
  },
  name: { fontSize: 16, fontWeight: 600 },
  version: { fontSize: 12, color: "var(--ink-3)", marginTop: 2 },
  desc: {
    fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6,
    margin: 0, marginBottom: 16,
  },
  link: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 16px", borderRadius: 10,
    background: "var(--surface)", border: "1px solid var(--line)",
    color: "var(--ink)", fontSize: 13, fontWeight: 500,
    textDecoration: "none", transition: "border-color 120ms, background 120ms",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    width: 680, maxWidth: "92vw", maxHeight: "80vh",
    background: "var(--bg)", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 20px 0",
  },
  title: { fontSize: 16, fontWeight: 600, margin: 0 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--ink-3)" },
  bodyRow: {
    display: "flex", gap: 0, flex: 1, minHeight: 0,
    padding: "12px 0 0",
  },
  nav: {
    width: 160, flexShrink: 0,
    display: "flex", flexDirection: "column", gap: 2,
    padding: "0 8px",
    overflowY: "auto",
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 8,
    fontSize: 12.5, color: "var(--ink-2)",
    textAlign: "left", transition: "background 120ms, color 120ms",
  },
  navItemActive: {
    background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 500,
  },
  navIcon: {
    width: 18, height: 18,
    display: "grid", placeItems: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1, minWidth: 0, overflowY: "auto",
    padding: "0 20px 8px",
  },
  error: { fontSize: 12.5, color: "oklch(0.55 0.18 30)", padding: "6px 0" },
  footer: {
    display: "flex", justifyContent: "flex-end", gap: 8,
    padding: "16px 20px", borderTop: "1px solid var(--line)",
  },
  cancelBtn: {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, color: "var(--ink-2)",
    transition: "background 120ms",
  },
  saveBtn: {
    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    background: "var(--ink)", color: "var(--bg)",
    transition: "background 120ms",
  },
  savedBtn: {
    background: "var(--good)", color: "white",
  },
};
