import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Settings.css'

const DAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

export default function Settings() {
  const { restaurant, refreshRestaurant, signOut } = useAuth()

  const [name, setName] = useState(restaurant?.name ?? '')
  const [hours, setHours] = useState(
    restaurant?.opening_hours ?? Object.fromEntries(
      Object.keys(DAY_LABELS).map((d) => [d, { open: '09:00', close: '21:00', closed: false }])
    )
  )
  const [notifyClaims, setNotifyClaims] = useState(restaurant?.notifications?.claims ?? true)
  const [notifyWeekly, setNotifyWeekly] = useState(restaurant?.notifications?.weekly_summary ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateDay = (day, patch) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: name.trim(),
        opening_hours: hours,
        notifications: { claims: notifyClaims, weekly_summary: notifyWeekly },
      })
      .eq('id', restaurant.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      refreshRestaurant()
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <div className="settings-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Restaurant profile, hours, and notifications.</p>

      <form onSubmit={handleSave} className="settings-form">
        <section className="settings-section">
          <h2 className="settings-section-title">Profile</h2>
          <label className="settings-field">
            <span>Restaurant name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Opening hours</h2>
          <div className="hours-list">
            {Object.entries(DAY_LABELS).map(([key, label]) => (
              <div key={key} className="hours-row">
                <span className="hours-day">{label}</span>
                <label className="hours-closed-toggle">
                  <input
                    type="checkbox"
                    checked={!hours[key]?.closed}
                    onChange={(e) => updateDay(key, { closed: !e.target.checked })}
                  />
                  Open
                </label>
                {!hours[key]?.closed && (
                  <div className="hours-times">
                    <input
                      type="time"
                      value={hours[key]?.open ?? '09:00'}
                      onChange={(e) => updateDay(key, { open: e.target.value })}
                    />
                    <span className="hours-sep">–</span>
                    <input
                      type="time"
                      value={hours[key]?.close ?? '21:00'}
                      onChange={(e) => updateDay(key, { close: e.target.value })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Notifications</h2>
          <label className="settings-checkbox-row">
            <input type="checkbox" checked={notifyClaims} onChange={(e) => setNotifyClaims(e.target.checked)} />
            <div>
              <span className="settings-checkbox-title">New claims</span>
              <span className="settings-checkbox-desc">Get notified when a customer claims a deal</span>
            </div>
          </label>
          <label className="settings-checkbox-row">
            <input type="checkbox" checked={notifyWeekly} onChange={(e) => setNotifyWeekly(e.target.checked)} />
            <div>
              <span className="settings-checkbox-title">Weekly summary</span>
              <span className="settings-checkbox-desc">A recap of redemptions and performance each week</span>
            </div>
          </label>
        </section>

        <div className="settings-actions">
          <button type="submit" className="settings-save" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="settings-saved-msg">Saved</span>}
        </div>
      </form>

      <div className="settings-danger">
        <h2 className="settings-section-title">Account</h2>
        <button className="settings-signout" onClick={signOut}>Sign out</button>
      </div>
    </div>
  )
}
