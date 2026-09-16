/**
 * Référentiels métier — les valeurs exactes proposées par l'application desktop.
 *
 * Extraits des listes déroulantes XAML (`DetenuFormView.xaml`, `GestionVisitesView.xaml`,
 * `SuiviMedicalView.xaml`). Ne pas « améliorer » ces libellés : ils sont repris tels
 * quels dans les états officiels imprimés.
 */

import type {
  CategoriePenale,
  RoleUtilisateur,
  StatutDetenu,
  TypeSortie,
  TypeStatutPenal,
} from "./types";

export const SEXES = ["Masculin", "Féminin"] as const;

export const STATUTS_MATRIMONIAUX = [
  "Célibataire",
  "Marié(e)",
  "Divorcé(e)",
  "Veuf(ve)",
] as const;

export const NIVEAUX_ETUDES = [
  "Aucun",
  "Primaire",
  "Secondaire",
  "Supérieur",
] as const;

export const TYPES_MANDAT = [
  "Mandat de détention provisoire",
  "Ordre de garde à vue",
  "Arrêté portant garde à vue administrative",
] as const;

export const TYPES_STATUT_PENAL: readonly TypeStatutPenal[] = [
  "Détention provisoire",
  "Exécution de peine",
  "Appellant",
  "Cassationnaire",
] as const;

export const AUTORITES_PENITENTIAIRES = [
  "Régisseur",
  "Régisseur adjoint",
  "CSAF",
] as const;

export const ETATS_PHYSIQUES_ARRIVEE = [
  "Aucun traumatisme apparent",
  "Blessures",
  "Fractures",
  "Fractures et blessures",
] as const;

export const SITUATIONS_PENALES = [
  "Accusé",
  "Inculpé",
  "Gardé à vue judiciaire",
  "Gardé à vue administrative",
] as const;

export const TYPES_CONSULTATION = [
  "Consultation générale",
  "Contrôle",
  "Urgence",
  "Spécialiste",
  "Psychiatrique",
] as const;

export const TYPES_VISITE = [
  "Parloir familial",
  "Parloir avocat",
  "Salle spécialisée",
  "Bureau administratif",
] as const;

export const LIENS_PARENTE = [
  "Père/Mère",
  "Époux/Épouse",
  "Fils/Fille",
  "Frère/Sœur",
  "Oncle/Tante",
  "Cousin/Cousine",
  "Ami(e)",
  "Avocat",
  "Assistante sociale",
  "Représentant consulaire",
  "Autorités judiciaires",
  "Autre",
] as const;

export const PIECES_IDENTITE = [
  "Carte nationale d'identité",
  "Passeport",
  "Carte consulaire",
  "Attestation d'identité",
] as const;

export const DUREES_VISITE = [15, 30, 45, 60] as const;

export const TYPES_SANCTION = [
  "Avertissement",
  "Privation de visite",
  "Privation de cantine",
  "Mise en cellule disciplinaire",
  "Travaux d'intérêt collectif",
] as const;

export const TYPES_CELLULE = [
  "Standard",
  "Quartier femmes",
  "Quartier mineurs",
  "Infirmerie",
  "Cellule disciplinaire",
] as const;

export const ETATS_A_GENERER = [
  "Fiche signalétique",
  "Extrait du registre d'écrou",
  "Attestation de détention",
  "Fichier des situations pénales",
  "Extrait du registre des sanctions",
] as const;

// ---------------------------------------------------------------------------
// Libellés d'affichage
// ---------------------------------------------------------------------------

export const LIBELLE_STATUT_DETENU: Record<StatutDetenu, string> = {
  Present: "Présent",
  Sorti: "Sorti",
  Transfere: "Transféré",
  EnAttente: "En attente",
  Hospitalise: "Hospitalisé",
  Evasion: "Évadé",
};

export const LIBELLE_CATEGORIE: Record<CategoriePenale, string> = {
  Prevenu: "Prévenu",
  Condamne: "Condamné",
  Appellant: "Appellant",
  Cassationnaire: "Cassationnaire",
  Dpac: "DPAC",
};

/** Explication de la règle de calcul, affichée en aide contextuelle. */
export const REGLE_CATEGORIE: Record<CategoriePenale, string> = {
  Prevenu: "Tous les mandats actifs sont en détention provisoire.",
  Condamne: "Un seul mandat actif, en exécution de peine.",
  Appellant:
    "Au moins un mandat actif en appel, et aucun en exécution de peine.",
  Cassationnaire:
    "Au moins un mandat actif en cassation, et aucun en exécution de peine.",
  Dpac: "Au moins deux mandats actifs, dont un en exécution de peine.",
};

export const LIBELLE_TYPE_SORTIE: Record<TypeSortie, string> = {
  LiberationNormale: "Libération normale",
  Transfert: "Transfert",
  Evasion: "Évasion",
  Deces: "Décès",
};

export const ROLES_UTILISATEUR: readonly RoleUtilisateur[] = ["admin", "agent", "medecin"];

export const LIBELLE_ROLE: Record<RoleUtilisateur, string> = {
  admin: "Administrateur",
  agent: "Agent",
  medecin: "Médecin",
};

/** Descriptions provisoires : la matrice des droits doit être confirmée avec l'API. */
export const DESCRIPTION_ROLE: Record<RoleUtilisateur, string> = {
  admin: "Accès total, y compris au personnel et aux paramètres.",
  agent: "Gestion courante : écrou, mandats, discipline, visites.",
  medecin: "Suivi médical des détenus.",
};

/** Correspondance segment d'URL ↔ catégorie pénale. */
export const SLUG_CATEGORIE: Record<string, CategoriePenale> = {
  prevenus: "Prevenu",
  condamnes: "Condamne",
  appellants: "Appellant",
  cassationnaires: "Cassationnaire",
  dpac: "Dpac",
};

export const CATEGORIE_SLUG: Record<CategoriePenale, string> = {
  Prevenu: "prevenus",
  Condamne: "condamnes",
  Appellant: "appellants",
  Cassationnaire: "cassationnaires",
  Dpac: "dpac",
};

/** Correspondance segment d'URL ↔ type de sortie. */
export const SLUG_TYPE_SORTIE: Record<string, TypeSortie> = {
  normale: "LiberationNormale",
  transfert: "Transfert",
  evasion: "Evasion",
  deces: "Deces",
};
