import { createClient } from '@supabase/supabase-js';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 1. Récupération et vérification des clés depuis ton .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Configuration manquante : Vérifie ton fichier .env");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function GET() {
  try {
    // 2. Récupération des rendez-vous depuis ta table 'reservations'
    const { data: appointments, error } = await supabase
      .from('reservations') 
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error("Erreur de lecture Supabase :", error);
      throw error;
    }

    // 3. Création de l'agenda iCal
    const calendar = ical({
      name: 'Studiio.25 - Agenda',
      method: ICalCalendarMethod.PUBLISH,
      ttl: 3600 // Demande à l'application Calendrier de se rafraîchir toutes les heures
    });

    // 4. Construction des événements à partir de tes lignes Supabase
    appointments?.forEach((rdv) => {
      // Découpage propre de la date (YYYY-MM-DD) et de l'heure (HH:MM)
      const [year, month, day] = rdv.date.split('-').map(Number);
      const [hours, minutes] = rdv.time_start.split(':').map(Number);

      // Création de l'objet Date en local (le mois commence à 0 en JS, donc month - 1)
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      
      // Calcule l'heure de fin en ajoutant la durée en minutes
      const endDateTime = new Date(startDateTime.getTime() + rdv.duree * 60000);

      // Sécurité : Si la date est invalide, on passe au rendez-vous suivant
      if (isNaN(startDateTime.getTime())) return;

      calendar.createEvent({
        id: rdv.id,
        start: startDateTime,
        end: endDateTime,
        summary: `💇‍♂️ ${rdv.prenom} ${rdv.nom.toUpperCase()} - ${rdv.service_nom}`,
        description: `Prestation : ${rdv.service_nom}\nDurée : ${rdv.duree} min\nTarif : ${rdv.prix} €\nTéléphone : ${rdv.phone}\nCatégorie : ${rdv.categorie}`,
        location: 'Studiio.25',
      });
    });

    // 5. Envoi du flux iCal avec les headers requis pour Apple Calendar / Google Calendar
    return new NextResponse(calendar.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="studiio25.ics"',
        'Cache-Control': 'public, max-age=1800', // Cache de 30 minutes
      },
    });

  } catch (error: any) {
    console.error('Erreur lors de la génération du flux iCal:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' }, 
      { status: 500 }
    );
  }
}