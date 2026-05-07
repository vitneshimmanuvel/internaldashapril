import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, AlertCircle, Loader } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Format date/time values into human-readable strings
function formatDateTimeValue(value, type) {
  if (!value) return '';
  try {
    if (type === 'date') {
      // value = '2026-05-04'
      const [y, m, d] = value.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (type === 'time') {
      // value = '18:00'
      const [h, min] = value.split(':').map(Number);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(min).padStart(2, '0')} ${suffix}`;
    }
    if (type === 'datetime') {
      // value = '2026-05-04T18:00'
      const dt = new Date(value);
      return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        + ', ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  } catch (_) {}
  return value;
}

export default function LeadFormPage() {
  const { boardId } = useParams();
  const [formMeta, setFormMeta] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!boardId) {
      setLoadError('Invalid form link.');
      return;
    }
    fetch(`${API_BASE}/public/form/${boardId}`)
      .then(r => {
        if (!r.ok) throw new Error('not_found');
        return r.json();
      })
      .then(data => {
        setFormMeta(data);
        // Initialize form data with empty strings — use field.id as key
        const init = {};
        (data.fields || []).forEach(f => { init[f.id] = ''; });
        setFormData(init);
      })
      .catch(err => {
        setLoadError('This form is not available or has been disabled. Please contact the team directly.');
      });
  }, [boardId]);

  const validate = () => {
    const errs = {};
    (formMeta?.fields || []).forEach(field => {
      const key = field.id;
      const val = (formData[key] || '').toString().trim();
      if (field.required && !val) {
        errs[key] = `${field.label} is required`;
      }
      if (val && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errs[key] = 'Please enter a valid email address';
      }
      if (val && field.type === 'phone' && !/^[\d\s\+\-\(\)]{7,15}$/.test(val)) {
        errs[key] = 'Please enter a valid phone number';
      }
    });
    return errs;
  };

  // Build the submission payload — convert raw date/time inputs to readable strings
  const buildPayload = () => {
    const payload = {};
    (formMeta?.fields || []).forEach(field => {
      const key = field.id;
      const raw = formData[key] || '';
      if (['date', 'time', 'datetime'].includes(field.type)) {
        payload[key] = formatDateTimeValue(raw, field.type);
      } else {
        payload[key] = raw;
      }
    });
    return payload;
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/public/form/${boardId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state
  if (!formMeta && !loadError) {
    return (
      <div style={shell}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', padding: '40px 0' }}>
            <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '14px' }}>Loading form…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state
  if (loadError) {
    return (
      <div style={shell}>
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <AlertCircle size={36} style={{ color: 'var(--red)', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Form Unavailable</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state
  if (submitted) {
    return (
      <div style={shell}>
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={28} style={{ color: 'var(--green)' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Enquiry Submitted!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '340px', margin: '0 auto' }}>
              {formMeta.successMessage}
            </p>
            <div style={{ marginTop: '32px', padding: '14px', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Powered by <strong style={{ color: 'var(--text-secondary)' }}>LeadFlow</strong> — {formMeta.boardName}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form
  return (
    <div style={shell}>
      <div style={{...card, animation: 'slideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'}}>
        {/* Header */}
        <div style={{ background: '#dc2626', padding: '32px 32px 28px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', lineHeight: 1.3, letterSpacing: '-0.3px' }}>
            {formMeta.formTitle}
          </h1>
          {formMeta.formDescription && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0 }}>
              {formMeta.formDescription}
            </p>
          )}
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '18px', background: '#f8f9fa' }}>
          {submitError && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '12px 14px', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} /> {submitError}
            </div>
          )}

          {(formMeta.fields || []).map((field, idx) => {
            const key = field.id;
            const err = errors[key];

            return (
              <div 
                key={field.id} 
                style={{ 
                  animation: 'slideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
                  animationDelay: `${idx * 0.1}s` 
                }}
              >
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                  {field.label}
                  {field.required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    className="form-field-input"
                    value={formData[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    rows={4}
                    style={{ ...fieldInput, borderColor: err ? '#dc2626' : '#d1d5db', resize: 'vertical' }}
                  />
                ) : field.type === 'dropdown' ? (
                  <select
                    className="form-field-input"
                    value={formData[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{ ...fieldInput, borderColor: err ? '#dc2626' : '#d1d5db' }}
                  >
                    <option value="" style={{ background: '#fff', color: '#9ca3af' }}>
                      Select {field.label}…
                    </option>
                    {(field.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                      <option key={opt} value={opt} style={{ background: '#fff', color: '#1e293b' }}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input
                    className="form-field-input"
                    type="date"
                    value={formData[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{ ...fieldInput, borderColor: err ? '#dc2626' : '#d1d5db', colorScheme: 'light' }}
                  />
                ) : field.type === 'time' ? (
                  <input
                    className="form-field-input"
                    type="time"
                    value={formData[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{ ...fieldInput, borderColor: err ? '#dc2626' : '#d1d5db', colorScheme: 'light' }}
                  />
                ) : field.type === 'datetime' ? (
                  <input
                    className="form-field-input"
                    type="datetime-local"
                    value={formData[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{ ...fieldInput, borderColor: err ? '#dc2626' : '#d1d5db', colorScheme: 'light' }}
                  />
                ) : field.type === 'phone' ? (
                  <input
                    className="form-field-input"
                    type="tel"
                    inputMode="tel"
                    value={formData[key] || ''}
                    onChange={e => {
                      // Only allow digits, +, -, (, ), and spaces
                      const filtered = e.target.value.replace(/[^\d\s\+\-\(\)]/g, '');
                      handleChange(key, filtered);
                    }}
                    placeholder={field.placeholder || 'e.g. +91 98765 43210'}
                    style={{ ...fieldInput, borderColor: err ? '#dc2626' : '#d1d5db' }}
                  />
                ) : (
                  <input
                    className="form-field-input"
                    type={
                      field.type === 'email' ? 'email' :
                      field.type === 'number' ? 'number' :
                      'text'
                    }
                    value={formData[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    style={{ ...fieldInput, borderColor: err ? '#dc2626' : '#d1d5db' }}
                  />
                )}

                {err && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', color: '#dc2626', fontSize: '12px' }}>
                    <AlertCircle size={12} /> {err}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={submitting}
            className="submit-btn"
            style={{
              background: '#dc2626', color: '#fff', border: '1px solid #b91c1c',
              borderRadius: '8px', padding: '13px 24px',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              marginTop: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.2s',
              transform: submitting ? 'scale(0.96)' : 'scale(1)',
              animation: 'slideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
              animationDelay: `${(formMeta.fields?.length || 0) * 0.1}s`
            }}
          >
            {submitting ? (
              <>
                <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Submitting…
              </>
            ) : 'Submit Enquiry'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ padding: '12px 32px 20px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '11px', color: '#9ca3af', background: '#f8f9fa' }}>
          Powered by <strong style={{ color: '#6b7280' }}>LeadFlow</strong> · Your data is handled securely
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { 
          from { transform: translateY(40px) scale(0.95); } 
          to { transform: translateY(0) scale(1); } 
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          background: #b91c1c !important;
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .form-field-input:focus {
          border-color: #dc2626 !important;
        }
        @media (max-width: 600px) {
          .lf-form-card { border-radius: 0 !important; min-height: 100vh; }
          .lf-form-card > div:first-child { padding: 22px 18px !important; }
          .lf-form-card form { padding: 20px 18px !important; }
          .lf-form-card > div:last-child { padding: 12px 18px 20px !important; }
        }
      `}</style>
    </div>
  );
}

const shell = {
  minHeight: '100vh',
  background: '#f1f5f9',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '32px 16px 48px',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const card = {
  width: '100%',
  maxWidth: '540px',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: 'none',
};

const fieldInput = {
  width: '100%',
  padding: '11px 14px',
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  color: '#1e293b',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
  boxShadow: 'none',
};
