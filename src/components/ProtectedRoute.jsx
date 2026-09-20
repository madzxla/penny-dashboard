import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, managerOnly = false }) {
  const { session, restaurant, role, loading } = useAuth()

  if (loading) return null // AuthProvider is still resolving the session

  if (!session || !role) {
    return <Navigate to="/login" replace />
  }

  if (!restaurant) {
    return <Navigate to="/not-a-partner" replace />
  }

  // Staff devices are hard-blocked from manager-only routes, not just
  // hidden from nav — typing /settings in the URL bar shouldn't work either.
  if (managerOnly && role !== 'manager') {
    return <Navigate to="/redeem" replace />
  }

  return children
}
