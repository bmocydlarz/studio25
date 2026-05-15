import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/iron-session'
import { cookies } from 'next/headers'

// POST /api/auth — connexion admin
export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const session = await getIronSession(cookies(), sessionOptions)
  session.isAdmin = true
  await session.save()

  return NextResponse.json({ ok: true })
}

// DELETE /api/auth — déconnexion
export async function DELETE() {
  const session = await getIronSession(cookies(), sessionOptions)
  session.destroy()
  return NextResponse.json({ ok: true })
}