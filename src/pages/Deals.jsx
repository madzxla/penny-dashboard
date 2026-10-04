import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import DealFormModal from '../components/DealFormModal'
import { normalizeActiveDays } from '../lib/activeDays'
import './Deals.css'

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return 0

  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0

  return hours * 60 + minutes
}

function dealIsInSchedule(deal) {
  if (!deal || deal.exists === false) return false

  const activeDays = normalizeActiveDays(deal.active_days)

  const now = new Date()
  const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]

  if (!activeDays.includes(dayKey)) return false

  const startMinutes = parseTimeToMinutes(deal.start_time)
  const endMinutes = parseTimeToMinutes(deal.end_time)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

function restaurantIsOpenNow(restaurant) {
  if (!restaurant?.opening_hours) return true

  const now = new Date()
  const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
  const todayHours = restaurant.opening_hours[dayKey] ?? { closed: false, open: '09:00', close: '21:00' }

  if (todayHours.closed) return false

  const startMinutes = parseTimeToMinutes(todayHours.open)
  const endMinutes = parseTimeToMinutes(todayHours.close)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

function getDealAvailability(deal, restaurant, capReached) {
  const isPausedBySchedule = !dealIsInSchedule(deal)
  const isPausedByRestaurantHours = !restaurantIsOpenNow(restaurant)
  const isPausedByManualState = !deal.active
  const isPaused = capReached || isPausedByManualState || isPausedBySchedule || isPausedByRestaurantHours

  let statusText = 'Aktīvs'
  if (isPaused) {
    if (capReached) {
      statusText = 'Automātiski pauzēts'
    } else if (isPausedBySchedule) {
      statusText = 'Ārpus grafika'
    } else if (isPausedByRestaurantHours) {
      statusText = 'Ārpus darba laika'
    } else if (isPausedByManualState) {
      statusText = 'Pauzēts'
    }
  }

  return {
    isPaused,
    toggleDisabled: capReached || isPausedBySchedule || isPausedByRestaurantHours,
    statusText,
  }
}

export default function Deals() {
  const { restaurant } = useAuth()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [capReached, setCapReached] = useState(false)

  const loadDeals = async () => {
    if (!restaurant?.id) return
    setLoading(true)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [dealsRes, capRes] = await Promise.all([
      supabase
        .from('deals')
        .select('*')
        .eq('rest_id', restaurant.id)
        .eq('exists', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('conversions')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .gte('confirmed_at', monthStart.toISOString())
    ])

    if (!dealsRes.error) {
      setDeals((dealsRes.data ?? [])
        .filter((deal) => deal.exists !== false)
        .map((deal) => ({ ...deal, active_days: normalizeActiveDays(deal.active_days) })))
    }

    const confirmedThisMonth = capRes.count ?? 0
    const monthlyCap = restaurant?.monthly_cap ?? null
    setCapReached(monthlyCap != null && confirmedThisMonth >= monthlyCap)
    setLoading(false)
  }

  useEffect(() => { loadDeals() }, [restaurant?.id])

  const toggleActive = async (deal) => {
    // Optimistic update so the toggle feels instant
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, active: !d.active } : d))
    const { error } = await supabase
      .from('deals')
      .update({ active: !deal.active })
      .eq('id', deal.id)
      .eq('rest_id', restaurant.id)
    if (error) loadDeals() // revert on failure by refetching
  }

  const softDeleteDeal = async (deal) => {
    const confirmed = window.confirm(`Vai Jūs vēlaties dzēst "${deal.title}"? Šī darbība ir neatgriezeniska.`)
    if (!confirmed) return

    const { error } = await supabase
      .from('deals')
      .update({ exists: false, active: false })
      .eq('id', deal.id)
      .eq('rest_id', restaurant.id)

    if (!error) {
      setDeals((prev) => prev.filter((d) => d.id !== deal.id))
      return
    }

    console.error('Failed to archive deal:', error.message)
    loadDeals()
  }

  const openCreate = () => { setEditingDeal(null); setModalOpen(true) }
  const openEdit = (deal) => { setEditingDeal(deal); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingDeal(null) }
  const onSaved = () => { closeModal(); loadDeals() }
  const dealsWithAvailability = deals.map((deal) => ({
    deal,
    availability: getDealAvailability(deal, restaurant, capReached),
  }))
  const dealGroups = [
    {
      key: 'active',
      title: 'Aktīvie piedāvājumi',
      items: dealsWithAvailability.filter(({ availability }) => !availability.isPaused),
    },
    {
      key: 'inactive',
      title: 'Neaktīvie piedāvājumi',
      items: dealsWithAvailability.filter(({ availability }) => availability.isPaused),
    },
  ]

  return (
    <div className="deals-page">
      <div className="deals-header">
        <div>
          <h1 className="page-title">Piedāvājumi</h1>
          <p className="page-subtitle">Pielāgojiet, kā citi redzēs Jūsu restorānu caur Penny. Izmaiņas tiks veiktas visās platformās minūtes laikā.</p>
        </div>
        <button className="deals-new-btn primary-button" onClick={openCreate}>Izveidot</button>
      </div>

      {loading ? (
        <div className="deals-empty">Lūdzu uzgaidiet...</div>
      ) : deals.length === 0 ? (
        <div className="deals-empty">
          <p>Jums vēl nav piedāvājumu.</p>
          <button className="deals-new-btn" onClick={openCreate}>Izveidot pirmo piedāvājumu</button>
        </div>
      ) : (
        <>
          {capReached && (
            <div className="deals-cap-banner">
              Mēneša limits ir sasniegts — visi piedāvājumi ir automātiski pauzēti.
            </div>
          )}

          {dealGroups.map((group) => (
            <details key={group.key} className="deal-group" open>
              <summary className="deal-group-heading">
                <span className="deal-group-title">{group.title}</span>
                <span className="deal-group-count">{group.items.length}</span>
              </summary>
              {group.items.length > 0 ? (
                <div className="deals-list">
                  {group.items.map(({ deal, availability: { isPaused, toggleDisabled, statusText } }) => {
                    return (
                      <div key={deal.id} className={`deal-row${deal.photo_url ? ' has-image' : ''}`}>
                        {deal.photo_url && (
                          <img className="deal-row-background" src={deal.photo_url} alt="" aria-hidden="true" />
                        )}
                        <span className={'deal-status-pill' + (isPaused ? '' : ' active')}>
                          {statusText}
                        </span>
                        <div className="deal-row-main">
                          <div className="deal-row-top">
                            <span className="deal-name">{deal.title}</span>
                            {deal.food_sos && (
                              <span className="deal-food-sos-badge" title="Pārtikas SOS" aria-label="Pārtikas SOS">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                  <path d="M20.8 3.2C12.1 3.2 5.7 5.1 4 10.5c-.9 2.8.8 5.4 3.5 5.4 5.8 0 9.8-5.7 13.3-12.7ZM3.4 21c2.3-5.2 6.6-8.8 12.1-11.8" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <span className="deal-meta">
                            {deal.deal_type === 'percentage_off'
                              ? `${deal.discount_percent}% atlaide`
                              : 'Bezmaksas'}
                            {deal.min_spend ? ` · min. pirkums €${deal.min_spend}` : ''}
                          </span>
                        </div>
                        <div className="deal-row-actions">
                          <button className="deal-edit-btn" onClick={() => softDeleteDeal(deal)}>
                            <span className="deal-btn-icon" aria-hidden="true">🗑</span>
                          </button>
                          <button className="deal-edit-btn" onClick={() => openEdit(deal)}>
                            <span className="deal-btn-icon" aria-hidden="true">✎</span>
                            Rediģēt
                          </button>
                          <button
                            className="deal-toggle-btn"
                            disabled={toggleDisabled}
                            onClick={() => toggleActive(deal)}
                          >
                            <span className="deal-btn-icon" aria-hidden="true">{isPaused ? '▶' : '⏸'}</span>
                            {isPaused ? 'Aktivizēt' : 'Pauzēt'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="deal-group-empty">Nav piedāvājumu.</p>
              )}
            </details>
          ))}
        </>
      )}

      {modalOpen && (
        <DealFormModal
          deal={editingDeal}
          restaurantId={restaurant?.id}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
