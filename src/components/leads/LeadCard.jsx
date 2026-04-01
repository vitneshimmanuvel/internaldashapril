import { useState } from 'react'
import { MessageSquare, Bell, Calendar, ChevronRight, MoreHorizontal, MoveRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const PRIORITY_COLORS = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' }

export default function LeadCard({ lead, stageColor, isDragging, stages, onDragStart, onMoveStage, onClick }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const stopProp = (e) => e.stopPropagation()

  return (
    <div
      style={{ ...s.card, opacity: isDragging ? 0.4 : 1, borderLeftColor: stageColor }}
      draggable
      onDragStart={e => onDragStart(e, lead)}
      onClick={onClick}
      className="animate-fade lead-card"
    >
      {/* Priority dot & Client Name as Header */}
      <div style={s.top}>
        <div style={{ ...s.priority, background: PRIORITY_COLORS[lead.priority] || 'var(--text-muted)' }} title={lead.priority} />
        <span style={s.title}>{lead.client_name}</span>
        {/* Move menu (mobile friendly) */}
        <div style={{ position: 'relative' }} onClick={stopProp}>
          <button style={s.moreBtn} onClick={() => setShowMoveMenu(v => !v)}>
            <MoveRight size={13} />
          </button>
          {showMoveMenu && (
            <div style={s.dropdown} className="animate-fade">
              <div style={s.dropdownLabel}>Move to stage</div>
              {stages.filter(st => st.id !== lead.stage).map(st => (
                <button
                  key={st.id}
                  style={s.dropdownItem}
                  onClick={() => { onMoveStage(lead, st.id); setShowMoveMenu(false) }}
                >
                  <span style={{ ...s.stageDot, background: st.color }} />
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {lead.client_company && <div style={s.company}>{lead.client_company}</div>}
      <div style={s.serviceTitle}>{lead.title}</div>

      {lead.value && (
        <div style={s.value}>
          ₹{Number(lead.value).toLocaleString('en-IN')}
        </div>
      )}

      <div style={s.meta}>
        {Number(lead.notes_count) > 0 && (
          <span style={s.metaItem}>
            <MessageSquare size={11} />
            {lead.notes_count}
          </span>
        )}
        {Number(lead.pending_reminders) > 0 && (
          <span style={{ ...s.metaItem, color: 'var(--yellow)' }}>
            <Bell size={11} />
            {lead.pending_reminders}
          </span>
        )}
        {lead.assigned_to_name && (
          <span style={s.assignee}>{lead.assigned_to_name.split(' ')[0]}</span>
        )}
        <span style={s.time}>
          {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}

const s = {
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid',
    borderRadius: 'var(--radius)',
    padding: '12px',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
    userSelect: 'none',
    position: 'relative',
  },
  top: { display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' },
  priority: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '5px' },
  title: { flex: 1, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 },
  moreBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center',
    borderRadius: 'var(--radius-sm)', flexShrink: 0,
  },
  company: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' },
  serviceTitle: { fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' },
  value: {
    fontSize: '13px', fontWeight: 700, color: 'var(--green)',
    marginBottom: '8px', fontFamily: 'var(--font-display)',
  },
  meta: {
    display: 'flex', alignItems: 'center', gap: '8px',
    flexWrap: 'wrap', marginTop: '8px',
    paddingTop: '8px', borderTop: '1px solid var(--border)',
  },
  metaItem: {
    display: 'flex', alignItems: 'center', gap: '3px',
    fontSize: '11px', color: 'var(--text-muted)',
  },
  assignee: {
    marginLeft: 'auto',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: 600,
  },
  time: { fontSize: '10px', color: 'var(--text-muted)' },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, zIndex: 100,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '6px',
    minWidth: '160px', boxShadow: 'var(--shadow-lg)',
  },
  dropdownLabel: {
    fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', padding: '4px 8px 6px',
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-primary)', fontSize: '12px',
    padding: '7px 8px', borderRadius: 'var(--radius-sm)', width: '100%',
    textAlign: 'left', transition: 'background 0.1s',
  },
  stageDot: { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
}
