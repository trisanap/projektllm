// API client for ProjektLLM backend

const BASE = '/api';

// Auth token management
let _authToken = null;

export function setAuthToken(token) {
  _authToken = token;
}

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (_authToken) h['Authorization'] = `Bearer ${_authToken}`;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: headers(options.headers),
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

// Auth
export const login = (username, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const getMe = () =>
  request('/auth/me');

// Projects
export const listProjects = () => request('/projects');
export const getProject = (id) => request(`/projects/${id}`);
export const createProject = () => request('/projects', { method: 'POST' });
export const patchProject = (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteProject = (id) => request(`/projects/${id}`, { method: 'DELETE' });
export const duplicateProject = (id) => request(`/projects/${id}/duplicate`, { method: 'POST' });

// Members
export const listProjectMembers = (pid) => request(`/projects/${pid}/members`);

// Sharing
export const shareProject = (pid, username, permission) =>
  request(`/projects/${pid}/share`, { method: 'POST', body: JSON.stringify({ username, permission }) });

export const getShares = (pid) =>
  request(`/projects/${pid}/shares`);

export const removeShare = (pid, uid) =>
  request(`/projects/${pid}/share/${uid}`, { method: 'DELETE' });

// User management (admin)
export const listUsers = () =>
  request('/auth/users');

export const createUser = (username, password, display_name) =>
  request('/auth/users', { method: 'POST', body: JSON.stringify({ username, password, display_name }) });

export const deleteUser = (uid) =>
  request(`/auth/users/${uid}`, { method: 'DELETE' });

// Chats
export const createChat = (pid) => request(`/projects/${pid}/chats`, { method: 'POST' });
export const patchChat = (cid, data) => request(`/chats/${cid}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteChat = (cid) => request(`/chats/${cid}`, { method: 'DELETE' });

// Messages
export const deleteMessage = (cid, mid) => request(`/chats/${cid}/messages/${mid}`, { method: 'DELETE' });

// Messages
export const listMessages = (cid) => request(`/chats/${cid}/messages`);
export async function streamCompletion(cid, content, model, onToken, onDone, onError, signal, extra = {}, onReasoning) {
  let finished = false;
  const finish = (fn, arg) => { if (!finished) { finished = true; fn?.(arg); } };

  let res;
  try {
    res = await fetch(`${BASE}/chats/${cid}/completions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ content, model, ...extra }),
      signal,
    });
  } catch (err) {
    finish(onError, err.message);
    return;
  }
  if (!res.ok) {
    const err = await res.text();
    finish(onError, `API ${res.status}: ${err}`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const ev = JSON.parse(raw);
          if (ev.type === 'token') {
            full += ev.content;
            onToken?.(ev.content, full);
          } else if (ev.type === 'reasoning') {
            onReasoning?.(ev.content);
          } else if (ev.type === 'done') {
            finish(onDone, ev.content || full);
          } else if (ev.type === 'error') {
            finish(onError, ev.content);
          }
        } catch { /* skip malformed */ }
      }
    }
  } catch (err) {
    finish(onError, err.message);
    return;
  }
  // If the stream ended without a 'done' event, finish normally with what we have
  finish(onDone, full);
}

// Auth-aware raw fetch helpers for file previews
export function fetchWithAuth(url) {
  const h = {};
  if (_authToken) h['Authorization'] = `Bearer ${_authToken}`;
  return fetch(url, { headers: h });
}

export function fetchViewData(fileId) {
  return fetchWithAuth(`${BASE}/files/${fileId}/view`).then(r => {
    if (!r.ok) throw new Error(`View API ${r.status}`);
    return r.json();
  });
}

export function fetchFileText(fileId) {
  return fetchWithAuth(`${BASE}/files/${fileId}/preview`).then(r => {
    if (!r.ok) throw new Error(`Preview API ${r.status}`);
    return r.text();
  });
}

// Files
export const listFiles = (pid) => request(`/projects/${pid}/files`);
export async function uploadFile(pid, file) {
  const fd = new FormData();
  fd.append('file', file);
  const h = {};
  if (_authToken) h['Authorization'] = `Bearer ${_authToken}`;
  const res = await fetch(`${BASE}/projects/${pid}/files`, { method: 'POST', body: fd, headers: h });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
export const deleteFile = (fid) => request(`/files/${fid}`, { method: 'DELETE' });
export const getFilePreviewUrl = (fid) => `${BASE}/files/${fid}/preview`;

// Artifacts
export const createArtifact = (pid, name, content) =>
  request(`/projects/${pid}/artifacts`, { method: 'POST', body: JSON.stringify({ name, content }) });

// Web search
export const webSearch = (query) => request('/web-search', { method: 'POST', body: JSON.stringify({ query }) });

// Settings
export const getSettings = () => request('/settings');
export const putSettings = (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) });

// Document generation
export async function generateDocx(title, content) {
  const res = await fetch(`${BASE}/generate/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error(`Generate DOCX failed: ${res.status}`);
  return res.blob();
}

export async function generateXlsx(title, sheets) {
  const res = await fetch(`${BASE}/generate/xlsx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, sheets }),
  });
  if (!res.ok) throw new Error(`Generate XLSX failed: ${res.status}`);
  return res.blob();
}

export async function generatePdf(title, content) {
  const res = await fetch(`${BASE}/generate/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error(`Generate PDF failed: ${res.status}`);
  return res.blob();
}

// File content extraction (read text from PDF, DOCX, XLSX)
export const extractFileContent = (fileId) =>
  request('/generate/extract', {
    method: 'POST',
    body: JSON.stringify({ file_id: fileId }),
  });

export async function extractUploadedFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/generate/extract-upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`Extract failed: ${res.status}`);
  return res.json();
}

// ── Skills ────────────────────────────────────────────────────────────────────
export const listSkills = () =>
  request('/skills');

export const getSkill = (name) =>
  request(`/skills/${name}`);

export const getSkillKnowledge = (name, path) =>
  request(`/skills/${name}/knowledge/${path}`);

export async function runSkill(name, data) {
  // data must include: client, reg, date, lead_auditor, auditor
  // plus file uploads: produk (File), bahan (File)
  const fd = new FormData();
  fd.append('produk', data.produk);
  fd.append('bahan', data.bahan);
  fd.append('client', data.client);
  fd.append('reg', data.reg);
  fd.append('date', data.date);
  fd.append('lead_auditor', data.lead_auditor);
  fd.append('auditor', data.auditor);
  fd.append('registration_type', data.registration_type || 'Pengajuan Baru');
  if (data.city) fd.append('city', data.city);
  if (data.product_type) fd.append('product_type', data.product_type);
  if (data.company) fd.append('company', data.company);
  if (data.penyelia) fd.append('penyelia', data.penyelia);
  if (data.penyelia_ktp) fd.append('penyelia_ktp', data.penyelia_ktp);
  if (data.penyelia_cert) fd.append('penyelia_cert', data.penyelia_cert);
  if (data.penyelia_sk) fd.append('penyelia_sk', data.penyelia_sk);
  if (data.penyelia_contact) fd.append('penyelia_contact', data.penyelia_contact);
  if (data.skip_api) fd.append('skip_api', 'true');

  const h = {};
  if (_authToken) h['Authorization'] = `Bearer ${_authToken}`;
  const res = await fetch(`${BASE}/skills/${name}/run`, { method: 'POST', body: fd, headers: h });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Skill run failed: ${res.status}: ${err}`);
  }
  return res.json();
}

export const getSkillDownloadUrl = (name, workDir, fileName) =>
  `${BASE}/skills/${name}/run/${workDir}/download/${fileName}`;

export async function saveSkillOutputToProject(name, workDirName, projectId, filePath, displayName) {
  const h = { 'Content-Type': 'application/json' };
  if (_authToken) h['Authorization'] = `Bearer ${_authToken}`;
  const res = await fetch(`${BASE}/skills/${name}/run/${workDirName}/save/${projectId}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ file_path: filePath, display_name: displayName }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Save failed: ${res.status}: ${err}`);
  }
  return res.json();
}
