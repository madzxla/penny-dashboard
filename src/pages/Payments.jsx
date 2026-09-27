import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Payments.css'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('lv-LV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getInvoiceStatus(invoice) {
  if (invoice.paid) {
    return { label: 'Apmaksāts', tone: 'paid', dueDate: null }
  }

  const createdAt = new Date(invoice.created_at)
  const dueAt = new Date(createdAt)
  dueAt.setDate(dueAt.getDate() + 14)
  const now = new Date()

  if (now > dueAt) {
    return { label: 'Nokavēts', tone: 'overdue', dueDate: dueAt }
  }

  const daysLeft = Math.ceil((dueAt - now) / (1000 * 60 * 60 * 24))
  return {
    label: daysLeft === 1 ? '1 diena atlikusi' : `${daysLeft} dienas atlikušas`,
    tone: 'due',
    dueDate: dueAt,
  }
}

export default function Payments() {
  const { restaurant } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurant?.id) return

    let active = true

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })

      if (!active) return

      if (!error) {
        setInvoices(data ?? [])
      }
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [restaurant?.id])

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <h1 className="page-title">Maksājumi</h1>
          <p className="page-subtitle">Rēķinu pārskats un maksājumu termiņi Jūsu restorānam.<br/>
            <i>Mūsu komanda apkopo Jūsu apstiprināto klientu skaitu un izsludina rēķinu 1. datumā katru mēnesi. Maksājuma apstiprināšana var aizņemt līdz 24 stundām. Ja maksājums ir apstrādāts, šī lapā arī tiks atjaunināta drīz.</i>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="payments-empty">Lūdzu uzgaidiet...</div>
      ) : invoices.length === 0 ? (
        <div className="payments-empty">
          <p>Jums vēl nav rēķinu.</p>
        </div>
      ) : (
        <div className="payments-list">
          {invoices.map((invoice) => {
            const status = getInvoiceStatus(invoice)

            return (
              <div key={invoice.id} className="payment-row">
                <div className="payment-main">
                  <div className="payment-row-top">
                    <span className="payment-id">Rēķins #{invoice.id}</span>
                    <span className={`payment-status payment-status-${status.tone}`}>{status.label}</span>
                  </div>

                  <div className="payment-meta-row">
                    <span>Izveidots: {formatDate(invoice.created_at)}</span>
                    {status.dueDate && (
                      <span>Termiņš: {formatDate(status.dueDate)}</span>
                    )}
                  </div>
                </div>

                {invoice.invoice_link ? (
                  <a
                    className="primary-button payment-link"
                    href={invoice.invoice_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Atvērt rēķinu
                  </a>
                ) : (
                  <button className="payment-link disabled" type="button" disabled>
                    Nav saites
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
