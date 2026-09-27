import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { normalizeOpeningHours } from '../lib/openingHours'
import './Overview.css'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return 0

  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0

  return hours * 60 + minutes
}

function normalizeActiveDays(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter(Boolean).map((day) => String(day).trim().toLowerCase())
  }

  if (typeof value === 'string') {
    return value.split(',').map((day) => day.trim().toLowerCase()).filter(Boolean)
  }

  return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
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
  const hours = normalizeOpeningHours(restaurant?.opening_hours)
  const now = new Date()
  const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
  const todayHours = hours[dayKey]

  if (!todayHours || todayHours.closed) return false

  const openMinutes = parseTimeToMinutes(todayHours.open)
  const closeMinutes = parseTimeToMinutes(todayHours.close)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (openMinutes <= closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  }

  return currentMinutes >= openMinutes || currentMinutes < closeMinutes
}

export default function Overview() {
  const { restaurant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ confirmedThisMonth: 0, pendingClaims: 0, activeDeals: 0 })
  const [dailySeries, setDailySeries] = useState([])

  useEffect(() => {
    if (!restaurant?.id) return
    let active = true

    async function load() {
      setLoading(true)

      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const fourteenDaysAgo = startOfDay(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000))

      const [confirmedRes, pendingRes, dealsRes, recentConversionsRes] = await Promise.all([
        supabase
          .from('conversions')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .gte('confirmed_at', monthStart.toISOString()),
        supabase
          .from('claims')
          .select('id, deal:deals!inner(rest_id)', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('deal.rest_id', restaurant.id),
        supabase
          .from('deals')
          .select('id, active, exists, active_days, start_time, end_time')
          .eq('rest_id', restaurant.id)
          .eq('exists', true),
        supabase
          .from('conversions')
          .select('confirmed_at')
          .eq('restaurant_id', restaurant.id)
          .gte('confirmed_at', fourteenDaysAgo.toISOString()),
      ])

      if (!active) return

      const buckets = {}
      for (let i = 0; i < 14; i++) {
        const d = new Date(fourteenDaysAgo.getTime() + i * 86400000)
        const key = d.toISOString().slice(0, 10)
        buckets[key] = { date: key, redemptions: 0 }
      }
      for (const row of recentConversionsRes.data ?? []) {
        const key = row.confirmed_at?.slice(0, 10)
        if (buckets[key]) buckets[key].redemptions += 1
      }

      const monthlyCap = restaurant?.monthly_cap ?? null
      const capReached = monthlyCap != null && (confirmedRes.count ?? 0) >= monthlyCap
      const restaurantOpenNow = restaurantIsOpenNow(restaurant)
      const activeDeals = restaurantOpenNow
        ? (dealsRes.data ?? []).filter((deal) => {
            if (!deal || deal.exists === false || !deal.active) return false
            if (capReached) return false
            return dealIsInSchedule(deal)
          }).length
        : 0

      setStats({
        confirmedThisMonth: confirmedRes.count ?? 0,
        pendingClaims: pendingRes.count ?? 0,
        activeDeals,
      })
      setDailySeries(Object.values(buckets))
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [restaurant?.id])

  const cap = restaurant?.monthly_cap ?? null
  const capUsedPct = cap ? Math.min(100, Math.round((stats.confirmedThisMonth / cap) * 100)) : null
  const capReached = cap != null && stats.confirmedThisMonth >= cap

  return (
    <div className="overview-page">
      <h1 className="page-title">Pārskats</h1>
      <p className="page-subtitle">
        {restaurant?.name ? `${restaurant.name}'s` : 'Tava'} piedāvājumu un apstiprinājumu statistika
      
      </p>

      {capReached && (
        <div className="deals-cap-banner">
          Mēneša limits ir sasniegts — visi piedāvājumi ir automātiski pauzēti.
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Apstiprināti šajā mēnesī</span>
          <span className="stat-value tabular">{loading ? '—' : stats.confirmedThisMonth}</span>
          {cap != null && (
            <span className="stat-footnote">tavs mēneša limits: {stats.confirmedThisMonth}/{cap} ({capUsedPct}%)</span>
          )}
        </div>

        <div className="stat-card">
          <span className="stat-label">Gaidām apstiprinājumu</span>
          <span className="stat-value tabular">{loading ? '—' : stats.pendingClaims}</span>
          <span className="stat-footnote">saņemti, bet vēl nav izmantoti</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Aktīvie piedāvājumi</span>
          <span className="stat-value tabular">{loading ? '—' : stats.activeDeals}</span>
          <span className="stat-footnote">pašlaik redzami klientiem</span>
        </div>
      </div>

      <div className="chart-card">
        <h2 className="chart-title">Apstiprinājumi - pēdējās 14 dienas</h2>
        {loading ? (
          <div className="chart-placeholder">Lūdzu uzgaidiet...</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => d.slice(5).replace('-', '/')}
                tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 13,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
                labelFormatter={(d) => d}
              />
              <Line
                type="monotone"
                dataKey="redemptions"
                stroke="var(--brand)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
