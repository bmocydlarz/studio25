import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/rdv/slots/2026-05-20 — retourne les créneaux bloqués (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  const { date } = params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('slots_occupes')
    .eq('date', date)

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  const booked: string[] = (data ?? []).flatMap((r: any) => r.slots_occupes as string[])
  return NextResponse.json({ booked })
}