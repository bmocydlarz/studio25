import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prenom, nom, phone, service_id, date, time } = body

    // TEST DE CONNEXION : Si Supabase n'est pas initialisé, on le saura de suite
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "URL Supabase manquante dans Vercel" }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert([
        {
          prenom: String(prenom),
          nom: String(nom),
          phone: String(phone),
          service_id: String(service_id),
          date: date, // Format attendu: YYYY-MM-DD
          time_start: String(time)
        }
      ])
      .select()

    if (error) {
      console.error("Erreur Supabase reçue:", error)
      return NextResponse.json({ 
        error: error.message, 
        details: error.details, 
        hint: error.hint 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: "Crash Serveur", message: err.message }, { status: 500 })
  }
}

// Optionnel : GET simplifié pour éviter les erreurs de build
export async function GET() {
  return NextResponse.json({ message: "API RDV Active" })
}