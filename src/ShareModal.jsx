// Share project dialog — invite users with view/edit permission
import React, { useState, useEffect } from 'react';
import { I } from './icons.jsx';
import { getShares, shareProject, removeShare } from './api.js';

export default function ShareModal({ project, onClose }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [permission, setPermission] = useState('view');
  const [error, setError] = useState('');

  const loadShares = async () => {
    try {
      const data = await getShares(project.id);
      setShares(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShares(); }, [project.id]);

  const add = async () => {
    if (!username.trim()) return;
    setError('');
    try {
      await shareProject(project.id, username.trim(), permission);
      setUsername('');
      await loadShares();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (uid) => {
    try {
      await removeShare(project.id, uid);
      await loadShares();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...glyph, background: project.color }} className="mono">{project.glyph}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Share project</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{project.name}</div>
            </div>
          </div>
          <button style={closeBtn} onClick={onClose}>{I.Close}</button>
        </div>

        <div style={body}>
          {error && <div style={errBox}>{error}</div>}

          {/* Add person */}
          <div style={addRow}>
            <input
              style={nameInput}
              placeholder="Enter username…"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              autoFocus
            />
            <select style={permSelect} value={permission} onChange={e => setPermission(e.target.value)}>
              <option value="view">Can view</option>
              <option value="edit">Can edit</option>
            </select>
            <button style={inviteBtn} onClick={add} disabled={!username.trim()}>Share</button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>Shared with</div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }} className="mono">Loading…</div>
          ) : shares.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', border: '1px dashed var(--line-2)', borderRadius: 10, fontSize: 12 }} className="mono">
              Not shared with anyone yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shares.map(s => (
                <div key={s.id} style={shareRow}>
                  <div style={shareAvatar} className="mono">{(s.display_name || s.username || '?').slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={shareName}>{s.display_name || s.username}</div>
                    <div style={shareMeta} className="mono">
                      @{s.username} · {s.permission}
                    </div>
                  </div>
                  <button style={removeBtn} onClick={() => remove(s.user_id)} title="Remove">{I.Close}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'oklch(0 0 0 / 0.35)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modal = {
  width: 440, maxWidth: '92vw', maxHeight: '70vh',
  background: 'var(--bg)', borderRadius: 16, boxShadow: 'var(--shadow-lg)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const header = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 18px 0',
};
const glyph = {
  width: 32, height: 32, borderRadius: 8,
  display: 'grid', placeItems: 'center',
  color: 'white', fontSize: 12, fontWeight: 600, flexShrink: 0,
};
const closeBtn = {
  width: 28, height: 28, borderRadius: 7,
  display: 'grid', placeItems: 'center', color: 'var(--ink-3)',
};
const body = {
  flex: 1, minHeight: 0, overflowY: 'auto',
  padding: '14px 18px 18px',
};
const errBox = {
  fontSize: 12.5, color: 'oklch(0.55 0.18 30)',
  padding: '8px 10px', marginBottom: 10,
  background: 'oklch(0.93 0.04 30 / 0.3)', borderRadius: 8,
};
const addRow = {
  display: 'flex', gap: 8, marginBottom: 16,
};
const nameInput = {
  flex: 1, height: 38, padding: '0 10px',
  border: '1px solid var(--line)', borderRadius: 9,
  background: 'var(--surface)', fontSize: 13, color: 'var(--ink)', outline: 'none',
};
const permSelect = {
  height: 38, padding: '0 8px',
  border: '1px solid var(--line)', borderRadius: 9,
  background: 'var(--surface)', fontSize: 12, color: 'var(--ink)', outline: 'none',
};
const inviteBtn = {
  height: 38, padding: '0 14px', borderRadius: 9,
  fontSize: 13, fontWeight: 500,
  background: 'var(--ink)', color: 'var(--bg)',
};
const shareRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px',
  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9,
};
const shareAvatar = {
  width: 30, height: 30, borderRadius: 8,
  background: 'var(--accent-soft)', color: 'var(--accent-ink)',
  display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600,
  flexShrink: 0,
};
const shareName = { fontSize: 13, fontWeight: 500, color: 'var(--ink)' };
const shareMeta = { fontSize: 11, color: 'var(--ink-3)', marginTop: 1 };
const removeBtn = {
  width: 26, height: 26, borderRadius: 6,
  display: 'grid', placeItems: 'center',
  color: 'var(--ink-3)', flexShrink: 0, opacity: 0.5,
};
