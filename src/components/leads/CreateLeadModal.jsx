import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

export default function CreateLeadModal({ onClose, onCreated, users = [] }) {
  const { user } = useAuth()
  const { stages: STAGES } = useSettings()
  const [form, setForm] = useState({
    title: '', client_name: '', client_email: '', client_phone: '',
    client_company: '', description: '', priority: 'medium', value: '', assigned_to: '',
    stage: STAGES?.[0]?.id || 'meeting',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validateEmail = (email) => {
    if (!email) { setEmailError(''); return true }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) { setEmailError('Invalid email address'); return false }
    setEmailError('')
    return true
  }

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    if (val.length <= 10) {
      set('client_phone', val)
      if (val.length > 0 && val.length < 10) {
        setPhoneError('Phone must be 10 digits')
      } else {
        setPhoneError('')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateEmail(form.client_email)) return
    if (form.client_phone && form.client_phone.length !== 10) {
      setPhoneError('Phone must be 10 digits')
      return
    }
    setLoading(true)
    try {
      const payload = { ...form, value: form.value ? parseFloat(form.value) : null, assigned_to: form.assigned_to || null }
      const r = await api.post('/leads', payload)
      onCreated(r.data.lead)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal} className="animate-fade">
        <div style={s.header}>
          <h2 style={s.title}>New Lead</h2>
          <button style={s.close} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.row}>
            <Field label="Lead Title *">
              <input style={s.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Website Redesign Project" required />
            </Field>
            <Field label="Initial Stage">
              <select style={s.input} value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
              </select>
            </Field>
          </div>

          <div style={s.row}>
            <Field label="Client Name *">
              <input style={s.input} value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="John Doe" required />
            </Field>
            <Field label="Company">
              <input style={s.input} value={form.client_company} onChange={e => set('client_company', e.target.value)} placeholder="Acme Corp" />
            </Field>
          </div>

          <div style={s.row}>
            <Field label="Email">
              <input 
                style={{ ...s.input, borderColor: emailError ? 'var(--red)' : undefined }} 
                type="text"
                value={form.client_email} 
                onChange={e => { set('client_email', e.target.value); validateEmail(e.target.value) }}
                onBlur={() => validateEmail(form.client_email)}
                placeholder="client@company.com" 
              />
              {emailError && <span style={s.fieldError}>{emailError}</span>}
            </Field>
            <Field label="Phone (10 digits)">
              <input 
                style={{ ...s.input, borderColor: phoneError ? 'var(--red)' : undefined }}
                type="tel"
                inputMode="numeric"
                value={form.client_phone} 
                onChange={handlePhoneChange}
                placeholder="9999900000"
                maxLength={10}
              />
              {phoneError && <span style={s.fieldError}>{phoneError}</span>}
            </Field>
          </div>

          <div style={s.row}>
            <Field label="Deal Value (₹)">
              <input style={s.input} type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </Field>
            <Field label="Priority">
              <select style={s.input} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>

          {users.length > 0 && (
            <Field label="Assign To">
              <select style={s.input} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">Unassigned</option>
                {users.filter(u => u.is_active).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Description">
            <textarea style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief notes about this lead…" />
          </Field>

          <div style={s.footer}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Creating…' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
      <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: '20px',
  },
  modal: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '640px',
    maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)',
  },
  header: {
    padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
    background: 'var(--bg-surface)', zIndex: 1,
  },
  title: { fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700 },
  close: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '4px' },
  form: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  row: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  input: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '9px 12px',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    width: '100%', fontFamily: 'var(--font-body)',
  },
  fieldError: {
    color: 'var(--red)', fontSize: '11px', marginTop: '2px',
  },
  error: {
    background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: '#fca5a5', fontSize: '13px',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' },
  cancelBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '9px 18px', color: 'var(--text-secondary)',
    fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
  submitBtn: {
    background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)',
    padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font-display)',
  },
}
