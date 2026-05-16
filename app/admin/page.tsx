"use client"

import { useState, useEffect } from 'react'

type RDV = { 
  id: string, 
  time_start: string, 
  prenom: string, 
  nom: string, 
  phone: string, 
  service_id?: string, 
  service_nom: string, 
  duree: number, 
  categorie: string, 
  prix: number 
}
type AvailabilityRule = { date: string, type: 'day_off' | 'partial', blocked_slots: string[] }
type AdminView = 'agenda' | 'disponibilites'

const ALL_SLOTS: string[] = []
for (let h = 9; h < 18; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2,'0')}:00`)
  ALL_SLOTS.push(`${String(h).padStart(2,'0')}:30`)
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function AdminAgenda() {
  const [view, setView] = useState<AdminView>('agenda')

  // ── AGENDA ──────────────────────────────────────────
  const [currentMonday, setCurrentMonday] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  })
  const [rdvsData, setRdvsData] = useState<Record<string, RDV[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [expandedRdv, setExpandedRdv] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── DISPONIBILITÉS ───────────────────────────────────
  const [dispMonth, setDispMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [availRules, setAvailRules] = useState<Record<string, AvailabilityRule>>({})
  const [selectedDispDate, setSelectedDispDate] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<'day_off' | 'partial' | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const makeKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const fetchWeek = async () => {
    const newData: Record<string, RDV[]> = {}
    const datesToFetch = [0, 1, 2, 3, 4, 5, 6].map(i => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      return makeKey(d);
    });
    await Promise.all(datesToFetch.map(async (dateKey) => {
      try {
        const res = await fetch(`/api/rdv?date=${dateKey}`);
        if (res.ok) {
          const json = await res.json();
          newData[dateKey] = json.rdvs || [];
        }
      } catch (err) { console.error(err); }
    }));
    setRdvsData(newData);
  }

  useEffect(() => {
    fetchWeek();
  }, [currentMonday]);

  useEffect(() => {
    const fetchAvailability = async () => {
      const monthsToFetch = new Set<string>()

      for (let i = 0; i <= 6; i++) {
        const d = new Date(currentMonday)
        d.setDate(d.getDate() + i)
        monthsToFetch.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }

      monthsToFetch.add(`${dispMonth.year}-${String(dispMonth.month + 1).padStart(2, '0')}`)

      const allRules: Record<string, AvailabilityRule> = {}
      await Promise.all(Array.from(monthsToFetch).map(async (monthStr) => {
        try {
          const res = await fetch(`/api/availability?month=${monthStr}`)
          if (res.ok) {
            const json = await res.json()
            ;(json.rules || []).forEach((r: AvailabilityRule) => { allRules[r.date] = r })
          }
        } catch {}
      }))
      setAvailRules(allRules)
    }
    fetchAvailability()
  }, [dispMonth, view, currentMonday])

  const changeWeek = (delta: number) => {
    const newMon = new Date(currentMonday)
    newMon.setDate(newMon.getDate() + delta * 7)
    setCurrentMonday(newMon)
    setSelectedDate(null)
  }

  // Suppression d'un RDV
  const deleteRdv = async (rdvId: string, dateKey: string, clientName: string) => {
    if (!confirm(`Supprimer définitivement le rendez-vous de ${clientName} ?`)) return
    
    setDeletingId(rdvId)
    try {
      const res = await fetch(`/api/rdv?id=${rdvId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        // Mise à jour de l'état local immédiat sans recharger toute la semaine
        setRdvsData(prev => ({
          ...prev,
          [dateKey]: (prev[dateKey] || []).filter(r => r.id !== rdvId)
        }))
        setExpandedRdv(null)
      } else {
        const err = await res.json()
        alert(`Erreur lors de la suppression : ${err.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      console.error(err)
      alert("Impossible de se connecter au serveur pour supprimer le rendez-vous.")
    } finally {
      setDeletingId(null)
    }
  }

  const selectedKey = selectedDate ? makeKey(selectedDate) : ''
  const selectedRdvs = rdvsData[selectedKey] || []
  const totalCA = selectedRdvs.reduce((acc, r) => acc + r.prix, 0)

  const getDaysInMonth = () => {
    const { year, month } = dispMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }

  const openDayEditor = (dateStr: string) => {
    setSelectedDispDate(dateStr)
    const existing = availRules[dateStr]
    if (existing) {
      setEditMode(existing.type)
      setSelectedSlots(existing.blocked_slots || [])
    } else {
      setEditMode(null)
      setSelectedSlots([])
    }
  }

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    )
  }

  const saveRule = async () => {
    if (!selectedDispDate) return
    setSaving(true)
    try {
      if (editMode === null) {
        await deleteRule(selectedDispDate, true)
      } else {
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDispDate,
            type: editMode,
            blocked_slots: editMode === 'day_off' ? [] : selectedSlots
          })
        })
        if (res.ok) {
          setAvailRules(prev => ({
            ...prev,
            [selectedDispDate]: { date: selectedDispDate, type: editMode!, blocked_slots: editMode === 'day_off' ? [] : selectedSlots }
          }))
        }
      }
      setSelectedDispDate(null)
    } finally { setSaving(false) }
  }

  const deleteRule = async (dateStr: string, silent = false) => {
    if (!silent && !confirm('Supprimer la règle ?')) return
    try {
      await fetch(`/api/availability?date=${dateStr}`, { method: 'DELETE' })
      setAvailRules(prev => {
        const copy = { ...prev }
        delete copy[dateStr]
        return copy
      })
    } catch {}
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="admin-container">
      <header className="page-header">
        <div className="header-brand">
          <span className="header-logo serif">Studiio<em>.25</em></span>
          <span className="header-badge">Admin</span>
        </div>
        <div className="header-right">
          <a href="/" className="btn-back">Retour au site</a>
        </div>
      </header>

      <div className="admin-tabs">
        <button className={`admin-tab ${view === 'agenda' ? 'active' : ''}`} onClick={() => setView('agenda')}>📅 Agenda</button>
        <button className={`admin-tab ${view === 'disponibilites' ? 'active' : ''}`} onClick={() => setView('disponibilites')}>🗓️ Dispos</button>
      </div>

      {view === 'agenda' && (
        <div className="admin-section">
          <div className="week-toolbar">
            <div className="week-label serif">Semaine du <span>{currentMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></div>
            <div className="nav-week">
              <button className="btn-today" onClick={() => {
                const d = new Date();
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                setCurrentMonday(new Date(d.setDate(diff)));
              }}>Auj.</button>
              <button className="btn-nav-week" onClick={() => changeWeek(-1)}>←</button>
              <button className="btn-nav-week" onClick={() => changeWeek(1)}>→</button>
            </div>
          </div>

          <div className="week-grid-wrapper">
            <div className="week-grid">
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const d = new Date(currentMonday)
                d.setDate(currentMonday.getDate() + i)
                const key = makeKey(d)
                const dayRdvs = rdvsData[key] || []
                const isSelected = selectedKey === key
                const rule = availRules[key]
                const isOff = rule?.type === 'day_off'

                return (
                  <div
                    key={key}
                    className={`day-card glass ${isSelected ? 'selected' : ''} ${isOff ? 'day-off-agenda' : ''}`}
                    onClick={() => { setSelectedDate(d); setExpandedRdv(null) }}
                  >
                    <div className="day-header">
                      <div className="day-name">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                      <div className="day-num serif">{d.getDate()}</div>
                      {isOff && <div className="day-off-label">OFF</div>}
                    </div>
                    <div className="day-body">
                      <div className="day-rdv-count">{dayRdvs.length} RDV</div>
                      {dayRdvs
                        .sort((a, b) => a.time_start.localeCompare(b.time_start))
                        .map(r => (
                          <div key={r.id} className={`mini-event ${r.categorie}`}>
                            <span className="ev-time">{r.time_start}</span>
                            <span className="ev-name">{r.prenom}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="detail-panel open" onClick={() => setSelectedDate(null)}>
              <div className="detail-card glass" onClick={e => e.stopPropagation()}>
                <div className="detail-head">
                  <div className="detail-title serif">
                    {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', weekday: 'long' })}
                  </div>
                  <button className="detail-close" onClick={() => setSelectedDate(null)}>✕</button>
                </div>
                <div className="day-stats">
                  <div className="stat-box">
                    <div className="stat-label">RDV</div>
                    <div className="stat-value">{selectedRdvs.length}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">CA Prévu</div>
                    <div className="stat-value">{totalCA} €</div>
                  </div>
                </div>
                <div className="rdv-list">
                  {selectedRdvs.length === 0 && <p className="empty-msg">Aucun rendez-vous sur cette journée</p>}
                  {selectedRdvs
                    .sort((a, b) => a.time_start.localeCompare(b.time_start))
                    .map(r => (
                      <div
                        key={r.id}
                        className={`rdv-item ${expandedRdv === r.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedRdv(expandedRdv === r.id ? null : r.id)}
                      >
                        <div className="rdv-main-row">
                          <div className="rdv-time-col">
                            <div className="rdv-time">{r.time_start}</div>
                            <div className="rdv-duree">{r.duree} min</div>
                          </div>
                          <div className="rdv-info">
                            <div className="rdv-client">👤 {r.prenom} {r.nom.toUpperCase()}</div>
                            <div className="rdv-service">✂️ {r.service_nom}</div>
                          </div>
                          <div className="rdv-right-col">
                            <span className="rdv-prix">{r.prix} €</span>
                            <div className="rdv-chevron">{expandedRdv === r.id ? '▲' : '▼'}</div>
                          </div>
                        </div>
                        
                        {expandedRdv === r.id && (
                          <div className="rdv-expanded-details animate-fade">
                            <hr className="rdv-divider" />
                            <div className="rdv-grid-details">
                              <div className="rdv-detail-row">
                                <span className="label">Client :</span>
                                <span className="value">{r.prenom} {r.nom}</span>
                              </div>
                              <div className="rdv-detail-row">
                                <span className="label">Téléphone :</span>
                                <a href={`tel:${r.phone}`} className="rdv-phone value" onClick={e => e.stopPropagation()}>
                                  📞 {r.phone}
                                </a>
                              </div>
                              <div className="rdv-detail-row">
                                <span className="label">Prestation :</span>
                                <span className="value">{r.service_nom} ({r.duree} min)</span>
                              </div>
                              <div className="rdv-detail-row">
                                <span className="label">Catégorie :</span>
                                <span className="rdv-cat">{r.categorie}</span>
                              </div>
                              <div className="rdv-detail-row">
                                <span className="label">Tarif appliqué :</span>
                                <span className="value font-bold">{r.prix} €</span>
                              </div>
                              {r.service_id && (
                                <div className="rdv-detail-row text-xs opacity-50">
                                  <span className="label">ID Technique :</span>
                                  <span className="value">{r.service_id}</span>
                                </div>
                              )}
                            </div>

                            {/* Zone d'action : Suppression de rendez-vous */}
                            <div className="rdv-actions-wrapper">
                              <button 
                                className="btn-delete-rdv"
                                disabled={deletingId === r.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRdv(r.id, selectedKey, `${r.prenom} ${r.nom}`);
                                }}
                              >
                                {deletingId === r.id ? 'Suppression...' : '🗑️ Annuler ce rendez-vous'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'disponibilites' && (
        <div className="admin-section">
          <div className="week-toolbar">
            <div className="week-label serif">{MONTHS_FR[dispMonth.month]} {dispMonth.year}</div>
            <div className="nav-week">
              <button className="btn-nav-week" onClick={() => setDispMonth(prev => prev.month === 0 ? {year: prev.year-1, month: 11} : {year: prev.year, month: prev.month-1})}>←</button>
              <button className="btn-nav-week" onClick={() => setDispMonth(prev => prev.month === 11 ? {year: prev.year+1, month: 0} : {year: prev.year, month: prev.month+1})}>→</button>
            </div>
          </div>

          <div className="cal-grid">
            {DAYS_FR.map(d => <div key={d} className="cal-day-name">{d}</div>)}
            {getDaysInMonth().map((d, i) => {
              if (!d) return <div key={`empty-${i}`} className="cal-cell empty" />
              const key = makeKey(d)
              const rule = availRules[key]
              return (
                <div
                  key={key}
                  className={`cal-cell glass ${rule?.type || ''} ${d < today ? 'past' : ''}`}
                  onClick={() => d >= today && openDayEditor(key)}
                >
                  <div className="cal-day-num">{d.getDate()}</div>
                  {rule?.type === 'day_off' && <div className="cal-badge off">OFF</div>}
                  {rule?.type === 'partial' && <div className="cal-badge partial">Partiel</div>}
                </div>
              )
            })}
          </div>

          {selectedDispDate && (
            <div className="detail-panel open" onClick={() => setSelectedDispDate(null)}>
              <div className="detail-card glass modal-mobile" onClick={e => e.stopPropagation()}>
                <div className="detail-head">
                  <div className="detail-title serif">Modifier le {new Date(selectedDispDate).toLocaleDateString('fr-FR', {day:'numeric', month:'short'})}</div>
                  <button className="detail-close" onClick={() => setSelectedDispDate(null)}>✕</button>
                </div>
                <div className="choice-grid" style={{marginBottom: '20px'}}>
                  <button className={`choice-card ${editMode === null ? 'selected' : ''}`} onClick={() => setEditMode(null)}>Ouvert</button>
                  <button className={`choice-card ${editMode === 'day_off' ? 'selected' : ''}`} onClick={() => setEditMode('day_off')}>Jour OFF</button>
                  <button className={`choice-card ${editMode === 'partial' ? 'selected' : ''}`} onClick={() => setEditMode('partial')}>Partiel</button>
                </div>

                {editMode === 'partial' && (
                  <>
                    <p className="slots-helper-text">Sélectionne les créneaux à <strong>bloquer</strong> :</p>
                    <div className="slots-grid" style={{maxHeight: '180px', overflowY: 'auto', marginBottom: '20px'}}>
                      {ALL_SLOTS.map(s => (
                        <div key={s} className={`slot ${selectedSlots.includes(s) ? 'selected' : ''}`} onClick={() => toggleSlot(s)}>{s}</div>
                      ))}
                    </div>
                  </>
                )}
                <button className="btn-submit" onClick={saveRule} disabled={saving}>
                  {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .admin-container { max-width: 1200px; margin: 0 auto; min-height: 100vh; background: #faf8f6; }
        .page-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: white; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .header-brand { display: flex; align-items: center; gap: 10px; }
        .header-logo { font-size: 1.4rem; font-weight: bold; color: #333; }
        .header-badge { background: #ba7c66; color: white; font-size: 0.75rem; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
        .btn-back { font-size: 0.85rem; color: #ba7c66; text-decoration: none; border: 1px solid #ba7c66; padding: 6px 12px; border-radius: 8px; transition: 0.2s; }
        .btn-back:hover { background: #ba7c66; color: white; }

        .admin-section { padding: 15px; }
        .admin-tabs { display: flex; gap: 5px; padding: 10px 15px 0; border-bottom: 1px solid rgba(0,0,0,0.05); background: white; }
        .admin-tab { padding: 12px 20px; border: none; background: none; cursor: pointer; opacity: 0.6; font-weight: 600; color: inherit; font-size: 0.95rem; }
        .admin-tab.active { opacity: 1; border-bottom: 3px solid #ba7c66; color: #ba7c66; }

        /* Grille semaine responsive scroll */
        .week-grid-wrapper { width: 100%; overflow-x: auto; padding-bottom: 10px; margin-top: 15px; scrolling-behavior: smooth; -webkit-overflow-scrolling: touch; }
        .week-grid { display: grid; grid-template-columns: repeat(7, 140px); gap: 10px; }
        @media (min-width: 992px) {
          .week-grid { grid-template-columns: repeat(7, 1fr); }
        }

        .day-card { padding: 12px; min-height: 140px; cursor: pointer; border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; transition: 0.2s; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .day-card.selected { border-color: #ba7c66; background: rgba(186, 124, 102, 0.03); box-shadow: 0 0 0 1px #ba7c66; }
        .day-card.day-off-agenda { background: #f3f3f3 !important; opacity: 0.7; border: 1px dashed rgba(0,0,0,0.15); }
        .day-off-label { font-size: 0.6rem; font-weight: 800; color: #dc2626; background: rgba(220, 38, 38, 0.1); padding: 1px 4px; border-radius: 4px; margin-top: 2px; text-align: center; }
        .day-rdv-count { font-size: 0.75rem; font-weight: bold; color: #666; margin-bottom: 6px; text-align: center; background: rgba(0,0,0,0.03); padding: 2px; border-radius: 4px;}

        .day-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.04); padding-bottom: 4px; }
        .day-name { font-size: 0.75rem; text-transform: uppercase; opacity: 0.5; }
        .day-num { font-size: 1.25rem; font-weight: bold; }

        .mini-event { font-size: 0.65rem; padding: 3px 5px; border-radius: 4px; background: #fff; border-left: 3px solid #ba7c66; margin-bottom: 4px; display: flex; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ev-time { font-weight: bold; color: #ba7c66; margin-right: 3px; }
        .ev-name { overflow: hidden; text-overflow: ellipsis; }

        /* Calendrier Mensuel */
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 15px; }
        .cal-day-name { text-align: center; font-size: 0.75rem; opacity: 0.6; padding-bottom: 5px; font-weight: bold; }
        .cal-cell { min-height: 65px; padding: 6px; cursor: pointer; position: relative; border-radius: 8px; border: 1px solid rgba(0,0,0,0.04); background: white; display: flex; flex-direction: column; justify-content: space-between; }
        .cal-cell.empty { background: transparent; border: none; cursor: default; }
        .cal-cell.past { opacity: 0.25; cursor: default; background: #eee; }
        .cal-cell.day_off { background: rgba(220, 38, 38, 0.04); border-color: rgba(220, 38, 38, 0.1); }
        .cal-cell.partial { background: rgba(217, 119, 6, 0.04); border-color: rgba(217, 119, 6, 0.1); }
        .cal-day-num { font-size: 0.9rem; font-weight: 600; }
        .cal-badge { font-size: 0.6rem; padding: 1px 3px; border-radius: 4px; text-align: center; font-weight: bold; width: 100%; }
        .cal-badge.off { background: #fee2e2; color: #dc2626; }
        .cal-badge.partial { background: #fef3c7; color: #d97706; }

        /* Modales */
        .detail-panel { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease-out; }
        .detail-card { width: 100%; max-width: 550px; max-height: 85vh; padding: 20px; background: white; color: #333; border-top-left-radius: 24px; border-top-right-radius: 24px; overflow-y: auto; box-shadow: 0 -10px 25px rgba(0,0,0,0.1); }
        
        @media (min-width: 576px) {
          .detail-panel { align-items: center; padding: 20px; }
          .detail-card { border-radius: 20px; max-height: 90vh; }
        }

        .detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .detail-title { font-size: 1.15rem; font-weight: bold; text-transform: capitalize; color: #222; }
        .detail-close { background: #f0f0f0; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.9rem; font-weight: bold; display: flex; align-items: center; justify-content: center; }

        .day-stats { display: flex; gap: 10px; margin-bottom: 15px; }
        .stat-box { background: #fdfbfa; padding: 10px; border-radius: 10px; flex: 1; text-align: center; border: 1px solid rgba(186,124,102,0.1); }
        .stat-label { font-size: 0.7rem; opacity: 0.6; font-weight: bold; text-transform: uppercase; }
        .stat-value { font-size: 1.25rem; font-weight: bold; color: #ba7c66; }

        .rdv-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
        .empty-msg { text-align: center; opacity: 0.5; padding: 30px 10px; font-size: 0.9rem; }

        /* Éléments de liste RDV */
        .rdv-item { border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; background: white; transition: all 0.2s; overflow: hidden; display: flex; flex-direction: column; }
        .rdv-item.expanded { border-color: #ba7c66; box-shadow: 0 4px 12px rgba(186,124,102,0.08); }
        .rdv-main-row { display: flex; gap: 12px; padding: 12px; align-items: center; cursor: pointer; }
        
        .rdv-time-col { display: flex; flex-direction: column; align-items: center; min-width: 60px; background: rgba(186,124,102,0.07); border-radius: 8px; padding: 6px; text-align: center; }
        .rdv-time { font-weight: 800; color: #ba7c66; font-size: 0.95rem; }
        .rdv-duree { font-size: 0.65rem; opacity: 0.6; margin-top: 1px; }
        
        .rdv-info { flex: 1; min-width: 0; }
        .rdv-client { font-weight: bold; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111; }
        .rdv-service { font-size: 0.8rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        
        .rdv-right-col { display: flex; align-items: center; gap: 8px; }
        .rdv-prix { font-weight: bold; color: #ba7c66; font-size: 0.95rem; }
        .rdv-chevron { font-size: 0.65rem; opacity: 0.4; width: 15px; text-align: center; }

        /* Métadonnées collectées (Zone dépliée) */
        .rdv-expanded-details { background: #faf8f6; padding: 12px; font-size: 0.85rem; border-top: 1px dashed #eee; }
        .rdv-divider { border: none; margin: 0 0 10px 0; }
        .rdv-grid-details { display: flex; flex-direction: column; gap: 8px; }
        .rdv-detail-row { display: flex; justify-content: space-between; align-items: flex-start; line-height: 1.4; }
        .rdv-detail-row .label { color: #666; font-weight: 500; min-width: 110px; }
        .rdv-detail-row .value { color: #222; text-align: right; word-break: break-word; }
        .rdv-cat { font-size: 0.7rem; background: rgba(186,124,102,0.1); color: #ba7c66; padding: 1px 8px; border-radius: 10px; text-transform: uppercase; font-weight: bold; }
        .rdv-phone.value { color: #ba7c66; font-weight: bold; text-decoration: none; padding: 2px 6px; background: rgba(186,124,102,0.05); border-radius: 4px; }

        /* Bouton Annulation / Suppression */
        .rdv-actions-wrapper { margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: flex-end; }
        .btn-delete-rdv { background: #fee2e2; color: #b91c1c; border: 1px solid rgba(185, 28, 28, 0.2); padding: 8px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: 0.2s; width: 100%; text-align: center; }
        @media (min-width: 576px) { .btn-delete-rdv { width: auto; } }
        .btn-delete-rdv:hover:not(:disabled) { background: #fca5a5; color: #7f1d1d; }
        .btn-delete-rdv:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Toolbar & Controls */
        .week-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; background: white; padding: 10px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .week-label { font-size: 1rem; font-weight: bold; }
        .nav-week { display: flex; gap: 4px; align-items: center; }
        .btn-nav-week { background: #f0f0f0; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .btn-today { background: #ba7c66; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.8rem; }

        .choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .choice-card { padding: 10px 5px; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; cursor: pointer; background: white; text-align: center; font-weight: bold; font-size: 0.85rem; transition: 0.2s; }
        .choice-card.selected { border-color: #ba7c66; background: rgba(186, 124, 102, 0.05); color: #ba7c66; }

        .slots-helper-text { font-size: 0.8rem; margin: 10px 0 5px; color: #555; }
        .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .slot { padding: 6px 2px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; text-align: center; cursor: pointer; font-size: 0.8rem; background: white; font-weight: 500; }
        .slot.selected { background: #e11d48; color: white; border-color: #e11d48; }

        .btn-submit { width: 100%; padding: 12px; background: #ba7c66; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.95rem; margin-top: 10px; }
        .btn-submit:disabled { opacity: 0.5; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade { animation: fadeIn 0.15s ease-out; }
        .font-bold { font-weight: bold; }
      `}</style>
    </div>
  )
}