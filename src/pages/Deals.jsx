import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import DealFormModal from '../components/DealFormModal'
import './Deals.css'

export default function Deals() {
  const { restaurant } = useAuth()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)

  const loadDeals = async () => {
    if (!restaurant?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('rest_id', restaurant.id)
      .order('created_at', { ascending: false })

    if (!error) setDeals(data ?? [])
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
    if (error) loadDeals() // revert on failure by refetching
  }

  const openCreate = () => { setEditingDeal(null); setModalOpen(true) }
  const openEdit = (deal) => { setEditingDeal(deal); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingDeal(null) }
  const onSaved = () => { closeModal(); loadDeals() }

  return (
    <div className="deals-page">
      <div className="deals-header">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="page-subtitle">What customers see when they discover you on Penny.</p>
        </div>
        <button className="deals-new-btn" onClick={openCreate}>New deal</button>
      </div>

      {loading ? (
        <div className="deals-empty">Loading…</div>
      ) : deals.length === 0 ? (
        <div className="deals-empty">
          <p>No deals yet.</p>
          <button className="deals-new-btn" onClick={openCreate}>Create your first deal</button>
        </div>
      ) : (
        <div className="deals-list">
          {deals.map((deal) => (
            <div key={deal.id} className="deal-row">
              <div className="deal-row-main">
                <div className="deal-row-top">
                  <span className="deal-name">{deal.item_name}</span>
                  <span className={'deal-status-pill' + (deal.active ? ' active' : '')}>
                    {deal.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <span className="deal-meta">
                  {deal.deal_type === 'percentage_off'
                    ? `${deal.discount_percent}% off`
                    : 'Free item'}
                  {deal.min_spend ? ` · min. spend €${deal.min_spend}` : ''}
                </span>
              </div>
              <div className="deal-row-actions">
                <button className="deal-edit-btn" onClick={() => openEdit(deal)}>Edit</button>
                <button className="deal-toggle-btn" onClick={() => toggleActive(deal)}>
                  {deal.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
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
