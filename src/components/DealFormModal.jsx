import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './DealFormModal.css'

const WEEKDAYS = [
  { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' }, { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' }, { key: 'sat', label: 'S' }, { key: 'sun', label: 'S' },
]

export default function DealFormModal({ deal, restaurantId, onClose, onSaved }) {
  const isEditing = Boolean(deal)

  const [itemName, setItemName] = useState(deal?.item_name ?? '')
  const [dealType, setDealType] = useState(deal?.deal_type ?? 'free_item')
  const [discountPercent, setDiscountPercent] = useState(deal?.discount_percent ?? 20)
  const [minSpend, setMinSpend] = useState(deal?.min_spend ?? '')
  const [activeDays, setActiveDays] = useState(deal?.active_days ?? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
  const [startTime, setStartTime] = useState(deal?.start_time ?? '11:00')
  const [endTime, setEndTime] = useState(deal?.end_time ?? '21:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const toggleDay = (key) => {
    setActiveDays((prev) => prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      item_name: itemName.trim(),
      deal_type: dealType,
      discount_percent: dealType === 'percentage_off' ? Number(discountPercent) : null,
      min_spend: minSpend ? Number(minSpend) : null,
      active_days: activeDays,
      start_time: startTime,
      end_time: endTime,
    }

    const result = isEditing
      ? await supabase.from('deals').update(payload).eq('id', deal.id)
      : await supabase.from('deals').insert({ ...payload, rest_id: restaurantId, active: true })

    setSaving(false)
    if (result.error) {
      setError('Could not save this deal. Try again.')
      return
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditing ? 'Edit deal' : 'New deal'}</h2>

        <form onSubmit={handleSubmit} className="deal-form">
          <label className="deal-field">
            <span>What's the deal</span>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Free espresso with any pastry"
              required
            />
          </label>

          <div className="deal-field-row">
            <label className="deal-field">
              <span>Type</span>
              <select value={dealType} onChange={(e) => setDealType(e.target.value)}>
                <option value="free_item">Free item</option>
                <option value="percentage_off">Percentage off</option>
              </select>
            </label>

            {dealType === 'percentage_off' && (
              <label className="deal-field deal-field-narrow">
                <span>Discount %</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </label>
            )}
          </div>

          <label className="deal-field">
            <span>Minimum spend (optional, €)</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
              placeholder="No minimum"
            />
          </label>

          <div className="deal-field">
            <span>Active days</span>
            <div className="day-toggle-row">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className={'day-toggle' + (activeDays.includes(d.key) ? ' selected' : '')}
                  onClick={() => toggleDay(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="deal-field-row">
            <label className="deal-field">
              <span>Starts</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="deal-field">
              <span>Ends</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>

          {error && <div className="deal-form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-save" disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
