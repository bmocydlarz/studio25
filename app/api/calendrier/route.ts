import { createClient } from '@supabase/supabase-js';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. VÉRIFICATION DE L'AUTHENTIFICATION (USER & MDP)
  const authHeader = request.headers.get('authorization');
  
  // Tu peux changer l'identifiant "studiio25" ici si tu veux
  const expectedUser = "studiio25"; 
  const expectedPassword = process.env.ADMIN_PASSWORD || "TEST";

  if (!authHeader) {
    return new NextResponse('Accès refusé : Identifiants requis', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Calendar"' },
    });
  }

  // Décodage des identifiants envoyés par le Calendrier
  try {
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user !== expectedUser || pass !== expectedPassword) {
      return new NextResponse('Accès refusé : Identifiants incorrects', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Secure Calendar"' },
      });
    }
  } catch (err) {
    return new NextResponse('Erreur d\'authentification', { status: 401 });
  }

  // 2. CONNEXION SUPABASE (Si l'authentification est réussie)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: appointments, error } = await supabase
      .from('reservations') 
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    const calendar = ical({
      name: 'Studiio.25 - Agenda',
      method: ICalCalendarMethod.PUBLISH,
      timezone: 'Europe/Paris',
      ttl: 3600
    });

    appointments?.forEach((rdv) => {
      const [year, month, day] = rdv.date.split('-').map(Number);
      const [hours, minutes] = rdv.time_start.split(':').map(Number);

      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      const endDateTime = new Date(startDateTime.getTime() + rdv.duree * 60000);

      if (isNaN(startDateTime.getTime())) return;

      calendar.createEvent({
        id: rdv.id,
        start: startDateTime,
        end: endDateTime,
        timezone: 'Europe/Paris',
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