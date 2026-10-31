import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/adminService.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'kim_admin_session';

const readSession = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const loginResponse = await adminService.login(email, password);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loginResponse));
    setSession(loginResponse);
  }, []);

  // Le client API déclenche cet événement lorsque le jeton est refusé (401).
  useEffect(() => {
    window.addEventListener('kim:unauthorized', logout);
    return () => window.removeEventListener('kim:unauthorized', logout);
  }, [logout]);

  const value = useMemo(() => ({
    token: session?.token || null,
    user: session?.user || null,
    isAuthenticated: Boolean(session?.token),
    login,
    logout,
  }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
