import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Copy, ExternalLink, ToggleLeft, ToggleRight, GripVertical, Link as LinkIcon } from 'lucide-react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

const FIELD_TYPES = [
  { value: 'text',     label: 'Short Text' },
  { value: 'textarea', label: 'Long Text / Message' },
  { value: 'name',     label: 'Full Name' },
  { value: 'email',    label: 'Email Address' },
  { value: 'phone',    label: 'Phone / Mobile' },
  { value: 'number',   label: 'Number' },
  { value: 'dropdown', label: 'Dropdown (Options)' },
  { value: 'date',     label: 'Date Only' },
  { value: 'time',     label: 'Time Only' },
  { value: 'datetime', label: 'Date & Time' },
];

// Lead field keys that form answers can map to
const LEAD_FIELD_OPTIONS = [
  { value: '',               label: '— Custom (store in extra data)' },
  { value: 'client_name',    label: 'Client Name' },
  { value: 'client_email',   label: 'Client Email' },
  { value: 'client_phone',   label: 'Client Phone' },
  { value: 'client_company', label: 'Company / Organization' },
  { value: 'title',          label: 'Enquiry Title / Subject' },
  { value: 'description',    label: 'Description / Notes' },
];

export default function AdminForms() {
  const { customFields, fetchSettings } = useSettings();
  const [config, setConfig] = useState({
    enabled: false,
    title: '',
    description: '',
    successMessage: '',
    defaultAssignee: '',
    notificationEmails: '',
    sendConfirmationEmail: false,
    fields: [],                     // ← starts EMPTY, no defaults
  });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const boardId = (localStorage.getItem('lf_active_board_id') || '').replace(/\s+/g, '-');
  const publicFormUrl = boardId ? `${window.location.origin}/form/${boardId}` : '';

  // Dynamically build mapping options from static + custom fields
  const fieldOptions = (() => {
    const staticValues = LEAD_FIELD_OPTIONS.map(o => o.value);
    const extraOptions = (customFields || [])
      .filter(f => !f.isSystem && !staticValues.includes(f.id))
      .map(f => ({ value: f.id, label: `Custom Field: ${f.label}` }));
    return [...LEAD_FIELD_OPTIONS, ...extraOptions];
  })();

  // ── Load existing config from settings
  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, usersRes] = await Promise.all([
          api.get('/settings'),
          api.get('/users/active').catch(() => ({ data: { users: [] } }))
        ]);
        if (usersRes.data?.users) {
          setUsers(usersRes.data.users);
        }
        const saved = settingsRes.data?.lead_form_config;
        if (saved) {
          setConfig(c => ({ ...c, ...saved, fields: saved.fields || [] }));
        }
      } catch (e) {
        console.error('Failed to load form config:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await api.put('/settings', { key: 'lead_form_config', value: config });
      setSuccess('Form configuration saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
      fetchSettings();
    } catch (e) {
      alert('Failed to save form configuration.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicFormUrl) return;
    await navigator.clipboard.writeText(publicFormUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const addField = () => {
    setConfig(c => ({
      ...c,
      fields: [
        ...c.fields,
        { id: `field_${Date.now()}`, label: '', type: 'text', required: false, placeholder: '', systemKey: '', options: '' },
      ],
    }));
  };

  const updateField = (idx, key, val) => {
    const arr = [...config.fields];
    arr[idx] = { ...arr[idx], [key]: val };
    setConfig(c => ({ ...c, fields: arr }));
  };

  const removeField = (idx) => {
    setConfig(c => ({ ...c, fields: c.fields.filter((_, i) => i !== idx) }));
  };

  const moveField = (idx, dir) => {
    const arr = [...config.fields];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setConfig(c => ({ ...c, fields: arr }));
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>
        Loading form configuration…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Public Lead Intake Form
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Build a shareable form. Submissions create leads automatically and notify managers by email.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} style={saveBtn}>
          <Check size={14} /> {saving ? 'Saving…' : 'Save Form'}
        </button>
      </div>

      {success && (
        <div style={{ padding: '12px 16px', background: 'var(--green-dim)', border: '1px solid var(--green)', color: 'var(--green)', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Check size={15} /> {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* ══════════ LEFT: Config ══════════ */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Enable / Disable */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>Form Status</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {config.enabled
                    ? 'Your form is live and accepting submissions.'
                    : 'Form is disabled. Enable it to start accepting leads.'}
                </div>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
                style={{
                  background: config.enabled ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  border: `1px solid ${config.enabled ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '20px', padding: '7px 16px',
                  color: config.enabled ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {config.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                {config.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* ── Shareable link — always shown when enabled ── */}
            {config.enabled && publicFormUrl && (
              <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <LinkIcon size={11} /> Shareable Link — send this to your leads
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, fontSize: '12px', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '8px 12px', borderRadius: '6px', wordBreak: 'break-all', minWidth: 0, fontWeight: 500 }}>
                    {publicFormUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    style={{
                      background: copied ? 'var(--green-dim)' : 'var(--bg-surface)',
                      border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`,
                      borderRadius: '6px', padding: '7px 12px',
                      color: copied ? 'var(--green)' : 'var(--text-secondary)',
                      fontSize: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      whiteSpace: 'nowrap', transition: 'all 0.2s', fontWeight: 600,
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={publicFormUrl} target="_blank" rel="noopener noreferrer"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 12px', color: 'var(--text-secondary)', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <ExternalLink size={13} /> Open
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Form Branding */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={sectionTitle}>Form Branding</h3>
            <div>
              <label style={lbl}>Form Title</label>
              <input type="text" value={config.title} onChange={e => setConfig(c => ({ ...c, title: e.target.value }))} placeholder="e.g. Study Abroad Enquiry Form" style={inp} />
            </div>
            <div>
              <label style={lbl}>Form Description (shown below the title)</label>
              <textarea value={config.description} onChange={e => setConfig(c => ({ ...c, description: e.target.value }))} placeholder="A brief intro shown at the top of your form…" rows={2} style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div>
              <label style={lbl}>Success Message (shown after submission)</label>
              <input type="text" value={config.successMessage} onChange={e => setConfig(c => ({ ...c, successMessage: e.target.value }))} placeholder="Thank you! We will get in touch with you soon." style={inp} />
            </div>
          </div>

          {/* Assignment & Notifications */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={sectionTitle}>Assignment & Notifications</h3>
            <div>
              <label style={lbl}>Default Assignee</label>
              <select
                value={config.defaultAssignee || ''}
                onChange={e => setConfig(c => ({ ...c, defaultAssignee: e.target.value }))}
                style={inp}
              >
                <option value="">— Unassigned (None) —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.email ? ` (${u.email})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Additional Notification Emails (comma-separated)</label>
              <input
                type="text"
                value={config.notificationEmails || ''}
                onChange={e => setConfig(c => ({ ...c, notificationEmails: e.target.value }))}
                placeholder="e.g. partner@example.com, manager@example.com"
                style={inp}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Note: The assigned user and board managers are automatically notified. Add any extra emails here.
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Send Confirmation to Lead</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Automatically email the lead confirming receipt of their enquiry.</div>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, sendConfirmationEmail: !c.sendConfirmationEmail }))}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: config.sendConfirmationEmail ? 'var(--accent)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.2s'
                }}
              >
                {config.sendConfirmationEmail ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
          </div>

          {/* ── Form Fields Builder ── */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={sectionTitle}>Form Fields ({config.fields.length})</h3>
              <button onClick={addField} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={13} /> Add Question
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {config.fields.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: '13px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  No questions yet.<br />
                  <span style={{ fontSize: '12px' }}>Click <strong>+ Add Question</strong> to start building your form.</span>
                </div>
              )}

              {config.fields.map((field, idx) => (
                <div key={field.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>

                  {/* Reorder arrows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '8px', flexShrink: 0 }}>
                    <button onClick={() => moveField(idx, -1)} style={arrowBtn} title="Move up">▲</button>
                    <GripVertical size={14} style={{ color: 'var(--text-muted)', margin: '1px auto', display: 'block' }} />
                    <button onClick={() => moveField(idx, 1)} style={arrowBtn} title="Move down">▼</button>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* ── ROW 1: Label | Type | Required | Maps To ── */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

                      {/* Label */}
                      <div style={{ flex: '2 1 140px' }}>
                        <label style={lbl}>Question / Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateField(idx, 'label', e.target.value)}
                          placeholder="e.g. Your Name"
                          style={{ ...inp, fontSize: '13px' }}
                        />
                      </div>

                      {/* Type */}
                      <div style={{ flex: '1 1 120px' }}>
                        <label style={lbl}>Field Type</label>
                        <select value={field.type} onChange={e => updateField(idx, 'type', e.target.value)} style={{ ...inp, fontSize: '12px' }}>
                          {FIELD_TYPES.map(t => (
                            <option key={t.value} value={t.value} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Required */}
                      <div style={{ flex: '0 1 90px' }}>
                        <label style={lbl}>Required?</label>
                        <select value={field.required ? 'true' : 'false'} onChange={e => updateField(idx, 'required', e.target.value === 'true')} style={{ ...inp, fontSize: '12px' }}>
                          <option value="true"  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Required</option>
                          <option value="false" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Optional</option>
                        </select>
                      </div>

                      {/* ── Maps To Lead Field — RIGHT HERE in row 1 ── */}
                      <div style={{ flex: '1 1 160px' }}>
                        <label style={{ ...lbl, color: 'var(--accent)' }}>Maps To Lead Field</label>
                        <select
                          value={field.systemKey || ''}
                          onChange={e => updateField(idx, 'systemKey', e.target.value)}
                          style={{ ...inp, fontSize: '12px', borderColor: field.systemKey ? 'var(--accent)' : 'var(--border)' }}
                        >
                          {fieldOptions.map(o => (
                            <option key={o.value} value={o.value} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* ── ROW 2: Placeholder | Dropdown options ── */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 180px' }}>
                        <label style={lbl}>Placeholder / Hint</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={e => updateField(idx, 'placeholder', e.target.value)}
                          placeholder="Hint text inside input…"
                          style={{ ...inp, fontSize: '12px' }}
                        />
                      </div>

                      {field.type === 'dropdown' && (
                        <div style={{ flex: '1 1 200px' }}>
                          <label style={lbl}>Options (comma separated)</label>
                          <input
                            type="text"
                            value={field.options || ''}
                            onChange={e => updateField(idx, 'options', e.target.value)}
                            placeholder="e.g. Study Visa, Work Visa, Tourist Visa"
                            style={{ ...inp, fontSize: '12px' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Mapping badge */}
                    {field.systemKey && (
                      <div style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '3px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '5px', alignSelf: 'flex-start' }}>
                        ↳ Saved to: <strong>{LEAD_FIELD_OPTIONS.find(o => o.value === field.systemKey)?.label || field.systemKey}</strong>
                        {/* Warn if same key used elsewhere */}
                        {config.fields.filter(f => f.systemKey === field.systemKey && f.id !== field.id).length > 0 && (
                          <span style={{ color: 'var(--yellow)', marginLeft: '4px' }}>⚠ multiple — stored comma-separated</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button onClick={() => removeField(idx)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px', opacity: 0.75, flexShrink: 0 }} title="Remove question">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT: Live preview ══════════ */}
        <div style={{ width: '290px', flexShrink: 0, position: 'sticky', top: '80px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Form Preview
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding: '18px 18px 14px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>
                {config.title || 'Your Form Title'}
              </div>
              <div style={{ fontSize: '11px', color: '#bfdbfe' }}>
                {config.description || 'Form description goes here…'}
              </div>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {config.fields.length === 0 ? (
                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '12px 0', fontStyle: 'italic' }}>
                  Add questions to preview
                </div>
              ) : (
                config.fields.map(field => (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      {field.label || <em style={{ opacity: 0.5 }}>Untitled Question</em>}
                      {field.required && <span style={{ color: 'var(--red)', marginLeft: '3px' }}>*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <div style={previewField}>{field.placeholder || '…'}</div>
                    ) : field.type === 'dropdown' ? (
                      <div style={previewField}>{field.options?.split(',')[0]?.trim() || 'Select…'} ▾</div>
                    ) : (
                      <div style={previewField}>{field.placeholder || field.label || '…'}</div>
                    )}
                  </div>
                ))
              )}
              <button style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 600, width: '100%', cursor: 'default', marginTop: '4px' }}>
                Submit Enquiry
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>On every submission:</div>
              <div>✓ Lead created in pipeline (1st stage)</div>
              <div>✓ Managers notified by email</div>
              {config.sendConfirmationEmail && <div>✓ Submitter gets confirmation email</div>}
              <div>✓ Two fields → same lead field = comma joined</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── styles ── */
const card = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: '12px', padding: '20px',
};
const sectionTitle = {
  fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0,
};
const lbl = {
  display: 'block', fontSize: '10px', fontWeight: 600,
  color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: '4px',
};
const inp = {
  width: '100%', padding: '8px 10px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: '6px', color: 'var(--text-primary)',
  fontSize: '13px', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};
const saveBtn = {
  padding: '9px 20px', background: 'var(--accent)', color: '#fff',
  borderRadius: '8px', fontSize: '13px', fontWeight: 600,
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '8px',
};
const arrowBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-muted)', fontSize: '8px', padding: '1px 4px',
  lineHeight: 1, display: 'block',
};
const previewField = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: '6px', padding: '7px 9px',
  fontSize: '11px', color: 'var(--text-muted)',
};
