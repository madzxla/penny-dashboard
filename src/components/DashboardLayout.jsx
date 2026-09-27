import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import logoUrl from '../assets/logo.png'
import './DashboardLayout.css'

const NAV_ICON_SIZE = 16

const MANAGER_NAV = [
  {
    to: '/overview',
    label: 'Pārskats',
    icon: (
      <svg viewBox="0 0 24 24" width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12.75V5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v7.25" />
        <path d="M3 18.5A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5v-2.25H3v2.25Z" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    to: '/deals',
    label: 'Piedāvājumi',
    icon: (
      <svg viewBox="0 0 24 24" width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 7.3 16.7 3.2a1.8 1.8 0 0 0-2.5 0l-9.2 9.2a2.2 2.2 0 0 0-.6 1.5v4.1c0 .8.6 1.4 1.4 1.4h4.1c.6 0 1.1-.2 1.5-.6l9.2-9.2a1.8 1.8 0 0 0 0-2.5Z" />
        <path d="M14 4l6 6" />
        <path d="M7 14l3 3" />
      </svg>
    ),
  },
  {
    to: '/payments',
    label: 'Maksājumi',
    icon: (
      <svg viewBox="0 0 24 24" width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="M3.5 10.5h17" />
        <path d="M8 15.5h3" />
      </svg>
    ),
  },
  {
    to: '/redeem',
    label: 'Apstiprināt',
    icon: (
      <svg viewBox="0 0 24 24" width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11.5 11 13.5l4.5-5" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Iestatījumi',
    icon: (
      <svg viewBox="0 0 24 24" width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.5 1.5 0 0 0 .3 1.6l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.6-.3 1.5 1.5 0 0 0-.9 1.3V20a2 2 0 0 1-4 0v-.2a1.5 1.5 0 0 0-.9-1.3 1.5 1.5 0 0 0-1.6.3l-.1.1A2 2 0 0 1 4.4 17l.1-.1a1.5 1.5 0 0 0 .3-1.6 1.5 1.5 0 0 0-1.3-.9H3a2 2 0 0 1 0-4h.2A1.5 1.5 0 0 0 4.5 9.1a1.5 1.5 0 0 0-.3-1.6L4.1 7.4A2 2 0 1 1 6.9 4.6l.1.1a1.5 1.5 0 0 0 1.6.3h.1A1.5 1.5 0 0 0 9.6 3.7V3.5a2 2 0 0 1 4 0v.2a1.5 1.5 0 0 0 .9 1.3h.1a1.5 1.5 0 0 0 1.6-.3l.1-.1A2 2 0 1 1 19.4 7.6l-.1.1a1.5 1.5 0 0 0-.3 1.6v.1A1.5 1.5 0 0 0 20.3 10H20.5a2 2 0 0 1 0 4h-.2a1.5 1.5 0 0 0-1.3.9Z" />
      </svg>
    ),
    children: [
      { to: '/settings/restaurant', label: 'Restorāns' },
      { to: '/settings/support', label: 'Atbalsts' },
      { to: '/settings/account', label: 'Konts' },
    ],
  },
]

export default function DashboardLayout() {
  const { restaurant, isManager, isStaff, signOut } = useAuth()
  const [hasUnpaidInvoice, setHasUnpaidInvoice] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!restaurant?.id) {
      setHasUnpaidInvoice(false)
      return
    }

    let active = true

    async function load() {
      const { count, error } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .eq('paid', false)

      if (!active) return
      if (!error) setHasUnpaidInvoice((count ?? 0) > 0)
    }

    load()
    return () => { active = false }
  }, [restaurant?.id])

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
          <img src={logoUrl} alt="Penny logo" className="staff-logo" />
          <button className="staff-signout" onClick={handleSignOut}>Iziet</button>
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
          <img src={logoUrl} alt="Penny logo" className="staff-logo" />
          <div className="dash-restaurant-name">{restaurant?.name ?? '—'}</div>
        </div>

        <nav className="dash-nav">
          {MANAGER_NAV.map((item) => {
            const showUnpaidDot = item.to === '/payments' && hasUnpaidInvoice
            const isParentActive = item.children
              ? item.children.some((child) => location.pathname.startsWith(child.to))
              : location.pathname.startsWith(item.to)

            return (
              <div key={item.to} className="dash-nav-group">
                <NavLink
                  to={item.to}
                  className={() => 'dash-nav-link' + (isParentActive ? ' active' : '')}
                >
                  <span className="dash-nav-label-wrap">
                    <span className="dash-nav-item">
                      <span className="dash-nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {showUnpaidDot && <span className="dash-nav-unpaid-dot" aria-label="Unpaid invoice" title="Unpaid invoice" />}
                  </span>
                </NavLink>

                {item.children && isParentActive && (
                  <div className="dash-subnav">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) => 'dash-subnav-link' + (isActive ? ' active' : '')}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="dash-sidebar-footer">
          <button className="dash-signout" onClick={handleSignOut}>Iziet</button>
        </div>
      </aside>

      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  )
}
