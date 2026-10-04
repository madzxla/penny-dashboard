import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { normalizeActiveDays } from '../lib/activeDays'
import { useAuth } from '../context/AuthContext'
import './DealFormModal.css'

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

const WEEKDAYS = [
  { key: 'mon', label: 'P' }, { key: 'tue', label: 'O' }, { key: 'wed', label: 'T' },
  { key: 'thu', label: 'C' }, { key: 'fri', label: 'Pk' }, { key: 'sat', label: 'S' }, { key: 'sun', label: 'Sv' },
]
const CREATE_STEPS = ['Tips', 'Nosaukums', 'Attēls', 'Dienas un laiks', 'Apstiprinājums', 'Pārskats']

export default function DealFormModal({ deal, restaurantId, onClose, onSaved }) {
  const { session } = useAuth()
  const isEditing = Boolean(deal)

  const [itemName, setItemName] = useState(deal?.title ?? deal?.item_name ?? '')
  const [dealType, setDealType] = useState(deal?.deal_type ?? 'free_item')
  const [discountPercent, setDiscountPercent] = useState(deal?.discount_percent ?? 20)
  const [minSpend, setMinSpend] = useState(deal?.min_spend ?? '')
  const [activeDays, setActiveDays] = useState(() => normalizeActiveDays(deal?.active_days))
  const [startTime, setStartTime] = useState(deal?.start_time ?? '11:00')
  const [endTime, setEndTime] = useState(deal?.end_time ?? '21:00')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(deal?.photo_url ?? '')
  const [error, setError] = useState(null)
  const [createStep, setCreateStep] = useState(1)
  const [confirmedDealDetails, setConfirmedDealDetails] = useState(false)

  const toggleDay = (key) => {
    setActiveDays((prev) => {
      const current = normalizeActiveDays(prev)

      if (current.includes(key)) {
        const next = current.filter((d) => d !== key)
        return next.length > 0 ? next : ['mon']
      }

      return [...current, key]
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_UPLOAD_SIZE) {
      setError('Image must be 5MB or smaller.')
      return
    }

    setError(null)
    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isEditing && createStep < CREATE_STEPS.length) {
      setCreateStep((step) => step + 1)
      return
    }

    setSaving(true)
    setError(null)

    let uploadedImageUrl = deal?.photo_url ?? null

    const { data: { session: liveSession } } = await supabase.auth.getSession()
    console.log('Live session at upload time:', liveSession?.user?.id, liveSession?.access_token?.slice(0, 20))

    try {
      const user = session?.user
      if (!user?.id) {
        throw new Error('You must be signed in to upload a deal image.')
      }

      if (!restaurantId) {
        throw new Error('Restaurant context is missing.')
      }

      if (selectedImage) {
        setUploadingImage(true)
        const safeFileName = `${Date.now()}-${selectedImage.name.replace(/\s+/g, '-')}`
        const storagePath = `${restaurantId}/${safeFileName}`

        console.log('Uploading deal image with auth user:', user.id)
        console.log('Target storage path:', storagePath)

        const { error: uploadError } = await supabase.storage
          .from('deals')
          .upload(storagePath, selectedImage, { contentType: selectedImage.type })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('deals')
          .getPublicUrl(storagePath)

        uploadedImageUrl = publicUrlData?.publicUrl ?? null
      }

      const normalizedActiveDays = normalizeActiveDays(activeDays)

      const payload = {
        title: itemName.trim(),
        deal_type: dealType,
        discount_percent: dealType === 'percentage_off' ? Number(discountPercent) : null,
        min_spend: minSpend ? Number(minSpend) : null,
        active_days: normalizedActiveDays,
        start_time: startTime,
        end_time: endTime,
        photo_url: uploadedImageUrl,
      }

      const result = isEditing
        ? await supabase.from('deals').update(payload).eq('id', deal.id)
        : await supabase.from('deals').insert({
          ...payload,
          rest_id: restaurantId,
          active: true,
          food_sos: confirmedDealDetails,
        })

      setSaving(false)
      setUploadingImage(false)

      if (result.error) {
        console.error('Error saving deal:', result.error)
        setError('Could not save this deal. Try again.')
        return
      }

      onSaved()
    } catch (err) {
      console.error('Upload failed:', err)
      setSaving(false)
      setUploadingImage(false)
      setError('Could not upload the deal image. Please try again.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Aizvērt">
          ×
        </button>
        <h2 className="modal-title">{isEditing ? 'Rediģēt piedāvājumu' : 'Jauns piedāvājums'}</h2>

        <form onSubmit={handleSubmit} className="deal-form">
          {!isEditing && (
            <div className="deal-wizard-progress" aria-label={`Solis ${createStep}/${CREATE_STEPS.length}`}>
              <span>Solis {createStep}/{CREATE_STEPS.length}</span>
              <div className="deal-wizard-progress-track" aria-hidden="true">
                {CREATE_STEPS.map((step, index) => (
                  <span key={step} className={createStep >= index + 1 ? 'complete' : ''} />
                ))}
              </div>
            </div>
          )}

          {isEditing ? (
            <>
              <label className="deal-field">
                <span>Kāds ir piedāvājums?</span>
                <input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Deserts ar 50% atlaidi"
                  required
                />
              </label>

              <div className="deal-field-row">
                <label className="deal-field">
                  <span>Tips</span>
                  <select value={dealType} onChange={(e) => setDealType(e.target.value)}>
                    <option value="free_item">Bezmaksas</option>
                    <option value="percentage_off">Procentu atlaide</option>
                  </select>
                </label>

                {dealType === 'percentage_off' && (
                  <label className="deal-field deal-field-narrow">
                    <span>Atlaide %</span>
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

              <div className="deal-field">
                <span>Attēls (5 MB maks.)</span>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {previewUrl && (
                  <img src={previewUrl} alt="Deal preview" className="deal-photo-preview" />
                )}
              </div>

              <div className="deal-field">
                <span>Aktīvās dienas</span>
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
                  <span>Sākas</span>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </label>
                <label className="deal-field">
                  <span>Beidzas</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </label>
              </div>
            </>
          ) : createStep === 1 ? (
            <>
              <div className="deal-field-row deal-type-row">
                <label className="deal-field">
                  <span className="deal-creation-label">Izvēlies piedāvājuma tipu</span>
                  <span className="deal-creation-desc">Tālāk izvēlēsities piedāvājuma nosacījumus.</span>
                  <select value={dealType} onChange={(e) => setDealType(e.target.value)}>
                    <option value="free_item">Bezmaksas</option>
                    <option value="percentage_off">Procentu atlaide</option>
                  </select>
                </label>

                {dealType === 'percentage_off' && (
                  <label className="deal-field deal-field-narrow">
                    <span>Atlaide %</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      required
                    />
                  </label>
                )}
              </div>
            </>
          ) : createStep === 2 ? (
            <label className="deal-field">
              <span className="deal-creation-label">Kāds ir piedāvājums?</span>
              <span className="deal-creation-desc">Šis ir pirmais, ko Penny lietotāji redzēs skatoties piedāvājumu.</span>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Deserts ar 50% atlaidi"
                required
              />
              <span className="deal-creation-desc">Nosaukumam vajadzētu būt īsam un viegli saprotamam.</span>
            </label>
          ) : createStep === 3 ? (
            <>
              <div className="deal-field">
                <span className="deal-creation-label">Pievienojat attēlu</span>
                <span className="deal-creation-desc">Palīdzat lietotājiem vizualizēt tavu piedāvājumu.<br/>Faila izmērs limits - <b>5 MB</b></span>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {previewUrl && (
                  <img src={previewUrl} alt="Deal preview" className="deal-photo-preview" />
                )}
              </div>
            </>
          ) : createStep === 4 ? (
            <>
              <div className="deal-field">
                <span className="deal-creation-label">Aktīvie laiki</span>
                <span className="deal-creation-desc">Mēs automātiski pauzēsim piedāvājumu ārpus darba laika un norādītiem aktīviem laikiem.</span>
                <span>Aktīvās dienas</span>
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
                  <span>Sākas</span>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </label>
                <label className="deal-field">
                  <span>Beidzas</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </label>
              </div>
            </>
          ) : createStep === 5 ? (
            <div className="deal-confirmation">
              <label className="deal-confirmation-choice">
                <input
                  type="checkbox"
                  checked={confirmedDealDetails}
                  onChange={(e) => setConfirmedDealDetails(e.target.checked)}
                />
                <span className="deal-confirmation-title">
                  <svg className="deal-confirmation-leaf" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M20.8 3.2C12.1 3.2 5.7 5.1 4 10.5c-.9 2.8.8 5.4 3.5 5.4 5.8 0 9.8-5.7 13.3-12.7ZM3.4 21c2.3-5.2 6.6-8.8 12.1-11.8" />
                  </svg>
                  Pārtikas SOS
                </span>
              </label>
              <p className="deal-confirmation-description">
                Mēs varam palīdzēt samazināt pārtikas atriktumus dienas beigās. Tu apstiprini, ka piedāvājums ir īslaicīgs un pieejamā pārtika atbilst veselības standartiem.
              </p>
            </div>
          ) : (
            <div className="deal-review">
              {previewUrl && <img src={previewUrl} alt="" className="deal-review-image" />}
              <span className="deal-creation-label">Pārskats</span>
              <h3 className="deal-review-title">
                {itemName}
                {confirmedDealDetails && (
                  <span className="deal-food-sos-badge" title="Pārtikas SOS" aria-label="Pārtikas SOS">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M20.8 3.2C12.1 3.2 5.7 5.1 4 10.5c-.9 2.8.8 5.4 3.5 5.4 5.8 0 9.8-5.7 13.3-12.7ZM3.4 21c2.3-5.2 6.6-8.8 12.1-11.8" />
                    </svg>
                  </span>
                )}
              </h3>
              <dl>
                <div>
                  <dt>Tips</dt>
                  <dd>{dealType === 'percentage_off' ? `${discountPercent}% atlaide` : 'Bezmaksas'}</dd>
                </div>
                <div>
                  <dt>Aktīvās dienas</dt>
                  <dd>{WEEKDAYS.filter((day) => activeDays.includes(day.key)).map((day) => day.label).join(', ')}</dd>
                </div>
                <div>
                  <dt>Laiks</dt>
                  <dd>{startTime}–{endTime}</dd>
                </div>
              </dl>
            </div>
          )}

          {error && <div className="deal-form-error">{error}</div>}

          <div className="modal-actions">
            {!isEditing && createStep > 1 && (
              <button type="button" className="deal-wizard-back" onClick={() => setCreateStep((step) => step - 1)} disabled={saving || uploadingImage}>
                Atpakaļ
              </button>
            )}
            <button type="submit" className="primary-button" disabled={saving || uploadingImage}>
              {uploadingImage ? 'Augšupielādē...' : saving ? 'Saglabā...' : isEditing ? 'Saglabāt izmaiņas' : createStep < CREATE_STEPS.length ? 'Tālāk' : 'Izveidot piedāvājumu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
