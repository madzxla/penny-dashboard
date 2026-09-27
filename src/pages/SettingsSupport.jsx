import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const SUPPORT = [
  {
    question: 'Kā es varu kontaktēt jūs? Kas ir konta speciālists?',
    answer: 'Konta speciālists ir persona mūsu komandā, kas ir šeit, lai palīdzētu ar jebkādiem jautājumiem par Penny. Jums nav nepieciešams izmantot mūsu lietotnes palīdzības metodes, vienkārši aizsūtiet e-pastu vai SMS ziņu, vai arī zvanat mums.',
  },
  {
    question: 'Kāds ir darba laiks konta speciālistiem?',
    answer: 'Mūsu konta speciālisti ir pieejami darba dienās no 9:00 līdz 18:00. Mēs cenšamies atbildēt uz visiem jautājumiem pēc iespējas ātrāk, parasti 24 stundu laikā. Ir iespējams, ka atbildi varēsiet saņemt arī ārpus darba laika, bet tas nav garantēts.',
  },
  {
    question: 'Kādos veidos konta speciālisti var man palīdzēt?',
    answer: 'Konta speciālisti var palīdzēt ar jebkādiem jautājumiem par Penny, ieskaitot problēmu risināšanu, iestatījumu maiņu un citus jautājumus.',
  },
]

const BASICS = [
  {
    question: 'Kā Penny strādā un kā tas palīdz?',
    answer: 'Penny ir lietotne, kas ļauj restorāniem izveidot piedāvājumus (piem. 50% atlaide desertam) un nosūtīt tos lietotājiem tuvumā. Tas ir vienkāršs un lēts veids, kā nemaksāt par skatījumiem, bet īstiem klientiem.',
  },
  {
    question: 'Cik maksā izveidot piedāvājumus?',
    answer: 'Izveidot piedāvājumus ir bez maksas. Jūs maksājat tikai par apstiprinātiem klientiem, kuri verificē savu apmeklējumu ar īpašu kodu, ko parāda Jūsu darbiniekiem. Tas nozīmē, ka Jūs maksājat tikai par klientiem, kuri patiešām apmeklē Jūsu restorānu un izmanto piedāvājumu.',
  },
  {
    question: 'Vai Penny ir piemērots jebkura veida restorāniem?',
    answer: 'Jā, Penny ir piemērots jebkura veida restorāniem, neatkarīgi no to, vai tie ir mazi vai lieli, un neatkarīgi no to, vai tie piedāvā standarta vai ekskluzīvus ēdienus. Jūs varat izveidot jebkāda veida piedāvājumus, kas atbilst Jūsu restorāna stilam un klientu vajadzībām.',
  },
]

export default function SettingsSupport() {
  const { restaurant } = useAuth()
  const [manager, setManager] = useState(null)
  const [loading, setLoading] = useState(Boolean(restaurant?.manager_id))

  useEffect(() => {
    if (!restaurant?.manager) {
      setManager(null)
      setLoading(false)
      return
    }

    let active = true

    async function loadManager() {
      setLoading(true)
      const { data, error } = await supabase
        .from('managers')
        .select('full_name, position, phone, email')
        .eq('id', restaurant.manager)
        .maybeSingle()

      if (!active) return
      if (!error) setManager(data)
      setLoading(false)
    }

    loadManager()
    return () => { active = false }
  }, [restaurant?.manager])

  return (
    <div className="settings-support-panel" aria-label="Support settings">
      <div className="settings-support-header">
        <h1 className="page-title">Atbalsts</h1>
        <p className="page-subtitle">Jūsu konta speciālists palīdzēs ar jebkādiem jautājumiem par Penny. Redzat Jūsu speciālista kontakta informāciju šeit.</p>
      </div>

      {loading ? (
        <p className="settings-support-empty-state">Lūdzu uzgaidiet...</p>
      ) : manager ? (
        <div className="settings-support-card">
          <div className="settings-support-name-row">
            <div className="settings-support-avatar">{manager.full_name?.charAt(0)?.toUpperCase() ?? 'M'}</div>
            <div>
              <h3 className="settings-support-name">{manager.full_name}</h3>
              {manager.position && <p className="settings-support-position">{manager.position}</p>}
            </div>
          </div>

          <div className="settings-support-meta">
            {manager.phone && (
              <a href={`tel:${manager.phone}`} className="settings-support-link">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.76.61 2.59a2 2 0 0 1-.45 2.11L9 9.91a16 16 0 0 0 6.09 6.09l1.49-1.22a2 2 0 0 1 2.11-.45c.83.28 1.69.49 2.59.61A2 2 0 0 1 22 16.92Z" />
                </svg>
                +371 {manager.phone}
              </a>
            )}
            {manager.email && (
              <a href={`mailto:${manager.email}`} className="settings-support-link">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                {manager.email}
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className="settings-support-empty-state">Pašlaik nav piešķirts konta speciālists. Lūdzam pārbaudīt šo lapu vēlāk.</p>
      )}

      <section className="settings-faq" aria-label="Frequently asked questions">
        <h2 className="settings-section-title">Partneru atbalsts</h2>
        <div className="settings-faq-list">
          {SUPPORT.map(({ question, answer }) => (
            <details key={question} className="settings-faq-item">
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="settings-faq" aria-label="Frequently asked questions">
        <h2 className="settings-section-title">Penny pamati</h2>
        <div className="settings-faq-list">
          {BASICS.map(({ question, answer }) => (
            <details key={question} className="settings-faq-item">
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
