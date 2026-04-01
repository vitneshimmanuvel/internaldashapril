import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lf_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lf_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(r => { setUser(r.data.user); localStorage.setItem('lf_user', JSON.stringify(r.data.user)); })
      .catch(() => { localStorage.removeItem('lf_token'); localStorage.removeItem('lf_user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('lf_token', r.data.token);
    localStorage.setItem('lf_user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
