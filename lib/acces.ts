/**
 * Droits d'accès écran par écran.
 *
 * Depuis le passage aux modules, une règle ne nomme plus une permission mais une
 * exigence : « ce chemin appartient au module Discipline », « celui-ci à
 * l'administration ». Un module s'accorde en bloc, donc tous ses écrans suivent —
 * /detenus, /detenus/nouveau et /detenus/liberation/evasion ouvrent ensemble ou
 * pas du tout. C'est aussi ce qui permet de dire à l'utilisateur ce qui lui manque
 * dans ses mots (« l'accès au module Gestion des détenus ») plutôt qu'en clés
 * techniques.
 *
 * Sans cette table, tout le monde atterrissait sur /tableau-de-bord ; un compte
 * sans `tableau_bord.consulter` y déclenchait un 403 de l'API et tombait sur
 * l'écran d'erreur générique.
 *
 * Ni `server-only` ni `next/headers` ici : ce module est lu par le proxy, par les
 * composants serveur et par le shell côté client.
 */

import {
  aLeModule,
  estAdministrateur,
  moduleMetier,
  modulesAccordes,
  type CleModule,
} from "@/lib/domain/modules";

/** Hall d'accueil : les modules du compte, quand il y en a plusieurs. */
export const ACCUEIL = "/accueil";
/** Écran de refus — jamais une erreur, une explication. */
export const ACCES_REFUSE = "/acces-refuse";

/**
 * Ce qu'un écran réclame. Les trois rubriques transverses ne sont pas des modules
 * attribuables : elles n'appartiennent qu'à l'administrateur.
 */
export type Exigence = CleModule | "administration" | "etats" | "tableau-de-bord";

interface RegleAcces {
  /** Préfixe de chemin ; `*` remplace exactement un segment dynamique. */
  motif: string;
  exige: Exigence;
}

/**
 * Première règle dont le motif correspond : l'ordre va du plus précis au plus
 * général. Un chemin absent de cette liste est ouvert à tout compte connecté
 * (/accueil, /profil, /acces-refuse…).
 */
const REGLES: RegleAcces[] = [
  { motif: "/tableau-de-bord", exige: "tableau-de-bord" },
  { motif: "/administration", exige: "administration" },
  { motif: "/etats", exige: "etats" },

  { motif: "/detenus", exige: "detenus" },
  { motif: "/discipline", exige: "discipline" },
  { motif: "/sante/suivi-medical", exige: "sante" },
  { motif: "/sante/visites", exige: "visites" },
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

/** Ce que l'écran réclame, ou `null` s'il est ouvert à tout compte connecté. */
export function exigenceDe(chemin: string): Exigence | null {
  return REGLES.find((r) => correspond(r.motif, chemin))?.exige ?? null;
}

export function satisfait(permissions: string[], exige: Exigence): boolean {
  switch (exige) {
    case "administration":
      return estAdministrateur(permissions);
    case "etats":
      return permissions.includes("etats.consulter");
    case "tableau-de-bord":
      return permissions.includes("tableau_bord.consulter");
    default:
      return aLeModule(permissions, exige);
  }
}

export function aAcces(permissions: string[], chemin: string): boolean {
  const exige = exigenceDe(chemin);
  return exige === null || satisfait(permissions, exige);
}

/** Ce qui manque, dit à l'utilisateur plutôt qu'au développeur. */
export function libelleExigence(exige: Exigence): string {
  switch (exige) {
    case "administration":
      return "l’habilitation d’administration";
    case "etats":
      return "l’accès à l’édition d’états";
    case "tableau-de-bord":
      return "l’accès au tableau de bord général";
    default:
      return `l’accès au module « ${moduleMetier(exige).label} »`;
  }
}

/**
 * Où déposer quelqu'un qui vient de se connecter, ou qui demande « / ».
 *
 * L'administrateur garde le tableau de bord complet. Un compte à module unique va
 * droit au travail, dans son propre sous-tableau de bord — passer par un hall qui
 * ne proposerait qu'une porte serait un clic pour rien. Les autres voient le hall.
 */
export function pageDArrivee(permissions: string[] | null): string {
  if (!permissions) return ACCUEIL;
  if (permissions.includes("tableau_bord.consulter")) return "/tableau-de-bord";

  const modules = modulesAccordes(permissions);
  return modules.length === 1 ? moduleMetier(modules[0]).accueil : ACCUEIL;
}

/** Deux jeux de permissions décrivent-ils les mêmes droits ? (ordre indifférent) */
export function memesPermissions(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const reference = new Set(a);
  return b.every((cle) => reference.has(cle));
}
