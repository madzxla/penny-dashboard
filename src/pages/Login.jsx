import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [deviceRole, setDeviceRole] = useState('manager')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ email, password, deviceRole })
      navigate(deviceRole === 'staff' ? '/redeem' : '/overview', { replace: true })
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : err.message || 'Something went wrong signing in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">Penny</div>
        <h1 className="login-title">Partner sign in</h1>
        <p className="login-subtitle">Manage deals, or hand this device to staff for redemptions.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <div className="login-field">
            <span>This device is used by</span>
            <div className="role-toggle" role="radiogroup" aria-label="Device role">
              <button
                type="button"
                role="radio"
                aria-checked={deviceRole === 'manager'}
                className={'role-option' + (deviceRole === 'manager' ? ' selected' : '')}
                onClick={() => setDeviceRole('manager')}
              >
                <span className="role-option-title">Manager</span>
                <span className="role-option-desc">Full access — deals, settings, redemptions</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={deviceRole === 'staff'}
                className={'role-option' + (deviceRole === 'staff' ? ' selected' : '')}
                onClick={() => setDeviceRole('staff')}
              >
                <span className="role-option-title">Staff</span>
                <span className="role-option-desc">Redemptions only — for the counter or till</span>
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <a href="/reset-password" className="login-forgot">Forgot your password?</a>
      </div>
    </div>
  )
}
