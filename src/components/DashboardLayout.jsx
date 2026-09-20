import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './DashboardLayout.css'

const MANAGER_NAV = [
  { to: '/overview', label: 'Overview' },
  { to: '/deals', label: 'Deals' },
  { to: '/redeem', label: 'Redeem' },
  { to: '/settings', label: 'Settings' },
]

export default function DashboardLayout() {
  const { restaurant, isManager, isStaff, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // Staff devices get no sidebar at all — the redeem page is the whole app.
  // This isn't a hidden nav item, it's a structurally different shell.
  if (isStaff) {
    return (
      <div className="staff-shell">
        <header className="staff-topbar">
          <span className="staff-topbar-name">{restaurant?.name ?? 'Penny'}</span>
          <button className="staff-signout" onClick={handleSignOut}>Sign out</button>
        </header>
        <main className="staff-main">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <span className="dash-brand-mark">Penny</span>
          <span className="dash-brand-sub">Partner</span>
        </div>

        <nav className="dash-nav">
          {MANAGER_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'dash-nav-link' + (isActive ? ' active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="dash-restaurant-name">{restaurant?.name ?? '—'}</div>
          <button className="dash-signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  )
}
