/**
 * Droits d'accès écran par écran.
 *
 * `lib/navigation.ts` décrit ce qu'un profil *voit* dans la sidebar ; ce fichier
 * décrit ce qu'il a le droit d'*ouvrir*. Les deux ne se recouvrent pas : un agent
 * qui consulte le registre voit le module « Détenus » sans pouvoir ouvrir
 * /detenus/nouveau ni /detenus/liberation/*.
 *
 * Sans cette table, tout le monde atterrissait sur /tableau-de-bord ; un profil sans
 * `tableau_bord.consulter` y déclenchait un 403 de l'API et tombait sur l'écran
 * d'erreur générique. On oriente désormais chacun vers un écran qu'il peut voir.
 *
 * Ni `server-only` ni `next/headers` ici : ce module est lu par le proxy, par les
 * composants serveur et par le shell côté client.
 */

/** Tableau de bord condensé, adapté aux droits réellement accordés. */
export const ACCUEIL = "/accueil";
/** Écran de refus — jamais une erreur, une explication. */
export const ACCES_REFUSE = "/acces-refuse";

interface RegleAcces {
  /** Préfixe de chemin ; `*` remplace exactement un segment dynamique. */
  motif: string;
  /** Une seule permission suffit (lecture « ou »). */
  permissions: string[];
}

/**
 * Première règle dont le motif correspond : l'ordre va donc du plus précis au plus
 * général. Un chemin absent de cette liste est ouvert à tout compte connecté
 * (/accueil, /profil, /acces-refuse…).
 */
const REGLES: RegleAcces[] = [
  { motif: "/tableau-de-bord", permissions: ["tableau_bord.consulter"] },

  { motif: "/detenus/nouveau", permissions: ["detenus.creer"] },
  { motif: "/detenus/liberation", permissions: ["detenus.sorties.enregistrer"] },
  { motif: "/detenus/*/modifier", permissions: ["detenus.modifier"] },
  { motif: "/detenus/*/mandats", permissions: ["detenus.mandats.gerer"] },
  { motif: "/detenus", permissions: ["detenus.consulter"] },

  { motif: "/discipline/cellules", permissions: ["discipline.cellules.consulter"] },
  { motif: "/discipline/affectations", permissions: ["discipline.affectations.gerer"] },
  { motif: "/discipline/sanctions/types", permissions: ["discipline.types_sanction.gerer"] },
  { motif: "/discipline/sanctions", permissions: ["discipline.sanctions.consulter"] },

  { motif: "/sante/suivi-medical", permissions: ["sante.consultations.consulter"] },
  { motif: "/sante/visites", permissions: ["visites.consulter"] },

  { motif: "/etats", permissions: ["etats.consulter"] },

  { motif: "/administration/personnel", permissions: ["administration.personnel.gerer"] },
  { motif: "/administration/parametres", permissions: ["administration.parametres.gerer"] },
];

const segments = (chemin: string): string[] =>
  chemin.split(/[?#]/)[0].split("/").filter(Boolean);

function correspond(motif: string, chemin: string): boolean {
  const attendus = segments(motif);
  const recus = segments(chemin);
  // Un motif ne matche qu'en préfixe complet : « /detenus » couvre « /detenus/12 »,
  // jamais « /detenus-archives ».
  if (recus.length < attendus.length) return false;
  return attendus.every((s, i) => s === "*" || s === recus[i]);
}

/** Permissions exigées par un écran — tableau vide si l'écran est ouvert à tous. */
export function permissionsRequises(chemin: string): string[] {
  return REGLES.find((r) => correspond(r.motif, chemin))?.permissions ?? [];
}

export function aAcces(permissions: string[], chemin: string): boolean {
  const requises = permissionsRequises(chemin);
  return requises.length === 0 || requises.some((cle) => permissions.includes(cle));
}

/**
 * Où déposer quelqu'un qui vient de se connecter, ou qui demande « / ».
 *
 * Le tableau de bord complet quand il y a droit ; sinon l'accueil, qui ne montre
 * que ce que ce compte peut ouvrir — y compris quand ce n'est rien du tout.
 */
export function pageDArrivee(permissions: string[] | null): string {
  return permissions?.includes("tableau_bord.consulter") ? "/tableau-de-bord" : ACCUEIL;
}

/** Deux jeux de permissions décrivent-ils les mêmes droits ? (ordre indifférent) */
export function memesPermissions(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const reference = new Set(a);
  return b.every((cle) => reference.has(cle));
}
