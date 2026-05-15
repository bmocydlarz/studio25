import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'

// GET : Récupérer les RDV pour l'admin
export async function GET(request: NextRequest) {
  const session = await getIronSession(cookies(), sessionOptions)
  const isAdmin = (session as any).isAdmin

  if (!isAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'Date manquante' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('date', date)
    .order('time_start', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rdvs: data || [] })
}

// POST : Enregistrer une nouvelle réservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prenom, nom, phone, service_id, date, time } = body

    // On insère uniquement les colonnes de base pour garantir le succès
    // Assure-toi que ces colonnes existent dans ta table Supabase
    const { error } = await supabase
      .from('reservations')
      .insert([
        {
          prenom,
          nom,
          phone,
          service_id,
          date,
          time_start: time
        }
      ])

    if (error) {
      console.error("Erreur Supabase:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Erreur Serveur:", err.message)
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 })
  }
}