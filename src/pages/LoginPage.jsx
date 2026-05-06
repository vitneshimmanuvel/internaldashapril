import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Sun, Moon } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg} />
      <button onClick={toggleTheme} className="theme-toggle" style={styles.themeToggle} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div style={styles.card} className="animate-fade">
        <div style={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="#4f7cff" fillOpacity="0.15"/>
            <path d="M8 26 L14 14 L20 20 L26 10" stroke="#4f7cff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="26" cy="10" r="3" fill="#4f7cff"/>
          </svg>
          <span style={styles.logoText}>LeadFlow</span>
        </div>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your workspace</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                style={{ ...styles.input, width: '100%', paddingRight: '40px' }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', background: 'none', 
                  border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>


      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  themeToggle: {
    position: 'absolute', top: '20px', right: '20px', zIndex: 10,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '8px',
    color: 'var(--text-secondary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.2s, color 0.2s',
  },
  bg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(79,124,255,0.15), transparent)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: '400px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px',
    position: 'relative',
    zIndex: 1,
    boxShadow: 'var(--shadow-lg)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' },
  logoText: { fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' },
  title: { fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '6px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '11px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'var(--font-body)',
  },
  btn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.02em',
    transition: 'background 0.15s',
  },
  error: {
    background: 'var(--red-dim)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: '#fca5a5',
    fontSize: '13px',
  },
  credentials: {
    marginTop: '24px', padding: '14px', borderRadius: 'var(--radius)',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  },
  credTitle: {
    fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
  },
  credRow: {
    fontSize: '11px', color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0',
  },
  credRole: {
    borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
    minWidth: '56px', textAlign: 'center',
  },
}
