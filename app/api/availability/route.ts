import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase' // Utilisé pour le GET public
import { createClient } from '@supabase/supabase-js' // Ajouté pour créer le client Admin secret
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'

// Client d'administration secret (Bypass le RLS pour POST et DELETE)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Ta clé privée serveur
)

// RÉCUPÉRER LES RÈGLES (ACCÈS PUBLIC POUR LE CALENDRIER CLIENT)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Mois manquant' }, { status: 400 })

  const [year, mon] = month.split('-').map(Number)
  const lastDay = new Date(year, mon, 0).getDate()
  const lastDayStr = `${month}-${String(lastDay).padStart(2, '0')}`

  // On utilise le client classique 'supabase' (soumis au RLS, autorisé en lecture publique)
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .gte('date', `${month}-01`)
    .lte('date', lastDayStr)

  if (error) {
    console.error("Erreur GET Availability:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ rules: data || [] })
}

// ENREGISTRER UNE RÈGLE (ADMIN ONLY)
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession(cookies(), sessionOptions)
    if (!(session as any).isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { date, type, blocked_slots } = await req.json()

    if (!date || !type) return NextResponse.json({ error: "Données manquantes" }, { status: 400 })

    // On utilise "supabaseAdmin" pour enregistrer sans blocage RLS
    const { data, error } = await supabaseAdmin
      .from('availability')
      .upsert({ 
        date, 
        type, 
        blocked_slots: blocked_slots || [] 
      }, { onConflict: 'date' })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("Erreur POST Availability:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// SUPPRIMER UNE RÈGLE (ADMIN ONLY)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getIronSession(cookies(), sessionOptions)
    if (!(session as any).isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (!date) return NextResponse.json({ error: "Date manquante" }, { status: 400 })

    // On utilise "supabaseAdmin" pour supprimer sans blocage RLS
    const { error } = await supabaseAdmin
      .from('availability')
      .delete()
      .eq('date', date)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Erreur DELETE Availability:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}