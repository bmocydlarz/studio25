"use client"

import { useState, useEffect } from 'react'

type RDV = { id: string, time_start: string, prenom: string, nom: string, phone: string, service_nom: string, duree: number, categorie: string, prix: number }
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

  useEffect(() => {
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
    fetchWeek();
  }, [currentMonday]);

  useEffect(() => {
    const fetchAvailability = async () => {
      const monthStr = `${dispMonth.year}-${String(dispMonth.month + 1).padStart(2, '0')}`
      try {
        const res = await fetch(`/api/availability?month=${monthStr}`)
        if (res.ok) {
          const json = await res.json()
          const rules: Record<string, AvailabilityRule> = {}
          ;(json.rules || []).forEach((r: AvailabilityRule) => { rules[r.date] = r })
          setAvailRules(rules)
        }
      } catch {}
    }
    fetchAvailability()
  }, [dispMonth, view]) // Re-fetch quand on change de vue

  const changeWeek = (delta: number) => {
    const newMon = new Date(currentMonday)
    newMon.setDate(newMon.getDate() + delta * 7)
    setCurrentMonday(newMon)
    setSelectedDate(null)
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
  const todayStr = makeKey(today)

  return (
    <>
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
        <button className={`admin-tab ${view === 'disponibilites' ? 'active' : ''}`} onClick={() => setView('disponibilites')}>🗓️ Disponibilités</button>
      </div>

      {view === 'agenda' && (
        <div className="admin-section">
          <div className="week-toolbar">
            <div className="week-label serif">Semaine du <span>{currentMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></div>
            <div className="nav-week">
              <button className="btn-today" onClick={() => {
                 const d = new Date();
                 const day = d.getDay();
                 const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                 setCurrentMonday(new Date(d.setDate(diff)));
              }}>Aujourd'hui</button>
              <button className="btn-nav-week" onClick={() => changeWeek(-1)}>←</button>
              <button className="btn-nav-week" onClick={() => changeWeek(1)}>→</button>
            </div>
          </div>

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
                  onClick={() => setSelectedDate(d)}
                >
                  <div className="day-header">
                    <div className="day-name">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                    <div className="day-num serif">{d.getDate()}</div>
                    {isOff && <div className="day-off-label">JOUR OFF</div>}
                  </div>
                  <div className="day-body">
                    {dayRdvs.map(r => (
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

          {selectedDate && (
            <div className="detail-panel open">
              <div className="detail-card glass">
                <div className="detail-head">
                  <div className="detail-title serif">Journée du {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
                  <button className="detail-close" onClick={() => setSelectedDate(null)}>✕</button>
                </div>
                <div className="day-stats">
                  <div className="stat-box"><div className="stat-label">RDV</div><div className="stat-value">{selectedRdvs.length}</div></div>
                  <div className="stat-box"><div className="stat-label">CA</div><div className="stat-value">{totalCA}€</div></div>
                </div>
                <div className="rdv-list">
                  {selectedRdvs.map(r => (
                    <div key={r.id} className="rdv-item">
                      <div className="rdv-time">{r.time_start}</div>
                      <div className="rdv-info">
                        <div className="rdv-client">{r.prenom} {r.nom}</div>
                        <div className="rdv-service">{r.service_nom} · {r.prix}€</div>
                        <div className="rdv-phone">{r.phone}</div>
                      </div>
                    </div>
                  ))}
                  {selectedRdvs.length === 0 && <p className="empty-msg">Aucun rendez-vous</p>}
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
              if (!d) return <div key={`empty-${i}`} />
              const key = makeKey(d)
              const rule = availRules[key]
              return (
                <div key={key} className={`cal-cell glass ${rule?.type || ''} ${d < today ? 'past' : ''}`} onClick={() => d >= today && openDayEditor(key)}>
                  <div className="cal-day-num">{d.getDate()}</div>
                  {rule?.type === 'day_off' && <div className="cal-badge off">OFF</div>}
                  {rule?.type === 'partial' && <div className="cal-badge partial">Partiel</div>}
                </div>
              )
            })}
          </div>

          {selectedDispDate && (
            <div className="detail-panel open">
              <div className="detail-card glass" style={{maxWidth: '450px'}}>
                <div className="detail-head">
                  <div className="detail-title serif">Modifier le {selectedDispDate}</div>
                  <button className="detail-close" onClick={() => setSelectedDispDate(null)}>✕</button>
                </div>
                <div className="choice-grid" style={{marginBottom: '20px'}}>
                  <button className={`choice-card ${editMode === null ? 'selected' : ''}`} onClick={() => setEditMode(null)}>Ouvert</button>
                  <button className={`choice-card ${editMode === 'day_off' ? 'selected' : ''}`} onClick={() => setEditMode('day_off')}>Jour OFF</button>
                  <button className={`choice-card ${editMode === 'partial' ? 'selected' : ''}`} onClick={() => setEditMode('partial')}>Partiel</button>
                </div>

                {editMode === 'partial' && (
                  <div className="slots-grid" style={{maxHeight: '200px', overflowY: 'auto', marginBottom: '20px'}}>
                    {ALL_SLOTS.map(s => (
                      <div key={s} className={`slot ${selectedSlots.includes(s) ? 'selected' : ''}`} onClick={() => toggleSlot(s)}>{s}</div>
                    ))}
                  </div>
                )}
                <button className="btn-submit" onClick={saveRule} disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .admin-section { padding: 20px; }
        .admin-tabs { display: flex; gap: 10px; padding: 20px 20px 0; border-bottom: 1px solid rgba(0,0,0,0.1); }
        .admin-tab { padding: 10px 20px; border: none; background: none; cursor: pointer; opacity: 0.6; font-weight: 600; color: inherit; }
        .admin-tab.active { opacity: 1; border-bottom: 2px solid #ba7c66; }
        
        .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-top: 20px; }
        .day-card { padding: 15px; min-height: 150px; cursor: pointer; border: 1px solid transparent; transition: 0.2s; position: relative; }
        .day-card.selected { border-color: #ba7c66; background: rgba(186, 124, 102, 0.05); }
        
        /* Style JOUR OFF dans Agenda */
        .day-card.day-off-agenda { 
          background: rgba(0,0,0,0.05) !important; 
          opacity: 0.8;
          border: 1px dashed rgba(0,0,0,0.2);
        }
        .day-off-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: #dc2626;
          background: rgba(220, 38, 38, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
        }

        .day-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 10px; }
        .day-num { font-size: 1.5rem; }
        
        .mini-event { font-size: 0.7rem; padding: 4px 6px; border-radius: 4px; background: white; margin-bottom: 4px; display: flex; gap: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #333; }
        .ev-time { font-weight: 700; color: #ba7c66; }
        
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-top: 20px; }
        .cal-day-name { text-align: center; font-size: 0.8rem; opacity: 0.5; padding-bottom: 10px; }
        .cal-cell { min-height: 80px; padding: 10px; cursor: pointer; position: relative; border: 1px solid rgba(0,0,0,0.05); }
        .cal-cell.past { opacity: 0.3; cursor: default; }
        .cal-cell.day_off { background: rgba(255,0,0,0.05); border-color: rgba(255,0,0,0.1); }
        .cal-cell.partial { background: rgba(255,165,0,0.05); border-color: rgba(255,165,0,0.1); }
        
        .detail-panel { position: fixed; inset: 0; background: rgba(0,0,0,0.2); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .detail-card { width: 90%; max-width: 600px; padding: 30px; background: white; color: #333; }
        .day-stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-box { background: #fcfaf8; padding: 15px; border-radius: 12px; flex: 1; text-align: center; border: 1px solid #eee; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #ba7c66; }
        
        .rdv-list { max-height: 300px; overflow-y: auto; }
        .rdv-item { display: flex; gap: 15px; padding: 15px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .rdv-time { font-weight: 700; color: #ba7c66; font-size: 1.1rem; }
        .rdv-client { font-weight: 600; }
        .rdv-service { font-size: 0.9rem; opacity: 0.7; }
        .rdv-phone { font-size: 0.85rem; color: #ba7c66; }
        
        .cal-badge { font-size: 0.65rem; padding: 2px 5px; border-radius: 4px; margin-top: 4px; display: inline-block; }
        .cal-badge.off { background: #fee2e2; color: #dc2626; }
        .cal-badge.partial { background: #fef3c7; color: #d97706; }
      `}</style>
    </>
  )
}