// app/admin/page.tsx
"use client"

import { useState, useEffect } from 'react'

type RDV = { id: string, time_start: string, prenom: string, nom: string, phone: string, service_nom: string, duree: number, categorie: string, prix: number }

export default function AdminAgenda() {
  const [currentMonday, setCurrentMonday] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  })
  
  const [rdvsData, setRdvsData] = useState<Record<string, RDV[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // FONCTION IDENTIQUE À LA PAGE ACCUEIL (Texte pur)
  const makeKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    const fetchWeek = async () => {
      const newData: Record<string, RDV[]> = {}
      
      // On crée les 7 clés de la semaine
      const datesToFetch = [0, 1, 2, 3, 4, 5, 6].map(i => {
        const d = new Date(currentMonday);
        d.setDate(currentMonday.getDate() + i);
        return makeKey(d);
      });

      // On lance les 7 requêtes
      await Promise.all(datesToFetch.map(async (dateKey) => {
        try {
          const res = await fetch(`/api/rdv?date=${dateKey}`);
          if (res.ok) {
            const json = await res.json();
            // Important : Ton API renvoie { rdvs: [...] }
            newData[dateKey] = json.rdvs || [];
          }
        } catch (err) {
          console.error(`Erreur pour la date ${dateKey}:`, err);
        }
      }));

      setRdvsData(newData);
    }
    fetchWeek();
  }, [currentMonday]);

  const changeWeek = (delta: number) => {
    const newMon = new Date(currentMonday)
    newMon.setDate(newMon.getDate() + delta * 7)
    setCurrentMonday(newMon)
    setSelectedDate(null)
  }

  const selectedKey = selectedDate ? makeKey(selectedDate) : ''
  const selectedRdvs = rdvsData[selectedKey] || []
  const totalMin = selectedRdvs.reduce((acc, r) => acc + r.duree, 0)
  const totalCA = selectedRdvs.reduce((acc, r) => acc + r.prix, 0)

  return (
    <>
      <header className="page-header">
        <div className="header-brand">
          <span className="header-logo">Studiio<em>.25</em></span>
          <span className="header-badge">Admin · Agenda</span>
        </div>
        <div className="header-right">
          <a href="/" className="btn-back">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8l4-4"/>
            </svg>
            Retour au site
          </a>
        </div>
      </header>

      <div className="week-toolbar">
        <div className="week-label">Semaine du <span>{currentMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></div>
        <div className="nav-week">
          <button className="btn-today" onClick={() => {
             const d = new Date();
             const day = d.getDay();
             const diff = d.getDate() - day + (day === 0 ? -6 : 1);
             setCurrentMonday(new Date(d.setDate(diff)));
             setSelectedDate(null);
          }}>Aujourd'hui</button>
          <button className="btn-nav-week" onClick={() => changeWeek(-1)}>←</button>
          <button className="btn-nav-week" onClick={() => changeWeek(1)}>→</button>
        </div>
      </div>

      <div className="week-grid-wrap">
        <div className="week-grid">
          {[0, 1, 2, 3, 4, 5, 6].map(i => {
            const d = new Date(currentMonday)
            d.setDate(currentMonday.getDate() + i)
            const key = makeKey(d)
            const dayRdvs = rdvsData[key] || []
            const isSelected = selectedKey === key

            return (
              <div key={key} className={`day-card ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedDate(d)}>
                <div className="day-header">
                  <div className="day-name">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                  <div className="day-num">{d.getDate()}</div>
                </div>
                <div className="day-body">
                  {dayRdvs.map(r => (
                    <div key={r.id} className={`mini-event ${r.categorie}`}>
                      <div className="ev-time">{r.time_start}</div>
                      <div className="ev-name">{r.prenom}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="detail-panel open">
          <div className="detail-card">
            <div className="detail-head">
              <div className="detail-title">Journée du <em>{selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</em></div>
              <button className="detail-close" onClick={() => setSelectedDate(null)}>✕</button>
            </div>
            <div className="detail-body">
              <div className="day-stats">
                <div className="stat-box"><div className="stat-label">RDV</div><div className="stat-value accent">{selectedRdvs.length}</div></div>
                <div className="stat-box"><div className="stat-label">Heures</div><div className="stat-value">{Math.floor(totalMin/60)}h{totalMin%60 || ''}</div></div>
                <div className="stat-box"><div className="stat-label">CA</div><div className="stat-value accent">{totalCA} €</div></div>
              </div>
              <div className="rdv-list">
                {selectedRdvs.map(r => (
                  <div key={r.id} className="rdv-item">
                    <div className={`rdv-stripe ${r.categorie}`}></div>
                    <div className="rdv-content">
                      <div className="rdv-time-block">
                        <div className="rdv-time">{r.time_start}</div>
                        <div className="rdv-duration">{r.duree} min</div>
                      </div>
                      <div className="rdv-info">
                        <div className="rdv-client">{r.prenom} {r.nom}</div>
                        <div className="rdv-service">{r.service_nom}</div>
                        <div className="rdv-phone">{r.phone}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}