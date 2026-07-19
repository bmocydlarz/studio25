import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/iron-session'
import { Resend } from 'resend'

// Initialisation de Resend avec ta clé secrète (.env.local)
const resend = new Resend(process.env.RESEND_API_KEY)

// ── FONCTION INTERNE : ENVOYER LE MAIL DE VALIDATION À LA CLIENTE ────
async function sendEmailNotification(rdv: any) {
  if (!process.env.RESEND_API_KEY) {
    console.error("Variable RESEND_API_KEY manquante dans l'environnement.")
    return
  }

  if (!rdv.email) {
    console.error("Impossible d'envoyer le mail : aucune adresse e-mail fournie par la cliente.")
    return
  }

  // Formatage de la date en français (ex: mercredi 20 mai 2026)
  const dateFormatee = new Date(rdv.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  try {
    await resend.emails.send({
      from: 'Studiio.25 <onboarding@resend.dev>', // Tu pourras remplacer par ton propre domaine plus tard sur Resend
      to: rdv.email,
      subject: `Confirmation de ton rendez-vous - Studiio.25`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #4a3f35; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0e6e1; border-radius: 16px; background-color: #fdfbfb;">
          <h2 style="color: #ba7c66; margin-top: 0; font-weight: normal; border-bottom: 1px solid #f0e6e1; padding-bottom: 15px; font-family: serif;">Coucou ${rdv.prenom} ! ✨</h2>
          
          <p style="font-size: 16px; line-height: 1.5;">Ton rendez-vous est bien confirmé !</p>
          
          <div style="background-color: #f7f1ed; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #ba7c66; font-size: 16px;">Récapitulatif de ta réservation</h3>
            <p style="margin: 8px 0;"><strong>Soin :</strong> ${rdv.service_nom}</p>
            <p style="margin: 8px 0;"><strong>Date :</strong> le ${dateFormatee}</p>
            <p style="margin: 8px 0;"><strong>Heure :</strong> à ${rdv.time_start}</p>
            <p style="margin: 8px 0;"><strong>Durée :</strong> ~ ${rdv.duree} min</p>
            <p style="margin: 8px 0; font-weight: bold;"><strong>Tarif :</strong> ${rdv.prix} €</p>
          </div>

          <p style="font-size: 14px; line-height: 1.5; opacity: 0.9;">
            📍 <strong>Adresse :</strong> Le salon est situé à Quesnoy-sur-Deûle.<br/>
            📞 <strong>Un contretemps ?</strong> En cas d'annulation ou de modification, merci de me prévenir au moins 24h à l'avance au 07.60.46.27.31.
          </p>
          
          <hr style="border: none; border-top: 1px solid #f0e6e1; margin: 30px 0;" />
          
          <p style="text-align: center; font-size: 16px; margin-bottom: 5px; font-family: serif; font-style: italic;">À très vite, prends soin de toi !</p>
          <p style="text-align: center; font-weight: bold; color: #ba7c66; margin-top: 0;">Studiio.25 🤎</p>
        </div>
      `,
    })
  } catch (err) {
    console.error("Échec de l'envoi de l'e-mail à la cliente :", err)
  }
}

// ── FONCTION INTERNE : ENVOYER LA NOTIFICATION TELEGRAM (ADMIN) ──────
async function sendTelegramNotification(rdv: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.error("Variables Telegram manquantes dans l'environnement.")
    return
  }

  const dateFormatee = new Date(rdv.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const message = `✨ *Nouveau Rendez-vous !* ✨\n\n` +
    `👤 *Client :* ${rdv.prenom} ${rdv.nom.toUpperCase()}\n` +
    `📞 *Téléphone :* ${rdv.phone}\n` +
    `📧 *Email :* ${rdv.email || 'Non fourni'}\n` +
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
        parse_mode: 'Markdown'
      })
    })
  } catch (err) {
    console.error("Échec de l'envoi de la notification Telegram :", err)
  }
}

// ── GET : RÉCUPÉRER LES RDV D'UNE DATE (ADMIN ONLY) ──────────────────
export async function GET(request: NextRequest) {
  const session = await getIronSession(await cookies(), sessionOptions)
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
    const { prenom, nom, phone, email, service_id, date, time, service_nom, categorie, prix, duree } = body

    const newRdv = {
      prenom,
      nom,
      phone,
      email, // Stocké en base de données pour le suivi
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

    // 🔥 Déclenchement des notifications en arrière-plan sans ralentir la réponse du client
    await Promise.all([
      sendTelegramNotification(newRdv),
      sendEmailNotification(newRdv)
    ])

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur serveur", message: err.message }, { status: 500 })
  }
}

// ── DELETE : SUPPRIMER UN RENDEZ-VOUS (ADMIN ONLY) ───────────────────
export async function DELETE(request: NextRequest) {
  try {
    const session = await getIronSession(await cookies(), sessionOptions)
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