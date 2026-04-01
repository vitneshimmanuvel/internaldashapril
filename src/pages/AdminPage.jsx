import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, UserX, UserCheck, X, Check, Shield, Eye, Briefcase, List, GripVertical, Trash2, Users } from 'lucide-react'
import api from '../utils/api'
import { format } from 'date-fns'
import { useSettings } from '../context/SettingsContext'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'visitor' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('users') // 'users' or 'pipeline'
  
  const { stages, setStages, fetchSettings } = useSettings()
  const [editingStages, setEditingStages] = useState([])
  const [savingStages, setSavingStages] = useState(false)

  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const handleSort = () => {
    let _stages = [...editingStages]
    const draggedItemContent = _stages.splice(dragItem.current, 1)[0]
    _stages.splice(dragOverItem.current, 0, draggedItemContent)
    dragItem.current = null
    dragOverItem.current = null
    setEditingStages(_stages)
  }

  useEffect(() => {
    if (stages && stages.length > 0) {
      setEditingStages(JSON.parse(JSON.stringify(stages)))
    }
  }, [stages])

  const fetchUsers = async () => {
    try {
      const r = await api.get('/users')
      setUsers(r.data.users)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', role: 'visitor' })
    setError('')
    setSuccess('')
    setEditUser(null)
    setShowPassword(false)
    setShowCreate(true)
  }

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, is_active: u.is_active })
    setError('')
    setSuccess('')
    setEditUser(u)
    setShowPassword(false)
    setShowCreate(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      if (editUser) {
        const payload = { name: form.name, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        await api.put(`/users/${editUser.id}`, payload)
        if (form.password) setSuccess(`Password for ${form.name} has been updated.`)
      } else {
        await api.post('/users', form)
        setSuccess(`User ${form.name} created.`)
      }
      await fetchUsers()
      setShowCreate(false)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving user')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active })
      await fetchUsers()
    } catch (err) {
      console.error(err.response?.data?.message)
    }
  }

  const roleIcon = (role) => {
    if (role === 'admin') return <Shield size={12} />
    if (role === 'manager') return <Briefcase size={12} />
    return <Eye size={12} />
  }

  const roleColor = (role) => {
    if (role === 'admin') return 'var(--accent)'
    if (role === 'manager') return 'var(--green)'
    return 'var(--text-muted)'
  }

  const admins = users.filter(u => u.role === 'admin')
  const managers = users.filter(u => u.role === 'manager')
  const visitors = users.filter(u => u.role === 'visitor')

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Admin Panel</h1>
          <p style={s.subtitle}>Manage team members, roles, and pipeline configurations</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...s.tabBtn, background: activeTab === 'users' ? 'var(--bg-elevated)' : 'transparent', color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setActiveTab('users')}>
            <Users size={14} /> Users
          </button>
          <button style={{ ...s.tabBtn, background: activeTab === 'pipeline' ? 'var(--bg-elevated)' : 'transparent', color: activeTab === 'pipeline' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setActiveTab('pipeline')}>
            <List size={14} /> Pipeline Stages
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button style={s.createBtn} onClick={openCreate}>
              <Plus size={15} /> Add Employee
            </button>
          </div>

      {success && (
        <div style={s.successWrap} className="animate-fade">
          <Check size={16} color="var(--green)" />
          <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{success}</span>
        </div>
      )}

      {/* Stats */}
      <div style={s.stats}>
        {[
          { label: 'Total Users', value: users.length, color: 'var(--accent)' },
          { label: 'Managers', value: managers.length, color: 'var(--green)' },
          { label: 'Employees', value: visitors.length, color: 'var(--text-secondary)' },
          { label: 'Active', value: users.filter(u => u.is_active).length, color: 'var(--green)' },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* User table */}
      {loading ? (
        <div style={s.loading}>Loading users…</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ ...s.tr, opacity: u.is_active ? 1 : 0.5 }}>
                  <td style={s.td}>
                    <div style={s.userCell}>
                      <div style={{ ...s.avatar, background: `${roleColor(u.role)}20`, color: roleColor(u.role) }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={s.userName}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, color: 'var(--text-secondary)', fontSize: '12px' }}>{u.email}</td>
                  <td style={s.td}>
                    <span style={{ ...s.rolePill, background: `${roleColor(u.role)}20`, color: roleColor(u.role) }}>
                      {roleIcon(u.role)}
                      {u.role === 'visitor' ? 'employee' : u.role}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      ...s.statusPill,
                      background: u.is_active ? 'var(--green-dim)' : 'var(--red-dim)',
                      color: u.is_active ? 'var(--green)' : 'var(--red)',
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontSize: '11px', color: 'var(--text-muted)' }}>
                    {format(new Date(u.created_at), 'dd MMM yyyy')}
                  </td>
                  <td style={s.td}>
                    <div style={s.actions}>
                      {u.role !== 'admin' && (
                        <>
                          <button style={s.actionBtn} onClick={() => openEdit(u)} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button
                            style={{ ...s.actionBtn, color: u.is_active ? 'var(--red)' : 'var(--green)' }}
                            onClick={() => toggleActive(u)}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>)}

      {/* PIPELINE SETTINGS */}
      {activeTab === 'pipeline' && (
        <div style={s.tableWrap}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Pipeline Stages</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Customize the sales flow stages. Drag to reorder. Changes apply globally.</p>
            </div>
            <button 
              style={{ ...s.saveBtn, opacity: savingStages ? 0.7 : 1 }} 
              disabled={savingStages}
              onClick={async () => {
                setSavingStages(true)
                try {
                  await api.put('/settings', { key: 'stages', value: editingStages })
                  setSuccess('Pipeline stages saved successfully.')
                  setTimeout(() => setSuccess(''), 4000)
                  fetchSettings()
                  window.alert('Pipeline stages saved successfully!')
                } catch(e) { console.error(e) }
                finally { setSavingStages(false) }
              }}
            >
              {savingStages ? 'Saving...' : 'Save Pipeline'}
            </button>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {editingStages.map((stage, idx) => (
              <div 
                key={idx} 
                draggable
                onDragStart={(e) => (dragItem.current = idx)}
                onDragEnter={(e) => (dragOverItem.current = idx)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'grab' }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <GripVertical size={16} style={{ color: 'var(--text-muted)' }} />
                  <div style={{ flex: 1 }}>
                    <input style={{ ...s.input, width: '100%', fontWeight: 600 }} value={stage.label} onChange={e => {
                      const next = [...editingStages]; next[idx].label = e.target.value;
                      next[idx].id = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      setEditingStages(next);
                    }} placeholder="Stage Name (e.g., Discovery)" />
                  </div>
                  <div>
                    <input type="color" style={{ width: '40px', height: '36px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }} 
                      value={stage.color.replace('var(--','').replace(')','')}
                      onChange={e => {
                        const next = [...editingStages]; next[idx].color = e.target.value; setEditingStages(next);
                      }} 
                      title="Stage Color"
                    />
                  </div>
                  <button style={{ ...s.actionBtn, color: 'var(--red)' }} onClick={() => {
                    setEditingStages(prev => prev.filter((_, i) => i !== idx))
                  }}><Trash2 size={15} /></button>
                </div>
                <div style={{ paddingLeft: '28px' }}>
                  <input style={{ ...s.input, width: '100%', fontSize: '12px' }} value={stage.info || ''} onChange={e => {
                    const next = [...editingStages]; next[idx].info = e.target.value; setEditingStages(next);
                  }} placeholder="Stage info/instructions for your team (optional)..." />
                </div>
              </div>
            ))}
            <button style={{ ...s.actionBtn, padding: '10px', display: 'flex', justifyContent: 'center', marginTop: '8px', borderStyle: 'dashed' }} onClick={() => {
              setEditingStages(prev => [...prev, { id: 'new_stage', label: 'New Stage', color: '#6366f1', info: '' }])
            }}>
              <Plus size={16} /> Add Stage
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreate && (
        <div style={s.backdrop} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={s.modal} className="animate-fade">
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editUser ? 'Edit User' : 'Add Employee'}</h2>
              <button style={s.closeBtn} onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={s.modalForm}>
              {error && <div style={s.error}>{error}</div>}
              <Field label="Full Name *">
                <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </Field>
              <Field label="Email *">
                <input style={s.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </Field>
              <Field label={editUser ? 'New Password (leave blank to keep)' : 'Password *'}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      style={{ ...s.input, width: '100%', paddingRight: '32px' }}
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required={!editUser} minLength={6}
                      placeholder={editUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                    />
                    <button 
                      type="button" 
                      style={s.eyeBtn}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Eye size={14} style={{ opacity: showPassword ? 1 : 0.5 }} />
                    </button>
                  </div>
                  <button 
                    type="button" 
                    style={s.generateBtn} 
                    onClick={() => {
                      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
                      let pass = ''
                      for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
                      setForm(f => ({ ...f, password: pass }))
                      setShowPassword(true)
                    }}
                  >
                    Generate
                  </button>
                </div>
              </Field>
              {(!editUser || form.role !== 'admin') && (
                <Field label="Role *">
                  <select style={s.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="visitor">Employee — Can create & view leads</option>
                    <option value="manager">Manager — Can manage leads + employee access</option>
                  </select>
                </Field>
              )}
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                  {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

const s = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' },
  title: { fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)' },
  createBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', padding: '9px 16px',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-display)', whiteSpace: 'nowrap',
  },
  stats: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  successWrap: { 
    display: 'flex', alignItems: 'center', gap: '8px', 
    background: 'var(--green-dim)', border: '1px solid var(--green)', 
    borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '24px' 
  },
  statCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '16px 20px',
    flex: '1 1 120px',
  },
  statValue: { fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  loading: { color: 'var(--text-muted)', fontSize: '13px' },
  tableWrap: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-elevated)', whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.1s' },
  td: { padding: '12px 16px', fontSize: '13px', verticalAlign: 'middle' },
  userCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '30px', height: '30px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 700, flexShrink: 0,
  },
  userName: { fontWeight: 500, whiteSpace: 'nowrap' },
  rolePill: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    borderRadius: '20px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
  },
  statusPill: {
    display: 'inline-block', borderRadius: '20px',
    padding: '2px 8px', fontSize: '11px', fontWeight: 600,
  },
  actions: { display: 'flex', gap: '6px' },
  actionBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '5px', cursor: 'pointer',
    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
    transition: 'color 0.15s',
  },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' },
  modal: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '460px',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: { padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' },
  modalTitle: { fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '4px' },
  modalForm: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  error: { background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: '#fca5a5', fontSize: '13px' },
  input: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-body)' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' },
  cancelBtn: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 18px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' },
  saveBtn: { background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)' },
  eyeBtn: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  generateBtn: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 12px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }
}
