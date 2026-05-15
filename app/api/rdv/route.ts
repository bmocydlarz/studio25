import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getPrestationById, getSlotsOccupes } from '@/lib/prestations'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/iron-session'
import { cookies } from 'next/headers'

// POST /api/rdv — créer une réservation
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { prenom, nom, phone, service_id, date, time } = body

  // Validation basique côté serveur
  if (!prenom || !nom || !phone || !service_id || !date || !time) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'Heure invalide' }, { status: 400 })
  }

  const prestation = getPrestationById(service_id)
  if (!prestation) {
    return NextResponse.json({ error: 'Prestation inconnue' }, { status: 400 })
  }

  const slots = getSlotsOccupes(time, prestation.duree)

  // Vérifier que les créneaux sont encore libres (protection double-réservation)
  const { data: existants } = await supabase
    .from('reservations')
    .select('slots_occupes')
    .eq('date', date)

  if (existants) {
    const tousSlots = existants.flatMap((r: any) => r.slots_occupes as string[])
    const conflit = slots.some(s => tousSlots.includes(s))
    if (conflit) {
      return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
    }
  }

  // Insérer en base
  const { error } = await supabase.from('reservations').insert({
    prenom: prenom.trim().slice(0, 50),
    nom: nom.trim().slice(0, 50),
    phone: phone.trim().slice(0, 20),
    service_id,
    service_nom: prestation.nom,
    categorie: prestation.categorie,
    date,
    time_start: time,
    duree: prestation.duree,
    prix: prestation.prix,
    slots_occupes: slots,
  })

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// GET /api/rdv?date=2026-05-20 — lister les rdv d'un jour (admin uniquement)
export async function GET(req: NextRequest) {
  const session = await getIronSession(cookies(), sessionOptions)
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const date = req.nextUrl.searchParams.get('date')
  if (!date) {
    return NextResponse.json({ error: 'date manquante' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('date', date)
    .order('time_start', { ascending: true })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json({ rdvs: data })
}