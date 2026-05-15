import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 0; // Force la mise à jour à chaque appel

// GET /api/rdv/slots/2026-05-20 — retourne les créneaux bloqués (fusion RDV + Disponibilités)
export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  const { date } = params

  // Validation du format de la date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }

  try {
    // 1. On récupère les créneaux occupés par des réservations existantes
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('slots_occupes')
      .eq('date', date)

    if (resError) throw resError

    // 2. On récupère les règles d'indisponibilité (Jour OFF ou blocage partiel)
    const { data: rule, error: ruleError } = await supabase
      .from('availability')
      .select('type, blocked_slots')
      .eq('date', date)
      .single()

    // On prépare la liste des créneaux bloqués
    let booked: string[] = []

    // CAS 1 : C'est un jour OFF complet
    if (rule?.type === 'day_off') {
      // On bloque tous les créneaux de 9h à 18h
      const allDaySlots = []
      for (let h = 9; h < 18; h++) {
        allDaySlots.push(`${String(h).padStart(2, '0')}:00`)
        allDaySlots.push(`${String(h).padStart(2, '0')}:30`)
      }
      booked = allDaySlots
    } 
    // CAS 2 : C'est une journée normale ou avec des blocages partiels
    else {
      // Créneaux des réservations
      const resSlots = (reservations ?? []).flatMap((r: any) => r.slots_occupes as string[])
      
      // Créneaux bloqués manuellement (si type === 'partial')
      const manualSlots = rule?.blocked_slots ?? []
      
      // Fusion des deux listes sans doublons
      booked = Array.from(new Set([...resSlots, ...manualSlots]))
    }

    return NextResponse.json({ booked })

  } catch (error: any) {
    console.error('Erreur lors de la récupération des créneaux:', error.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}