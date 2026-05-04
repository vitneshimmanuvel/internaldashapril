import { useState, useEffect, useRef } from 'react';
import { Plus, GripVertical, Trash2, Check, Eye, EyeOff, ChevronUp, ChevronDown, MessageSquare, Bell, MoveRight } from 'lucide-react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

export default function AdminLeadFields() {
  const { customFields, fetchSettings } = useSettings();
  const [editingFields, setEditingFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    if (customFields) {
      setEditingFields(JSON.parse(JSON.stringify(customFields)));
    }
  }, [customFields]);

  const handleSort = () => {
    let _fields = [...editingFields];
    const draggedItemContent = _fields.splice(dragItem.current, 1)[0];
    _fields.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setEditingFields(_fields);
  };

  const addField = () => {
    setEditingFields([
      ...editingFields, 
      { id: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, options: '', showOnCard: false, cardOrder: 99 }
    ]);
  };

  const updateField = (idx, key, val) => {
    const arr = [...editingFields];
    arr[idx][key] = val;
    // When toggling showOnCard ON, give it a default card order
    if (key === 'showOnCard' && val === true) {
      const maxOrder = Math.max(0, ...arr.filter(f => f.showOnCard).map(f => f.cardOrder || 0));
      arr[idx].cardOrder = maxOrder + 1;
    }
    setEditingFields(arr);
  };

  const moveCardOrder = (idx, direction) => {
    const arr = [...editingFields];
    const cardFields = arr
      .map((f, i) => ({ ...f, _idx: i }))
      .filter(f => f.showOnCard)
      .sort((a, b) => (a.cardOrder || 0) - (b.cardOrder || 0));

    const currentPos = cardFields.findIndex(f => f._idx === idx);
    if (currentPos < 0) return;

    const swapPos = currentPos + direction;
    if (swapPos < 0 || swapPos >= cardFields.length) return;

    // Swap cardOrder values
    const tempOrder = arr[cardFields[currentPos]._idx].cardOrder;
    arr[cardFields[currentPos]._idx].cardOrder = arr[cardFields[swapPos]._idx].cardOrder;
    arr[cardFields[swapPos]._idx].cardOrder = tempOrder;
    setEditingFields(arr);
  };

  const removeField = (idx) => {
    if (window.confirm('Are you sure you want to delete this field from this board? Only this board will be affected, and any existing data for this field will be hidden.')) {
      const arr = [...editingFields];
      arr.splice(idx, 1);
      setEditingFields(arr);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await api.put('/settings', { key: 'custom_fields', value: editingFields });
      setSuccess('Custom fields saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
      fetchSettings();
    } catch (e) {
      console.error(e);
      alert('Failed to save fields');
    } finally {
      setSaving(false);
    }
  };

  const FIELD_TYPES = [
    { value: 'text', label: 'Normal Text' },
    { value: 'name', label: 'Name Only' },
    { value: 'number', label: 'Numbers Only' },
    { value: 'phone', label: 'Mobile Number' },
    { value: 'email', label: 'Email Only' },
    { value: 'dropdown', label: 'Dropdown List' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'user_dropdown', label: 'User Dropdown' },
    { value: 'priority_dropdown', label: 'Priority Dropdown' },
    { value: 'stage_dropdown', label: 'Stage Dropdown' }
  ];

  // Get fields visible on card, sorted by cardOrder
  const cardVisibleFields = editingFields
    .filter(f => f.showOnCard)
    .sort((a, b) => (a.cardOrder || 0) - (b.cardOrder || 0));

  // Dummy data for preview
  const DUMMY_DATA = {
    title: 'Kitchen Renovation',
    client_name: 'Rajesh Kumar',
    client_company: 'ABC Corp',
    client_email: 'rajesh@abc.com',
    client_phone: '9876543210',
    value: 250000,
    priority: 'high',
    assigned_to: 'user1',
    assigned_name: 'Arun',
    description: 'Full kitchen renovation with modular setup',
    notes_count: 3,
    pending_reminders: 1,
    custom_data: {}
  };

  const getPreviewValue = (field) => {
    if (field.isSystem) {
      if (field.id === 'value') return `₹${Number(DUMMY_DATA.value).toLocaleString('en-IN')}`;
      if (field.id === 'priority') return DUMMY_DATA.priority;
      if (field.id === 'assigned_to') return DUMMY_DATA.assigned_name;
      return DUMMY_DATA[field.id] || '—';
    }
    // For custom fields, show placeholder
    switch(field.type) {
      case 'number': return '42';
      case 'phone': return '9876543210';
      case 'email': return 'sample@email.com';
      case 'name': return 'Sample Name';
      case 'dropdown': return field.options?.split(',')[0]?.trim() || 'Option 1';
      default: return `Sample ${field.label}`;
    }
  };

  const PRIORITY_COLORS = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' };

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Custom Lead Fields</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Customize the form fields for new leads on this board.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            style={{
              padding: '8px 14px', background: showPreview ? 'var(--accent-dim)' : 'var(--bg-elevated)', 
              color: showPreview ? 'var(--accent)' : 'var(--text-secondary)', borderRadius: '6px',
              fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
              border: `1px solid ${showPreview ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer'
            }} 
            onClick={() => setShowPreview(v => !v)}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Hide Preview' : 'Preview Card'}
          </button>
          <button 
            style={{
              padding: '8px 16px', background: 'var(--accent)', color: '#fff', borderRadius: '6px',
              fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px',
              border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1
            }} 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Fields'}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ padding: '12px', background: 'var(--green-dim)', border: '1px solid var(--green)', color: 'var(--green)', borderRadius: '6px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Check size={16} /> {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Fields List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {editingFields.map((field, idx) => (
            <div 
              key={field.id}
              draggable
              onDragStart={() => dragItem.current = idx}
              onDragEnter={() => dragOverItem.current = idx}
              onDragEnd={handleSort}
              style={{
                background: 'var(--bg-elevated)', border: `1px solid ${field.showOnCard ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px',
                padding: '16px', display: 'flex', gap: '16px', cursor: 'grab', alignItems: 'flex-start',
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{ color: 'var(--text-muted)', paddingTop: '8px' }}>
                <GripVertical size={16} />
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Field Label</label>
                    <input 
                      type="text" 
                      value={field.label} 
                      onChange={e => updateField(idx, 'label', e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ width: '140px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Type</label>
                    <select 
                      value={field.type} 
                      onChange={e => updateField(idx, 'type', e.target.value)}
                      disabled={field.isSystem}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: field.isSystem ? 'var(--bg-surface)' : 'var(--bg-elevated)', color: field.isSystem ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '13px', outline: 'none', cursor: field.isSystem ? 'not-allowed' : 'pointer' }}
                    >
                      {FIELD_TYPES.map(t => {
                        const isSystemType = ['priority_dropdown', 'stage_dropdown'].includes(t.value);
                        if (!field.isSystem && isSystemType) return null;
                        return <option key={t.value} value={t.value} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{t.label}</option>;
                      })}
                    </select>
                  </div>
                  <div style={{ width: '110px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Validation</label>
                    <select 
                      value={field.required ? 'true' : 'false'} 
                      onChange={e => updateField(idx, 'required', e.target.value === 'true')}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    >
                      <option value="true" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Required</option>
                      <option value="false" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Optional</option>
                    </select>
                  </div>
                </div>

                {/* Card visibility controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label 
                    htmlFor={`card_${field.id}`} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer',
                      padding: '5px 10px', borderRadius: '6px',
                      background: field.showOnCard ? 'var(--accent-dim)' : 'transparent',
                      border: `1px solid ${field.showOnCard ? 'var(--accent)' : 'var(--border)'}`,
                      color: field.showOnCard ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      id={`card_${field.id}`} 
                      checked={!!field.showOnCard} 
                      onChange={e => updateField(idx, 'showOnCard', e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {field.showOnCard ? <Eye size={12} /> : <EyeOff size={12} />}
                    Show on Card
                  </label>

                  {field.showOnCard && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Order:</span>
                      <button 
                        onClick={() => moveCardOrder(idx, -1)}
                        style={{ 
                          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '4px',
                          padding: '2px 4px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center'
                        }}
                        title="Move up in card"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button 
                        onClick={() => moveCardOrder(idx, 1)}
                        style={{ 
                          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '4px',
                          padding: '2px 4px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center'
                        }}
                        title="Move down in card"
                      >
                        <ChevronDown size={12} />
                      </button>
                      <span style={{ 
                        fontSize: '10px', color: 'var(--accent)', background: 'var(--accent-dim)',
                        padding: '1px 6px', borderRadius: '10px', fontWeight: 600, marginLeft: '4px'
                      }}>
                        #{cardVisibleFields.findIndex(f => f.id === field.id) + 1}
                      </span>
                    </div>
                  )}
                </div>

                {field.type === 'dropdown' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Dropdown Options (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Yes, No, Maybe"
                      value={field.options || ''} 
                      onChange={e => updateField(idx, 'options', e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={() => removeField(idx)}
                style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '8px', opacity: 0.7 }}
                title="Delete Field"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button 
            onClick={addField}
            style={{
              background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px',
              padding: '16px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
              fontSize: '14px', cursor: 'pointer', width: '100%', marginTop: '8px'
            }}
          >
            <Plus size={16} /> Add Custom Field
          </button>
        </div>

        {/* Live Card Preview */}
        {showPreview && (
          <div style={{ width: '280px', flexShrink: 0, position: 'sticky', top: '80px' }}>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Card Preview</span>
            </div>
            <div style={{ 
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
              borderLeft: '3px solid var(--cyan)', borderRadius: '10px', padding: '12px',
              boxShadow: 'var(--shadow)'
            }}>
              {/* Card content — mirrors LeadCard rendering logic */}
              {(() => {
                // Determine which fields to show on card, in order
                const orderedFields = [...cardVisibleFields];
                const clientNameField = orderedFields.find(f => f.id === 'client_name');
                const titleField = orderedFields.find(f => f.id === 'title');
                const priorityField = orderedFields.find(f => f.id === 'priority');
                const valueField = orderedFields.find(f => f.id === 'value');
                const companyField = orderedFields.find(f => f.id === 'client_company');
                const assignedField = orderedFields.find(f => f.id === 'assigned_to');
                
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(() => {
                        const visibleTextFields = orderedFields.filter(f => {
                          if (f.id === 'assigned_to' || f.id === 'priority') return false;
                          if (['client_name', 'client_company', 'title', 'value'].includes(f.id)) return true;
                          const val = getPreviewValue(f);
                          return val && String(val).trim() !== '';
                        });

                        return visibleTextFields.map((field, index) => {
                          const isFirstItem = index === 0;
                          let content = null;

                          if (field.id === 'client_name') {
                            content = <span style={isFirstItem ? { flex: 1, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 } : { fontSize: '13px', color: 'var(--text-primary)' }}>{DUMMY_DATA.client_name || '—'}</span>;
                          } else if (field.id === 'client_company') {
                            content = <div style={isFirstItem ? { flex: 1, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 } : { fontSize: '12px', color: 'var(--text-secondary)' }}>{DUMMY_DATA.client_company || '—'}</div>;
                          } else if (field.id === 'title') {
                            content = <div style={isFirstItem ? { flex: 1, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 } : { fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{DUMMY_DATA.title || '—'}</div>;
                          } else if (field.id === 'value') {
                            content = <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>₹{Number(DUMMY_DATA.value || 0).toLocaleString('en-IN')}</div>;
                          } else {
                            content = (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>{field.label}:</span>
                                {getPreviewValue(field)}
                              </div>
                            );
                          }

                          if (isFirstItem) {
                            return (
                              <div key={field.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                {priorityField && (
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '5px', background: PRIORITY_COLORS[DUMMY_DATA.priority] }} />
                                )}
                                {content}
                                <div style={{ 
                                  background: 'var(--bg-surface)', border: '1px solid var(--border)', 
                                  padding: '4px 6px', display: 'flex', alignItems: 'center', borderRadius: '6px',
                                  color: 'var(--text-secondary)'
                                }}>
                                  <MoveRight size={11} />
                                </div>
                              </div>
                            );
                          }

                          return <div key={field.id}>{content}</div>;
                        });
                      })()}
                    </div>

                    {/* Meta bar */}
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                      marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <MessageSquare size={11} /> 3
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--yellow)' }}>
                        <Bell size={11} /> 1
                      </span>
                      {assignedField && (
                        <span style={{ 
                          marginLeft: 'auto', background: 'var(--accent-dim)', color: 'var(--accent)',
                          borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: 600
                        }}>
                          {DUMMY_DATA.assigned_name}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>2 hrs ago</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Legend */}
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Fields on Card ({cardVisibleFields.length})
              </div>
              {cardVisibleFields.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No fields selected</div>
              ) : (
                cardVisibleFields.map((f, i) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ 
                      fontSize: '10px', color: 'var(--accent)', background: 'var(--accent-dim)',
                      padding: '0px 5px', borderRadius: '8px', fontWeight: 700, minWidth: '18px', textAlign: 'center'
                    }}>
                      {i + 1}
                    </span>
                    {f.label}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
