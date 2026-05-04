import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext({});

export const SettingsProvider = ({ children }) => {
  const { user, activeBoardId } = useAuth();
  const [stages, setStages] = useState([
    { id: 'meeting', label: 'Meeting', color: 'var(--cyan)' },
    { id: 'followup', label: 'Follow-up', color: 'var(--accent)' },
    { id: 'negotiation', label: 'Negotiation', color: 'var(--yellow)' },
    { id: 'estimation_review', label: 'Est. Review', color: 'var(--orange)' },
    { id: 'finalization', label: 'Finalization', color: 'var(--green)' },
    { id: 'cancelled', label: 'Cancelled', color: 'var(--red)' }
  ]);
  const [customFields, setCustomFields] = useState([]);
  const [loadingObj, setLoadingObj] = useState(true);

const DEFAULT_SYSTEM_FIELDS = [
  { id: 'title', label: 'Lead Title', type: 'text', required: true, isSystem: true, showOnCard: true },
  { id: 'client_name', label: 'Client Name', type: 'name', required: true, isSystem: true, showOnCard: true },
  { id: 'client_company', label: 'Company', type: 'text', required: false, isSystem: true, showOnCard: true },
  { id: 'client_email', label: 'Email', type: 'email', required: false, isSystem: true, showOnCard: false },
  { id: 'client_phone', label: 'Phone', type: 'phone', required: false, isSystem: true, showOnCard: false },
  { id: 'value', label: 'Deal Value (₹)', type: 'number', required: false, isSystem: true, showOnCard: true },
  { id: 'priority', label: 'Priority', type: 'priority_dropdown', required: false, isSystem: true, showOnCard: false },
  { id: 'assigned_to', label: 'Assign To', type: 'user_dropdown', required: false, isSystem: true, showOnCard: false },
  { id: 'description', label: 'Description', type: 'textarea', required: false, isSystem: true, showOnCard: false }
];

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.stages && Array.isArray(res.data.stages)) {
        setStages(res.data.stages);
      }
      
      let fields = [];
      if (res.data.custom_fields && Array.isArray(res.data.custom_fields)) {
        fields = res.data.custom_fields;
      }
      
      // Merge system fields if not present
      if (!fields.some(f => f.isSystem)) {
        fields = [...DEFAULT_SYSTEM_FIELDS, ...fields];
      }
      
      setCustomFields(fields);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingObj(false);
    }
  };

  useEffect(() => {
    // We only fetch if localStorage has a token and we have an activeBoardId
    if (localStorage.getItem('lf_token') && activeBoardId) {
      fetchSettings();
    } else {
      setLoadingObj(false);
    }
  }, [activeBoardId, user]);

  return (
    <SettingsContext.Provider value={{ stages, setStages, customFields, fetchSettings, loadingObj }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
