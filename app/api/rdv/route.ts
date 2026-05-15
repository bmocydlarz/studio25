// app/api/rdv/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'

// On définit la structure de la session pour TypeScript ici aussi
interface SessionData {
  isAdmin?: boolean;
}

// 1. RÉCUPÉRER LES RDV (Protégé par isAdmin pour l'Admin)
export async function GET(request: NextRequest) {
  // Vérification de la session
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  
  // Si ce n'est pas l'admin, on bloque l'accès aux données privées
  if (!session.isAdmin) {
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

// 2. ENREGISTRER UN RDV (Public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prenom, nom, phone, service_id, date, time, service_nom, categorie, prix, duree } = body

    const { error } = await supabase
      .from('reservations')
      .insert([
        {
          prenom,
          nom,
          phone,
          service_id,
          date,
          time_start: time,
          service_nom,
          categorie,
          prix,
          duree,
          slots_occupes: [time] 
        }
      ])

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Erreur POST rdv:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}