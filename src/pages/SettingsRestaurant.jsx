import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { DAY_LABELS, createDefaultOpeningHours, normalizeOpeningHours } from '../lib/openingHours'
import { supabase } from '../lib/supabase'

export default function SettingsRestaurant() {
  const { restaurant, refreshRestaurant, signOut } = useAuth()

  const [name, setName] = useState(restaurant?.name ?? '')
  const [monthlyCap, setMonthlyCap] = useState(restaurant?.monthly_cap ?? 0)
  const [hours, setHours] = useState(() => normalizeOpeningHours(restaurant?.opening_hours))
  const [notifyClaims, setNotifyClaims] = useState(restaurant?.notifications?.claims ?? true)
  const [notifyWeekly, setNotifyWeekly] = useState(restaurant?.notifications?.weekly_summary ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!restaurant) return
    setName(restaurant.name ?? '')
    setMonthlyCap(restaurant.monthly_cap ?? 0)
    setHours(normalizeOpeningHours(restaurant.opening_hours))
    setNotifyClaims(restaurant.notifications?.claims ?? true)
    setNotifyWeekly(restaurant.notifications?.weekly_summary ?? true)
  }, [restaurant])

  const updateDay = (day, patch) => {
    setHours((prev) => {
      const next = createDefaultOpeningHours()
      Object.keys(prev).forEach((existingDay) => {
        next[existingDay] = { ...next[existingDay], ...prev[existingDay] }
      })

      next[day] = { ...next[day], ...patch }
      return next
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const nextHours = normalizeOpeningHours(hours)

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: name.trim(),
        monthly_cap: Number(monthlyCap) || 0,
        opening_hours: nextHours,
        notifications: { claims: notifyClaims, weekly_summary: notifyWeekly },
      })
      .eq('id', restaurant.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      refreshRestaurant()
      setTimeout(() => setSaved(false), 2500)
    } else {
      console.error('Failed to save settings: ' + error.message)
    }
  }

  return (
    <>
      <h1 className="page-title">Restorāns</h1>
      <p className="page-subtitle">Jūsu restorāna profils, darba laiki un paziņojumi.</p>

      <form onSubmit={handleSave} className="settings-form">
        <section className="settings-section">
          <h2 className="settings-section-title">Profils</h2>
          <label className="settings-field">
            <span>Restorāna nosaukums</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Apstiprinājumi</h2>
          <label className="settings-field">
            <span>Mēneša apstiprinājumu limits</span>
            <input
              type="number"
              min="0"
              step="1"
              value={monthlyCap}
              onChange={(e) => setMonthlyCap(e.target.value === '' ? 0 : Number(e.target.value))}
            />
          </label>
          <span className="settings-checkbox-desc">Piedāvājumi automātiski apstāsies, kad šis limits tiek sasniegts. Jūs varat mainīt limitu jebkurā brīdī.</span>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Darba laiki</h2>
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
                  Atvērts
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
          <h2 className="settings-section-title">Paziņojumi</h2>
          <label className="settings-checkbox-row">
            <input type="checkbox" checked={notifyClaims} onChange={(e) => setNotifyClaims(e.target.checked)} />
            <div>
              <span className="settings-checkbox-title">Jauni apstiprinājumi</span>
              <span className="settings-checkbox-desc">Saņemt paziņojumu, kad klients saņem piedāvājumu un apstiprina apmeklējumu</span>
            </div>
          </label>
          <label className="settings-checkbox-row">
            <input type="checkbox" checked={notifyWeekly} onChange={(e) => setNotifyWeekly(e.target.checked)} />
            <div>
              <span className="settings-checkbox-title">Nedēļas kopsavilkums</span>
              <span className="settings-checkbox-desc">Viss tavs nedēļas pārskats ar ieteikumiem, kā uzlabot Jūsu Penny pieredzi</span>
            </div>
          </label>
        </section>

        <div className="settings-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Lūdzu uzgaidiet...' : 'Saglabāt izmaiņas'}
          </button>
          {saved && <span className="settings-saved-msg">Saglabāts</span>}
        </div>
      </form>
    </>
  )
}
