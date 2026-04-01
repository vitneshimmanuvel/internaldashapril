import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const SettingsContext = createContext({});

export const SettingsProvider = ({ children }) => {
  const [stages, setStages] = useState([
    { id: 'meeting', label: 'Meeting', color: 'var(--cyan)' },
    { id: 'followup', label: 'Follow-up', color: 'var(--accent)' },
    { id: 'negotiation', label: 'Negotiation', color: 'var(--yellow)' },
    { id: 'estimation_review', label: 'Est. Review', color: 'var(--orange)' },
    { id: 'finalization', label: 'Finalization', color: 'var(--green)' },
    { id: 'cancelled', label: 'Cancelled', color: 'var(--red)' }
  ]);
  const [loadingObj, setLoadingObj] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.stages && Array.isArray(res.data.stages)) {
        setStages(res.data.stages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingObj(false);
    }
  };

  useEffect(() => {
    // We only fetch if localStorage has a token
    if (localStorage.getItem('token')) {
      fetchSettings();
    } else {
      setLoadingObj(false);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ stages, fetchSettings, loadingObj }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
