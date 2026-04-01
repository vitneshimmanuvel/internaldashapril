import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { SettingsProvider } from './context/SettingsContext'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/layout/AppLayout'
import BoardPage from './pages/BoardPage'
import LeadDetailPage from './pages/LeadDetailPage'
import AdminPage from './pages/AdminPage'
import AdminStatsPage from './pages/AdminStatsPage'
import RemindersPage from './pages/RemindersPage'
import TravelLogsPage from './pages/TravelLogsPage'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading"><span className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <SettingsProvider>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '13px', fontFamily: 'var(--font-body)' } }} />
      <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<BoardPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="admin/dashboard" element={<ProtectedRoute adminOnly><AdminStatsPage /></ProtectedRoute>} />
        <Route path="admin/travel" element={<ProtectedRoute adminOnly><TravelLogsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  )
}
