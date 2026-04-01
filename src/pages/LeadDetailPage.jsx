import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Check, X, Plus, Bell, Clock, ChevronDown, ChevronRight, History, MessageSquare, AlertCircle, MapPin, Car, Users, Info } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { format, formatDistanceToNow } from 'date-fns'

// STAGES are fetched from SettingsContext

const ACTION_LABELS = {
  lead_created: { label: 'Lead created', color: 'var(--green)' },
  stage_changed: { label: 'Stage changed', color: 'var(--accent)' },
  field_updated: { label: 'Field updated', color: 'var(--yellow)' },
  note_added: { label: 'Note added', color: 'var(--purple)' },
  note_edited: { label: 'Note edited', color: 'var(--orange)' },
  reminder_set: { label: 'Reminder set', color: 'var(--cyan)' },
  reminder_completed: { label: 'Reminder done', color: 'var(--green)' },
  visit_logged: { label: 'Visit logged', color: 'var(--orange)' },
  visit_updated: { label: 'Visit updated', color: 'var(--yellow)' },
  visit_planned: { label: 'Visit planned', color: 'var(--cyan)' },
}

const PURPOSES = [
  { id: 'site_visit', label: 'Site Visit' },
  { id: 'client_meeting', label: 'Client Meeting' },
  { id: 'follow_up_visit', label: 'Follow-up Visit' },
  { id: 'final_inspection', label: 'Final Inspection' },
  { id: 'other', label: 'Other' },
]
const TRAVEL_MODES = ['car','bike','public_transport','walk','other']
const OUTCOMES = [
  { id: 'positive', label: 'Positive', color: 'var(--green)' },
  { id: 'neutral', label: 'Neutral', color: 'var(--yellow)' },
  { id: 'negative', label: 'Negative', color: 'var(--red)' },
  { id: 'pending', label: 'Pending', color: 'var(--text-muted)' },
]

import { useSettings } from '../context/SettingsContext'

export default function LeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isManager } = useAuth()
  const { stages: STAGES } = useSettings()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('notes')
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [reminder, setReminder] = useState({ title: '', description: '', remind_at: '', recurrence: 'none' })
  const [savingReminder, setSavingReminder] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [expandedNoteHistory, setExpandedNoteHistory] = useState({})
  const [movingStage, setMovingStage] = useState(false)
  const [moneyCollected, setMoneyCollected] = useState(false)
  const [users, setUsers] = useState([])
  const [visits, setVisits] = useState([])
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [visitForm, setVisitForm] = useState({
    location: '', distance_km: '', visit_date: '', purpose: 'site_visit',
    notes: '', outcome: 'pending', travel_mode: 'car', participants: []
  })
  const [savingVisit, setSavingVisit] = useState(false)
  const [showPlanVisit, setShowPlanVisit] = useState(false)
  const [planVisitForm, setPlanVisitForm] = useState({
    location: '', visit_date: '', purpose: 'site_visit', notes: '', participants: []
  })
  const [savingPlan, setSavingPlan] = useState(false)

  useEffect(() => {
    api.get('/users/active').then(r => setUsers(r.data.users)).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [leadRes, visitRes] = await Promise.all([
        api.get(`/leads/${id}`),
        api.get(`/leads/${id}/visits`).catch(() => ({ data: { visits: [] } }))
      ])
      setData(leadRes.data)
      setVisits(visitRes.data.visits || [])
    } catch { navigate('/') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const moveStage = async (stage) => {
    setMovingStage(true)
    try {
      await api.put(`/leads/${id}/stage`, { stage })
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setMovingStage(false) }
  }

  const saveField = async (field) => {
    try {
      await api.put(`/leads/${id}`, { [field]: editValue })
      await fetchData()
    } catch (e) { console.error(e) }
    setEditingField(null)
  }

  const submitNote = async () => {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      await api.post(`/leads/${id}/notes`, { content: newNote, stage: data.lead.stage, money_collected: moneyCollected })
      setNewNote('')
      setMoneyCollected(false)
      setAddingNote(false)
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingNote(false) }
  }

  const saveNoteEdit = async (noteId) => {
    if (!editNoteContent.trim()) return
    try {
      await api.put(`/leads/${id}/notes/${noteId}`, { content: editNoteContent })
      setEditingNote(null)
      await fetchData()
    } catch (e) { console.error(e) }
  }

  const submitVisit = async () => {
    if (!visitForm.location.trim() || !visitForm.visit_date) return
    setSavingVisit(true)
    try {
      await api.post(`/leads/${id}/visits`, {
        ...visitForm,
        purpose: 'visit',
        distance_km: parseFloat(visitForm.distance_km) || 0,
        participants: visitForm.participants.map(uid => ({ user_id: uid, distance_km: parseFloat(visitForm.distance_km) || 0, travel_mode: visitForm.travel_mode }))
      })
      setVisitForm({ location: '', distance_km: '', visit_date: '', purpose: 'visit', notes: '', outcome: 'pending', travel_mode: 'car', participants: [] })
      setShowVisitForm(false)
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingVisit(false) }
  }

  const submitPlanVisit = async () => {
    if (!planVisitForm.location.trim() || !planVisitForm.visit_date) return
    setSavingPlan(true)
    try {
      const purposeLabel = PURPOSES.find(p => p.id === planVisitForm.purpose)?.label || planVisitForm.purpose
      const participantNames = planVisitForm.participants
        .map(uid => users.find(u => u.id === uid)?.name)
        .filter(Boolean)
      
      // Create a reminder of type visit_planned
      await api.post(`/leads/${id}/reminders`, {
        title: `Planned Visit: ${planVisitForm.location}`,
        description: [
          `Purpose: ${purposeLabel}`,
          participantNames.length > 0 ? `Team: ${participantNames.join(', ')}` : '',
          planVisitForm.notes ? `Notes: ${planVisitForm.notes}` : '',
        ].filter(Boolean).join('\n'),
        remind_at: planVisitForm.visit_date,
        stage: data.lead.stage,
        type: 'visit_planned'
      })

      setPlanVisitForm({ location: '', visit_date: '', purpose: 'site_visit', notes: '', participants: [] })
      setShowPlanVisit(false)
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingPlan(false) }
  }

  const createReminder = async () => {
    if (!reminder.title || !reminder.remind_at) return
    setSavingReminder(true)
    try {
      await api.post(`/leads/${id}/reminders`, { ...reminder, stage: data.lead.stage })
      setReminder({ title: '', description: '', remind_at: '', recurrence: 'none' })
      setShowReminder(false)
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingReminder(false) }
  }

  const completeReminder = async (remId) => {
    try {
      await api.put(`/reminders/${remId}/complete`)
      await fetchData()
    } catch (e) { console.error(e) }
  }



  if (loading) return <div style={s.loading}><div style={s.spinner} /></div>
  if (!data) return null

  const { lead, history, notes, reminders } = data
  const currentStage = STAGES.find(st => st.id === lead.stage)
  const pendingReminders = reminders.filter(r => !r.is_completed)
  const doneReminders = reminders.filter(r => r.is_completed)

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topbar}>
        <button style={s.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> <span>Board</span>
        </button>
        <div style={s.breadcrumb}>
          <span style={s.breadClient}>{lead.client_name}</span>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={s.breadTitle}>{lead.title}</span>
        </div>
      </div>

      <div style={s.body} className="lead-detail-body">
        {/* Left panel */}
        <div style={s.left}>
          {/* Lead header */}
          <div style={s.card}>
            <div style={s.stageRow} className="stage-row">
              {STAGES.map(st => (
                <div
                  key={st.id}
                  style={{
                    ...s.stageBtn,
                    background: lead.stage === st.id ? `${st.color}20` : 'transparent',
                    color: lead.stage === st.id ? st.color : 'var(--text-muted)',
                    border: `1px solid ${lead.stage === st.id ? st.color : 'var(--border)'}`,
                    cursor: 'default',
                  }}
                  title={st.info || ''}
                >
                  {st.label}
                  {st.info && <Info size={12} style={{ opacity: 0.6, marginLeft: '4px', verticalAlign: 'middle' }} />}
                </div>
              ))}
            </div>

            <h1 style={s.leadTitle}>{lead.title}</h1>

            <div style={s.fields}>
              {[
                { key: 'client_name', label: 'Client', value: lead.client_name },
                { key: 'client_company', label: 'Company', value: lead.client_company },
                { key: 'client_email', label: 'Email', value: lead.client_email },
                { key: 'client_phone', label: 'Phone', value: lead.client_phone },
                { key: 'value', label: 'Deal Value', value: lead.value ? `₹${Number(lead.value).toLocaleString('en-IN')}` : null },
              ].map(({ key, label, value }) => (
                <div key={key} style={s.field}>
                  <span style={s.fieldLabel}>{label}</span>
                  {editingField === key ? (
                    <div style={s.fieldEdit}>
                      <input
                        style={s.fieldInput}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveField(key); if (e.key === 'Escape') setEditingField(null) }}
                      />
                      <button style={s.iconBtn} onClick={() => saveField(key)}><Check size={13} /></button>
                      <button style={s.iconBtn} onClick={() => setEditingField(null)}><X size={13} /></button>
                    </div>
                  ) : (
                    <div style={s.fieldValue} onClick={() => { setEditingField(key); setEditValue(lead[key] || '') }}>
                      <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {value || '—'}
                      </span>
                      <Edit2 size={11} style={{ color: 'var(--text-muted)', opacity: 0 }} className="edit-icon" />
                    </div>
                  )}
                </div>
              ))}

              <div style={s.field}>
                <span style={s.fieldLabel}>Assigned To</span>
                {editingField === 'assigned_to' ? (
                  <div style={s.fieldEdit}>
                    <select style={s.fieldInput} value={editValue} onChange={e => setEditValue(e.target.value)}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button style={s.iconBtn} onClick={() => saveField('assigned_to')}><Check size={13} /></button>
                    <button style={s.iconBtn} onClick={() => setEditingField(null)}><X size={13} /></button>
                  </div>
                ) : (
                  <div style={{...s.fieldValue, cursor: isManager ? 'pointer' : 'default'}}>
                    <span style={{
                      color: lead.assigned_to_name ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: lead.assigned_to_name ? 600 : 400,
                    }}>{lead.assigned_to_name || 'Unassigned'}</span>
                    {isManager && (
                      <button 
                        style={{
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer',
                          color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: 500, marginLeft: '8px',
                        }} 
                        onClick={() => { setEditingField('assigned_to'); setEditValue(lead.assigned_to || ''); }}
                      >
                        <Edit2 size={10} /> Change
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={s.field}>
                <span style={s.fieldLabel}>Priority</span>
                {editingField === 'priority' ? (
                  <div style={s.fieldEdit}>
                    <select style={s.fieldInput} value={editValue} onChange={e => setEditValue(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <button style={s.iconBtn} onClick={() => saveField('priority')}><Check size={13} /></button>
                    <button style={s.iconBtn} onClick={() => setEditingField(null)}><X size={13} /></button>
                  </div>
                ) : (
                  <div style={s.fieldValue} onClick={() => { setEditingField('priority'); setEditValue(lead.priority) }}>
                    <span style={{
                      color: lead.priority === 'high' ? 'var(--red)' : lead.priority === 'medium' ? 'var(--yellow)' : 'var(--green)',
                      textTransform: 'capitalize', fontWeight: 600,
                    }}>{lead.priority}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={s.metaRow}>
              <span style={s.metaItem}>Created by <b>{lead.created_by_name}</b></span>
              <span style={s.metaItem}>{format(new Date(lead.created_at), 'dd MMM yyyy, HH:mm')}</span>
            </div>
          </div>

          {/* Description */}
          <div style={s.card}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>Description</span>
              {editingField !== 'description' && (
                <button style={s.editBtn} onClick={() => { setEditingField('description'); setEditValue(lead.description || '') }}>
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
            {editingField === 'description' ? (
              <div>
                <textarea
                  style={{ ...s.fieldInput, minHeight: '100px', resize: 'vertical', width: '100%' }}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button style={s.saveBtn} onClick={() => saveField('description')}>Save</button>
                  <button style={s.cancelSmBtn} onClick={() => setEditingField(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ color: lead.description ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
                {lead.description || 'No description yet. Click Edit to add one.'}
              </p>
            )}
          </div>
        </div>

        {/* Right panel - tabs */}
        <div style={s.right}>
          <div style={s.tabs}>
            {[
              { id: 'notes', label: `Notes (${notes.length})`, icon: MessageSquare },
              { id: 'visits', label: `Visits (${visits.length})`, icon: MapPin },
              { id: 'reminders', label: `Reminders (${pendingReminders.length})`, icon: Bell },
              { id: 'history', label: `History (${history.length})`, icon: History },
            ].map(tab => (
              <button
                key={tab.id}
                style={{ ...s.tab, ...(activeTab === tab.id ? s.tabActive : {}) }}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div style={s.tabContent}>
            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div style={s.tabPanel}>
                <div style={s.tabHeader}>
                  <span style={s.tabTitle}>Stage Notes</span>
                  {lead.stage !== 'cancelled' && (
                    <button style={s.addBtn} onClick={() => setAddingNote(true)}>
                      <Plus size={13} /> Add Activity
                    </button>
                  )}
                </div>

                {addingNote && (
                  <div style={s.noteForm} className="animate-fade">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={s.noteStageBadge}>
                        Stage: <b style={{ color: currentStage?.color }}>{currentStage?.label}</b>
                      </div>
                    </div>
                    <textarea
                      style={s.noteTextarea}
                      placeholder="Write your note here…"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      autoFocus
                      rows={4}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: moneyCollected ? 'var(--green)' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: moneyCollected ? '1px solid var(--green)' : '1px solid var(--border)', background: moneyCollected ? 'var(--green-dim)' : 'transparent' }}>
                        <input type="checkbox" checked={moneyCollected} onChange={e => setMoneyCollected(e.target.checked)} style={{ accentColor: 'var(--green)' }} />
                        💰 Money Collected
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button style={s.saveBtn} onClick={submitNote} disabled={savingNote}>
                        {savingNote ? 'Saving…' : 'Save'}
                      </button>
                      <button style={s.cancelSmBtn} onClick={() => { setAddingNote(false); setNewNote(''); setMoneyCollected(false) }}>Cancel</button>
                    </div>
                  </div>
                )}

                {notes.length === 0 && !addingNote ? (
                  <div style={s.empty}>No notes yet. Add the first one.</div>
                ) : (
                  notes.map(note => {
                    const stageInfo = STAGES.find(st => st.id === note.stage)
                    const canEdit = note.user_id === user.id || user.role === 'admin'
                    const hasHistory = note.edit_history?.length > 0
                    const showHistory = expandedNoteHistory[note.id]
                    return (
                      <div key={note.id} style={s.noteCard} className="animate-fade">
                        <div style={s.noteHeader}>
                          <span style={{ ...s.noteStagePill, background: `${stageInfo?.color}20`, color: stageInfo?.color }}>
                            {stageInfo?.label}
                          </span>
                          <span style={s.noteAuthor}>{note.user_name}</span>
                          {note.is_edited && <span style={s.editedBadge}>edited</span>}
                          <span style={s.noteTime}>{format(new Date(note.created_at), 'dd MMM, HH:mm')}</span>
                        </div>

                        {editingNote === note.id ? (
                          <div>
                            <textarea
                              style={s.noteTextarea}
                              value={editNoteContent}
                              onChange={e => setEditNoteContent(e.target.value)}
                              autoFocus rows={4}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button style={s.saveBtn} onClick={() => saveNoteEdit(note.id)}>Save Edit</button>
                              <button style={s.cancelSmBtn} onClick={() => setEditingNote(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {note.money_collected && <span style={{ display: 'inline-block', background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>💰 Money Collected</span>}
                            <p style={s.noteContent}>{note.content}</p>
                          </>
                        )}

                        <div style={s.noteFooter}>
                          {canEdit && editingNote !== note.id && (
                            <button style={s.editNoteBtn} onClick={() => { setEditingNote(note.id); setEditNoteContent(note.content) }}>
                              <Edit2 size={11} /> Edit
                            </button>
                          )}
                          {hasHistory && (
                            <button style={s.historyToggle} onClick={() => setExpandedNoteHistory(p => ({ ...p, [note.id]: !p[note.id] }))}>
                              <History size={11} />
                              {showHistory ? 'Hide' : `${note.edit_history.length} edit${note.edit_history.length > 1 ? 's' : ''}`}
                            </button>
                          )}
                        </div>

                        {showHistory && hasHistory && (
                          <div style={s.editHistory}>
                            <div style={s.editHistoryTitle}>Edit history (oldest → newest)</div>
                            {[...note.edit_history].reverse().map((eh, i) => (
                              <div key={eh.id || i} style={s.editEntry}>
                                <div style={s.editMeta}>
                                  <span>{eh.editor_name}</span>
                                  <span>{format(new Date(eh.edited_at), 'dd MMM, HH:mm')}</span>
                                </div>
                                <div style={s.editPrev}>
                                  <span style={s.editPrevLabel}>Previous:</span>
                                  <span style={s.editPrevText}>{eh.previous_content}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* REMINDERS TAB */}
            {activeTab === 'reminders' && (
              <div style={s.tabPanel}>
                <div style={s.tabHeader}>
                  <span style={s.tabTitle}>Reminders</span>
                  {lead.stage !== 'cancelled' && (
                    <button style={s.addBtn} onClick={() => setShowReminder(v => !v)}>
                      <Plus size={13} /> Set Reminder
                    </button>
                  )}
                </div>

                {showReminder && (
                  <div style={s.noteForm} className="animate-fade">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        style={s.fieldInput}
                        placeholder="Reminder title *"
                        value={reminder.title}
                        onChange={e => setReminder(r => ({ ...r, title: e.target.value }))}
                      />
                      <input
                        style={s.fieldInput}
                        placeholder="Description (optional)"
                        value={reminder.description}
                        onChange={e => setReminder(r => ({ ...r, description: e.target.value }))}
                      />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          style={{ ...s.fieldInput, flex: 1, minWidth: '180px' }}
                          type="datetime-local"
                          value={reminder.remind_at}
                          onChange={e => setReminder(r => ({ ...r, remind_at: e.target.value }))}
                        />
                        <button style={s.quickTimeBtn} onClick={() => {
                          const d = new Date(); d.setMinutes(d.getMinutes() + 30);
                          setReminder(r => ({ ...r, remind_at: new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }));
                        }}>30 Mins</button>
                        <button style={s.quickTimeBtn} onClick={() => {
                          const d = new Date(); d.setHours(d.getHours() + 1);
                          setReminder(r => ({ ...r, remind_at: new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }));
                        }}>1 Hour</button>
                        <button style={s.quickTimeBtn} onClick={() => {
                          const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
                          setReminder(r => ({ ...r, remind_at: new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }));
                        }}>Tomorrow Morning</button>
                        <button style={s.quickTimeBtn} onClick={() => {
                          const d = new Date(); d.setHours(17, 0, 0, 0); 
                          if (d < new Date()) d.setDate(d.getDate() + 1);
                          setReminder(r => ({ ...r, remind_at: new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }));
                        }}>Late Evening</button>
                      </div>
                      <select style={s.fieldInput} value={reminder.recurrence || 'none'} onChange={e => setReminder(r => ({ ...r, recurrence: e.target.value }))}>
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button style={s.saveBtn} onClick={createReminder} disabled={savingReminder}>
                        {savingReminder ? 'Creating...' : 'Create'}
                      </button>
                      <button style={s.cancelSmBtn} onClick={() => setShowReminder(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {pendingReminders.length === 0 && doneReminders.length === 0 && !showReminder ? (
                  <div style={s.empty}>No reminders set.</div>
                ) : null}

                {pendingReminders.length > 0 && (
                  <>
                    <div style={s.reminderSection}>Upcoming</div>
                    {pendingReminders.map(rem => {
                      const isPast = new Date(rem.remind_at) < new Date()
                      return (
                        <div key={rem.id} style={{ ...s.reminderCard, borderLeftColor: isPast ? 'var(--red)' : 'var(--cyan)' }}>
                          <div style={s.reminderTop}>
                            {isPast && <AlertCircle size={13} color="var(--red)" />}
                            <span style={s.reminderTitle}>{rem.title}</span>
                            <button style={{ ...s.iconBtn, color: 'var(--green)' }} onClick={() => completeReminder(rem.id)} title="Mark done">
                              <Check size={13} />
                            </button>
                          </div>
                          {rem.description && <p style={s.reminderDesc}>{rem.description}</p>}
                          <div style={s.reminderMeta}>
                            <Clock size={11} />
                            <span style={{ color: isPast ? 'var(--red)' : 'var(--text-muted)' }}>
                              {format(new Date(rem.remind_at), 'dd MMM yyyy, HH:mm')}
                              {isPast ? ' (overdue)' : ''}
                            </span>
                            <span>• {rem.user_name}</span>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {doneReminders.length > 0 && (
                  <>
                    <div style={{ ...s.reminderSection, marginTop: '16px', opacity: 0.6 }}>Completed</div>
                    {doneReminders.map(rem => (
                      <div key={rem.id} style={{ ...s.reminderCard, opacity: 0.5, borderLeftColor: 'var(--text-muted)' }}>
                        <div style={s.reminderTop}>
                          <span style={{ ...s.reminderTitle, textDecoration: 'line-through' }}>{rem.title}</span>
                        </div>
                        <div style={s.reminderMeta}>
                          <Clock size={11} />
                          {format(new Date(rem.remind_at), 'dd MMM yyyy, HH:mm')}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* VISITS TAB */}
            {activeTab === 'visits' && (
              <div style={s.tabPanel}>
                <div style={s.tabHeader}>
                  <span style={s.tabTitle}>Visits</span>
                  {lead.stage !== 'cancelled' && user?.role !== 'admin' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={s.addBtn} onClick={() => { setShowVisitForm(true); setShowPlanVisit(false) }}>
                        <Plus size={13} /> Add Visit
                      </button>
                    </div>
                  )}
                </div>

                {/* PLAN VISIT FORM */}
                {showPlanVisit && (
                  <div style={{ ...s.noteForm, padding: '16px', borderLeft: '3px solid var(--cyan, var(--accent))' }} className="animate-fade">
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cyan, var(--accent))', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={14} /> Schedule a Future Visit
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.formLabel}>Location *</label>
                        <input style={s.fieldInput} placeholder="e.g. Client office, Mumbai" value={planVisitForm.location}
                          onChange={e => setPlanVisitForm(f => ({...f, location: e.target.value}))} />
                      </div>
                      <div>
                        <label style={s.formLabel}>Planned Date & Time *</label>
                        <input type="datetime-local" style={s.fieldInput} value={planVisitForm.visit_date}
                          onChange={e => setPlanVisitForm(f => ({...f, visit_date: e.target.value}))} />
                      </div>
                      <div>
                        <label style={s.formLabel}>Purpose</label>
                        <select style={s.fieldInput} value={planVisitForm.purpose}
                          onChange={e => setPlanVisitForm(f => ({...f, purpose: e.target.value}))}>
                          {PURPOSES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.formLabel}>Team Members</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {users.filter(u => u.id !== user?.id).map(u => (
                            <button key={u.id}
                              style={{
                                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                                border: planVisitForm.participants.includes(u.id) ? '1px solid var(--accent)' : '1px solid var(--border)',
                                background: planVisitForm.participants.includes(u.id) ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                                color: planVisitForm.participants.includes(u.id) ? 'var(--accent)' : 'var(--text-secondary)',
                              }}
                              onClick={() => setPlanVisitForm(f => ({
                                ...f,
                                participants: f.participants.includes(u.id)
                                  ? f.participants.filter(pid => pid !== u.id)
                                  : [...f.participants, u.id]
                              }))}
                            >{u.name}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.formLabel}>Planning Notes</label>
                        <textarea style={{ ...s.fieldInput, minHeight: '50px', resize: 'vertical', width: '100%' }}
                          placeholder="Agenda, things to prepare, directions..." value={planVisitForm.notes}
                          onChange={e => setPlanVisitForm(f => ({...f, notes: e.target.value}))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                      <button style={s.cancelSmBtn} onClick={() => setShowPlanVisit(false)}>Cancel</button>
                      <button style={{ ...s.saveBtn, background: 'var(--cyan, var(--accent))' }} onClick={submitPlanVisit} disabled={savingPlan}>
                        {savingPlan ? 'Scheduling...' : 'Schedule Visit'}
                      </button>
                    </div>
                  </div>
                )}

                {/* LOG VISIT FORM */}

                {showVisitForm && (
                  <div style={{ ...s.noteForm, padding: '16px' }} className="animate-fade">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.formLabel}>Location *</label>
                        <input style={s.fieldInput} placeholder="e.g. Client office, Mumbai" value={visitForm.location}
                          onChange={e => setVisitForm(f => ({...f, location: e.target.value}))} />
                      </div>
                      <div>
                        <label style={s.formLabel}>Visit Date & Time *</label>
                        <input type="datetime-local" style={s.fieldInput} value={visitForm.visit_date}
                          onChange={e => setVisitForm(f => ({...f, visit_date: e.target.value}))} />
                      </div>
                      <div>
                        <label style={s.formLabel}>Distance (km)</label>
                        <input type="number" style={s.fieldInput} placeholder="0" value={visitForm.distance_km}
                          onChange={e => setVisitForm(f => ({...f, distance_km: e.target.value}))} />
                      </div>
                      <div>
                        <label style={s.formLabel}>Travel Mode</label>
                        <select style={s.fieldInput} value={visitForm.travel_mode}
                          onChange={e => setVisitForm(f => ({...f, travel_mode: e.target.value}))}>
                          {TRAVEL_MODES.map(m => <option key={m} value={m}>{m.replace('_',' ').replace(/^./,c=>c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={s.formLabel}>Outcome</label>
                        <select style={s.fieldInput} value={visitForm.outcome}
                          onChange={e => setVisitForm(f => ({...f, outcome: e.target.value}))}>
                          {OUTCOMES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.formLabel}>Travel Participants</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {users.filter(u => u.id !== user?.id).map(u => (
                            <button key={u.id}
                              style={{
                                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                                border: visitForm.participants.includes(u.id) ? '1px solid var(--accent)' : '1px solid var(--border)',
                                background: visitForm.participants.includes(u.id) ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                                color: visitForm.participants.includes(u.id) ? 'var(--accent)' : 'var(--text-secondary)',
                              }}
                              onClick={() => setVisitForm(f => ({
                                ...f,
                                participants: f.participants.includes(u.id)
                                  ? f.participants.filter(id => id !== u.id)
                                  : [...f.participants, u.id]
                              }))}
                            >{u.name}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.formLabel}>Visit Notes</label>
                        <textarea style={{ ...s.fieldInput, minHeight: '60px', resize: 'vertical', width: '100%' }}
                          placeholder="Meeting discussion, observations..." value={visitForm.notes}
                          onChange={e => setVisitForm(f => ({...f, notes: e.target.value}))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                      <button style={s.cancelSmBtn} onClick={() => setShowVisitForm(false)}>Cancel</button>
                      <button style={s.saveBtn} onClick={submitVisit} disabled={savingVisit}>
                        {savingVisit ? 'Saving...' : 'Add Visit'}
                      </button>
                    </div>
                  </div>
                )}

                {visits.length === 0 && !showVisitForm ? (
                  <div style={s.empty}><MapPin size={20} style={{ marginBottom: '6px' }} /> No visits logged yet.</div>
                ) : (
                  visits.map(v => {
                    const purposeLabel = PURPOSES.find(p => p.id === v.purpose)?.label || v.purpose
                    const outcomeInfo = OUTCOMES.find(o => o.id === v.outcome) || OUTCOMES[3]
                    return (
                      <div key={v.id} style={{ ...s.noteCard, borderLeft: `3px solid var(--orange)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={14} style={{ color: 'var(--orange)' }} />
                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{v.location}</span>
                          </div>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: `${outcomeInfo.color}18`, color: outcomeInfo.color, fontWeight: 600 }}>
                            {outcomeInfo.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          <span><Clock size={10} /> {format(new Date(v.visit_date), 'dd MMM yyyy, HH:mm')}</span>
                          <span><Car size={10} /> {v.distance_km} km</span>
                        </div>
                        {v.participants && v.participants.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <Users size={11} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                            {v.participants.map(p => (
                              <span key={p.id} style={{ fontSize: '10px', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 7px', borderRadius: '10px', fontWeight: 500 }}>
                                {p.user_name}
                              </span>
                            ))}
                          </div>
                        )}
                        {v.notes && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '4px 0 0' }}>{v.notes}</p>}
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>Logged by {v.created_by_name}</div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div style={s.tabPanel}>
                <div style={s.tabHeader}>
                  <span style={s.tabTitle}>Activity Timeline</span>
                </div>
                {history.length === 0 ? (
                  <div style={s.empty}>No history yet.</div>
                ) : (
                  <div style={s.timeline}>
                    {history.map((item, i) => {
                      const meta = ACTION_LABELS[item.action] || { label: item.action, color: 'var(--text-muted)' }
                      return (
                        <div key={item.id} style={s.timelineItem}>
                          <div style={{ ...s.timelineDot, background: meta.color }} />
                          {i < history.length - 1 && <div style={s.timelineLine} />}
                          <div style={s.timelineContent}>
                            <div style={s.timelineTop}>
                              <span style={{ ...s.timelineAction, color: meta.color }}>{meta.label}</span>
                              <span style={s.timelineTime}>{format(new Date(item.created_at), 'dd MMM, HH:mm')}</span>
                            </div>
                            <span style={s.timelineUser}>{item.user_name}</span>
                            {item.field_changed && (
                              <div style={s.timelineDetail}>
                                <span style={s.fieldName}>{item.field_changed}</span>
                                {item.old_value && <><span style={s.oldVal}>{item.old_value}</span><span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span></>}
                                {item.new_value && <span style={s.newVal}>{item.new_value}</span>}
                              </div>
                            )}
                            {item.details && (() => {
                              try {
                                const d = typeof item.details === 'string' ? JSON.parse(item.details) : item.details
                                if (d.from && d.to) return (
                                  <div style={s.timelineDetail}>
                                    <span style={s.oldVal}>{d.from}</span>
                                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                                    <span style={s.newVal}>{d.to}</span>
                                  </div>
                                )
                                if (d.preview) return <div style={s.timelinePreview}>"{d.preview}{d.preview.length >= 80 ? '…' : ''}"</div>
                                if (d.location) return (
                                  <div style={s.timelineDetail}>
                                    <MapPin size={10} style={{ color: 'var(--orange)' }} />
                                    <span style={{ fontSize: '11px' }}>{d.location} — {d.distance_km}km</span>
                                  </div>
                                )
                              } catch {}
                              return null
                            })()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .edit-icon { transition: opacity 0.15s; }
        [style*="fieldValue"]:hover .edit-icon { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

const s = {
  page: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  loading: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  topbar: {
    padding: '14px 24px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'var(--bg-surface)', flexShrink: 0,
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-secondary)', fontSize: '13px', padding: '4px',
  },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', overflow: 'hidden' },
  breadClient: { color: 'var(--text-muted)', whiteSpace: 'nowrap' },
  breadTitle: { color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  body: {
    flex: 1, overflow: 'auto',
    display: 'flex', gap: '0',
    minHeight: 0,
  },
  left: {
    width: '360px', flexShrink: 0,
    padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '16px',
    borderRight: '1px solid var(--border)',
    overflow: 'auto',
  },
  right: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  card: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '16px',
  },
  stageRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' },
  stageBtn: {
    borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-display)',
  },
  leadTitle: { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '16px' },
  fields: { display: 'flex', flexDirection: 'column', gap: '10px' },
  field: { display: 'flex', flexDirection: 'column', gap: '3px' },
  fieldLabel: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  fieldValue: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 0', fontSize: '13px', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
  },
  fieldEdit: { display: 'flex', alignItems: 'center', gap: '6px' },
  fieldInput: {
    flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-sm)', padding: '6px 9px',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    fontFamily: 'var(--font-body)',
  },
  iconBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '5px', cursor: 'pointer',
    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
  },
  metaRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' },
  metaItem: { fontSize: '11px', color: 'var(--text-muted)' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  sectionTitle: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  editBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '3px 8px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer',
  },
  saveBtn: {
    background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)',
    padding: '7px 14px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-display)',
  },
  cancelSmBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '7px 14px',
    color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
  },
  quickTimeBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '6px 10px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer',
  },
  tabs: {
    display: 'flex', gap: '0',
    borderBottom: '1px solid var(--border)',
    padding: '0 20px',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', borderBottom: '2px solid transparent',
    padding: '14px 12px 12px', cursor: 'pointer',
    color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500,
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: '-1px',
  },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  tabContent: { flex: 1, overflow: 'auto' },
  tabPanel: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  tabHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  tabTitle: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '6px 12px',
    color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer',
  },
  noteForm: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '14px',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  noteStageBadge: { fontSize: '11px', color: 'var(--text-muted)' },
  noteTextarea: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 12px',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6,
    width: '100%',
  },
  noteCard: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '14px',
  },
  noteHeader: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' },
  noteStagePill: { borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 600 },
  noteAuthor: { fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' },
  editedBadge: { fontSize: '10px', color: 'var(--yellow)', background: 'var(--yellow-dim)', borderRadius: '20px', padding: '1px 6px' },
  noteTime: { fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' },
  noteContent: { fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  noteFooter: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' },
  editNoteBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: '11px',
  },
  historyToggle: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: '11px',
  },
  editHistory: {
    marginTop: '10px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  editHistoryTitle: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' },
  editEntry: { borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  editMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' },
  editPrev: { display: 'flex', gap: '6px', fontSize: '11px', flexWrap: 'wrap' },
  editPrevLabel: { color: 'var(--text-muted)', fontWeight: 500 },
  editPrevText: { color: 'var(--text-secondary)', fontStyle: 'italic' },
  empty: { color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '32px 0' },
  reminderSection: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  reminderCard: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderLeft: '3px solid', borderRadius: 'var(--radius)',
    padding: '12px',
  },
  reminderTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  reminderTitle: { flex: 1, fontSize: '13px', fontWeight: 600 },
  reminderDesc: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' },
  reminderMeta: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0' },
  timelineItem: { display: 'flex', gap: '12px', position: 'relative', paddingBottom: '16px' },
  timelineDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '4px', zIndex: 1 },
  timelineLine: {
    position: 'absolute', left: '4px', top: '14px', bottom: 0,
    width: '2px', background: 'var(--border)',
  },
  timelineContent: { flex: 1, paddingBottom: '4px' },
  timelineTop: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' },
  timelineAction: { fontSize: '12px', fontWeight: 600 },
  timelineTime: { fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' },
  timelineUser: { fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' },
  timelineDetail: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '4px' },
  fieldName: { fontSize: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', color: 'var(--text-muted)', textTransform: 'capitalize' },
  oldVal: { fontSize: '11px', color: 'var(--red)', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', padding: '1px 6px' },
  newVal: { fontSize: '11px', color: 'var(--green)', background: 'var(--green-dim)', borderRadius: 'var(--radius-sm)', padding: '1px 6px' },
  timelinePreview: { fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' },
  formLabel: { fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'block' },
}
