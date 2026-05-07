// Admin user management panel
import React, { useState, useEffect } from 'react';
import { I } from './icons.jsx';
import { listUsers, createUser as apiCreateUser, deleteUser as apiDeleteUser } from './api.js';

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', display_name: '' });
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const create = async () => {
    if (!form.username.trim() || !form.password) return;
    setError('');
    try {
      await apiCreateUser(form.username.trim(), form.password, form.display_name.trim());
      setForm({ username: '', password: '', display_name: '' });
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (uid, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await apiDeleteUser(uid);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>User Management</h3>
          <button style={closeBtn} onClick={onClose}>{I.Close}</button>
        </div>

        <div style={body}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{users.length} user(s)</span>
            <button style={addBtn} onClick={() => setShowForm(o => !o)}>
              {showForm ? 'Cancel' : '+ Add user'}
            </button>
          </div>

          {showForm && (
            <div style={formCard}>
              <input style={inp} placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoFocus />
              <input style={inp} type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <input style={inp} placeholder="Display name (optional)" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
              <button style={saveBtn} onClick={create}>Create user</button>
            </div>
          )}

          {error && <div style={errBox}>{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }} className="mono">Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {users.map(u => (
                <div key={u.id} style={userRow}>
                  <div style={userInfo}>
                    <div style={userName}>{u.display_name || u.username}</div>
                    <div style={userMeta} className="mono">
                      @{u.username}
                      {u.is_admin && <span style={adminBadge}>admin</span>}
                    </div>
                  </div>
                  {!u.is_admin && (
                    <button style={delBtn} onClick={() => remove(u.id, u.username)} title="Delete user">{I.Trash}</button>
                  )}
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
  width: 460, maxWidth: '92vw', maxHeight: '75vh',
  background: 'var(--bg)', borderRadius: 16, boxShadow: 'var(--shadow-lg)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const header = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 18px 0',
};
const closeBtn = {
  width: 28, height: 28, borderRadius: 7,
  display: 'grid', placeItems: 'center', color: 'var(--ink-3)',
};
const body = {
  flex: 1, minHeight: 0, overflowY: 'auto',
  padding: '14px 18px 18px',
};
const addBtn = {
  height: 32, padding: '0 12px', borderRadius: 8,
  fontSize: 12, fontWeight: 500,
  background: 'var(--ink)', color: 'var(--bg)',
};
const formCard = {
  display: 'flex', flexDirection: 'column', gap: 8,
  padding: 14, marginBottom: 12,
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 10,
};
const inp = {
  width: '100%', height: 36, padding: '0 10px',
  border: '1px solid var(--line)', borderRadius: 8,
  background: 'var(--bg)', fontSize: 13, color: 'var(--ink)', outline: 'none',
};
const saveBtn = {
  height: 34, borderRadius: 8,
  background: 'var(--good)', color: 'white',
  fontSize: 13, fontWeight: 500, marginTop: 4,
};
const errBox = {
  fontSize: 12.5, color: 'oklch(0.55 0.18 30)',
  padding: '8px 10px', marginBottom: 10,
  background: 'oklch(0.93 0.04 30 / 0.3)', borderRadius: 8,
};
const userRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 12px',
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 10,
};
const userInfo = { flex: 1, minWidth: 0 };
const userName = { fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' };
const userMeta = { fontSize: 11, color: 'var(--ink-3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 };
const adminBadge = {
  fontSize: 9.5, background: 'var(--warn)', color: 'white',
  padding: '1px 6px', borderRadius: 999, letterSpacing: 0.3,
};
const delBtn = {
  width: 30, height: 30, borderRadius: 7,
  display: 'grid', placeItems: 'center',
  color: 'var(--ink-3)', flexShrink: 0,
};
