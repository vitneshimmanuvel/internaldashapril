import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, Check, Plus, X, Loader } from 'lucide-react';
import api from '../../utils/api';

export default function BoardSwitcher() {
  const { user, activeBoardId, switchBoard, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
        setNewName('');
        setError('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  if (!user || !user.boards || user.boards.length === 0) return null;

  const activeBoard = user.boards.find(b => b.id === activeBoardId) || user.boards[0];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/boards', { name: newName.trim() });
      const newBoard = res.data.board;
      setNewName('');
      setCreating(false);
      setOpen(false);
      // Switch to the new board (this reloads the page)
      switchBoard(newBoard.id);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create board');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.container} ref={menuRef}>
      <button style={s.button} onClick={() => setOpen(!open)}>
        <div style={s.boardIndicator}>{activeBoard?.name?.charAt(0).toUpperCase()}</div>
        <span style={s.boardName}>{activeBoard?.name}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={s.dropdown} className="animate-fade">
          <div style={s.dropdownHeader}>Workspaces</div>
          <div style={s.boardList}>
            {user.boards.map(board => (
              <button
                key={board.id}
                style={{ ...s.boardItem, ...(board.id === activeBoardId ? s.boardItemActive : {}) }}
                onClick={() => {
                  if (board.id !== activeBoardId) {
                    switchBoard(board.id);
                  }
                  setOpen(false);
                }}
              >
                <div style={{
                  ...s.boardIcon,
                  background: board.id === activeBoardId ? 'var(--accent-dim)' : 'var(--bg-base)',
                  color: board.id === activeBoardId ? 'var(--accent)' : 'var(--text-secondary)',
                  border: board.id === activeBoardId ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}>{board.name.charAt(0).toUpperCase()}</div>
                <div style={s.boardDetails}>
                  <div style={s.boardItemName}>{board.name}</div>
                </div>
                {board.id === activeBoardId && <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              </button>
            ))}
          </div>

          {/* Create new board - admin only */}
          {isAdmin && (
            <div style={s.createSection}>
              {creating ? (
                <div style={s.createForm}>
                  <input
                    ref={inputRef}
                    style={s.createInput}
                    placeholder="Board name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') { setCreating(false); setNewName(''); setError(''); }
                    }}
                    disabled={saving}
                  />
                  {error && <div style={s.error}>{error}</div>}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      style={{ ...s.createSubmitBtn, opacity: saving ? 0.6 : 1 }}
                      onClick={handleCreate}
                      disabled={saving || !newName.trim()}
                    >
                      {saving ? <Loader size={12} className="spin" /> : <Check size={12} />}
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                    <button style={s.createCancelBtn} onClick={() => { setCreating(false); setNewName(''); setError(''); }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <button style={s.newBoardBtn} onClick={() => setCreating(true)}>
                  <Plus size={14} />
                  <span>Create New Board</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  container: {
    position: 'relative',
    margin: '0 16px 12px',
  },
  button: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  boardName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    textAlign: 'left',
  },
  boardIndicator: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    flexShrink: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    minWidth: '220px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '10px 12px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-base)',
  },
  boardList: {
    maxHeight: '250px',
    overflowY: 'auto',
    padding: '4px',
  },
  boardItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  boardItemActive: {
    background: 'var(--accent-dim)',
  },
  boardIcon: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  boardDetails: {
    flex: 1,
    overflow: 'hidden',
  },
  boardItemName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  createSection: {
    borderTop: '1px solid var(--border)',
    padding: '6px',
  },
  newBoardBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 10px',
    background: 'transparent',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '4px',
  },
  createInput: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
  },
  error: {
    fontSize: '11px',
    color: 'var(--red)',
    padding: '0 2px',
  },
  createSubmitBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '7px 10px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
  },
  createCancelBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
  },
};
