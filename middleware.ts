import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions } from './lib/iron-session' // Vérifie que le chemin est bon vers ton fichier lib

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // CORRECTION : On passe req.cookies et non req, res
  const session = await getIronSession(req.cookies, sessionOptions)

  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (session.isAdmin !== true) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}