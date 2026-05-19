import { createClient } from '@supabase/supabase-js';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { NextResponse } from 'next/server';

// 1. Récupération et vérification des clés depuis ton .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Configuration manquante : Vérifie ton fichier .env.local");
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
      // Combine la date (YYYY-MM-DD) et l'heure de début (HH:MM)
      const startDateTime = new Date(`${rdv.date}T${rdv.time_start}:00`);
      
      // Calcule l'heure de fin en ajoutant la durée en minutes (duree * 60 000 ms)
      const endDateTime = new Date(startDateTime.getTime() + rdv.duree * 60000);

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