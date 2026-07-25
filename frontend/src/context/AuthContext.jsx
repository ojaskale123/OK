import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, setUnauthorizedHandler } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const restoreGeneration = useRef(0);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const persistSession = useCallback((userData, userToken) => {
    const { token: _ignored, ...safeUser } = userData || {};
    setUser(safeUser);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(safeUser));
  }, []);

  const restoreSession = useCallback(async () => {
    const gen = ++restoreGeneration.current;
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      if (gen === restoreGeneration.current) {
        clearAuth();
        setAuthReady(true);
      }
      return;
    }

    try {
      const res = await apiFetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (gen !== restoreGeneration.current) return;

      if (!res.ok) {
        clearAuth();
        return;
      }

      const data = await res.json();
      persistSession(data, storedToken);
    } catch {
      if (gen !== restoreGeneration.current) return;
      clearAuth();
    } finally {
      if (gen === restoreGeneration.current) {
        setAuthReady(true);
      }
    }
  }, [clearAuth, persistSession]);

  useEffect(() => {
    setUnauthorizedHandler(clearAuth);
    return () => setUnauthorizedHandler(null);
  }, [clearAuth]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = (userData, userToken) => {
    restoreGeneration.current += 1;
    persistSession(userData, userToken);
    setAuthReady(true);
  };

  const logout = () => {
    restoreGeneration.current += 1;
    clearAuth();
    setAuthReady(true);
  };

  const updateUser = (data) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...data };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, authReady, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
