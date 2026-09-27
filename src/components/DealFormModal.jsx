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
        : await supabase.from('deals').insert({ ...payload, rest_id: restaurantId, active: true })

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
        <h2 className="modal-title">{isEditing ? 'Rediģēt piedāvājumu' : 'Jauns piedāvājums'}</h2>

        <form onSubmit={handleSubmit} className="deal-form">
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

          {error && <div className="deal-form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>Atcelt</button>
            <button type="submit" className="primary-button" disabled={saving || uploadingImage}>
              {uploadingImage ? 'Augšupielādē...' : saving ? 'Saglabā...' : isEditing ? 'Saglabāt izmaiņas' : 'Izveidot piedāvājumu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
