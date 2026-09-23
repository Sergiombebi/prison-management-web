/**
 * Modules métier — la maille d'habilitation du système.
 *
 * L'administrateur n'attribue plus un rôle (« agent », « médecin ») mais l'accès à
 * un ou plusieurs modules. Un compte peut cumuler Détenus et Visites, n'avoir que
 * le Suivi médical, ou tout avoir. Le rôle ne subsiste que parce que l'API le
 * réclame encore ; il n'est plus saisi nulle part (voir `roleImplicite`).
 *
 * Les rubriques transverses — Tableau de bord général, Édition d'états,
 * Administration — ne sont pas des modules attribuables : elles n'appartiennent
 * qu'à l'administrateur.
 *
 * Ce fichier est la source unique : `lib/acces.ts` s'en sert pour garder les
 * routes, `lib/navigation.ts` pour composer la sidebar, et le formulaire Personnel
 * pour ses cases à cocher. Aucune de ces trois listes ne doit être redite ailleurs.
 */

import type { RoleUtilisateur } from "./types";
import { PERMISSIONS } from "./referentiels";

export type CleModule = "detenus" | "discipline" | "sante" | "visites";

/**
 * Lire le registre d'écrou est le socle commun à tous les modules : affecter une
 * cellule, saisir une consultation ou enregistrer une visite suppose de désigner
 * un détenu. Cette permission accompagne donc chaque module — mais à elle seule
 * elle n'en ouvre aucun, d'où son absence des listes `permissions` ci-dessous.
 */
export const PERMISSION_SOCLE = "detenus.consulter";

export interface ModuleMetier {
  cle: CleModule;
  label: string;
  /** Version courte, pour une puce ou un onglet. */
  labelCourt: string;
  /** Une phrase, telle qu'elle s'affiche en face de la case à cocher. */
  resume: string;
  /** Ce que la personne pourra faire — détaillé sous la case. */
  capacites: string[];
  icone: "detenus" | "discipline" | "sante" | "door";
  /** Sous-tableau de bord du module : là où atterrit quelqu'un qui y a accès. */
  accueil: string;
  /** Écran de travail principal, atteint depuis le sous-tableau de bord. */
  travail: string;
  /** Couleur propre au module — reprend le ton de son icône dans toute l'interface. */
  teinte: { trait: string; voile: string };
  /**
   * Droits propres au module, accordés en bloc. Ils servent aussi de signature :
   * détenir l'un d'eux, c'est avoir ce module (voir `aLeModule`). Le socle en est
   * volontairement exclu, sans quoi les quatre modules seraient indiscernables.
   */
  permissions: string[];
}

export const MODULES_METIER: ModuleMetier[] = [
  {
    cle: "detenus",
    label: "Gestion des détenus",
    labelCourt: "Détenus",
    resume: "Registre d’écrou, mandats et procédures de sortie",
    capacites: [
      "Écrouer, modifier et consulter les dossiers",
      "Gérer les mandats de dépôt et titres de détention",
      "Enregistrer libérations, transferts, évasions et décès",
    ],
    icone: "detenus",
    accueil: "/detenus/apercu",
    travail: "/detenus",
    teinte: { trait: "var(--sgp-info)", voile: "var(--sgp-info-soft)" },
    permissions: [
      "detenus.creer",
      "detenus.modifier",
      "detenus.desactiver",
      "detenus.restaurer",
      "detenus.mandats.gerer",
      "detenus.sorties.enregistrer",
    ],
  },
  {
    cle: "discipline",
    label: "Discipline",
    labelCourt: "Discipline",
    resume: "Logement, affectations et sanctions disciplinaires",
    capacites: [
      "Créer des cellules et suivre leur occupation",
      "Affecter et réaffecter les détenus",
      "Prononcer, modifier et clore les sanctions",
    ],
    icone: "discipline",
    accueil: "/discipline",
    travail: "/discipline/cellules",
    teinte: { trait: "var(--sgp-warning)", voile: "var(--sgp-warning-soft)" },
    permissions: [
      "discipline.cellules.consulter",
      "discipline.cellules.gerer",
      "discipline.affectations.gerer",
      "discipline.sanctions.consulter",
      "discipline.sanctions.creer",
      "discipline.sanctions.modifier",
      "discipline.sanctions.terminer",
      "discipline.sanctions.annuler",
      "discipline.types_sanction.gerer",
    ],
  },
  {
    cle: "sante",
    label: "Suivi médical",
    labelCourt: "Suivi médical",
    resume: "Consultations, diagnostics et traitements prescrits",
    capacites: [
      "Consulter le dossier médical des détenus",
      "Saisir une consultation et prescrire un traitement",
      "Enregistrer les évacuations sanitaires et leur retour",
    ],
    icone: "sante",
    accueil: "/sante/suivi-medical/apercu",
    travail: "/sante/suivi-medical",
    teinte: { trait: "var(--sgp-viz-5)", voile: "var(--sgp-viz-5-soft)" },
    permissions: [
      "sante.consultations.consulter",
      "sante.consultations.creer",
      "sante.dossier_medical.gerer",
      "sante.evacuations.consulter",
      "sante.evacuations.creer",
    ],
  },
  {
    cle: "visites",
    label: "Visites",
    labelCourt: "Visites",
    resume: "Parloirs, visiteurs et contrôles de sécurité",
    capacites: [
      "Enregistrer une visite et son visiteur",
      "Consigner les contrôles de sécurité et les objets déposés",
      "Éditer le ticket de parloir",
    ],
    icone: "door",
    accueil: "/sante/visites/apercu",
    travail: "/sante/visites",
    teinte: { trait: "var(--sgp-viz-4)", voile: "var(--sgp-viz-4-soft)" },
    permissions: ["visites.consulter", "visites.creer"],
  },
];

export const CLES_MODULES: CleModule[] = MODULES_METIER.map((m) => m.cle);

export function moduleMetier(cle: CleModule): ModuleMetier {
  // Non-null assuré par le type : `cle` ne peut venir que de CLES_MODULES.
  return MODULES_METIER.find((m) => m.cle === cle)!;
}

/**
 * Rubriques réservées à l'administrateur. Elles ne s'attribuent pas module par
 * module : c'est l'habilitation d'administration, ou rien.
 */
export const PERMISSIONS_ADMINISTRATION = [
  "tableau_bord.consulter",
  "etats.consulter",
  "administration.personnel.gerer",
  "administration.parametres.gerer",
];

/** Toutes les permissions du catalogue — ce que détient un administrateur. */
export const TOUTES_PERMISSIONS: string[] = PERMISSIONS.flatMap((groupe) =>
  groupe.permissions.map((p) => p.cle),
);

/**
 * Ce compte a-t-il ce module ? Une seule de ses permissions propres suffit : un
 * compte créé avant ce modèle peut n'en détenir qu'une partie, et le priver du
 * module qu'il utilise déjà serait pire que de l'y laisser entrer.
 */
export function aLeModule(permissions: string[], cle: CleModule): boolean {
  return moduleMetier(cle).permissions.some((p) => permissions.includes(p));
}

export function modulesAccordes(permissions: string[]): CleModule[] {
  return CLES_MODULES.filter((cle) => aLeModule(permissions, cle));
}

/** L'habilitation d'administration : Personnel, Paramètres, états, tableau de bord. */
export function estAdministrateur(permissions: string[]): boolean {
  return (
    permissions.includes("administration.personnel.gerer") ||
    permissions.includes("administration.parametres.gerer")
  );
}

/**
 * Traduit une sélection de l'écran Personnel en permissions pour l'API.
 *
 * Tout module entraîne le socle : sans lui, le sélecteur de détenus des
 * formulaires resterait vide et l'écran afficherait « Droit manquant ».
 */
export function permissionsPourAcces(
  modules: CleModule[],
  administrateur: boolean,
): string[] {
  if (administrateur) return [...TOUTES_PERMISSIONS];
  if (modules.length === 0) return [];

  const accordees = new Set<string>([PERMISSION_SOCLE]);
  for (const cle of modules) {
    for (const p of moduleMetier(cle).permissions) accordees.add(p);
  }
  // On garde l'ordre du catalogue : deux enregistrements identiques produisent la
  // même liste, ce qui évite de faux « droits modifiés » au rechargement.
  return TOUTES_PERMISSIONS.filter((p) => accordees.has(p));
}

/**
 * L'API exige encore un `role` (`admin` | `agent` | `medecin`) alors que l'interface
 * ne le demande plus. On le déduit des accès, uniquement pour satisfaire la
 * validation : côté API le rôle n'est qu'une étiquette, les droits viennent des
 * permissions. À retirer le jour où la route acceptera un rôle absent.
 */
export function roleImplicite(
  modules: CleModule[],
  administrateur: boolean,
): RoleUtilisateur {
  if (administrateur) return "admin";
  if (modules.length === 1 && modules[0] === "sante") return "medecin";
  return "agent";
}
