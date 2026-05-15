import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'

export async function GET(request: NextRequest) {
  const session = await getIronSession(cookies(), sessionOptions)
  const isAdmin = (session as any).isAdmin

  if (!isAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) return NextResponse.json({ error: 'Date manquante' }, { status: 400 })

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('date', date)
    .order('time_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rdvs: data || [] })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // On récupère TOUTES les infos envoyées par le front
    const { prenom, nom, phone, service_id, date, time, service_nom, categorie, prix, duree } = body

    const { data, error } = await supabase
      .from('reservations')
      .insert([
        {
          prenom,
          nom,
          phone,
          service_id,
          date,
          time_start: time,
          service_nom: service_nom || "Service inconnu", // Sécurité pour éviter le Not Null
          categorie: categorie || "Non spécifié",
          prix: prix || 0,
          duree: duree || 30,
          slots_occupes: [time]
        }
      ])

    if (error) {
      return NextResponse.json({ 
        error: error.message, 
        details: error.details, 
        hint: error.hint 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur serveur", message: err.message }, { status: 500 })
  }
}