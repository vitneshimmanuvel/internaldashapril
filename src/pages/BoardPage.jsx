import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, X, ChevronDown, Info } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import CreateLeadModal from '../components/leads/CreateLeadModal'
import LeadCard from '../components/leads/LeadCard'

// STAGES are now fetched from SettingsContext

import { useSettings } from '../context/SettingsContext'

export default function BoardPage() {
  const { user, isManager } = useAuth()
  const { stages: STAGES, loadingObj } = useSettings()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [users, setUsers] = useState([])
  const [filterUser, setFilterUser] = useState('')
  const dragItem = useRef(null)

  const fetchLeads = useCallback(async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (filterUser) params.assigned_to = filterUser
      // If not a manager, they can still see leads, but maybe only their own?
      // For now we just implement the filter hiding.
      const r = await api.get('/leads', { params })
      setLeads(r.data.leads)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterUser])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  useEffect(() => {
    api.get('/users/active').then(r => setUsers(r.data.users)).catch(() => {})
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchLeads, 350)
    return () => clearTimeout(t)
  }, [search])

  const leadsForStage = (stage) => leads.filter(l => l.stage === stage)

  // Drag & drop handlers
  const onDragStart = (e, lead) => {
    dragItem.current = lead
    setDragging(lead.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e, stageId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(stageId)
  }

  const onDrop = async (e, targetStage) => {
    e.preventDefault()
    const lead = dragItem.current
    if (!lead || lead.stage === targetStage) { setDragging(null); setDragOver(null); return }

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: targetStage } : l))
    setDragging(null); setDragOver(null)

    try {
      await api.put(`/leads/${lead.id}/stage`, { stage: targetStage })
    } catch (err) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: lead.stage } : l))
    }
  }

  // Mobile touch drag (swipe to move)
  const moveLeadMobile = async (lead, targetStage) => {
    if (lead.stage === targetStage) return
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: targetStage } : l))
    try { await api.put(`/leads/${lead.id}/stage`, { stage: targetStage }) }
    catch { setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: lead.stage } : l)) }
  }

  const onLeadCreated = (lead) => { setLeads(prev => [lead, ...prev]); setShowCreate(false) }

  if (loadingObj) return <div style={s.page}><div style={s.header}><h1 style={s.title}>Pipeline</h1></div><div style={s.loading}>Loading settings...</div></div>

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <h1 style={s.title}>Pipeline Board</h1>
          <span style={s.leadCount}>{leads.length} leads</span>
        </div>
        <div style={s.headerRight}>
          {isManager && (
            <select 
              style={s.filterSelect}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">All Assignees</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <div style={s.searchWrap}>
            <Search size={14} style={s.searchIcon} />
            <input
              style={s.searchInput}
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button style={s.clearBtn} onClick={() => setSearch('')}><X size={12} /></button>}
          </div>
          <button style={s.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={15} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Board */}
      <div style={s.board} className="board-columns">
        {STAGES.map((stage) => {
          const stageLeads = leadsForStage(stage.id)
          const isDragTarget = dragOver === stage.id
          return (
            <div
              key={stage.id}
              style={{ ...s.column, ...(isDragTarget ? s.columnHover : {}) }}
              onDragOver={e => onDragOver(e, stage.id)}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, stage.id)}
            >
              {/* Column header */}
              <div style={s.colHeader}>
                <div style={{ ...s.stageIndicator, background: stage.color }} />
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, cursor: stage.info ? 'pointer' : 'default' }} 
                  title={stage.info || ''}
                  onClick={() => { if (stage.info) window.alert(`Stage: ${stage.label}\n\nInstructions:\n${stage.info}`) }}
                >
                  <span style={s.stageName}>{stage.label}</span>
                  {stage.info && <Info size={12} style={{ opacity: 0.6 }} />}
                </div>
                <span style={{ ...s.stageCount, background: `${stage.color}20`, color: stage.color }}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div style={s.cardList}>
                {loading && stageLeads.length === 0 ? (
                  [1,2].map(i => <div key={i} style={s.skeletonCard} className="skeleton" />)
                ) : stageLeads.length === 0 ? (
                  <div style={s.emptyCol}>
                    <span>Drop cards here</span>
                  </div>
                ) : (
                  stageLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      stageColor={stage.color}
                      isDragging={dragging === lead.id}
                      stages={STAGES}
                      onDragStart={onDragStart}
                      onMoveStage={moveLeadMobile}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    />
                  ))
                )}
              </div>

              {/* Add lead in col */}
              <button style={s.addInCol} onClick={() => setShowCreate(true)}>
                <Plus size={13} /> <span>Add lead</span>
              </button>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <CreateLeadModal
          onClose={() => setShowCreate(false)}
          onCreated={onLeadCreated}
          users={users}
        />
      )}
    </div>
  )
}

const s = {
  page: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    padding: '20px 24px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '12px', flexWrap: 'wrap',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 },
  leadCount: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2px 10px',
    fontSize: '12px', color: 'var(--text-secondary)',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  searchWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  searchIcon: { position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '8px 32px 8px 32px',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    width: '200px', fontFamily: 'var(--font-body)',
  },
  clearBtn: {
    position: 'absolute', right: '8px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
  },
  filterSelect: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '7px 12px',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
  createBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius)',
    padding: '8px 14px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font-display)',
    whiteSpace: 'nowrap',
  },
  board: {
    flex: 1, overflow: 'auto',
    display: 'flex', gap: '0',
    padding: '16px',
    minWidth: 0,
  },
  column: {
    flex: '0 0 280px', minWidth: '240px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    margin: '0 6px',
    display: 'flex', flexDirection: 'column',
    maxHeight: '100%',
    transition: 'border-color 0.15s, background 0.15s',
  },
  columnHover: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-dim)',
  },
  colHeader: {
    padding: '14px 14px 10px',
    display: 'flex', alignItems: 'center', gap: '8px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  stageIndicator: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  stageName: { flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px' },
  stageCount: {
    borderRadius: '20px', padding: '1px 7px',
    fontSize: '11px', fontWeight: 700,
  },
  cardList: {
    flex: 1, overflow: 'auto',
    padding: '10px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  skeletonCard: { height: '100px', borderRadius: 'var(--radius)' },
  emptyCol: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-muted)', fontSize: '12px',
    border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
    minHeight: '80px', padding: '20px',
  },
  addInCol: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: '12px',
    padding: '10px 14px', borderTop: '1px solid var(--border)',
    width: '100%', textAlign: 'left',
    transition: 'color 0.15s',
    borderBottomLeftRadius: 'var(--radius-lg)',
    borderBottomRightRadius: 'var(--radius-lg)',
    flexShrink: 0,
  },
}
