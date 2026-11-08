import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'kim_session';
export const ADMINISTRATOR_ROLE = 'Administrateur';

const readSession = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
};

/** Connexion unique pour tous : le rôle du compte décide de l'espace affiché (visiteur ou administration). */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const openSession = useCallback((sessionData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    setSession(sessionData);
    return sessionData.user;
  }, []);

  const login = useCallback(async (email, password) => openSession(await authService.login(email, password)), [openSession]);
  const loginWithGoogle = useCallback(async (credential, state) => openSession(await authService.loginWithGoogle(credential, state)), [openSession]);
  const register = useCallback(async (accountData) => openSession(await authService.register(accountData)), [openSession]);

  // Le client API déclenche cet événement lorsque le jeton est refusé (401).
  useEffect(() => {
    window.addEventListener('kim:unauthorized', logout);
    return () => window.removeEventListener('kim:unauthorized', logout);
  }, [logout]);

  const value = useMemo(() => ({
    token: session?.token || null,
    user: session?.user || null,
    isAuthenticated: Boolean(session?.token),
    isAdministrator: session?.user?.role === ADMINISTRATOR_ROLE,
    login, loginWithGoogle, register, logout,
  }), [session, login, loginWithGoogle, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
