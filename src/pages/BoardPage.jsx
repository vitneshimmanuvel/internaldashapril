import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, X, ChevronDown, Info, Calendar } from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import CreateLeadModal from '../components/leads/CreateLeadModal'
import LeadCard from '../components/leads/LeadCard'
import { useSettings } from '../context/SettingsContext'

export default function BoardPage() {
  const { user, isManager, activeBoardId } = useAuth()
  const { stages: STAGES, customFields, loadingObj } = useSettings()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => {
    const boardId = localStorage.getItem('lf_active_board_id')
    return boardId ? (sessionStorage.getItem(`lf_board_search_${boardId}`) || '') : ''
  })
  const [showCreate, setShowCreate] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [users, setUsers] = useState([])
  const [filterUser, setFilterUser] = useState(() => {
    const boardId = localStorage.getItem('lf_active_board_id')
    return boardId ? (sessionStorage.getItem(`lf_board_filter_user_${boardId}`) || '') : ''
  })
  const [filterTitle, setFilterTitle] = useState(() => {
    const boardId = localStorage.getItem('lf_active_board_id')
    return boardId ? (sessionStorage.getItem(`lf_board_filter_title_${boardId}`) || '') : ''
  })
  const [timeFilter, setTimeFilter] = useState(() => {
    const boardId = localStorage.getItem('lf_active_board_id')
    return boardId ? (sessionStorage.getItem(`lf_board_time_filter_${boardId}`) || 'all') : 'all'
  })
  const [filterDate, setFilterDate] = useState(() => {
    const boardId = localStorage.getItem('lf_active_board_id')
    return boardId ? (sessionStorage.getItem(`lf_board_filter_date_${boardId}`) || format(new Date(), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd')
  })
  const [filterFromDate, setFilterFromDate] = useState(() => {
    const boardId = localStorage.getItem('lf_active_board_id')
    return boardId ? (sessionStorage.getItem(`lf_board_from_date_${boardId}`) || '') : ''
  })
  const [filterToDate, setFilterToDate] = useState(() => {
    const boardId = localStorage.getItem('lf_active_board_id')
    return boardId ? (sessionStorage.getItem(`lf_board_to_date_${boardId}`) || '') : ''
  })
  const dragItem = useRef(null)

  const titleField = customFields?.find(f => f.id === 'title')

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {}
      if (search) params.search = search
      if (filterUser) params.assigned_to = filterUser
      if (filterTitle) params.title = filterTitle
      
      // Calculate date filters based on when the lead was entered
      if (timeFilter === 'today') {
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        params.from_date = todayStr
        params.to_date = todayStr
      } else if (timeFilter === 'yesterday') {
        const yestStr = format(subDays(new Date(), 1), 'yyyy-MM-dd')
        params.from_date = yestStr
        params.to_date = yestStr
      } else if (timeFilter === '7days') {
        params.from_date = format(subDays(new Date(), 6), 'yyyy-MM-dd')
        params.to_date = format(new Date(), 'yyyy-MM-dd')
      } else if (timeFilter === 'this_month') {
        params.from_date = format(startOfMonth(new Date()), 'yyyy-MM-dd')
        params.to_date = format(new Date(), 'yyyy-MM-dd')
      } else if (timeFilter === 'date') {
        if (filterDate) {
          params.from_date = filterDate
          params.to_date = filterDate
        }
      } else if (timeFilter === 'range') {
        if (filterFromDate) params.from_date = filterFromDate
        if (filterToDate) params.to_date = filterToDate
      }

      const r = await api.get('/leads', { params })
      setLeads(r.data.leads)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterUser, filterTitle, timeFilter, filterDate, filterFromDate, filterToDate, user, activeBoardId])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  useEffect(() => {
    api.get('/users/active').then(r => setUsers(r.data.users)).catch(() => {})
  }, [activeBoardId])

  // Debounce search only
  useEffect(() => {
    const t = setTimeout(fetchLeads, 350)
    return () => clearTimeout(t)
  }, [search])

  // Persist filter states in sessionStorage
  useEffect(() => {
    if (activeBoardId) {
      sessionStorage.setItem(`lf_board_search_${activeBoardId}`, search)
    }
  }, [search, activeBoardId])

  useEffect(() => {
    if (activeBoardId) {
      sessionStorage.setItem(`lf_board_filter_user_${activeBoardId}`, filterUser)
    }
  }, [filterUser, activeBoardId])

  useEffect(() => {
    if (activeBoardId) {
      sessionStorage.setItem(`lf_board_filter_title_${activeBoardId}`, filterTitle)
    }
  }, [filterTitle, activeBoardId])

  useEffect(() => {
    if (activeBoardId) {
      sessionStorage.setItem(`lf_board_time_filter_${activeBoardId}`, timeFilter)
    }
  }, [timeFilter, activeBoardId])

  useEffect(() => {
    if (activeBoardId) {
      sessionStorage.setItem(`lf_board_filter_date_${activeBoardId}`, filterDate)
    }
  }, [filterDate, activeBoardId])

  useEffect(() => {
    if (activeBoardId) {
      sessionStorage.setItem(`lf_board_from_date_${activeBoardId}`, filterFromDate)
    }
  }, [filterFromDate, activeBoardId])

  useEffect(() => {
    if (activeBoardId) {
      sessionStorage.setItem(`lf_board_to_date_${activeBoardId}`, filterToDate)
    }
  }, [filterToDate, activeBoardId])

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
      await api.put(`/leads/${lead.id}/stage`, { new_stage: targetStage })
    } catch (err) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: lead.stage } : l))
    }
  }

  // Mobile touch drag (swipe to move)
  const moveLeadMobile = async (lead, targetStage) => {
    if (lead.stage === targetStage) return
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: targetStage } : l))
    try { await api.put(`/leads/${lead.id}/stage`, { new_stage: targetStage }) }
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
          {timeFilter !== 'all' && (
            <span style={s.activeFilterBadge}>
              {timeFilter === 'today' && 'Entered: Today'}
              {timeFilter === 'yesterday' && 'Entered: Yesterday'}
              {timeFilter === '7days' && 'Entered: Last 7 Days'}
              {timeFilter === 'this_month' && 'Entered: This Month'}
              {timeFilter === 'date' && `Entered: ${filterDate}`}
              {timeFilter === 'range' && `Entered: ${filterFromDate || 'Start'} → ${filterToDate || 'Now'}`}
            </span>
          )}
        </div>
        <div style={s.headerRight}>
          {/* Time Filter Dropdown */}
          <div style={s.timeFilterWrap}>
            <Calendar size={14} style={{ color: timeFilter !== 'all' ? 'var(--accent)' : 'var(--text-muted)' }} />
            <select 
              style={s.timeSelect}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option style={s.selectOption} value="all">All Time</option>
              <option style={s.selectOption} value="today">Entered Today</option>
              <option style={s.selectOption} value="yesterday">Entered Yesterday</option>
              <option style={s.selectOption} value="7days">Last 7 Days</option>
              <option style={s.selectOption} value="this_month">This Month</option>
              <option style={s.selectOption} value="date">Specific Date</option>
              <option style={s.selectOption} value="range">Date Range</option>
            </select>
          </div>

          {timeFilter === 'date' && (
            <input 
              type="date" 
              style={s.dateInput} 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
            />
          )}

          {timeFilter === 'range' && (
            <div style={s.rangeWrap}>
              <input 
                type="date" 
                style={s.dateInput} 
                value={filterFromDate} 
                onChange={(e) => setFilterFromDate(e.target.value)} 
                placeholder="From"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>to</span>
              <input 
                type="date" 
                style={s.dateInput} 
                value={filterToDate} 
                onChange={(e) => setFilterToDate(e.target.value)} 
                placeholder="To"
              />
            </div>
          )}

          {timeFilter !== 'all' && (
            <button 
              style={s.resetFilterBtn} 
              title="Reset time filter to All Time"
              onClick={() => setTimeFilter('all')}
            >
              <X size={12} />
              <span>Clear Time</span>
            </button>
          )}

          <select 
            style={s.filterSelect}
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option style={s.selectOption} value="">All Assignees</option>
            {users.map(u => <option style={s.selectOption} key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          {titleField && titleField.type === 'dropdown' && Array.isArray(titleField.options) ? (
            <select 
              style={s.filterSelect}
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
            >
              <option style={s.selectOption} value="">All {titleField.label || 'Titles'}</option>
              {titleField.options.map((opt, i) => <option style={s.selectOption} key={i} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input 
              style={{ ...s.filterSelect, width: '130px' }}
              placeholder={`Filter ${titleField?.label || 'Title'}...`}
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
            />
          )}

          <div style={s.searchWrap}>
            <Search size={14} style={s.searchIcon} />
            <input
              style={s.searchInput}
              placeholder="Search leads by name, phone..."
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
                      users={users}
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
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  title: { fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 },
  leadCount: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2px 10px',
    fontSize: '12px', color: 'var(--text-secondary)',
  },
  activeFilterBadge: {
    background: 'var(--accent-dim)', color: 'var(--accent)',
    border: '1px solid rgba(79, 124, 255, 0.25)',
    borderRadius: '20px', padding: '2px 10px',
    fontSize: '11px', fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: '4px',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  timeFilterWrap: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '0 10px',
  },
  timeSelect: {
    background: 'var(--bg-elevated)', border: 'none',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '7px 0',
  },
  selectOption: {
    background: '#181b22',
    color: '#e8eaf0',
  },
  rangeWrap: {
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  dateInput: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '6px 10px',
    color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
    fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  resetFilterBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)',
    border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius)',
    padding: '6px 9px', fontSize: '12px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
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
