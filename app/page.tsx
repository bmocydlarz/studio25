"use client"

import { useState, useEffect } from 'react'
import { PRESTATIONS_PAR_CAT, getPrestationById, Categorie } from '@/lib/prestations'

interface Slot {
  time: string;
  isAvailable: boolean;
}

export default function Home() {
  const [formData, setFormData] = useState({ prenom: '', nom: '', phone: '' })
  const [categorie, setCategorie] = useState<Categorie | null>(null)
  const [serviceId, setServiceId] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('')
  
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const currentService = serviceId ? getPrestationById(serviceId) : null
  const currentDuration = currentService?.duree || 0

  const generateSlots = () => {
    const slots: Slot[] = []
    const blocksNeeded = Math.ceil(currentDuration / 30)
    const allTimes: string[] = []
    
    for (let h = 9; h < 18; h++) {
      allTimes.push(`${String(h).padStart(2, '0')}:00`)
      allTimes.push(`${String(h).padStart(2, '0')}:30`)
    }

    allTimes.forEach((t, i) => {
      let isAvailable = (i + blocksNeeded <= allTimes.length)
      if (isAvailable) {
        for (let b = 0; b < blocksNeeded; b++) {
          if (bookedSlots.includes(allTimes[i + b])) {
            isAvailable = false
            break
          }
        }
      }
      slots.push({ time: t, isAvailable })
    })
    return slots
  }

  useEffect(() => {
    if (!date) return
    setTime('')
    fetch(`/api/rdv/slots/${date}`)
      .then(res => res.json())
      .then(data => setBookedSlots(data.booked || []))
      .catch(console.error)
  }, [date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // On envoie TOUTES les infos pour satisfaire les contraintes Not Null de Supabase
    const payload = {
      ...formData,
      service_id: serviceId,
      date,
      time,
      service_nom: currentService?.nom,
      categorie: categorie,
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
        setCategorie(null); setServiceId(''); setDate(''); setTime('');
      } else {
        const errorData = await res.json()
        alert(`Erreur : ${errorData.error}`)
      }
    } catch (err) {
      alert("Erreur de connexion au serveur.")
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.prenom && formData.nom && formData.phone && serviceId && date && time

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

      <section id="reservation">
        <div className="section-label">Agenda</div>
        <h2 className="section-title">Prendre Rendez-vous</h2>
        <div className="booking-wrap glass">
          <form onSubmit={handleSubmit}>
            <div className="booking-step">
              <div className="step-head"><div className="step-num">1</div> Tes coordonnées</div>
              <div className="client-fields">
                <div className="field-group"><label>Prénom</label><input type="text" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} required /></div>
                <div className="field-group"><label>Nom</label><input type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required /></div>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}><label>Téléphone</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required /></div>
              </div>
            </div>

            <div className="booking-step">
              <div className="step-head"><div className="step-num">2</div> L'Univers</div>
              <div className="choice-grid">
                {(['onglerie', 'cils', 'coiffure'] as Categorie[]).map(cat => (
                  <div key={cat} className={`choice-card ${categorie === cat ? 'selected' : ''}`} onClick={() => setCategorie(cat)}>
                    <div className="title" style={{textTransform: 'capitalize'}}>{cat}</div>
                  </div>
                ))}
              </div>
            </div>

            {categorie && (
              <div className="booking-step">
                <div className="step-head"><div className="step-num">3</div> La Prestation</div>
                <div className="choice-grid">
                  {PRESTATIONS_PAR_CAT[categorie].map(s => (
                    <div key={s.id} className={`choice-card ${serviceId === s.id ? 'selected' : ''}`} onClick={() => { setServiceId(s.id); setDate(''); setTime(''); }}>
                      <div className="title">{s.nom}</div>
                      <div className="duration">⏱ {s.duree} min</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {serviceId && (
              <div className="booking-step">
                <div className="step-head"><div className="step-num">4</div> Le Moment Parfait</div>
                <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} required />
                {date && (
                  <div className="slots-wrap">
                    <div className="slots-grid">
                      {generateSlots().map(slot => (
                        <div key={slot.time} className={`slot ${!slot.isAvailable ? 'booked' : ''} ${time === slot.time ? 'selected' : ''}`} onClick={() => slot.isAvailable && setTime(slot.time)}>{slot.time}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button type="submit" className={`btn-submit ${loading ? 'loading' : ''}`} disabled={!isFormValid || loading}>
              <span className="btn-text">Confirmer mon rendez-vous</span>
              <span className="btn-loader">Envoi en cours…</span>
            </button>
          </form>
        </div>
      </section>

      <footer><p>Studiio.25 🤎 · Quesnoy-sur-Deûle</p></footer>
    </>
  )
}