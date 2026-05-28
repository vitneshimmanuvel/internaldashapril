import { useState, useEffect } from 'react';
import { Plus, Edit2, Users, Check, X, Shield, Settings } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
//csfsfd egfdaffqefqf svdsddsfaafaadv dfaascac
export default function AdminBoards() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [editBoard, setEditBoard] = useState(null);
  const [form, setForm] = useState({ name: '', is_active: true });
  
  const [showMembers, setShowMembers] = useState(null); // Board ID
  const [members, setMembers] = useState([]);
  const [addMemberForm, setAddMemberForm] = useState({ userId: '', role: 'visitor' });

  const [boardMembers, setBoardMembers] = useState({}); // { boardId: [members] }

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [bRes, uRes] = await Promise.all([
        api.get('/boards'),
        api.get('/users/all') // Global users list for assignment
      ]);
      setBoards(bRes.data.boards);
      setAllUsers(uRes.data.users);

      // Fetch members for each board
      const membersMap = {};
      for (const board of bRes.data.boards) {
        try {
          const mRes = await api.get(`/boards/${board.id}`);
          membersMap[board.id] = mRes.data.members || [];
        } catch (e) {
          membersMap[board.id] = [];
        }
      }
      setBoardMembers(membersMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveBoard = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editBoard) {
        await api.put(`/boards/${editBoard.id}`, form);
        setSuccess('Board updated');
      } else {
        await api.post('/boards', form);
        setSuccess('Board created');
      }
      setShowCreate(false);
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error saving board');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addMemberForm.userId) return;
    try {
      await api.post(`/boards/${showMembers}/members`, { user_id: addMemberForm.userId, role: addMemberForm.role });
      // Refresh board list to get updated member count, or just fetch again
      await fetchData();
      setAddMemberForm({ userId: '', role: 'visitor' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.delete(`/boards/${showMembers}/members/${userId}`);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.role !== 'admin') {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Access denied. Only Global Admins can manage boards.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button style={s.createBtn} onClick={() => { setForm({ name: '', is_active: true }); setEditBoard(null); setShowCreate(true); }}>
          <Plus size={15} /> Create Board
        </button>
      </div>

      {success && (
        <div style={s.successWrap} className="animate-fade">
          <Check size={16} color="var(--green)" />
          <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{success}</span>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading boards...</div>
      ) : (
        <div style={s.grid}>
          {boards.map(b => {
             // Members for this specific board from our fetched map
             const bMembers = boardMembers[b.id] || [];
             // Match members with full user details
             const memberUsers = bMembers.map(m => {
               const fullUser = allUsers.find(u => u.id === m.user_id);
               return fullUser ? { ...fullUser, boardRole: m.role || m.user_role } : null;
             }).filter(Boolean);

             return (
               <div key={b.id} style={{...s.card, opacity: b.is_active ? 1 : 0.6}}>
                 <div style={s.cardHeader}>
                   <div style={s.cardTitle}>
                     <div style={s.iconWrap}><Shield size={16} style={{ color: 'var(--accent)' }}/></div>
                     <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</h3>
                   </div>
                   <div style={{ display: 'flex', gap: '8px' }}>
                     <button style={s.actionBtn} onClick={() => setShowMembers(showMembers === b.id ? null : b.id)} title="Members">
                       <Users size={14} />
                     </button>
                     <button style={s.actionBtn} onClick={() => { setForm({ name: b.name, is_active: b.is_active }); setEditBoard(b); setShowCreate(true); }} title="Edit Settings">
                       <Settings size={14} />
                     </button>
                   </div>
                 </div>
                 
                 <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                   Created {format(new Date(b.created_at), 'MMM dd, yyyy')} • {memberUsers.length} members
                 </div>

                 {!b.is_active && <span style={s.inactiveBadge}>Inactive</span>}

                 {showMembers === b.id && (
                   <div style={s.membersSection}>
                     <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                       {memberUsers.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No members assigned</div> : null}
                       {memberUsers.map(m => (
                         <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                           <div style={{ fontSize: '12px' }}>
                             <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</div>
                             <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{m.email} • {m.boardRole}</div>
                           </div>
                           {m.role !== 'admin' && (
                             <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }} onClick={() => handleRemoveMember(m.id)}>
                               <X size={12} />
                             </button>
                           )}
                         </div>
                       ))}
                     </div>
                     <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '6px' }}>
                       <select style={{...s.input, flex: 1, padding: '6px', fontSize: '12px'}} value={addMemberForm.userId} onChange={e => setAddMemberForm(f => ({...f, userId: e.target.value}))} required>
                         <option value="">Select User...</option>
                         {allUsers.filter(u => !memberUsers.some(mu => mu.id === u.id)).map(u => (
                           <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                         ))}
                       </select>
                       <select style={{...s.input, width: '100px', padding: '6px', fontSize: '12px'}} value={addMemberForm.role} onChange={e => setAddMemberForm(f => ({...f, role: e.target.value}))}>
                         <option value="visitor">Employee</option>
                         <option value="admin">Admin</option>
                       </select>
                       <button type="submit" style={{...s.createBtn, padding: '6px 10px'}}><Plus size={14}/></button>
                     </form>
                   </div>
                 )}
               </div>
             )
          })}
        </div>
      )}

      {/* Create / Edit Board Modal */}
      {showCreate && (
        <div style={s.backdrop} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={s.modal} className="animate-fade">
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editBoard ? 'Edit Board' : 'Create Board'}</h2>
              <button style={s.closeBtn} onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveBoard} style={s.modalForm}>
              {error && <div style={s.error}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Board Name *</label>
                <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Acme Corp" />
              </div>
              {editBoard && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <label htmlFor="active" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Board is Active</label>
                </div>
              )}
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                  {saving ? 'Saving…' : editBoard ? 'Save Changes' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  createBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', padding: '9px 16px',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-display)', whiteSpace: 'nowrap',
  },
  successWrap: { 
    display: 'flex', alignItems: 'center', gap: '8px', 
    background: 'var(--green-dim)', border: '1px solid var(--green)', 
    borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '24px' 
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrap: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  actionBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '6px', cursor: 'pointer',
    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
    transition: 'color 0.15s',
  },
  inactiveBadge: {
    display: 'inline-block', borderRadius: '20px',
    background: 'var(--red-dim)', color: 'var(--red)',
    padding: '2px 8px', fontSize: '11px', fontWeight: 600,
    marginBottom: '12px'
  },
  membersSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px dashed var(--border)'
  },
  input: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-body)' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' },
  modal: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: { padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' },
  modalTitle: { fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '4px' },
  modalForm: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  error: { background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: '#fca5a5', fontSize: '13px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' },
  cancelBtn: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 18px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' },
  saveBtn: { background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)' },
};
