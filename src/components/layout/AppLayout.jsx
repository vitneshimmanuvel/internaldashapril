import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Bell, Shield, LogOut, Zap, MapPin } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'

import { setupFCM } from '../../firebase'

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [reminderCount, setReminderCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const notifiedSet = useRef(new Set())

  const checkReminders = () => {
    api.get('/reminders/mine').then(r => {
      const pending = r.data.reminders || []
      setReminderCount(pending.length)
    }).catch(() => {})
  }

  useEffect(() => {
    window.showFcmToast = (payload) => {
      const title = payload.notification?.title || 'Notification';
      const body = payload.notification?.body || '';
      toast.custom((t) => (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
          padding: '12px 16px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
          display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '300px', cursor: 'pointer'
        }} onClick={() => {toast.dismiss(t.id); navigate(payload.data?.url || '/reminders')}}>
          <Bell size={16} style={{ color: 'var(--accent)', marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{body}</div>
          </div>
        </div>
      ), { duration: 8000 })
    };

    setupFCM()
    
    checkReminders()
    const interval = setInterval(checkReminders, 60000)
    return () => {
      clearInterval(interval)
      delete window.showFcmToast
    }
  }, [navigate])

  const handleLogout = () => { logout(); navigate('/login') }

  const roleColor = user?.role === 'admin' ? 'var(--accent)' : user?.role === 'manager' ? 'var(--green)' : 'var(--text-muted)'

  return (
    <div style={s.shell}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside style={s.sidebar} className={sidebarOpen ? 'sidebar-open' : ''}>
        <div style={s.sidebarTop}>
          <div style={s.brand}>
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#4f7cff" fillOpacity="0.15"/>
              <path d="M8 26 L14 14 L20 20 L26 10" stroke="#4f7cff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="26" cy="10" r="3" fill="#4f7cff"/>
            </svg>
            <span style={s.brandText}>LeadFlow</span>
          </div>
        </div>

        <nav style={s.nav}>
          <div style={s.navSection}>USER NAVIGATION</div>
          <NavLink to="/" end style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navActive : {}) })} onClick={() => setSidebarOpen(false)}>
            <LayoutDashboard size={16} />
            <span>Pipeline Board</span>
          </NavLink>
          <NavLink to="/reminders" style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navActive : {}) })} onClick={() => setSidebarOpen(false)}>
            <Bell size={16} />
            <span>Reminders</span>
            {reminderCount > 0 && <span style={s.badge}>{reminderCount}</span>}
          </NavLink>
          {isAdmin && (
            <>
              <div style={{...s.navSection, marginTop: '20px'}}>ADMIN NAVIGATION</div>
              <NavLink to="/admin/dashboard" style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navActive : {}) })} onClick={() => setSidebarOpen(false)}>
                <Zap size={16} />
                <span>Activity Dashboard</span>
              </NavLink>
              <NavLink to="/admin" end style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navActive : {}) })} onClick={() => setSidebarOpen(false)}>
                <Shield size={16} />
                <span>Team & Pipeline</span>
              </NavLink>
              <NavLink to="/admin/travel" style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navActive : {}) })} onClick={() => setSidebarOpen(false)}>
                <MapPin size={16} />
                <span>Travel Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.userCard}>
            <div style={s.avatar}>{user?.name?.charAt(0)?.toUpperCase()}</div>
            <div style={s.userInfo}>
              <div style={s.userName}>{user?.name}</div>
              <div style={{ ...s.userRole, color: roleColor }}>{user?.role === 'visitor' ? 'employee' : user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={s.main}>
        {/* Mobile header */}
        <header style={s.mobileHeader}>
          <button className="menu-btn" style={s.menuBtn} onClick={() => setSidebarOpen(v => !v)}>
            <span /><span /><span />
          </button>
          <div style={s.mobileBrand}>
            <Zap size={18} color="var(--accent)" />
            <span style={s.brandText}>LeadFlow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {reminderCount > 0 && (
              <button style={s.mobileBell} onClick={() => navigate('/reminders')}>
                <Bell size={18} />
                <span style={s.badge}>{reminderCount}</span>
              </button>
            )}
          </div>

        </header>

        <main style={s.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const s = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' },
  sidebar: {
    width: 'var(--sidebar-width)',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    flexShrink: 0,
    transition: 'transform 0.25s ease',
    zIndex: 50,
  },
  sidebarTop: { padding: '20px 16px 16px' },
  brand: { display: 'flex', alignItems: 'center', gap: '10px' },
  brandText: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' },
  nav: { flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '2px' },
  navSection: { 
    fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', 
    textTransform: 'uppercase', letterSpacing: '0.08em', 
    padding: '8px 12px 4px', 
  },
  navLink: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)', textDecoration: 'none',
    fontSize: '13.5px', fontWeight: 500, transition: 'all 0.15s',
    position: 'relative',
  },
  navActive: { background: 'var(--accent-dim)', color: 'var(--accent)' },
  badge: {
    marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
    borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: 700,
  },
  sidebarBottom: {
    padding: '12px 12px 16px',
    borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  userCard: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' },
  avatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, flexShrink: 0,
  },
  userInfo: { overflow: 'hidden' },
  userName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: '11px', textTransform: 'capitalize', fontWeight: 500 },
  logoutBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: '6px', borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center',
    transition: 'color 0.15s',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  mobileHeader: {
    display: 'none',
    height: '56px', padding: '0 16px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    alignItems: 'center', gap: '12px',
  },
  menuBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px',
  },
  mobileBrand: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  mobileBell: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px',
  },
  content: { flex: 1, overflow: 'auto' },
}
