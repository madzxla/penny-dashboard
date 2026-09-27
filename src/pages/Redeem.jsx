import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Redeem.css'

// UI states for the redeem flow
const STATE = {
  ENTER: 'enter',       // typing the code
  CHECKING: 'checking',
  FOUND: 'found',        // valid claim found, awaiting confirm
  CONFIRMING: 'confirming',
  SUCCESS: 'success',
  ERROR: 'error',
}

function formatMoney(cents) {
  if (cents == null) return null
  return `€${(cents / 100).toFixed(2)}`
}

export default function Redeem() {
  const { restaurant } = useAuth()
  const [code, setCode] = useState('')
  const [state, setState] = useState(STATE.ENTER)
  const [claim, setClaim] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef(null)

  const resetToEntry = () => {
    setCode('')
    setClaim(null)
    setErrorMsg('')
    setState(STATE.ENTER)
    inputRef.current?.focus()
  }

  const handleCodeChange = (value) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 5)
    setCode(digitsOnly)
  }

  const handleLookup = async (e) => {
    e.preventDefault()
    if (code.length !== 5 || !restaurant?.id) return

    setState(STATE.CHECKING)
    setErrorMsg('')

    // Claims carry the staff code; join to deals to show what's being redeemed
    // and scope the lookup to this restaurant so codes can't be checked
    // against another restaurant's claims.
    const { data, error } = await supabase
      .from('claims')
      .select(`
        id,
        status,
        staff_code,
        expires_at,
        deal:deals!inner (
          id,
          title,
          deal_type,
          discount_percent,
          rest_id
        )
      `)
      .eq('staff_code', code)
      .eq('deal.rest_id', restaurant.id)
      .maybeSingle()

    if (error) {
      console.error('Error looking up claim:', error)
      setErrorMsg('Kaut kas nogāja greizi apstiprinot kodu. Lūdzu mēģiniet vēlreiz.')
      setState(STATE.ERROR)
      return
    }

    if (!data) {
      setErrorMsg('Šis kods nav derīgs. Pārlieciniaties, ka tas ir pareizi ievadīts.')
      setState(STATE.ERROR)
      return
    }

    if (data.status === 'confirmed') {
      setErrorMsg('Šis kods jau ir izmantots.')
      setState(STATE.ERROR)
      return
    }

    if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
      setErrorMsg('Šim kodam ir beidzies derīguma termiņš.')
      setState(STATE.ERROR)
      return
    }

    setClaim(data)
    setState(STATE.FOUND)
  }

  const handleConfirm = async () => {
    if (!claim) return
    setState(STATE.CONFIRMING)

    // Server-side function handles: marking the claim confirmed, writing
    // the conversions row for billing, and respecting the monthly cap
    // (in-flight claims still confirm unbilled once the cap is hit).
    const { error } = await supabase.rpc('confirm_claim', { p_restaurant_id: restaurant.id, p_staff_code: claim.staff_code })

    if (error) {
      console.error('Error confirming claim:', error)
      setErrorMsg('Nevarējām apstiprināt šo kodu. Lūdzu mēģiniet vēlreiz.')
      setState(STATE.ERROR)
      return
    }

    setState(STATE.SUCCESS)
  }

  return (
    <div className="redeem-wrap">
      <div className="redeem-card">
        {state === STATE.ENTER && (
          <form onSubmit={handleLookup} className="redeem-form">
            <h1 className="redeem-title">Apstiprināt kodu</h1>
            <p className="redeem-hint">Meklē 5 ciparu kodu klienta lietotnē un ievadi to šeit. Pārliecinaties, ka kods ir ievadīts pareizi.</p>

            <input
              ref={inputRef}
              className="redeem-input tabular"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="•••••"
              aria-label="5-digit redemption code"
            />

            <button
              type="submit"
              className="primary-button redeem-submit"
              disabled={code.length !== 5}
            >
              Pārbaudīt
            </button>
          </form>
        )}

        {state === STATE.CHECKING && (
          <div className="redeem-status">
            <div className="redeem-spinner" aria-hidden="true" />
            <p>Pārbaudām kodu...</p>
          </div>
        )}

        {state === STATE.FOUND && claim && (
          <div className="redeem-found">
            <div className="redeem-found-badge">Derīgs kods</div>
            <h2 className="redeem-item-name">{claim.deal.title}</h2>
            <p className="redeem-item-type">
              {claim.deal.deal_type === 'percentage_off'
                ? `${claim.deal.discount_percent}% atlaide`
                : 'Bezmaksas'}
            </p>

            <div className="redeem-actions">
              <button className="primary-button" onClick={handleConfirm}>
                Apstiprināt
              </button>
              <button className="redeem-cancel" onClick={resetToEntry}>
                Atcelt
              </button>
            </div>
          </div>
        )}

        {state === STATE.CONFIRMING && (
          <div className="redeem-status">
            <div className="redeem-spinner" aria-hidden="true" />
            <p>Apstiprinām...</p>
          </div>
        )}

        {state === STATE.SUCCESS && (
          <div className="redeem-success">
            <div className="redeem-success-icon" aria-hidden="true">✓</div>
            <h2>Apstiprināts</h2>
            <p className="redeem-item-type">{claim?.deal.title}</p>
            <button className="primary-button" onClick={resetToEntry}>
              Nākamais kods
            </button>
          </div>
        )}

        {state === STATE.ERROR && (
          <div className="redeem-error-state">
            <div className="redeem-error-icon" aria-hidden="true">!</div>
            <p className="redeem-error-msg">{errorMsg}</p>
            <button className="primary-button" onClick={resetToEntry}>
              Mēģināt citu kodu
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
