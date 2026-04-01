import { useState, useEffect } from 'react'
import { MapPin, Car, Users, Clock, Filter, Calendar, ChevronDown, Search } from 'lucide-react'
import api from '../utils/api'
import { format } from 'date-fns'

const PURPOSES = {
  site_visit: 'Site Visit', client_meeting: 'Client Meeting',
  follow_up_visit: 'Follow-up Visit', final_inspection: 'Final Inspection', other: 'Other',
}
const OUTCOMES = {
  positive: { label: 'Positive', color: 'var(--green)' },
  neutral: { label: 'Neutral', color: 'var(--yellow)' },
  negative: { label: 'Negative', color: 'var(--red)' },
  pending: { label: 'Pending', color: 'var(--text-muted)' },
}
const TRAVEL_MODES = { car: '🚗 Car', bike: '🏍️ Bike', public_transport: '🚌 Transit', walk: '🚶 Walk', other: '📦 Other' }

export default function TravelLogsPage() {
  const [visits, setVisits] = useState([])
  const [userSummary, setUserSummary] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expandedVisit, setExpandedVisit] = useState(null)

  useEffect(() => {
    api.get('/users/active').then(r => setUsers(r.data.users)).catch(() => {})
  }, [])

  useEffect(() => {
    fetchVisits()
  }, [filterUser, fromDate, toDate])

  const fetchVisits = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterUser) params.set('user_id', filterUser)
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)
      const r = await api.get(`/visits/all?${params.toString()}`)
      setVisits(r.data.visits || [])
      setUserSummary(r.data.userSummary || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const totalKm = userSummary.reduce((sum, u) => sum + parseFloat(u.total_distance_km || 0), 0)
  const totalVisits = visits.length

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Travel Logs</h1>
          <p style={s.subtitle}>Track all field visits and travel across the team</p>
        </div>
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <Users size={13} style={{ color: 'var(--text-muted)' }} />
          <select style={s.filterSelect} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="">All Team Members</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div style={s.filterGroup}>
          <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
          <input type="date" style={s.filterInput} value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From" />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>to</span>
          <input type="date" style={s.filterInput} value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To" />
        </div>
        {(filterUser || fromDate || toDate) && (
          <button style={s.clearBtn} onClick={() => { setFilterUser(''); setFromDate(''); setToDate(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--orange)' }}>{totalVisits}</div>
          <div style={s.statLabel}>TOTAL VISITS</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>{totalKm.toFixed(1)}</div>
          <div style={s.statLabel}>TOTAL KM TRAVELED</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--green)' }}>{userSummary.length}</div>
          <div style={s.statLabel}>ACTIVE TRAVELERS</div>
        </div>
      </div>

      {/* Per-User Summary */}
      {userSummary.length > 0 && (
        <div style={s.summarySection}>
          <h3 style={s.sectionTitle}>Team Travel Summary</h3>
          <div style={s.summaryGrid}>
            {userSummary.map(u => (
              <div key={u.id} style={{
                ...s.summaryCard,
                border: filterUser === u.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                cursor: 'pointer',
              }} onClick={() => setFilterUser(filterUser === u.id ? '' : u.id)}>
                <div style={s.summaryAvatar}>{u.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {u.role === 'visitor' ? 'Employee' : u.role}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--orange)' }}>{u.total_visits}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{parseFloat(u.total_distance_km).toFixed(1)} km</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit List */}
      <div style={s.visitList}>
        <h3 style={s.sectionTitle}>All Visits {filterUser && `— Filtered`}</h3>
        {loading ? (
          <div style={s.empty}>Loading visits...</div>
        ) : visits.length === 0 ? (
          <div style={s.empty}>
            <MapPin size={24} style={{ marginBottom: '8px', color: 'var(--text-muted)' }} />
            <div>No visits found{filterUser || fromDate || toDate ? ' for the selected filters' : ''}.</div>
          </div>
        ) : (
          visits.map(v => {
            const outcomeInfo = OUTCOMES[v.outcome] || OUTCOMES.pending
            const isExpanded = expandedVisit === v.id
            return (
              <div key={v.id} style={s.visitCard} onClick={() => setExpandedVisit(isExpanded ? null : v.id)}>
                <div style={s.visitHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={s.visitIcon}><MapPin size={16} /></div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{v.location}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {v.lead_title} — {v.client_name}{v.client_company ? ` (${v.client_company})` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '10px', padding: '3px 10px', borderRadius: '12px', fontWeight: 600,
                      background: `${outcomeInfo.color}18`, color: outcomeInfo.color,
                    }}>{outcomeInfo.label}</span>
                    <ChevronDown size={14} style={{
                      color: 'var(--text-muted)', transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }} />
                  </div>
                </div>

                <div style={s.visitMeta}>
                  <span><Clock size={10} /> {format(new Date(v.visit_date), 'dd MMM yyyy, HH:mm')}</span>
                  <span><Car size={10} /> {v.distance_km} km</span>
                  <span style={s.purposeBadge}>{PURPOSES[v.purpose] || v.purpose}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>by {v.created_by_name}</span>
                </div>

                {isExpanded && (
                  <div style={s.visitExpanded} className="animate-fade">
                    {v.participants && v.participants.length > 0 && (
                      <div style={s.participantsRow}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Participants:</span>
                        {v.participants.map(p => (
                          <div key={p.id} style={s.participantChip}>
                            <span style={{ fontWeight: 500 }}>{p.user_name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                              {p.distance_km}km · {TRAVEL_MODES[p.travel_mode] || p.travel_mode}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {v.notes && (
                      <div style={s.visitNotes}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Notes:</span>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{v.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const s = {
  page: { padding: '24px 32px', maxWidth: '1100px', margin: '0 auto', height: '100%', overflow: 'auto' },
  header: { marginBottom: '20px' },
  title: {
    fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)', margin: 0,
  },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' },
  filterBar: {
    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
    marginBottom: '20px', padding: '12px 16px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  filterSelect: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text-primary)',
    fontSize: '12px', outline: 'none', fontFamily: 'var(--font-body)',
  },
  filterInput: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text-primary)',
    fontSize: '12px', outline: 'none', fontFamily: 'var(--font-body)',
  },
  clearBtn: {
    background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: '140px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    padding: '16px 20px',
  },
  statLabel: { fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginTop: '4px' },
  summarySection: { marginBottom: '24px' },
  sectionTitle: {
    fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)', margin: '0 0 12px 0',
  },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' },
  summaryCard: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
    padding: '12px 16px', transition: 'border-color 0.15s',
  },
  summaryAvatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)', flexShrink: 0,
  },
  visitList: {},
  empty: { color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  visitCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '14px 18px',
    marginBottom: '8px', cursor: 'pointer', transition: 'border-color 0.15s',
  },
  visitHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' },
  visitIcon: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--orange)18', color: 'var(--orange)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  visitMeta: {
    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
    fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px', paddingLeft: '42px',
  },
  purposeBadge: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    padding: '1px 8px', borderRadius: '10px', fontSize: '10px',
  },
  visitExpanded: {
    marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', paddingLeft: '42px',
  },
  participantsRow: {
    display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px',
  },
  participantChip: {
    display: 'flex', flexDirection: 'column', gap: '1px',
    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
    borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: '11px', color: 'var(--accent)',
  },
  visitNotes: {
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius)',
    padding: '10px 12px',
  },
}
