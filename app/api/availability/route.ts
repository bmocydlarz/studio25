import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'

// RÉCUPÉRER LES RÈGLES
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Mois manquant' }, { status: 400 })

  const [year, mon] = month.split('-').map(Number)
  const lastDay = new Date(year, mon, 0).getDate()
  const lastDayStr = `${month}-${String(lastDay).padStart(2, '0')}`

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

// ENREGISTRER UNE RÈGLE
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession(await cookies(), sessionOptions)
    if (!(session as any).isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { date, type, blocked_slots } = await req.json()

    if (!date || !type) return NextResponse.json({ error: "Données manquantes" }, { status: 400 })

    const { data, error } = await supabase
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

// SUPPRIMER UNE RÈGLE
export async function DELETE(req: NextRequest) {
  const session = await getIronSession(await cookies(), sessionOptions)
  if (!(session as any).isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) return NextResponse.json({ error: "Date manquante" }, { status: 400 })

  const { error } = await supabase.from('availability').delete().eq('date', date)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}