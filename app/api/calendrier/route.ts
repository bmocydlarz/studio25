import { createClient } from '@supabase/supabase-js';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { NextResponse } from 'next/server';

// Force Next.js à ne pas évaluer cette page au moment du build sur Vercel
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Récupération des rendez-vous
    const { data: appointments, error } = await supabase
      .from('reservations') 
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    // 2. Création de l'agenda avec le fuseau horaire Europe/Paris
    const calendar = ical({
      name: 'Studiio.25 - Agenda',
      method: ICalCalendarMethod.PUBLISH,
      timezone: 'Europe/Paris', // <-- FORCE LE FUSEAU HORAIRE ICI
      ttl: 3600
    });

    // 3. Construction des événements
    appointments?.forEach((rdv) => {
      const [year, month, day] = rdv.date.split('-').map(Number);
      const [hours, minutes] = rdv.time_start.split(':').map(Number);

      // Création de la date locale
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      const endDateTime = new Date(startDateTime.getTime() + rdv.duree * 60000);

      if (isNaN(startDateTime.getTime())) return;

      calendar.createEvent({
        id: rdv.id,
        start: startDateTime,
        end: endDateTime,
        timezone: 'Europe/Paris', // <-- FORCE AUSSI SUR L'ÉVÉNEMENT
        summary: `💇‍♂️ ${rdv.prenom} ${rdv.nom.toUpperCase()} - ${rdv.service_nom}`,
        description: `Prestation : ${rdv.service_nom}\nDurée : ${rdv.duree} min\nTarif : ${rdv.prix} €\nTéléphone : ${rdv.phone}\nCatégorie : ${rdv.categorie}`,
        location: 'Studiio.25',
      });
    });

    return new NextResponse(calendar.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="studiio25.ics"',
        'Cache-Control': 'public, max-age=1800',
      },
    });

  } catch (error: any) {
    console.error('Erreur iCal:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}