// app/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { PRESTATIONS_PAR_CAT, getPrestationById, Categorie } from '@/lib/prestations'

export default function Home() {
  const [formData, setFormData] = useState({ prenom: '', nom: '', phone: '' })
  const [categorie, setCategorie] = useState<Categorie | null>(null)
  const [serviceId, setServiceId] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('')
  
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Calcule la durée actuelle
  const currentDuration = serviceId ? getPrestationById(serviceId)?.duree || 0 : 0

  // Génération des créneaux de 9h à 18h
  const generateSlots = () => {
    const slots = []
    const blocksNeeded = Math.ceil(currentDuration / 30)
    const allTimes: string[] = []
    
    // On génère la liste de tous les créneaux possibles en texte
    for (let h = 9; h < 18; h++) {
      allTimes.push(`${String(h).padStart(2, '0')}:00`)
      allTimes.push(`${String(h).padStart(2, '0')}:30`)
    }

    allTimes.forEach((t, i) => {
      let isAvailable = (i + blocksNeeded <= allTimes.length)
      
      if (isAvailable) {
        // On vérifie si l'un des blocs nécessaires est déjà dans bookedSlots
        for (let b = 0; b < blocksNeeded; b++) {
          const slotToCheck = allTimes[i + b]
          // Comparaison stricte de texte pour éviter les bugs d'heure UTC/Locale
          if (bookedSlots.includes(slotToCheck)) {
            isAvailable = false
            break
          }
        }
      }
      slots.push({ time: t, isAvailable })
    })
    return slots
  }

  // Récupérer les créneaux bloqués quand la date change
  useEffect(() => {
    if (!date) return
    setTime('')
    
    // On force la récupération des données fraîches
    fetch(`/api/rdv/slots/${date}`)
      .then(res => res.json())
      .then(data => {
        // On s'assure que booked est bien un tableau de strings "HH:mm"
        setBookedSlots(data.booked || [])
      })
      .catch(console.error)
  }, [date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/rdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, service_id: serviceId, date, time })
    })

    if (res.ok) {
      setSuccess(true)
      setFormData({ prenom: '', nom: '', phone: '' })
      setCategorie(null)
      setServiceId('')
      setDate('')
      setTime('')
    } else {
      alert("Erreur lors de la réservation. Le créneau n'est peut-être plus disponible.")
    }
    setLoading(false)
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
            <div className="badge">📍 Sur place / À domicile (20 km)</div>
            <div className="badge">📞 07.60.46.27.31</div>
            <div className="badge">✨ Certifiée & Diplômée</div>
        </div>
      </header>

      <section id="instagram" className="visible">
          <div className="section-label">Portfolio</div>
          <h2 className="section-title">Mon Univers</h2>
          <p className="section-sub">Découvre mes dernières créations ✨</p>
          <div className="ig-grid">
              <div className="ig-card"><iframe src="https://www.instagram.com/p/DHrH71SMkTm/embed" height="450" frameBorder="0" scrolling="no" allowtransparency="true"></iframe></div>
              <div className="ig-card"><iframe src="https://www.instagram.com/p/DWhFvJ9iMpk/embed" height="450" frameBorder="0" scrolling="no" allowtransparency="true"></iframe></div>
              <div className="ig-card"><iframe src="https://www.instagram.com/p/DUtPGm2iJPT/embed/" height="450" frameBorder="0" scrolling="no" allowtransparency="true"></iframe></div>
          </div>
      </section>

      <section id="tarifs" className="visible">
          <div className="section-label">Prestations</div>
          <h2 className="section-title">La Carte des Soins</h2>
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
                  <p className="tarif-note">Remplissage 3–4 semaines : 35 € · 5 semaines : 40 €</p>
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
                  <div className="tarif-item"><span className="name">Balayage*</span><span className="price">dès 75 €</span></div>
                  <div className="tarif-item"><span className="name">Couleur*</span><span className="price">dès 60 €</span></div>
                  <div className="tarif-item"><span className="name">Coupe Homme</span><span className="price">18 €</span></div>
                  <p className="tarif-note">*Forfaits incluant shampoing, soin & brushing</p>
              </div>
          </div>
      </section>

      <section id="reservation" className="visible">
        <div className="section-label">Agenda</div>
        <h2 className="section-title">Prendre Rendez-vous</h2>
        <p className="section-sub">Choisis ton soin, ton moment, et c'est tout — je m'occupe du reste.</p>
        
        <div className="booking-wrap glass">
          <form onSubmit={handleSubmit} noValidate>
            
            <div className="booking-step">
              <div className="step-head"><div className="step-num">1</div> Tes coordonnées</div>
              <div className="client-fields">
                <div className="field-group">
                  <label>Prénom *</label>
                  <input type="text" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} required />
                </div>
                <div className="field-group">
                  <label>Nom *</label>
                  <input type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required />
                </div>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Téléphone *</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                </div>
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
                <input 
                  type="date" 
                  value={date} 
                  min={new Date().toISOString().split('T')[0]} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                />
                
                {date && (
                  <div className="slots-wrap">
                    <p className="slots-label">Créneaux disponibles</p>
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

            <button type="submit" className={`btn-submit ${loading ? 'loading' : ''}`} disabled={!isFormValid || loading}>
              <span className="btn-text">Confirmer mon rendez-vous</span>
              <span className="btn-loader">⏳ Envoi en cours…</span>
            </button>

          </form>
        </div>
      </section>

      <footer>
          <p>Studiio.25 🤎 · <a href="tel:0760462731" style={{color: 'var(--terra)', textDecoration: 'none'}}>07.60.46.27.31</a> · Quesnoy-sur-Deûle</p>
          <p style={{marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-soft)'}}>© 2026 Studiio.25 — Tous droits réservés</p>
      </footer>
    </>
  )
}