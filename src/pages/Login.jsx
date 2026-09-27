import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoUrl from '../assets/logo.png'
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
        ? 'Nepareizs e-pasts vai parole.'
        : err.message || 'Mēs nevarējām ielogoties Jūsu kontā.')
        setError(err.message === 'User is banned'
        ? 'Jūsu konts ir bloķēts. Lūdzu sazinaties ar mūsu komandu.'
        : err.message || 'Mēs nevarējām ielogoties Jūsu kontā.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logoUrl} alt="Penny logo" className="login-logo" />
        <h1 className="login-title">Laipni lūdzam!</h1>
        <p className="login-subtitle">Pārvaldi piedāvājumus, vai iedod šo ierīci darbiniekiem, lai apstiprinātu klientus.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-field">
            <span>E-pasts</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="login-field">
            <span>Parole</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <div className="login-field">
            <span>Šo ierīci izmantos</span>
            <div className="role-toggle" role="radiogroup" aria-label="Device role">
              <button
                type="button"
                role="radio"
                aria-checked={deviceRole === 'manager'}
                className={'role-option' + (deviceRole === 'manager' ? ' selected' : '')}
                onClick={() => setDeviceRole('manager')}
              >
                <span className="role-option-title">Menedžeris</span>
                <span className="role-option-desc">Pilna piekļuve piedāvājumiem un iestatījumiem</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={deviceRole === 'staff'}
                className={'role-option' + (deviceRole === 'staff' ? ' selected' : '')}
                onClick={() => setDeviceRole('staff')}
              >
                <span className="role-option-title">Darbinieks</span>
                <span className="role-option-desc">Tikai piedāvājumu apstiprināšanai</span>
              </button>
            </div>
          </div>
      
          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit primary-button" disabled={submitting}>
            {submitting ? 'Lūdzu uzgaidiet...' : 'Ienākt'}
          </button>
        </form>
      </div>
    </div>
  )
}
