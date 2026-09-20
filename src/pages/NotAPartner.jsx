import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function NotAPartner() {
  const { signOut } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">Penny</div>
        <h1 className="login-title">No partner account found</h1>
        <p className="login-subtitle">
          This login isn't linked to a restaurant on Penny yet. If you think this is a mistake,
          reach out to support.
        </p>
        <button className="login-submit" onClick={signOut}>Sign out</button>
      </div>
    </div>
  )
}
