// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/iron-session'
import { cookies } from 'next/headers'

// On définit la structure de la session pour TypeScript
// Cela évite l'erreur "Property isAdmin does not exist"
interface SessionData {
  isAdmin?: boolean;
}

// POST /api/auth — connexion admin
export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  // On applique le type <SessionData> ici
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.isAdmin = true
  await session.save()

  return NextResponse.json({ ok: true })
}

// DELETE /api/auth — déconnexion
export async function DELETE() {
  // On applique aussi le type ici par cohérence
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.destroy()
  return NextResponse.json({ ok: true })
}