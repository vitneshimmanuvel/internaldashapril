import { useState, useEffect } from 'react'
import { Bell, Check, ExternalLink, Clock, AlertCircle } from 'lucide-react'
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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReminders() }, [])

  const complete = async (id) => {
    try {
      await api.put(`/reminders/${id}/complete`)
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch (e) { console.error(e) }
  }

  const overdue = reminders.filter(r => isPast(new Date(r.remind_at)))
  const upcoming = reminders.filter(r => !isPast(new Date(r.remind_at)))

  const ReminderItem = ({ rem }) => {
    const past = isPast(new Date(rem.remind_at))
    return (
      <div style={{ ...s.card, borderLeftColor: past ? 'var(--red)' : 'var(--cyan)' }} className="animate-fade">
        <div style={s.cardTop}>
          {past && <AlertCircle size={14} color="var(--red)" />}
          <div style={s.cardInfo}>
            <div style={s.cardTitle}>{rem.title}</div>
            <div style={s.cardLead} onClick={() => navigate(`/leads/${rem.lead_id}`)}>
              {rem.lead_title} — {rem.client_name}
              <ExternalLink size={11} />
            </div>
          </div>
          <button style={s.doneBtn} onClick={() => complete(rem.id)} title="Mark done">
            <Check size={14} />
          </button>
        </div>
        {rem.description && <p style={s.cardDesc}>{rem.description}</p>}
        <div style={s.cardMeta}>
          <Clock size={11} />
          <span style={{ color: past ? 'var(--red)' : 'var(--text-muted)' }}>
            {format(new Date(rem.remind_at), 'dd MMM yyyy, HH:mm')}
            {past ? ` (${formatDistanceToNow(new Date(rem.remind_at))} overdue)` : ` (in ${formatDistanceToNow(new Date(rem.remind_at))})`}
          </span>
          <span style={s.stagePill}>{rem.lead_stage?.replace('_', ' ')}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>My Reminders</h1>
        <span style={s.count}>{reminders.length} pending</span>
      </div>

      {loading ? (
        <div style={s.loading}>Loading…</div>
      ) : reminders.length === 0 ? (
        <div style={s.empty}>
          <Bell size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <div>No pending reminders</div>
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
    borderLeft: '3px solid', borderRadius: 'var(--radius-lg)', padding: '14px',
  },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: '14px', fontWeight: 600, marginBottom: '4px' },
  cardLead: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '12px', color: 'var(--accent)', cursor: 'pointer',
  },
  doneBtn: {
    background: 'var(--green-dim)', border: '1px solid var(--green)',
    borderRadius: 'var(--radius-sm)', padding: '5px', cursor: 'pointer',
    color: 'var(--green)', display: 'flex', alignItems: 'center',
  },
  cardDesc: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' },
  stagePill: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '1px 8px', textTransform: 'capitalize',
  },
}
