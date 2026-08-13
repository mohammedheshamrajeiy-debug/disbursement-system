import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setStoredUser, getStoredUser, clearAuth } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((data) => {
        setUser(data.user);
        setStoredUser(data.user);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    setToken(data.token);
    setUser(data.user);
    setStoredUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
