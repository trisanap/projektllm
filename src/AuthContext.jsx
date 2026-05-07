// Auth context — manages JWT token and user state
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, getMe, setAuthToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore token from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('projektllm_token');
    if (saved) {
      setToken(saved);
      setAuthToken(saved);
      getMe()
        .then(u => { setUser(u); })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem('projektllm_token');
          setToken(null);
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await apiLogin(username, password);
    setToken(result.token);
    setUser(result.user);
    setAuthToken(result.token);
    localStorage.setItem('projektllm_token', result.token);
    return result;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('projektllm_token');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, isAdmin: user?.is_admin ?? false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
