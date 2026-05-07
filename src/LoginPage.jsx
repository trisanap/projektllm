// Login page — split layout: welcome panel (left) + sign-in panel (right)
import React, { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { I } from './icons.jsx';

const features = [
  { icon: I.Book, title: 'Organize knowledge', desc: 'Upload PDFs, DOCX, spreadsheets and let AI index them for instant retrieval.' },
  { icon: I.Chat, title: 'Chat with your documents', desc: 'Ask questions across all your files and get answers with citations.' },
  { icon: I.Code, title: 'Self-hosted & private', desc: 'Runs on your own infrastructure. Your data never leaves your servers.' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div className="loginpage-container" style={s.container}>

        {/* ── Left panel: welcome / marketing ── */}
        <div className="loginpage-left" style={s.left}>
          <div style={s.logoWrap}>
            <I.Logo size={48} />
          </div>
          <h1 style={s.title}>ProjektLLM</h1>
          <p style={s.tagline}>
            Claude.ai-like platform, powered by Claude-like LLM API
          </p>

          <div style={s.pills}>
            <span style={s.pill}>large context</span>
            <span style={s.pill}>BYOK</span>
            <span style={s.pill}>self-hosted</span>
          </div>

          <div style={s.features}>
            {features.map((f, i) => (
              <div key={i} style={s.featureRow}>
                <div style={s.featureIcon}>{f.icon}</div>
                <div>
                  <div style={s.featureTitle}>{f.title}</div>
                  <div style={s.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <a
            href="https://github.com/trisanap/projektllm"
            target="_blank"
            rel="noopener noreferrer"
            style={s.ghLink}
            className="mono"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            View on GitHub
          </a>
        </div>

        {/* ── Right panel: sign in ── */}
        <div className="loginpage-right" style={s.right}>
          <div style={s.rightInner}>
            <h2 style={s.signInTitle}>Sign in</h2>

            <form onSubmit={handleSubmit} style={s.form}>
              <label style={s.label}>Username</label>
              <input
                style={s.input}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
              />

              <label style={{ ...s.label, marginTop: 14 }}>Password</label>
              <input
                style={s.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              {error && <div style={s.error}>{error}</div>}

              <button
                type="submit"
                style={{ ...s.btn, ...(busy ? s.btnBusy : {}) }}
                disabled={busy || !username.trim() || !password}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

const s = {
  wrap: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-2)',
    padding: 24,
  },
  container: {
    display: 'flex',
    width: '100%',
    maxWidth: 800,
    minHeight: 480,
    background: 'var(--bg)',
    border: '1px solid var(--line)',
    borderRadius: 20,
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    animation: 'fadeIn 200ms ease-out',
  },

  // Left panel
  left: {
    flex: 1,
    padding: '40px 36px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    borderRight: '1px solid var(--line)',
    background: 'var(--surface)',
  },
  logoWrap: {
    marginBottom: 16,
    width: 64,
    height: 64,
    borderRadius: 18,
    background: 'var(--bg)',
    border: '1px solid var(--line)',
    display: 'grid',
    placeItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    letterSpacing: -0.5,
    color: 'var(--ink)',
  },
  tagline: {
    fontSize: 13,
    color: 'var(--ink-2)',
    margin: '4px 0 14px',
    lineHeight: 1.55,
  },
  pills: {
    display: 'flex',
    gap: 6,
    marginBottom: 24,
  },
  pill: {
    fontSize: 10.5,
    color: 'var(--ink-3)',
    background: 'var(--bg)',
    border: '1px solid var(--line)',
    borderRadius: 6,
    padding: '3px 10px',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flex: 1,
  },
  featureRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  featureIcon: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--bg)',
    border: '1px solid var(--line)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--ink-2)',
    marginTop: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: 'var(--ink-3)',
    lineHeight: 1.5,
  },
  ghLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    fontSize: 12,
    color: 'var(--ink-3)',
    textDecoration: 'none',
    transition: 'color 120ms',
  },

  // Right panel
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  rightInner: {
    width: '100%',
    maxWidth: 280,
  },
  signInTitle: {
    fontSize: 18,
    fontWeight: 650,
    margin: '0 0 20px',
    color: 'var(--ink)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-2)',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    height: 40,
    padding: '0 12px',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    color: 'var(--ink)',
    transition: 'border-color 120ms, box-shadow 120ms',
  },
  error: {
    fontSize: 12.5,
    color: 'oklch(0.55 0.18 30)',
    marginTop: 14,
    padding: '8px 10px',
    background: 'oklch(0.93 0.04 30 / 0.3)',
    borderRadius: 8,
    textAlign: 'center',
  },
  btn: {
    height: 42,
    marginTop: 18,
    borderRadius: 10,
    background: 'var(--ink)',
    color: 'var(--bg)',
    fontSize: 14,
    fontWeight: 600,
    transition: 'opacity 120ms',
    border: 'none',
    cursor: 'pointer',
  },
  btnBusy: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

};

// Inject a stylesheet for the responsive breakpoint (inline styles can't do @media)
const styleId = 'loginpage-responsive';
if (!document.getElementById(styleId)) {
  const sheet = document.createElement('style');
  sheet.id = styleId;
  sheet.textContent = `
    @media (max-width: 700px) {
      .loginpage-container {
        flex-direction: column !important;
        max-width: 400px !important;
      }
      .loginpage-left {
        border-right: none !important;
        border-bottom: 1px solid var(--line) !important;
        padding: 32px 28px 24px !important;
      }
      .loginpage-right {
        padding: 28px !important;
      }
    }
  `;
  document.head.appendChild(sheet);
}
