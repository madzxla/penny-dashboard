import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Overview.css'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
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
          .eq('status', 'claimed')
          .eq('deal.rest_id', restaurant.id),
        supabase
          .from('deals')
          .select('id', { count: 'exact', head: true })
          .eq('rest_id', restaurant.id)
          .eq('active', true),
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

      setStats({
        confirmedThisMonth: confirmedRes.count ?? 0,
        pendingClaims: pendingRes.count ?? 0,
        activeDeals: dealsRes.count ?? 0,
      })
      setDailySeries(Object.values(buckets))
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [restaurant?.id])

  const cap = restaurant?.monthly_cap ?? null
  const capUsedPct = cap ? Math.min(100, Math.round((stats.confirmedThisMonth / cap) * 100)) : null

  return (
    <div className="overview-page">
      <h1 className="page-title">Overview</h1>
      <p className="page-subtitle">
        {restaurant?.name ? `${restaurant.name}'s` : 'Your'} activity at a glance.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Confirmed this month</span>
          <span className="stat-value tabular">{loading ? '—' : stats.confirmedThisMonth}</span>
          {cap != null && (
            <span className="stat-footnote">of {cap} monthly cap ({capUsedPct}%)</span>
          )}
        </div>

        <div className="stat-card">
          <span className="stat-label">Pending redemptions</span>
          <span className="stat-value tabular">{loading ? '—' : stats.pendingClaims}</span>
          <span className="stat-footnote">claimed, not yet redeemed</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Active deals</span>
          <span className="stat-value tabular">{loading ? '—' : stats.activeDeals}</span>
          <span className="stat-footnote">currently visible to customers</span>
        </div>
      </div>

      <div className="chart-card">
        <h2 className="chart-title">Redemptions, last 14 days</h2>
        {loading ? (
          <div className="chart-placeholder">Loading…</div>
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
