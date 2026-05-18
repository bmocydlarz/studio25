"use client"

import { useState, useEffect } from 'react'
import { PRESTATIONS_PAR_CAT, getPrestationById, Categorie } from '@/lib/prestations'

const CONTACT_REQUIRED_IDS = ['balayage', 'couleur']

interface Slot {
  time: string;
  isAvailable: boolean;
}

interface AvailabilityRule {
  date: string;
  type: 'day_off' | 'partial';
  blocked_slots: string[];
}

export default function Home() {
  const [formData, setFormData] = useState({ prenom: '', nom: '', phone: '' })
  const [categorie, setCategorie] = useState<Categorie | null>(null)
  const [serviceId, setServiceId] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('')

  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [availabilityRules, setAvailabilityRules] = useState<Record<string, AvailabilityRule>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showContactWarning, setShowContactWarning] = useState(false)

  const currentService = serviceId ? getPrestationById(serviceId) : null
  const currentDuration = currentService?.duree || 0
  const needsContact = serviceId ? CONTACT_REQUIRED_IDS.includes(serviceId) : false

  const today = new Date()
  const maxDate = new Date(today)
  maxDate.setMonth(maxDate.getMonth() + 1)
  const maxDateStr = maxDate.toISOString().split('T')[0]
  const minDateStr = today.toISOString().split('T')[0]

  useEffect(() => {
    const fetchAvailability = async () => {
      const months = [
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}`
      ]
      const uniqueMonths = Array.from(new Set(months))
      const allRules: Record<string, AvailabilityRule> = {}
      await Promise.all(uniqueMonths.map(async (month) => {
        try {
          const res = await fetch(`/api/availability?month=${month}`)
          if (res.ok) {
            const json = await res.json()
            ;(json.rules || []).forEach((rule: AvailabilityRule) => {
              allRules[rule.date] = rule
            })
          }
        } catch {}
      }))
      setAvailabilityRules(allRules)
    }
    fetchAvailability()
  }, [])

  useEffect(() => {
    if (!date) return
    setTime('')
    setBookedSlots([])
    fetch(`/api/rdv/slots/${date}?t=${new Date().getTime()}`)
      .then(res => res.json())
      .then(data => setBookedSlots(data.booked || []))
      .catch(err => console.error("Erreur récup slots:", err))
  }, [date])

  const generateSlots = (): Slot[] => {
    if (!date) return []

    const [y, mo, d] = date.split('-').map(Number)
    const dayOfWeek = new Date(y, mo - 1, d).getDay()

    // Dimanche fermé
    if (dayOfWeek === 0) return []

    // Génération de tous les slots de la journée
    const endMinutes = dayOfWeek === 6 ? 14 * 60 : 18 * 60 + 30
    const allTimes: string[] = []
    for (let m = 9 * 60; m < endMinutes; m += 30) {
     const h = Math.floor(m / 60)
     const min = m % 60
     allTimes.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }

    const rule = availabilityRules[date]
    const adminBlockedSlots = rule?.type === 'day_off'
      ? allTimes
      : (rule?.blocked_slots || [])

    const blocksNeeded = Math.ceil(currentDuration / 30) || 1

    // Fonction utilitaire : est-ce qu'un slot à l'index i est disponible ?
    const isSlotAvailable = (i: number): boolean => {
      if (i + blocksNeeded > allTimes.length) return false
      for (let b = 0; b < blocksNeeded; b++) {
        const t = allTimes[i + b]
        if (bookedSlots.includes(t) || adminBlockedSlots.includes(t)) return false
      }
      return true
    }

    // Tous les jours (samedi inclus) : on retourne tous les créneaux
    return allTimes.map((t, i) => ({ time: t, isAvailable: isSlotAvailable(i) }))
  }

  const isDayOff = (dateStr: string) => {
    return availabilityRules[dateStr]?.type === 'day_off'
  }

  const handleServiceSelect = (id: string) => {
    setServiceId(id)
    setDate('')
    setTime('')
    if (CONTACT_REQUIRED_IDS.includes(id)) {
      setShowContactWarning(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...formData,
      service_id: serviceId,
      date,
      time,
      service_nom: currentService?.nom,
      categorie,
      prix: currentService?.prix,
      duree: currentService?.duree
    }
    try {
      const res = await fetch('/api/rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setSuccess(true)
        setFormData({ prenom: '', nom: '', phone: '' })
        setCategorie(null); setServiceId(''); setDate(''); setTime('')
      } else {
        const err = await res.json()
        alert(`Erreur : ${err.error}`)
      }
    } catch {
      alert("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.prenom && formData.nom && formData.phone && serviceId && date && time && !needsContact

  return (
    <>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className={`modal-overlay ${success ? 'active' : ''}`}>
        <div className="modal-box glass">
          <div className="modal-check">✅</div>
          <h3 className="serif">Rendez-vous confirmé !</h3>
          <p>Merci pour votre réservation. À très vite !</p>
          <button className="modal-close" onClick={() => setSuccess(false)}>Parfait, merci !</button>
        </div>
      </div>

      <div className={`modal-overlay ${showContactWarning ? 'active' : ''}`}>
        <div className="modal-box glass" style={{ maxWidth: '420px' }}>
          <div className="modal-check">📞</div>
          <h3 className="serif">Contact préalable requis</h3>
          <p style={{ marginBottom: '12px' }}>
            Pour le <strong>{currentService?.nom}</strong>, la durée et le matériel dépendent de ton projet.
            Je dois d'abord en discuter avec toi avant de valider le rendez-vous.
          </p>
          <p style={{ marginBottom: '24px', fontSize: '0.9rem', opacity: 0.75 }}>
            Appelle-moi pour qu'on échange sur ton projet et que je puisse vérifier si j'ai tout le matériel en stock.
            On fixe ensuite le créneau ensemble !
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href="tel:0760462731"
              className="btn-submit"
              style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
              onClick={() => setShowContactWarning(false)}
            >
              📞 M'appeler au 07.60.46.27.31
            </a>
            <button
              className="modal-close"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={() => { setShowContactWarning(false); setServiceId('') }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>

      <nav className="glass">
        <a href="#" className="logo serif">Studiio<em>.25</em></a>
        <div className="nav-links">
          <a href="#instagram">Créations</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#reservation" className="btn-nav">Réserver</a>
        </div>
      </nav>

      <header>
        <div className="hero-eyebrow"><span></span> Professionnelle certifiée · Quesnoy-sur-Deûle</div>
        <h1>Beauté & <em>confiance<br/>en toi</em></h1>
        <p>Coiffure, Onglerie et Regard. Un moment rien que pour soi, par une professionnelle diplômée et passionnée.</p>
        <div className="badges">
          <div className="badge">📍 Quesnoy-sur-Deûle</div>
          <div className="badge">📞 07.60.46.27.31</div>
          <div className="badge">✨ Certifiée & Diplômée</div>
        </div>
      </header>

      <section id="instagram">
        <div className="section-label">Portfolio</div>
        <h2 className="section-title">Mon <em>Univers</em></h2>
        <p className="section-sub">Découvre mes dernières créations ✨</p>
        <div className="ig-grid">
          <div className="ig-card"><iframe src="https://www.instagram.com/p/DHrH71SMkTm/embed" height="450" frameBorder="0" scrolling="no"></iframe></div>
          <div className="ig-card"><iframe src="https://www.instagram.com/p/DWhFvJ9iMpk/embed" height="450" frameBorder="0" scrolling="no"></iframe></div>
          <div className="ig-card"><iframe src="https://www.instagram.com/p/DUtPGm2iJPT/embed/" height="450" frameBorder="0" scrolling="no"></iframe></div>
        </div>
      </section>

      <section id="tarifs">
        <div className="section-label">Prestations</div>
        <h2 className="section-title">La Carte des <em>Soins</em></h2>
        <p className="section-sub">Des prestations sur-mesure pour sublimer ton naturel 🤎</p>
        <div className="tarifs-grid">
          <div className="tarif-card glass">
            <div className="tarif-head">
              <div className="tarif-icon">💅</div>
              <h3>Onglerie</h3>
            </div>
            <div className="tarif-item"><span className="name">Manucure</span><span className="price">20 €</span></div>
            <div className="tarif-item"><span className="name">Semi Permanent</span><span className="price">25 €</span></div>
            <div className="tarif-item"><span className="name">Gainage / Renfort</span><span className="price">30 €</span></div>
            <div className="tarif-item"><span className="name">Gel-X</span><span className="price">40 €</span></div>
            <div className="tarif-item"><span className="name">Capsule Gel</span><span className="price">45 €</span></div>
          </div>

          <div className="tarif-card glass">
            <div className="tarif-head">
              <div className="tarif-icon">👁️</div>
              <h3>Cils</h3>
            </div>
            <div className="tarif-item"><span className="name">Réhaussement Cils</span><span className="price">30 €</span></div>
            <div className="tarif-item"><span className="name">Cils à cils</span><span className="price">40 €</span></div>
            <div className="tarif-item"><span className="name">Mixte léger</span><span className="price">45 €</span></div>
            <div className="tarif-item"><span className="name">Mixte Intense</span><span className="price">50 €</span></div>
            <div className="tarif-item"><span className="name">Volume Russe</span><span className="price">55 €</span></div>
          </div>

          <div className="tarif-card glass">
            <div className="tarif-head">
              <div className="tarif-icon">✂️</div>
              <h3>Coiffure</h3>
            </div>
            <div className="tarif-item"><span className="name">Coupe brushing</span><span className="price">30 €</span></div>
            <div className="tarif-item"><span className="name">Brushing</span><span className="price">20 €</span></div>
            <div className="tarif-item">
              <span className="name">Balayage</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="price">dès 75 €</span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(255,160,100,0.15)', color: '#ff9955', border: '1px solid rgba(255,160,100,0.3)', borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap' }}>📞 Sur devis</span>
              </span>
            </div>
            <div className="tarif-item">
              <span className="name">Couleur</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="price">dès 60 €</span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(255,160,100,0.15)', color: '#ff9955', border: '1px solid rgba(255,160,100,0.3)', borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap' }}>📞 Sur devis</span>
              </span>
            </div>
            <div className="tarif-item" style={{ marginTop: '10px' }}><span className="name">Coupe Homme</span><span className="price">18 €</span></div>
          </div>
        </div>
      </section>

      <section id="reservation">
        <div className="section-label">Agenda</div>
        <h2 className="section-title">Prendre <em>Rendez-vous</em></h2>
        <div className="booking-wrap glass">
          <form onSubmit={handleSubmit}>
            <div className="booking-step">
              <div className="step-head"><div className="step-num">1</div> Tes coordonnées</div>
              <div className="client-fields">
                <div className="field-group"><label>Prénom</label><input type="text" value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} required /></div>
                <div className="field-group"><label>Nom</label><input type="text" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} required /></div>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}><label>Téléphone</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required /></div>
              </div>
            </div>

            <div className="booking-step">
              <div className="step-head"><div className="step-num">2</div> L'Univers</div>
              <div className="choice-grid">
                {(['onglerie', 'cils', 'coiffure'] as Categorie[]).map(cat => (
                  <div key={cat} className={`choice-card ${categorie === cat ? 'selected' : ''}`} onClick={() => { setCategorie(cat); setServiceId(''); setDate(''); setTime('') }}>
                    <div className="title" style={{ textTransform: 'capitalize' }}>{cat}</div>
                  </div>
                ))}
              </div>
            </div>

            {categorie && (
              <div className="booking-step">
                <div className="step-head"><div className="step-num">3</div> La Prestation</div>
                <div className="choice-grid">
                  {PRESTATIONS_PAR_CAT[categorie].map(s => {
                    const requiresContact = CONTACT_REQUIRED_IDS.includes(s.id)
                    return (
                      <div
                        key={s.id}
                        className={`choice-card ${serviceId === s.id ? 'selected' : ''} ${requiresContact ? 'contact-required' : ''}`}
                        onClick={() => handleServiceSelect(s.id)}
                      >
                        <div className="title">{s.nom}</div>
                        {requiresContact
                          ? <div className="duration" style={{ color: '#ff9955' }}>📞 Appel requis</div>
                          : <div className="duration">⏱ {s.duree} min</div>
                        }
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {serviceId && !needsContact && (
              <div className="booking-step">
                <div className="step-head"><div className="step-num">4</div> Le Moment Parfait</div>

                <input
                  type="date"
                  value={date}
                  min={minDateStr}
                  max={maxDateStr}
                  onChange={e => setDate(e.target.value)}
                  required
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                />

                {date && isDayOff(date) && (
                  <div className="off-day-alert">
                    <div className="off-day-icon">🗓️</div>
                    <div className="off-day-text">
                      <strong>Indisponible</strong>
                      <span>Je ne suis pas disponible ce jour-là. Choisis une autre date ! 🤎</span>
                    </div>
                  </div>
                )}

                {date && !isDayOff(date) && (
                  <div className="slots-wrap">
                    <div className="slots-grid">
                      {generateSlots().map(slot => (
                        <div
                          key={slot.time}
                          className={`slot ${!slot.isAvailable ? 'booked' : ''} ${time === slot.time ? 'selected' : ''}`}
                          onClick={() => slot.isAvailable && setTime(slot.time)}
                        >
                          {slot.time}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {serviceId && needsContact && (
              <div className="booking-step">
                <div className="step-head"><div className="step-num">4</div> Prise de contact</div>
                <div className="contact-call-box">
                  <div className="call-icon">📞</div>
                  <div className="call-text">
                    <strong>Contact préalable obligatoire</strong>
                    <p>Pour un <strong>{currentService?.nom}</strong>, la durée dépend de ton projet. Appelle-moi d'abord !</p>
                  </div>
                  <a href="tel:0760462731" className="btn-call-action">Appeler le 07.60.46.27.31</a>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`btn-submit ${loading ? 'loading' : ''}`}
              disabled={!isFormValid || loading}
            >
              <span className="btn-text">Confirmer mon rendez-vous</span>
              <span className="btn-loader">Envoi en cours…</span>
            </button>
          </form>
        </div>
      </section>

      <footer>
        <p>Studiio.25 🤎 · Quesnoy-sur-Deûle</p>
      </footer>

      <style jsx>{`
        .client-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .field-group label { display: block; font-size: 0.8rem; margin-bottom: 5px; opacity: 0.7; font-weight: 600; }
        .field-group input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); outline: none; }

        .off-day-alert {
          display: flex; align-items: center; gap: 15px; margin-top: 20px; padding: 15px 20px;
          background: rgba(186, 124, 102, 0.1); border: 1px solid rgba(186, 124, 102, 0.2);
          border-radius: 14px; animation: fadeIn 0.3s ease;
        }
        .off-day-text { display: flex; flex-direction: column; font-size: 0.9rem; color: #4a3f35; text-align: left; }
        .off-day-text strong { color: #ba7c66; text-transform: uppercase; font-size: 0.75rem; margin-bottom: 2px; }
        .off-day-icon { font-size: 1.5rem; }

        .contact-call-box { background: rgba(186, 124, 102, 0.08); border: 1px solid rgba(186, 124, 102, 0.3); padding: 25px; border-radius: 20px; text-align: center; }
        .call-icon { font-size: 2.5rem; margin-bottom: 10px; }
        .call-text strong { display: block; color: #ba7c66; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .btn-call-action { display: inline-block; background: #ba7c66; color: white; padding: 12px 25px; border-radius: 12px; text-decoration: none; font-weight: 700; margin-top: 15px; }
        /* Force l'input date à rester propre et responsive */
input[type="date"] {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  -webkit-appearance: none; /* Supprime des styles forcés sur iOS */
  min-height: 45px; /* Aligne une hauteur confortable pour le clic mobile */
}

/* Optionnel : Si ta grille de slots (.slots-grid) déborde elle aussi sur mobile */
.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); 
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.slots-wrap {
  width: 100%;
  overflow-x: hidden; /* Sécurité anti-débordement horizontal */
}

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
      `}</style>
    </>
  )
}
