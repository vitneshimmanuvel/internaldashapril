import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lf_user')); } catch { return null; }
  });
  const [activeBoardId, setActiveBoardId] = useState(() => localStorage.getItem('lf_active_board_id'));
  const [loading, setLoading] = useState(true);

  // Helper to ensure a valid board is selected
  const ensureValidBoard = useCallback((u) => {
    if (!u || !u.boards || u.boards.length === 0) {
      localStorage.removeItem('lf_active_board_id');
      setActiveBoardId(null);
      return;
    }
    const currentId = localStorage.getItem('lf_active_board_id');
    if (!currentId || !u.boards.find(b => b.id === currentId)) {
      const newId = u.boards[0].id;
      localStorage.setItem('lf_active_board_id', newId);
      setActiveBoardId(newId);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('lf_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(r => { 
        setUser(r.data.user); 
        localStorage.setItem('lf_user', JSON.stringify(r.data.user)); 
        ensureValidBoard(r.data.user);
      })
      .catch(() => { localStorage.removeItem('lf_token'); localStorage.removeItem('lf_user'); localStorage.removeItem('lf_active_board_id'); setUser(null); setActiveBoardId(null); })
      .finally(() => setLoading(false));
  }, [ensureValidBoard]);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('lf_token', r.data.token);
    localStorage.setItem('lf_user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    ensureValidBoard(r.data.user);
    return r.data.user;
  }, [ensureValidBoard]);

  const logout = useCallback(() => {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
    localStorage.removeItem('lf_active_board_id');
    setUser(null);
    setActiveBoardId(null);
  }, []);

  const switchBoard = useCallback((boardId) => {
    localStorage.setItem('lf_active_board_id', boardId);
    setActiveBoardId(boardId);
    window.location.reload(); // Reset all state across the app
  }, []);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, activeBoardId, switchBoard, loading, login, logout, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
