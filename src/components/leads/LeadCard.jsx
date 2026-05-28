import { useState } from 'react'
import { MessageSquare, Bell, Calendar, ChevronRight, MoreHorizontal, MoveRight, Copy, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSettings } from '../../context/SettingsContext'

const PRIORITY_COLORS = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' }

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      style={s.copyBtn} 
      onClick={handleCopy}
      title={`Copy "${text}"`}
      className="copy-btn"
    >
      {copied ? (
        <Check size={13} style={{ color: 'var(--green)' }} />
      ) : (
        <Copy size={13} style={s.copyIcon} />
      )}
    </button>
  );
}

export default function LeadCard({ lead, stageColor, isDragging, stages, onDragStart, onMoveStage, onClick, users = [] }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const { customFields } = useSettings()

  const stopProp = (e) => e.stopPropagation()

  // Get fields marked for card display, sorted by cardOrder
  const cardFields = (customFields || [])
    .filter(f => f.showOnCard)
    .sort((a, b) => (a.cardOrder || 0) - (b.cardOrder || 0))

  // Helpers to check if a specific field should show on card
  const shouldShow = (fieldId) => cardFields.some(f => f.id === fieldId)

  // Special fields rendered with dedicated UI
  const specialIds = ['title', 'client_name', 'client_company', 'value', 'priority', 'assigned_to']

  // Extra visible fields (non-special ones that are showOnCard and have data)
  const extraFields = cardFields.filter(f => {
    if (specialIds.includes(f.id)) return false
    const val = f.isSystem ? lead[f.id] : lead.custom_data?.[f.id]
    return val && String(val).trim() !== ''
  })

  return (
    <div
      style={{ ...s.card, opacity: isDragging ? 0.4 : 1, borderLeftColor: stageColor }}
      draggable
      onDragStart={e => onDragStart(e, lead)}
      onClick={onClick}
      className="animate-fade lead-card"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {(() => {
          const visibleTextFields = cardFields.filter(f => {
            if (f.id === 'assigned_to' || f.id === 'priority') return false;
            if (['client_name', 'client_company', 'title', 'value'].includes(f.id)) return true;
            const val = f.isSystem ? lead[f.id] : lead.custom_data?.[f.id];
            return val && String(val).trim() !== '';
          });

          return visibleTextFields.map((field, index) => {
            const isFirstItem = index === 0;
            let content = null;

            if (field.id === 'client_name') {
              content = (
                <span style={isFirstItem ? s.title : { fontSize: '13px', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center' }}>
                  {lead.client_name || '—'}
                  {lead.client_name && <CopyButton text={lead.client_name} />}
                </span>
              );
            } else if (field.id === 'client_company') {
              content = (
                <div style={isFirstItem ? s.title : { ...s.company, display: 'inline-flex', alignItems: 'center' }}>
                  {lead.client_company || '—'}
                  {lead.client_company && <CopyButton text={lead.client_company} />}
                </div>
              );
            } else if (field.id === 'title') {
              content = (
                <div style={isFirstItem ? s.title : { ...s.serviceTitle, display: 'inline-flex', alignItems: 'center' }}>
                  {lead.title || '—'}
                  {lead.title && <CopyButton text={lead.title} />}
                </div>
              );
            } else if (field.id === 'value') {
              content = (
                <div style={{ ...s.value, display: 'inline-flex', alignItems: 'center' }}>
                  ₹{Number(lead.value || 0).toLocaleString('en-IN')}
                  {lead.value && <CopyButton text={String(lead.value)} />}
                </div>
              );
            } else {
              let val = field.isSystem ? lead[field.id] : lead.custom_data?.[field.id];
              
              if (field.type === 'user_dropdown') {
                if (field.isSystem) {
                  val = lead.assigned_name || 'Unassigned';
                } else if (val) {
                  const u = users.find(u => u.id === val);
                  if (u) val = u.name;
                }
              }

              content = (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>{field.label}:</span>
                  <span>{val}</span>
                  {val && val !== 'Unassigned' && <CopyButton text={val} />}
                </div>
              );
            }

            if (isFirstItem) {
              return (
                <div key={field.id} style={s.top}>
                  {shouldShow('priority') && (
                    <div style={{ ...s.priority, background: PRIORITY_COLORS[lead.priority] || 'var(--text-muted)' }} title={lead.priority} />
                  )}
                  {content}
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
              );
            }

            return <div key={field.id}>{content}</div>;
          });
        })()}
      </div>

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
        {shouldShow('assigned_to') && lead.assigned_name && (
          <span style={s.assignee}>{lead.assigned_name.split(' ')[0]}</span>
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
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '6px',
    verticalAlign: 'middle',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  copyIcon: {
    color: 'var(--text-secondary)',
  },
  top: { display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' },
  priority: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '5px' },
  title: { flex: 1, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 },
  moreBtn: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer',
    color: 'var(--text-secondary)', padding: '4px 6px', display: 'flex', alignItems: 'center',
    borderRadius: 'var(--radius-sm)', flexShrink: 0, minWidth: '28px', minHeight: '28px',
    justifyContent: 'center',
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
