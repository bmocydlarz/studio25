export type Categorie = 'onglerie' | 'cils' | 'coiffure'

export interface Prestation {
  id: string
  nom: string
  duree: number  // minutes
  prix: number   // euros
  categorie: Categorie
}

export const PRESTATIONS: Prestation[] = [
  // Onglerie
  { id: 'manucure',  nom: 'Manucure',          duree: 45,  prix: 20, categorie: 'onglerie' },
  { id: 'semi',      nom: 'Semi Permanent',     duree: 60,  prix: 25, categorie: 'onglerie' },
  { id: 'gainage',   nom: 'Gainage / Renfort',  duree: 75,  prix: 30, categorie: 'onglerie' },
  { id: 'gelx',      nom: 'Gel-X',              duree: 105, prix: 40, categorie: 'onglerie' },
  { id: 'capsule',   nom: 'Capsule Gel',        duree: 120, prix: 45, categorie: 'onglerie' },
  // Cils
  { id: 'rehausse',  nom: 'Réhaussement',       duree: 60,  prix: 30, categorie: 'cils' },
  { id: 'cilacil',   nom: 'Cils à cils',        duree: 90,  prix: 40, categorie: 'cils' },
  { id: 'mixtel',    nom: 'Mixte léger',         duree: 105, prix: 45, categorie: 'cils' },
  { id: 'mixtei',    nom: 'Mixte Intense',       duree: 120, prix: 50, categorie: 'cils' },
  { id: 'volume',    nom: 'Volume Russe',        duree: 150, prix: 55, categorie: 'cils' },
  // Coiffure
  { id: 'brushing',  nom: 'Brushing',            duree: 45,  prix: 20, categorie: 'coiffure' },
  { id: 'coupe_f',   nom: 'Coupe brushing',      duree: 60,  prix: 30, categorie: 'coiffure' },
  { id: 'coupe_h',   nom: 'Coupe Homme',         duree: 30,  prix: 18, categorie: 'coiffure' },
  { id: 'couleur',   nom: 'Couleur + soin',      duree: 120, prix: 70, categorie: 'coiffure' },
  { id: 'balayage',  nom: 'Balayage + soin',     duree: 180, prix: 85, categorie: 'coiffure' },
]

export const PRESTATIONS_PAR_CAT: Record<Categorie, Prestation[]> = {
  onglerie: PRESTATIONS.filter(p => p.categorie === 'onglerie'),
  cils:     PRESTATIONS.filter(p => p.categorie === 'cils'),
  coiffure: PRESTATIONS.filter(p => p.categorie === 'coiffure'),
}

export function getPrestationById(id: string): Prestation | undefined {
  return PRESTATIONS.find(p => p.id === id)
}

// Génère tous les créneaux de 30min qu'occupe un rdv
export function getSlotsOccupes(timeStart: string, duree: number): string[] {
  const [h, m] = timeStart.split(':').map(Number)
  let total = h * 60 + m
  const slots: string[] = []
  for (let i = 0; i < Math.ceil(duree / 30); i++) {
    slots.push(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`)
    total += 30
  }
  return slots
}