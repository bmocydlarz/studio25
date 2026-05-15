import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/iron-session'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // CORRECTION : On utilise le constructeur qui accepte req et res pour le middleware
  // Cela permet de gérer les cookies correctement sans erreur de type
  const session = await getIronSession(req, res, sessionOptions) as any

  // Protection de la route /admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session.isAdmin) {
      // Redirection vers le login si pas admin
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}