import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Users, Calendar, ArrowRight, TrendingUp, MapPin, DollarSign, Clock } from 'lucide-react'
import api from '../utils/api'
import { format } from 'date-fns'
import { useSettings } from '../context/SettingsContext'

const ACTION_LABELS = {
  lead_created: { label: 'Lead Created', color: 'var(--green)' },
  stage_changed: { label: 'Stage Changed', color: 'var(--accent)' },
  field_updated: { label: 'Field Updated', color: 'var(--yellow)' },
  note_added: { label: 'Note Added', color: 'var(--purple)' },
  note_edited: { label: 'Note Edited', color: 'var(--orange)' },
  reminder_set: { label: 'Reminder Set', color: 'var(--cyan)' },
  reminder_completed: { label: 'Reminder Done', color: 'var(--green)' },
  visit_logged: { label: 'Visit Logged', color: 'var(--orange)' },
  visit_updated: { label: 'Visit Updated', color: 'var(--yellow)' },
  visit_planned: { label: 'Visit Planned', color: 'var(--cyan)' },
}

export default function AdminStatsPage() {
  const { stages } = useSettings()
  const [stats, setStats] = useState({ newLeads: [], stageMoves: [], allActions: [], activeUsers: [], visitsToday: [], moneyCollected: [] })
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState('today')
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    fetchStats()
  }, [filterMode, singleDate, fromDate, toDate])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterMode === 'date' && singleDate) {
        params.set('from_date', singleDate)
        params.set('to_date', singleDate)
      } else if (filterMode === 'range') {
        if (fromDate) params.set('from_date', fromDate)
        if (toDate) params.set('to_date', toDate)
      }
      
      const r = await api.get(`/stats/today?${params.toString()}`)
      setStats(r.data)
    } catch (e) {
      console.error('Error fetching stats', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={s.page}><div className="app-loading" style={{ height: '50vh' }}><span className="spinner" /></div></div>
  }

  const roleColor = (role) => {
    if (role === 'admin') return 'var(--accent)'
    if (role === 'manager') return 'var(--green)'
    return 'var(--text-muted)'
  }

  const formatStage = (stage) => {
    const found = stages?.find(s => s.id === stage)
    if (found) return found.label
    return stage?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown'
  }

  const moneyCollectedCount = stats.moneyCollected?.length || 0

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Activity Dashboard</h1>
          <p style={s.subtitle}>
            Overview of lead progress and team actions
            {filterMode === 'today' && ` for ${format(new Date(), 'MMMM d, yyyy')}`}
            {filterMode === 'date' && singleDate && ` for ${format(new Date(singleDate), 'MMMM d, yyyy')}`}
            {filterMode === 'range' && (fromDate || toDate) && ` from ${fromDate ? format(new Date(fromDate), 'MMM d, yyyy') : 'start'} to ${toDate ? format(new Date(toDate), 'MMM d, yyyy') : 'now'}`}
          </p>
        </div>
        
        <div style={s.controls}>
          <select 
            style={s.filterSelect} 
            value={filterMode} 
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="date">Specific Date</option>
            <option value="range">Date Range</option>
          </select>

          {filterMode === 'date' && (
            <input 
              type="date" 
              style={s.dateInput} 
              value={singleDate} 
              onChange={(e) => setSingleDate(e.target.value)} 
            />
          )}

          {filterMode === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="date" 
                style={s.dateInput} 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
                placeholder="From"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>to</span>
              <input 
                type="date" 
                style={s.dateInput} 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
                placeholder="To"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={{ ...s.iconWrap, background: 'var(--green-dim)', color: 'var(--green)' }}>
              <TrendingUp size={18} />
            </div>
            <span style={s.cardTitle}>New Leads</span>
          </div>
          <div style={s.val}>{stats.newLeads.length}</div>
        </div>
        
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={{ ...s.iconWrap, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <Activity size={18} />
            </div>
            <span style={s.cardTitle}>Total Actions</span>
          </div>
          <div style={s.val}>{stats.allActions?.length || 0}</div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={{ ...s.iconWrap, background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <Users size={18} />
            </div>
            <span style={s.cardTitle}>Active Users</span>
          </div>
          <div style={s.val}>{stats.activeUsers.length}</div>
        </div>

        <div style={{ ...s.card, borderColor: moneyCollectedCount > 0 ? 'var(--green)' : undefined }}>
          <div style={s.cardHeader}>
            <div style={{ ...s.iconWrap, background: 'var(--green-dim)', color: 'var(--green)' }}>
              <DollarSign size={18} />
            </div>
            <span style={s.cardTitle}>💰 Money Received</span>
          </div>
          <div style={{ ...s.val, color: moneyCollectedCount > 0 ? 'var(--green)' : undefined }}>{moneyCollectedCount}</div>
        </div>
      </div>

      {/* Money Collected - HIGH PRIORITY at the top */}
      {moneyCollectedCount > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ ...s.section, border: '2px solid var(--green)' }}>
            <h3 style={{ ...s.sectionTitle, background: 'var(--green-dim)', color: 'var(--green)' }}>
              💰 Money Collected — HIGH PRIORITY ({moneyCollectedCount})
            </h3>
            <div style={s.list}>
              {stats.moneyCollected.map(mc => (
                <div key={mc.id} style={{ ...s.listItem, background: 'rgba(16,185,129,0.04)' }}>
                  <div style={s.itemMain}>
                    <Link to={`/leads/${mc.lead_id}`} style={{ ...s.leadLink, color: 'var(--green)' }}>
                      {mc.client_name} — {mc.lead_title}
                    </Link>
                    <span style={s.itemSub}>
                      {mc.value ? `Deal Value: ₹${Number(mc.value).toLocaleString('en-IN')}` : ''}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {mc.content.length > 100 ? mc.content.slice(0, 100) + '…' : mc.content}
                    </span>
                  </div>
                  <div style={s.itemMeta}>
                    <span style={s.time}>{format(new Date(mc.created_at), 'HH:mm')}</span>
                    <span style={{ ...s.pill, background: 'var(--green-dim)', color: 'var(--green)' }}>
                      {mc.user_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '24px' }} className="stats-columns">
        
        {/* New Leads List */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Fresh Leads</h3>
          {(!stats.newLeads || stats.newLeads.length === 0) ? (
            <div style={s.empty}>No new leads found for this period.</div>
          ) : (
            <div style={s.list}>
              {stats.newLeads.map(lead => (
                <div key={lead.id} style={s.listItem}>
                  <div style={s.itemMain}>
                    <Link to={`/leads/${lead.id}`} style={s.leadLink}>{lead.client_name}</Link>
                    <span style={s.itemSub}>{lead.title}</span>
                  </div>
                  <div style={s.itemMeta}>
                    <span style={s.time}>{format(new Date(lead.created_at), 'HH:mm')}</span>
                    <span style={{ ...s.pill, background: `${roleColor(lead.creator_role)}20`, color: roleColor(lead.creator_role) }}>
                      {lead.creator_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Activity Timeline */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>All Activity ({stats.allActions?.length || 0})</h3>
          {(!stats.allActions || stats.allActions.length === 0) ? (
            <div style={s.empty}>No activity recorded for this period.</div>
          ) : (
            <div style={{ ...s.list, maxHeight: '500px', overflow: 'auto' }}>
              {stats.allActions.map(action => {
                const meta = ACTION_LABELS[action.action] || { label: action.action, color: 'var(--text-muted)' }
                const details = typeof action.details === 'string' ? (() => { try { return JSON.parse(action.details) } catch { return {} } })() : (action.details || {})
                return (
                  <div key={action.id} style={s.listItem}>
                    <div style={s.itemMain}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: meta.color }}>{meta.label}</span>
                        {details.money_collected && <span style={{ fontSize: '10px', background: 'var(--green-dim)', color: 'var(--green)', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>💰</span>}
                      </div>
                      <Link to={`/leads/${action.lead_id}`} style={s.leadLinkSm}>
                        {action.client_name} — {action.lead_title}
                      </Link>
                      {action.action === 'stage_changed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {formatStage(action.old_value)} <ArrowRight size={10} /> {formatStage(action.new_value)}
                        </div>
                      )}
                      {action.field_changed && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {action.field_changed}: {action.old_value} → {action.new_value}
                        </span>
                      )}
                    </div>
                    <div style={s.itemMeta}>
                      <span style={s.time}>{format(new Date(action.created_at), 'HH:mm')}</span>
                      <span style={{ ...s.pill, background: `${roleColor(action.user_role)}20`, color: roleColor(action.user_role) }}>
                        {action.user_name}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Visits Logged */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Field Visits</h3>
          {(!stats.visitsToday || stats.visitsToday.length === 0) ? (
            <div style={s.empty}>No field visits logged for this period.</div>
          ) : (
            <div style={s.list}>
              {stats.visitsToday.map(visit => (
                <div key={visit.id} style={s.listItem}>
                  <div style={s.itemMain}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={12} style={{ color: 'var(--orange)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{visit.location}</span>
                    </div>
                    <span style={s.leadLinkSm}>{visit.lead_title}</span>
                    <span style={s.itemSub}>{parseFloat(visit.distance_km).toFixed(1)} km</span>
                  </div>
                  <div style={s.itemMeta}>
                    <span style={s.time}>{format(new Date(visit.created_at), 'HH:mm')}</span>
                    <span style={{ ...s.pill, background: `${roleColor(visit.user_role)}20`, color: roleColor(visit.user_role) }}>
                      {visit.user_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

const s = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto', animation: 'fade 0.3s ease' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' },
  title: { fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: 0 },
  controls: {
    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
    background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  },
  filterSelect: {
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text-primary)',
    fontSize: '12px', outline: 'none', fontFamily: 'var(--font-body)',
  },
  dateInput: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text-primary)',
    fontSize: '12px', outline: 'none', fontFamily: 'var(--font-body)', minWidth: '120px'
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  card: { 
    background: 'var(--bg-surface)', border: '1px solid var(--border)', 
    borderRadius: 'var(--radius-lg)', padding: '20px',
    boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  iconWrap: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' },
  val: { fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800 },
  section: { 
    background: 'var(--bg-surface)', border: '1px solid var(--border)', 
    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)'
  },
  sectionTitle: { 
    fontSize: '14px', fontWeight: 600, padding: '16px 20px', 
    borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)',
    fontFamily: 'var(--font-display)' 
  },
  list: { display: 'flex', flexDirection: 'column' },
  listItem: { 
    padding: '14px 20px', borderBottom: '1px solid var(--border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
    transition: 'background 0.15s'
  },
  itemMain: { display: 'flex', flexDirection: 'column', gap: '4px' },
  leadLink: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' },
  leadLinkSm: { fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none', marginTop: '2px' },
  itemSub: { fontSize: '12px', color: 'var(--text-secondary)' },
  itemMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 },
  time: { fontSize: '11px', color: 'var(--text-muted)' },
  pill: { fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', whiteSpace: 'nowrap' },
  empty: { padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }
}
