import { Outlet } from 'react-router-dom'
import './Settings.css'

export default function Settings() {
  return (
    <div className="settings-page">
      <Outlet />
    </div>
  )
}
