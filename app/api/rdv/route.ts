// app/api/rdv/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'

export async function GET(request: NextRequest) {
  const session = await getIronSession(cookies(), sessionOptions)
  const isAdmin = (session as any).isAdmin;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Données reçues pour insertion:", body)

    const { prenom, nom, phone, service_id, date, time } = body

    // On n'insère que les colonnes indispensables pour éviter les erreurs de schéma
    const { data, error } = await supabase
      .from('reservations')
      .insert([
        {
          prenom: prenom,
          nom: nom,
          phone: phone,
          service_id: service_id,
          date: date,
          time_start: time,
          slots_occupes: [time] 
        }
      ])

    if (error) {
      console.error("Erreur Supabase détaillée:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Erreur Catch API:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}