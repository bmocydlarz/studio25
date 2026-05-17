import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'

// Fonction interne pour envoyer la notification Telegram
async function sendTelegramNotification(rdv: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.error("Variables Telegram manquantes dans l'environnement.")
    return
  }

  // Formatage propre de la date en français (ex: 20 mai 2026)
  const dateFormatee = new Date(rdv.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  // Contenu du message reçu sur ton téléphone
  const message = `✨ *Nouveau Rendez-vous !* ✨\n\n` +
    `👤 *Client :* ${rdv.prenom} ${rdv.nom.toUpperCase()}\n` +
    `📞 *Téléphone :* ${rdv.phone}\n` +
    `✂️ *Prestation :* ${rdv.service_nom}\n` +
    `📂 *Catégorie :* ${rdv.categorie}\n` +
    `⏱️ *Durée :* ${rdv.duree} min\n` +
    `💶 *Tarif :* ${rdv.prix} €\n\n` +
    `📅 *Date :* ${dateFormatee}\n` +
    `🕒 *Heure :* ${rdv.time_start}`;

  try {
    return await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown' // Permet d'avoir le texte en gras/italique
      })
    })
  } catch (err) {
    console.error("Échec de l'envoi de la notification Telegram:", err)
  }
}

// ── GET : RÉCUPÉRER LES RDV D'UNE DATE (ADMIN ONLY) ──────────────────
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

// ── POST : CRÉER UN RENDEZ-VOUS (CLIENT / PUBLIC) ────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prenom, nom, phone, service_id, date, time, service_nom, categorie, prix, duree } = body

    const newRdv = {
      prenom,
      nom,
      phone,
      service_id,
      date,
      time_start: time,
      service_nom: service_nom || "Service inconnu",
      categorie: categorie || "Non spécifié",
      prix: prix || 0,
      duree: duree || 30,
      slots_occupes: [time]
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert([newRdv])

    if (error) {
      return NextResponse.json({ 
        error: error.message, 
        details: error.details, 
        hint: error.hint 
      }, { status: 500 })
    }

    // 🔥 DÉCLENCHEMENT DE LA NOTIFICATION (Sans bloquer la réponse de l'utilisateur)
    await sendTelegramNotification(newRdv)

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur serveur", message: err.message }, { status: 500 })
  }
}

// ── DELETE : SUPPRIMER UN RENDEZ-VOUS (ADMIN ONLY) ───────────────────
export async function DELETE(request: NextRequest) {
  try {
    const session = await getIronSession(cookies(), sessionOptions)
    const isAdmin = (session as any).isAdmin

    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur serveur", message: err.message }, { status: 500 })
  }
}