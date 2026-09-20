import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Deals from './pages/Deals'
import Redeem from './pages/Redeem'
import Settings from './pages/Settings'
import NotAPartner from './pages/NotAPartner'

function RootRedirect() {
  const { session, role, loading } = useAuth()
  if (loading) return null
  if (!session || !role) return <Navigate to="/login" replace />
  return <Navigate to={role === 'staff' ? '/redeem' : '/overview'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/not-a-partner" element={<NotAPartner />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/overview"
              element={<ProtectedRoute managerOnly><Overview /></ProtectedRoute>}
            />
            <Route
              path="/deals"
              element={<ProtectedRoute managerOnly><Deals /></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute managerOnly><Settings /></ProtectedRoute>}
            />
            <Route path="/redeem" element={<Redeem />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
