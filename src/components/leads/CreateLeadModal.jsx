import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

export default function CreateLeadModal({ onClose, onCreated, users = [] }) {
  const { user } = useAuth()
  const { stages: STAGES, customFields } = useSettings()
  const [form, setForm] = useState({
    title: '', client_name: '', client_email: '', client_phone: '',
    client_company: '', description: '', priority: 'medium', value: '', assigned_to: '',
    stage: STAGES?.[0]?.id || 'meeting',
  })
  const [customData, setCustomData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setCustom = (k, v) => setCustomData(c => ({ ...c, [k]: v }))

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
    
    // Check required custom fields
    if (customFields?.length > 0) {
      for (const field of customFields) {
        const val = field.isSystem ? form[field.id] : customData[field.id];
        if (field.required && (!val || String(val).trim() === '')) {
          setError(`${field.label} is required`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const payload = { 
        ...form, 
        value: form.value ? parseFloat(form.value) : null, 
        assigned_to: form.assigned_to || null,
        custom_data: customData
      }
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Initial Stage *">
              <select style={s.input} value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
              </select>
            </Field>

            {customFields.map(field => {
              const isSys = field.isSystem;
              const val = isSys ? form[field.id] : (customData[field.id] || '');
              const onChange = (v) => isSys ? set(field.id, v) : setCustom(field.id, v);

              const handleChange = (e) => {
                if (field.type === 'phone') {
                  const num = e.target.value.replace(/[^0-9]/g, '');
                  if (num.length <= 10) onChange(num);
                } else if (field.type === 'number') {
                  onChange(e.target.value);
                } else if (field.type === 'name') {
                  const nameVal = e.target.value.replace(/[0-9]/g, '');
                  onChange(nameVal);
                } else {
                  onChange(e.target.value);
                }
                
                if (field.type === 'email') validateEmail(e.target.value);
              };

              let inputEl = null;

              if (field.type === 'textarea') {
                inputEl = <textarea style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} value={val || ''} onChange={handleChange} required={field.required} placeholder={`Enter ${field.label.toLowerCase()}`} />;
              } else if (field.type === 'user_dropdown') {
                inputEl = (
                  <select style={s.input} value={val || ''} onChange={handleChange} required={field.required}>
                    <option value="">Unassigned</option>
                    {users.filter(u => u.is_active !== false).map(u => (
                      <option key={u.id} value={u.id}>{u.name}{u.role ? ` (${u.role})` : ''}</option>
                    ))}
                  </select>
                );
              } else if (field.type === 'priority_dropdown') {
                inputEl = (
                  <select style={s.input} value={val || 'medium'} onChange={handleChange} required={field.required}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                );
              } else if (field.type === 'dropdown') {
                inputEl = (
                  <select style={s.input} value={val || ''} onChange={handleChange} required={field.required}>
                    <option value="">Select option...</option>
                    {field.options && field.options.split(',').map(opt => opt.trim()).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                );
              } else {
                const typeMap = { 'phone': 'tel', 'number': 'number', 'email': 'email', 'name': 'text', 'text': 'text' };
                inputEl = (
                  <input
                    type={typeMap[field.type] || 'text'}
                    style={{ ...s.input, borderColor: (field.type === 'email' && emailError) || (field.type === 'phone' && val?.length > 0 && val?.length < 10) ? 'var(--red)' : undefined }}
                    value={val || ''}
                    onChange={handleChange}
                    required={field.required}
                    placeholder={field.type === 'phone' ? '9999900000' : `Enter ${field.label.toLowerCase()}`}
                    step={field.type === 'number' ? '0.01' : undefined}
                  />
                );
              }

              return (
                <div key={field.id} style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                  <Field label={`${field.label} ${field.required ? '*' : ''}`}>
                    {inputEl}
                    {field.type === 'email' && emailError && <span style={s.fieldError}>{emailError}</span>}
                    {field.type === 'phone' && val?.length > 0 && val?.length < 10 && <span style={s.fieldError}>Phone must be 10 digits</span>}
                  </Field>
                </div>
              );
            })}
          </div>

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
