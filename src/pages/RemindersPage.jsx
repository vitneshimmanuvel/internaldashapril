import { useState, useEffect } from 'react'
import { Bell, Check, ExternalLink, Clock, AlertCircle, X, Archive, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import api from '../utils/api'

export default function RemindersPage() {
  const navigate = useNavigate()
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReminders = async () => {
    try {
      const r = await api.get('/reminders/mine')
      setReminders(r.data.reminders)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReminders() }, [])

  const complete = async (id, status, note) => {
    try {
      await api.put(`/reminders/${id}/complete`, { status, note })
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_completed: true, completion_status: status, completion_note: note, completed_at: new Date().toISOString() } : r))
    } catch (e) {
      console.error(e)
    }
  }

  const pendingReminders = reminders.filter(r => !r.is_completed)
  const pastReminders = reminders.filter(r => r.is_completed).sort((a,b) => new Date(b.completed_at || b.remind_at) - new Date(a.completed_at || a.remind_at))

  const overdue = pendingReminders.filter(r => isPast(new Date(r.remind_at)))
  const upcoming = pendingReminders.filter(r => !isPast(new Date(r.remind_at)))

  const ReminderItem = ({ rem }) => {
    const past = !rem.is_completed && isPast(new Date(rem.remind_at))
    const isDone = rem.is_completed
    const [action, setAction] = useState(null)
    const [note, setNote] = useState('')

    const handleSubmit = async () => {
      await complete(rem.id, action, note)
      setAction(null)
      setNote('')
    }

    return (
      <div style={{ ...s.card, borderLeftColor: isDone ? 'var(--border)' : past ? 'var(--red)' : 'var(--cyan)' }} className="animate-fade">
        <div style={s.cardTop}>
          {past && !isDone && <AlertCircle size={14} color="var(--red)" />}
          <div style={{ ...s.cardInfo, opacity: isDone ? 0.6 : 1 }}>
            <div style={s.cardTitle}>
              {rem.title}
              {isDone && <span style={s.statusPill(rem.completion_status)}>
                {rem.completion_status === 'completed' ? 'Completed' : 'Not Completed'}
              </span>}
            </div>
            <div style={s.cardLead} onClick={() => navigate(`/leads/${rem.lead_id}`)}>
              {rem.lead_title} — {rem.client_name}
              <ExternalLink size={11} />
            </div>
          </div>
        </div>

        {rem.description && <p style={{ ...s.cardDesc, opacity: isDone ? 0.6 : 1 }}>{rem.description}</p>}
        {isDone && rem.completion_note && (
          <div style={s.completedNote}>
            <MessageSquare size={12} style={{marginRight: 6, opacity: 0.7}}/>
            {rem.completion_note}
          </div>
        )}

        <div style={{ ...s.cardMeta, opacity: isDone ? 0.6 : 1 }}>
          <Clock size={11} />
          <span style={{ color: past && !isDone ? 'var(--red)' : 'var(--text-muted)' }}>
            {format(new Date(rem.remind_at), 'dd MMM yyyy, HH:mm')}
            {!isDone && (past ? ` (${formatDistanceToNow(new Date(rem.remind_at))} overdue)` : ` (in ${formatDistanceToNow(new Date(rem.remind_at))})`)}
            {isDone && ` (Answered ${formatDistanceToNow(new Date(rem.completed_at || rem.remind_at))} ago)`}
          </span>
          <span style={s.stagePill}>{rem.lead_stage?.replace('_', ' ')}</span>
        </div>

        {!isDone && (
          action ? (
            <div style={s.actionBox} className="animate-fade">
              <input
                type="text"
                placeholder={action === 'completed' ? 'Add a completed note (optional)' : 'Why was this not completed?'}
                value={note}
                onChange={e => setNote(e.target.value)}
                style={s.noteInput}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={s.btnPrimary} onClick={handleSubmit}>Save</button>
                <button style={s.btnSecondary} onClick={() => setAction(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={s.buttonsRow}>
              <button style={s.completedBtn} onClick={() => setAction('completed')}>
                <Check size={14} /> Mark Completed
              </button>
              <button style={s.failedBtn} onClick={() => setAction('not_completed')}>
                 Mark Not Completed
              </button>
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>My Reminders</h1>
        <span style={s.count}>{pendingReminders.length} pending</span>
      </div>

      {loading ? (
        <div style={s.loading}>Loading…</div>
      ) : reminders.length === 0 ? (
        <div style={s.empty}>
          <Bell size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <div>No reminders found</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Set reminders from lead detail pages
          </div>
        </div>
      ) : (
        <div style={s.lists}>
          {overdue.length > 0 && (
            <div style={s.section}>
              <div style={{ ...s.sectionTitle, color: 'var(--red)' }}>
                <AlertCircle size={14} /> Overdue ({overdue.length})
              </div>
              <div style={s.grid}>
                {overdue.map(r => <ReminderItem key={r.id} rem={r} />)}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>
                <Clock size={14} /> Upcoming ({upcoming.length})
              </div>
              <div style={s.grid}>
                {upcoming.map(r => <ReminderItem key={r.id} rem={r} />)}
              </div>
            </div>
          )}
          {pastReminders.length > 0 && (
            <div style={{ ...s.section, marginTop: '24px' }}>
              <div style={{ ...s.sectionTitle, color: 'var(--text-muted)' }}>
                <Archive size={14} /> Old Notifications ({pastReminders.length})
              </div>
              <div style={{ ...s.grid, opacity: 0.8 }}>
                {pastReminders.map(r => <ReminderItem key={r.id} rem={r} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto', animation: 'fade 0.3s ease' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 },
  count: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2px 10px', fontSize: '12px', color: 'var(--text-secondary)',
  },
  loading: { color: 'var(--text-muted)', fontSize: '13px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: 'var(--text-secondary)', fontSize: '15px' },
  lists: { display: 'flex', flexDirection: 'column', gap: '32px' },
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '8px' },
  card: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderLeft: '3px solid', borderRadius: 'var(--radius-lg)', padding: '16px',
    display: 'flex', flexDirection: 'column'
  },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: '15px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' },
  statusPill: (status) => ({
    fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700,
    background: status === 'completed' ? 'var(--green-dim)' : 'var(--red-dim)',
    color: status === 'completed' ? 'var(--green)' : 'var(--red)',
    border: `1px solid ${status === 'completed' ? 'var(--green)' : 'var(--red)'}`
  }),
  cardLead: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '12px', color: 'var(--primary)', cursor: 'pointer',
    width: 'fit-content'
  },
  completedNote: {
    display: 'flex', alignItems: 'flex-start',
    background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-md)',
    fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px',
    border: '1px solid var(--border)', fontStyle: 'italic'
  },
  cardDesc: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', flexWrap:'wrap', marginBottom: '4px' },
  stagePill: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2px 8px', textTransform: 'capitalize',
  },
  buttonsRow: { display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' },
  completedBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    background: 'var(--green-dim)', border: '1px solid var(--green)', color: 'var(--green)',
    padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s'
  },
  failedBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
    padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s'
  },
  actionBox: {
    marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px',
    display: 'flex', flexDirection: 'column', gap: '8px'
  },
  noteInput: {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    fontSize: '13px', boxSizing: 'border-box'
  },
  btnPrimary: {
    flex: 1, background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)',
    padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    flex: 1, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)',
    padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  }
}
