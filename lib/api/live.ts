/**
 * Adaptateur LIVE — appelle l'API Laravel réelle.
 *
 * C'est le seul fichier qui connaît la forme exacte de l'API : routes, snake_case,
 * enveloppes `{ data, meta }`, valeurs de rôles… Les écrans ne consomment que les
 * types de `contract.ts`.
 *
 * Référence : docs/GUIDE_FRONTEND.md du dépôt `prison-management-api`.
 * Les routes absentes de l'API (visites, suivi médical, tableau de bord…)
 * lèvent une erreur explicite : leur domaine doit rester en démonstration.
 */

import "server-only";

import { redirect } from "next/navigation";
import type {
  Affectation,
  CategoriePenale,
  Cellule,
  DetenuResume,
  FiltreDetenus,
  Mandas,
  RoleUtilisateur,
  Sanction,
  Sexe,
  SortieDetenu,
  SuiviMedical,
  TableauDeBord,
  TypeSortie,
  TypeStatutPenal,
  Visite,
} from "@/lib/domain/types";
import { CATEGORIE_SLUG, ROLES_UTILISATEUR } from "@/lib/domain/referentiels";
import { getJeton } from "@/lib/session";
import {
  ApiErreur,
  type ApiClient,
  type DossierDetenu,
  type EntreeDetenu,
  type EntreeMandat,
  type MandatDetaille,
  type ProfilUtilisateur,
} from "./contract";

/*
 * 127.0.0.1 plutôt que localhost : sous Windows, Node peut résoudre « localhost » en
 * IPv6 (::1) alors que `php artisan serve` n'écoute qu'en IPv4.
 */
const BASE_URL = process.env.SGP_API_URL ?? "http://127.0.0.1:8000/api/v1";

interface OptionsRequete extends RequestInit {
  query?: Record<string, unknown>;
  /**
   * Sur un 401, renvoyer vers /deconnexion pour nettoyer la session (par défaut).
   * À désactiver quand l'appelant gère lui-même le 401 : connexion, déconnexion,
   * vérification de session dans le layout.
   */
  redigerSur401?: boolean;
  /** Un 404 renvoie `null` au lieu de lever — réservé aux routes de détail. */
  nullSur404?: boolean;
  /** Corps `FormData` : ne pas poser de Content-Type, la frontière est calculée. */
  multipart?: boolean;
}

async function requete<T>(
  chemin: string,
  { query, redigerSur401 = true, nullSur404 = false, multipart = false, ...init }: OptionsRequete = {},
): Promise<T> {
  const url = new URL(chemin.replace(/^\//, ""), BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`);
  for (const [cle, valeur] of Object.entries(query ?? {})) {
    if (valeur !== undefined && valeur !== null && valeur !== "") {
      url.searchParams.set(cle, String(valeur));
    }
  }

  const jeton = await getJeton();

  let reponse: Response;
  try {
    reponse = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !multipart ? { "Content-Type": "application/json" } : {}),
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiErreur(
      `Le serveur de l'API est injoignable (${url.origin}). Vérifiez qu'il est démarré.`,
      0,
      "RESEAU",
    );
  }

  if (reponse.status === 401 && redigerSur401) {
    // Jeton expiré ou révoqué. redirect() lève une exception de contrôle : ne jamais
    // envelopper un appel api.* dans un try/catch qui avalerait toutes les erreurs.
    redirect("/deconnexion?raison=expiree");
  }

  if (reponse.status === 404 && nullSur404) return null as T;

  if (!reponse.ok) {
    let message = `Erreur ${reponse.status}`;
    let erreurs: Record<string, string[]> | undefined;
    let conflit: Record<string, unknown> | undefined;
    try {
      const corps = await reponse.json();
      erreurs = corps?.errors;
      conflit = corps?.conflict;
      // Laravel (422) : { message, errors: { champ: ["…"] } } — la première erreur est la plus lisible
      const premiere = erreurs ? Object.values(erreurs).flat()[0] : undefined;
      message = premiere ?? corps?.message ?? message;

      // Une erreur serveur expose souvent la requête SQL et le chemin de la base :
      // on la consigne côté serveur et on montre un message sobre à l'utilisateur.
      if (reponse.status >= 500) {
        console.error(`[SGP] ${reponse.status} sur ${url.pathname} :`, message);
        message = `L'API a renvoyé une erreur interne (${reponse.status}) sur ${url.pathname}. Le détail est consigné côté serveur.`;
      }
    } catch {
      /* corps non JSON : on garde le message générique */
    }
    throw new ApiErreur(message, reponse.status, undefined, erreurs, conflit);
  }

  const texte = await reponse.text();
  return (texte ? JSON.parse(texte) : undefined) as T;
}

/** Pagination Laravel : `meta` accompagne toute liste paginée. */
interface MetaPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

/**
 * Parcourt toutes les pages d'une liste. Le plafond évite une boucle sans fin si
 * l'API renvoyait un `last_page` incohérent ; il reste large pour un établissement.
 */
async function toutesLesPages<T>(
  chemin: string,
  query: Record<string, unknown> = {},
  maxPages = 50,
): Promise<T[]> {
  const tous: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const corps = await requete<{ data: T[]; meta?: MetaPagination }>(chemin, {
      query: { ...query, page },
    });
    tous.push(...(corps?.data ?? []));
    if (!corps?.meta || page >= corps.meta.last_page) break;
  }
  return tous;
}

/** Retire les clés vides : l'API applique alors ses propres valeurs par défaut. */
export function sansVides(corps: Record<string, unknown>): Record<string, unknown> {
  for (const cle of Object.keys(corps)) {
    if (corps[cle] === undefined || corps[cle] === null || corps[cle] === "") delete corps[cle];
  }
  return corps;
}

/** Route décrite dans le guide mais pas encore livrée par l'API. */
function nonLivre(route: string): never {
  throw new ApiErreur(
    `La route ${route} n'existe pas encore dans l'API. Ce module doit rester en données de démonstration.`,
    501,
    "NON_LIVRE",
  );
}

// ---------------------------------------------------------------------------
// Authentification — GUIDE_FRONTEND.md §1
// ---------------------------------------------------------------------------

/** Utilisateur tel que renvoyé par Laravel. */
export interface UtilisateurApi {
  id: number;
  nom: string;
  prenom: string;
  username: string;
  email: string | null;
  role: string;
  est_actif: boolean;
}

function versRole(role: string): RoleUtilisateur {
  if ((ROLES_UTILISATEUR as readonly string[]).includes(role)) return role as RoleUtilisateur;
  // Rôle inconnu du front : aucun droit d'administration plutôt qu'un plantage
  console.warn(`[SGP] Rôle API inconnu « ${role} » : traité comme « agent ».`);
  return "agent";
}

export function versProfil(u: UtilisateurApi): ProfilUtilisateur {
  return {
    id: u.id,
    username: u.username,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email ?? null,
    role: versRole(u.role),
    estActif: u.est_actif !== false,
  };
}

// ---------------------------------------------------------------------------
// Détenus — GUIDE_FRONTEND.md §3 et §4
// ---------------------------------------------------------------------------

/** Taille de page fixée par l'API sur `GET /detenus` (non paramétrable). */
const PAGE_API_DETENUS = 10;

/** Vue résumée renvoyée par `GET /detenus` (colonnes de l'ancienne app C#). */
export interface DetenuListeApi {
  id: number;
  numero_ecrou: string;
  nom: string;
  sexe: string;
  date_naissance: string | null;
  lieu_naissance: string;
  nationalite: string | null;
  profession: string;
  contact: string | null;
  statut_penal: string | null;
  date_incarceration: string | null;
  motif_detention: string | null;
  type_mandat: string | null;
  categorie_penale?: string | null;
  cellule_actuelle?: { id: number; numero: string; bloc: string | null } | null;
  est_present: boolean;
}

export interface MandasApi {
  id: number;
  detenu_id: number;
  type_statut_penal: string | null;
  date_incarceration: string | null;
  autorite_signataire: string | null;
  motif_detention: string | null;
  type_mandat: string | null;
  reference_mandat: string | null;
  date_signature_mandat: string | null;
  date_expiration_mandat: string | null;
  observations_statut: string | null;
  objets_personnels: string | null;
  autorite_penitentiaire: string | null;
  etat_physique_arrivee: string | null;
  date_jugement: string | null;
  reference_jugement: string | null;
  tribunal_jugement: string | null;
  motif_jugement: string | null;
  peine_prononcee: string | null;
  date_appel: string | null;
  tribunal_appel: string | null;
  decision_appel: string | null;
  observations_appel: string | null;
  date_cassation: string | null;
  tribunal_cassation: string | null;
  decision_cassation: string | null;
  observations_cassation: string | null;
  est_actif: boolean;
}

// La fiche détaillée renvoie l'affectation complète là où la liste n'en donne que
// la cellule, et calcule la catégorie depuis les mandats déjà chargés.
export interface DetenuDetailApi
  extends Omit<
    DetenuListeApi,
    "contact" | "statut_penal" | "date_incarceration" | "motif_detention" | "type_mandat" | "categorie_penale" | "cellule_actuelle"
  > {
  age: number | null;
  langue: string | null;
  ethnie: string | null;
  religion: string | null;
  departement: string | null;
  arrondissement: string | null;
  residence: string | null;
  statut_matrimonial: string | null;
  nombre_enfants: number | null;
  niveau_etudes: string | null;
  numero_cni: string | null;
  numero_passeport: string | null;
  nom_pere: string;
  nom_mere: string;
  contact_urgence: {
    nom: string | null;
    lien_parente: string | null;
    telephone: string | null;
    adresse: string | null;
  } | null;
  photo_face_url: string | null;
  photo_profil_url: string | null;
  anthropometrie: string | null;
  mandas?: MandasApi[];
  sanctions?: SanctionApi[];
  cellule_actuelle?: AffectationApi | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CelluleApi {
  id: number;
  numero: string;
  bloc: string | null;
  type_cellule: string | null;
  capacite_max: number;
  effectif_actuel: number;
  places_disponibles: number;
}

export interface AffectationApi {
  id: number;
  detenu_id: number;
  cellule?: { id: number; numero: string; bloc: string | null };
  date_affectation: string | null;
  date_fin: string | null;
  est_active: boolean;
  motif_affectation: string | null;
}

export interface TableauDeBordApi {
  genere_le: string;
  effectif: number;
  capacite_totale: number;
  taux_occupation: number;
  effectif_mois_precedent: number;
  visites_aujourdhui: number;
  sorties_prevues_mois_prochain: number;
  mandats_expires: number;
  sanctions_en_cours: number;
  mouvements: {
    incarcerations: number;
    liberations: number;
    transferements: number;
    evasions: number;
    deces: number;
  };
  /** Clés déjà dans la casse du front : Prevenu, Condamne, Appellant… */
  effectifs_par_categorie: Record<string, number>;
  population_derniers_mois: Array<{ label: string; population: number }>;
  liberables_ce_mois: Array<{
    numero_ecrou: string;
    nom: string;
    date_incarceration: string | null;
    date_expiration: string | null;
    statut: string | null;
  }>;
}

export interface SanctionApi {
  id: number;
  detenu_id: number;
  detenu?: { id: number; numero_ecrou: string; nom: string };
  type_sanction?: { id: number; libelle: string };
  motif: string | null;
  date_faute: string | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: string | null;
  est_actif: boolean;
  cellule_disciplinaire?: { id: number; numero: string; bloc: string | null } | null;
  cellule_origine?: { id: number; numero: string; bloc: string | null } | null;
  affectation_disciplinaire_active?: boolean;
  created_at: string | null;
}

export interface SuiviMedicalApi {
  id: number;
  detenu_id: number;
  detenu?: { id: number; numero_ecrou: string; nom: string };
  date_consultation: string | null;
  type_consultation: string;
  nom_medecin: string;
  temperature: string | null;
  tension_arterielle: string | null;
  poids: string | null;
  symptomes: string | null;
  diagnostic: string | null;
  medicaments_prescrits: string | null;
  duree_traitement: string | null;
  date_suivi: string | null;
  observations: string | null;
}

export interface VisiteApi {
  id: number;
  detenu_id: number;
  detenu?: { id: number; numero_ecrou: string; nom: string };
  date_visite: string | null;
  heure_arrivee: string;
  duree_prevue_minutes: number;
  type_visite: string;
  lieu_visite: string | null;
  autorisation_prealable: boolean;
  nom_visiteur: string;
  sexe_visiteur: string;
  type_piece_identite: string;
  numero_piece_identite: string;
  telephone_visiteur: string | null;
  lien_parente: string;
  adresse_visiteur: string | null;
  agent_controle: string;
  objets_deposes: string | null;
  fouille_corporelle: boolean | null;
  observations_securite: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  observations_visite: string | null;
}

export interface SortieApi {
  id: number;
  detenu_id: number;
  detenu?: { id: number; numero_ecrou: string; nom: string };
  mandas_id: number | null;
  mandas?: { id: number; type_statut_penal: string | null; reference_mandat: string | null } | null;
  type_sortie: string;
  date_sortie: string | null;
  motif: string | null;
  destination: string | null;
  cause: string | null;
  observation: string | null;
  sortie_definitive: boolean;
  created_at: string | null;
}

/** Valeur de `type_sortie` dans les réponses et dans le filtre de l'archive. */
const TYPE_SORTIE_API: Record<TypeSortie, string> = {
  LiberationNormale: "liberation_normale",
  Deces: "deces",
  Transfert: "transfert",
  Evasion: "evasion",
};

/** Segment d'URL de création — avec un tiret, contrairement à la valeur ci-dessus. */
const ROUTE_SORTIE: Record<TypeSortie, string> = {
  LiberationNormale: "liberation-normale",
  Deces: "deces",
  Transfert: "transfert",
  Evasion: "evasion",
};

const libelleCellule = (c: { numero: string; bloc: string | null }) =>
  c.bloc ? `${c.bloc} · ${c.numero}` : c.numero;

export function versCellule(c: CelluleApi): Cellule {
  return {
    id: c.id,
    numero: c.numero,
    bloc: c.bloc,
    typeCellule: c.type_cellule,
    capaciteMax: c.capacite_max,
    // L'API ne stocke aucun effectif théorique : l'occupation est toujours calculée
    effectifTheorique: c.effectif_actuel,
    effectifReel: c.effectif_actuel,
  };
}

export function versAffectation(a: AffectationApi, detenu: { nom: string; numeroEcrou: string }): Affectation {
  return {
    id: a.id,
    detenuId: a.detenu_id,
    detenuNom: detenu.nom,
    numeroEcrou: detenu.numeroEcrou,
    celluleId: a.cellule?.id ?? 0,
    celluleLibelle: a.cellule ? libelleCellule(a.cellule) : "—",
    dateAffectation: a.date_affectation ?? "",
    motifAffectation: a.motif_affectation,
    dateFin: a.date_fin,
  };
}

/** Catégorie pénale : l'API renvoie son propre code (« prevenus »), le front son nom. */
const CATEGORIE_DEPUIS_SLUG = Object.fromEntries(
  Object.entries(CATEGORIE_SLUG).map(([categorie, slug]) => [slug, categorie as CategoriePenale]),
) as Record<string, CategoriePenale>;

export function versSanction(s: SanctionApi, detenu?: { nom: string; numeroEcrou: string }): Sanction {
  const statut = s.statut as Sanction["statut"];
  return {
    id: s.id,
    detenuId: s.detenu_id,
    detenuNom: s.detenu?.nom ?? detenu?.nom ?? "",
    numeroEcrou: s.detenu?.numero_ecrou ?? detenu?.numeroEcrou ?? "",
    celluleId: s.cellule_disciplinaire?.id ?? null,
    celluleLibelle: s.cellule_disciplinaire ? libelleCellule(s.cellule_disciplinaire) : null,
    dateFaute: s.date_faute ?? "",
    dateDebut: s.date_debut ?? "",
    dateFin: s.date_fin,
    typeSanction: s.type_sanction?.libelle ?? null,
    motif: s.motif,
    // Une fiche désactivée est une saisie annulée, quoi que disent ses dates
    statut: s.est_actif === false ? "Annulée" : (statut ?? null),
    dateCreation: s.created_at ?? "",
    estActif: s.est_actif,
    isolementEnCours: s.affectation_disciplinaire_active ?? false,
    celluleOrigine: s.cellule_origine
      ? { id: s.cellule_origine.id, libelle: libelleCellule(s.cellule_origine) }
      : null,
  };
}

export function versSuiviMedical(s: SuiviMedicalApi, detenu?: { nom: string; numeroEcrou: string }): SuiviMedical {
  return {
    id: s.id,
    detenuId: s.detenu_id,
    detenuNom: s.detenu?.nom ?? detenu?.nom ?? "",
    numeroEcrou: s.detenu?.numero_ecrou ?? detenu?.numeroEcrou ?? "",
    dateConsultation: s.date_consultation ?? "",
    typeConsultation: s.type_consultation,
    nomMedecin: s.nom_medecin,
    temperature: s.temperature,
    tensionArterielle: s.tension_arterielle,
    poids: s.poids,
    symptomes: s.symptomes,
    diagnostic: s.diagnostic,
    medicamentsPrescrits: s.medicaments_prescrits,
    dureeTraitement: s.duree_traitement,
    dateSuivi: s.date_suivi,
    observations: s.observations,
  };
}

export function versVisite(v: VisiteApi, detenu?: { nom: string; numeroEcrou: string }): Visite {
  return {
    id: v.id,
    detenuId: v.detenu_id,
    detenuNom: v.detenu?.nom ?? detenu?.nom ?? "",
    numeroEcrou: v.detenu?.numero_ecrou ?? detenu?.numeroEcrou ?? "",
    dateVisite: v.date_visite ?? "",
    heureArrivee: v.heure_arrivee,
    dureePrevueMinutes: v.duree_prevue_minutes,
    typeVisite: v.type_visite,
    lieuVisite: v.lieu_visite ?? "",
    autorisationPrealable: v.autorisation_prealable,
    nomVisiteur: v.nom_visiteur,
    sexeVisiteur: versSexe(v.sexe_visiteur),
    typePieceIdentite: v.type_piece_identite,
    numeroPieceIdentite: v.numero_piece_identite,
    telephoneVisiteur: v.telephone_visiteur,
    lienParente: v.lien_parente,
    adresseVisiteur: v.adresse_visiteur,
    agentControle: v.agent_controle,
    objetsDeposes: v.objets_deposes,
    fouilleCorporelle: v.fouille_corporelle,
    observationsSecurite: v.observations_securite,
    heureDebut: v.heure_debut,
    heureFin: v.heure_fin,
    observationsVisite: v.observations_visite,
  };
}

export function versTableauDeBord(d: TableauDeBordApi): TableauDeBord {
  const categories = Object.fromEntries(
    (Object.keys(CATEGORIE_SLUG) as CategoriePenale[]).map((c) => [c, d.effectifs_par_categorie?.[c] ?? 0]),
  ) as Record<CategoriePenale, number>;

  return {
    genereLe: d.genere_le,
    effectif: d.effectif,
    capaciteTotale: d.capacite_totale,
    tauxOccupation: d.taux_occupation,
    effectifMoisPrecedent: d.effectif_mois_precedent,
    visitesAujourdhui: d.visites_aujourdhui,
    sortiesPrevuesMoisProchain: d.sorties_prevues_mois_prochain,
    mandatsExpires: d.mandats_expires,
    sanctionsEnCours: d.sanctions_en_cours,
    mouvements: d.mouvements,
    effectifsParCategorie: categories,
    populationDerniersMois: d.population_derniers_mois ?? [],
    liberablesCeMois: (d.liberables_ce_mois ?? []).map((l) => ({
      numeroEcrou: l.numero_ecrou,
      nom: l.nom,
      dateIncarceration: l.date_incarceration ?? "",
      dateExpiration: l.date_expiration ?? "",
      statut: l.statut ?? "",
    })),
  };
}

export function versSortie(x: SortieApi, detenu?: { nom: string; numeroEcrou: string }): SortieDetenu {
  const type = (Object.keys(TYPE_SORTIE_API) as TypeSortie[]).find(
    (t) => TYPE_SORTIE_API[t] === x.type_sortie,
  );
  return {
    id: x.id,
    detenuId: x.detenu_id,
    detenuNom: x.detenu?.nom ?? detenu?.nom ?? "",
    numeroEcrou: x.detenu?.numero_ecrou ?? detenu?.numeroEcrou ?? "",
    typeSortie: type ?? "LiberationNormale",
    dateSortie: x.date_sortie ?? "",
    situationPenale: x.mandas?.type_statut_penal ?? null,
    motif: x.motif,
    destination: x.destination,
    cause: x.cause,
    observation: x.observation,
    dateEnregistrement: x.created_at ?? "",
    definitive: x.sortie_definitive,
  };
}

const versSexe = (s: string): Sexe => (s === "Féminin" ? "Féminin" : "Masculin");

/**
 * Un mandat est actif si l'API ne l'a pas désactivé ET que sa date d'expiration
 * n'est pas passée — même règle que l'ancienne application desktop.
 */
export function mandatActif(m: MandasApi): boolean {
  if (!m.est_actif) return false;
  if (!m.date_expiration_mandat) return true;
  return new Date(m.date_expiration_mandat) > new Date();
}

export function versMandas(m: MandasApi): Mandas {
  return {
    id: m.id,
    detenuId: m.detenu_id,
    dateIncarceration: m.date_incarceration ?? "",
    autoriteSignataire: m.autorite_signataire,
    motifDetention: m.motif_detention,
    typeMandat: m.type_mandat,
    referenceMandat: m.reference_mandat,
    dateSignatureMandat: m.date_signature_mandat,
    dateSortieMandat: m.date_expiration_mandat,
    observationsStatut: m.observations_statut,
    objetsPersonnels: m.objets_personnels,
    autoritePenitentiaire: m.autorite_penitentiaire,
    etatPhysiqueArrivee: m.etat_physique_arrivee,
    typeStatutPenal: (m.type_statut_penal as TypeStatutPenal | null) ?? null,
    dateJugement: m.date_jugement,
    referenceJugement: m.reference_jugement,
    tribunalJugement: m.tribunal_jugement,
    motifJugement: m.motif_jugement,
    peinePrononcee: m.peine_prononcee,
    dateAppel: m.date_appel,
    tribunalAppel: m.tribunal_appel,
    decisionAppel: m.decision_appel,
    observationsAppel: m.observations_appel,
    dateCassation: m.date_cassation,
    tribunalCassation: m.tribunal_cassation,
    decisionCassation: m.decision_cassation,
    observationsCassation: m.observations_cassation,
  };
}

/**
 * Ligne de liste → résumé attendu par les écrans.
 *
 * L'échéance du mandat reste nulle : elle n'est pas dans la liste, seulement sur
 * la fiche. L'écran masque cette colonne en mode réel plutôt que d'inventer.
 */
export function versResume(d: DetenuListeApi): DetenuResume {
  const aMandat = Boolean(d.date_incarceration || d.statut_penal);
  return {
    id: d.id,
    numeroEcrou: d.numero_ecrou,
    nom: d.nom,
    sexe: versSexe(d.sexe),
    dateNaissance: d.date_naissance ?? "",
    lieuNaissance: d.lieu_naissance,
    age: null,
    nationalite: d.nationalite,
    langue: null,
    ethnie: null,
    religion: null,
    profession: d.profession,
    departement: null,
    arrondissement: null,
    residence: null,
    statutMatrimonial: null,
    nombreEnfants: null,
    niveauEtudes: null,
    numeroCNI: null,
    numeroPasseport: null,
    contact: d.contact,
    nomPere: "",
    nomMere: "",
    photoFaceUrl: null,
    photoProfilUrl: null,
    anthropometrie: null,
    statut: d.est_present ? "Present" : "Sorti",
    dateCreation: "",
    dateModification: null,
    categoriePenale: d.categorie_penale ? (CATEGORIE_DEPUIS_SLUG[d.categorie_penale] ?? null) : null,
    nombreMandatsActifs: aMandat ? 1 : 0,
    mandatCourant: aMandat
      ? {
          id: 0,
          dateIncarceration: d.date_incarceration ?? "",
          typeMandat: d.type_mandat,
          motifDetention: d.motif_detention,
          dateSortieMandat: null,
          typeStatutPenal: (d.statut_penal as TypeStatutPenal | null) ?? null,
        }
      : null,
    cellule: d.cellule_actuelle
      ? { id: d.cellule_actuelle.id, numero: d.cellule_actuelle.numero, bloc: d.cellule_actuelle.bloc }
      : null,
  };
}

/** Fiche complète → résumé, mandats compris (là, tout est disponible). */
export function versResumeDetail(d: DetenuDetailApi, mandats: MandatDetaille[]): DetenuResume {
  // `actif` tient compte de la désactivation par l'API, pas seulement de l'échéance
  const actifs = mandats
    .filter((m) => m.actif)
    .sort((a, b) => b.dateIncarceration.localeCompare(a.dateIncarceration));
  const courant = actifs[0] ?? null;

  return {
    id: d.id,
    numeroEcrou: d.numero_ecrou,
    nom: d.nom,
    sexe: versSexe(d.sexe),
    dateNaissance: d.date_naissance ?? "",
    lieuNaissance: d.lieu_naissance,
    age: d.age !== null && d.age !== undefined ? String(d.age) : null,
    nationalite: d.nationalite,
    langue: d.langue,
    ethnie: d.ethnie,
    religion: d.religion,
    profession: d.profession,
    departement: d.departement,
    arrondissement: d.arrondissement,
    residence: d.residence,
    statutMatrimonial: d.statut_matrimonial,
    nombreEnfants: d.nombre_enfants !== null && d.nombre_enfants !== undefined ? String(d.nombre_enfants) : null,
    niveauEtudes: d.niveau_etudes,
    numeroCNI: d.numero_cni,
    numeroPasseport: d.numero_passeport,
    contact: d.contact_urgence?.telephone ?? null,
    contactUrgence: {
      nom: d.contact_urgence?.nom ?? null,
      lienParente: d.contact_urgence?.lien_parente ?? null,
      telephone: d.contact_urgence?.telephone ?? null,
      adresse: d.contact_urgence?.adresse ?? null,
    },
    nomPere: d.nom_pere,
    nomMere: d.nom_mere,
    photoFaceUrl: d.photo_face_url,
    photoProfilUrl: d.photo_profil_url,
    anthropometrie: d.anthropometrie,
    statut: d.est_present ? "Present" : "Sorti",
    dateCreation: d.created_at ?? "",
    dateModification: d.updated_at ?? null,
    categoriePenale: null,
    nombreMandatsActifs: actifs.length,
    mandatCourant: courant
      ? {
          id: courant.id,
          dateIncarceration: courant.dateIncarceration,
          typeMandat: courant.typeMandat,
          motifDetention: courant.motifDetention,
          dateSortieMandat: courant.dateSortieMandat,
          typeStatutPenal: courant.typeStatutPenal,
        }
      : null,
    cellule: d.cellule_actuelle?.cellule
      ? {
          id: d.cellule_actuelle.cellule.id,
          numero: d.cellule_actuelle.cellule.numero,
          bloc: d.cellule_actuelle.cellule.bloc,
        }
      : null,
  };
}

/**
 * Corps JSON attendu par l'API pour un détenu.
 *
 * À la création, les clés vides ne partent pas. En mise à jour, l'API ne touche
 * qu'aux clés reçues : un champ que l'agent a vidé doit donc partir à `null`, sinon
 * l'ancienne valeur resterait en base. Les photos ne partent que si une nouvelle a
 * été déposée.
 */
export function versCorpsDetenu(e: EntreeDetenu, mode: "creation" | "maj" = "creation"): Record<string, unknown> {
  const corps: Record<string, unknown> = {
    numero_ecrou: e.numeroEcrou,
    nom: e.nom,
    sexe: e.sexe,
    date_naissance: e.dateNaissance,
    lieu_naissance: e.lieuNaissance,
    profession: e.profession,
    nom_pere: e.nomPere,
    nom_mere: e.nomMere,
    nationalite: e.nationalite,
    langue: e.langue,
    ethnie: e.ethnie,
    religion: e.religion,
    departement: e.departement,
    arrondissement: e.arrondissement,
    residence: e.residence,
    statut_matrimonial: e.statutMatrimonial,
    nombre_enfants: e.nombreEnfants,
    niveau_etudes: e.niveauEtudes,
    numero_cni: e.numeroCNI,
    numero_passeport: e.numeroPasseport,
    anthropometrie: e.anthropometrie,
    contact_urgence_nom: e.contactUrgence?.nom,
    contact_urgence_lien_parente: e.contactUrgence?.lienParente,
    contact_urgence_telephone: e.contactUrgence?.telephone,
    contact_urgence_adresse: e.contactUrgence?.adresse,
  };

  // L'URL et le public_id voyagent toujours ensemble, ou pas du tout
  if (e.photoFace) {
    corps.photo_face_url = e.photoFace.url;
    corps.photo_face_public_id = e.photoFace.publicId;
  }
  if (e.photoProfil) {
    corps.photo_profil_url = e.photoProfil.url;
    corps.photo_profil_public_id = e.photoProfil.publicId;
  }

  if (mode === "maj") {
    for (const cle of Object.keys(corps)) {
      if (corps[cle] === undefined || corps[cle] === "") corps[cle] = null;
    }
    return corps;
  }
  return sansVides(corps);
}

/** Corps JSON attendu par l'API pour un mandat. */
export function versCorpsMandat(e: EntreeMandat): Record<string, unknown> {
  const corps: Record<string, unknown> = {
    type_statut_penal: e.typeStatutPenal,
    date_incarceration: e.dateIncarceration,
    autorite_signataire: e.autoriteSignataire,
    motif_detention: e.motifDetention,
    type_mandat: e.typeMandat,
    reference_mandat: e.referenceMandat,
    date_signature_mandat: e.dateSignatureMandat,
    date_expiration_mandat: e.dateExpirationMandat,
    objets_personnels: e.objetsPersonnels,
    autorite_penitentiaire: e.autoritePenitentiaire,
    etat_physique_arrivee: e.etatPhysiqueArrivee,
    observations_statut: e.observationsStatut,
    date_jugement: e.dateJugement,
    reference_jugement: e.referenceJugement,
    tribunal_jugement: e.tribunalJugement,
    motif_jugement: e.motifJugement,
    peine_prononcee: e.peinePrononcee,
    date_appel: e.dateAppel,
    tribunal_appel: e.tribunalAppel,
    decision_appel: e.decisionAppel,
    observations_appel: e.observationsAppel,
    date_cassation: e.dateCassation,
    tribunal_cassation: e.tribunalCassation,
    decision_cassation: e.decisionCassation,
    observations_cassation: e.observationsCassation,
  };
  return sansVides(corps);
}

export const liveApi: ApiClient = {
  async connexion(identifiant, motDePasse) {
    const corps = await requete<{ user?: UtilisateurApi; token?: string } | null>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifiant, password: motDePasse }),
      redigerSur401: false,
    });
    if (!corps?.token || !corps.user) {
      throw new ApiErreur("Réponse de connexion inattendue de l'API.", 502, "REPONSE_INVALIDE");
    }
    if (corps.user.est_actif === false) {
      throw new ApiErreur("Ce compte est désactivé.", 403, "COMPTE_INACTIF");
    }
    return { utilisateur: versProfil(corps.user), jeton: corps.token };
  },

  async deconnexion() {
    await requete("/auth/logout", { method: "POST", redigerSur401: false });
  },

  async getUtilisateurCourant() {
    const corps = await requete<Record<string, unknown> | null>("/auth/me", { redigerSur401: false });
    // Le guide ne précise pas l'enveloppe de /auth/me : { user }, { data } ou l'objet nu
    const brut = (corps?.user ?? corps?.data ?? corps) as UtilisateurApi | null;
    if (!brut?.id) {
      throw new ApiErreur("Réponse /auth/me inattendue de l'API.", 502, "REPONSE_INVALIDE");
    }
    return versProfil(brut);
  },

  async listDetenus(filtre: FiltreDetenus = {}) {
    const categorie =
      filtre.categorie && filtre.categorie !== "toutes"
        ? CATEGORIE_SLUG[filtre.categorie]
        : undefined;

    // Les écrans de saisie demandent « tous les détenus » pour une liste déroulante :
    // l'API pagine à 10 sans option, on parcourt donc les pages.
    if (filtre.parPage && filtre.parPage > PAGE_API_DETENUS) {
      const tous = (
        await toutesLesPages<DetenuListeApi>("/detenus", {
          search: filtre.recherche,
          categorie_penale: categorie,
        })
      ).map(versResume);
      if (filtre.tri === "nom") tous.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      return { items: tous.slice(0, filtre.parPage), total: tous.length, page: 1, parPage: filtre.parPage };
    }

    const corps = await requete<{ data: DetenuListeApi[]; meta: MetaPagination }>("/detenus", {
      query: {
        page: filtre.page,
        search: filtre.recherche,
        categorie_penale: categorie,
      },
    });

    return {
      items: (corps?.data ?? []).map(versResume),
      total: corps?.meta?.total ?? 0,
      page: corps?.meta?.current_page ?? 1,
      parPage: corps?.meta?.per_page ?? 10,
    };
  },

  async getDossierDetenu(id): Promise<DossierDetenu | null> {
    const [corps, affectationsApi, sortiesApi, suivisApi, visitesApi] = await Promise.all([
      requete<{ data: DetenuDetailApi } | null>(`/detenus/${id}`, { nullSur404: true }),
      requete<{ data: AffectationApi[] } | null>(`/detenus/${id}/affectations`, { nullSur404: true }),
      requete<{ data: SortieApi[] } | null>(`/detenus/${id}/sorties`, { nullSur404: true }),
      requete<{ data: SuiviMedicalApi[] } | null>(`/detenus/${id}/suivis-medicaux`, { nullSur404: true }),
      requete<{ data: VisiteApi[] } | null>(`/detenus/${id}/visites`, { nullSur404: true }),
    ]);
    if (!corps?.data) return null;

    const brut = corps.data;
    const mandatsApi = brut.mandas ?? [];
    const mandats: MandatDetaille[] = mandatsApi
      .map((m) => ({
        ...versMandas(m),
        detenuNom: brut.nom,
        numeroEcrou: brut.numero_ecrou,
        actif: mandatActif(m),
        ouvert: m.est_actif,
      }))
      .sort((a, b) => b.dateIncarceration.localeCompare(a.dateIncarceration));

    const identite = { nom: brut.nom, numeroEcrou: brut.numero_ecrou };
    return {
      detenu: versResumeDetail(brut, mandats),
      mandats,
      affectations: (affectationsApi?.data ?? []).map((a) => versAffectation(a, identite)),
      sorties: (sortiesApi?.data ?? []).map((x) => versSortie(x, identite)),
      // Les sanctions arrivent avec la fiche ; les consultations et visites ont leur
      // propre route, chargée en parallèle ci-dessus.
      sanctions: (brut.sanctions ?? []).map((s) => versSanction(s, identite)),
      suivisMedicaux: (suivisApi?.data ?? []).map((s) => versSuiviMedical(s, identite)),
      visites: (visitesApi?.data ?? []).map((v) => versVisite(v, identite)),
    };
  },

  async listParCategorie(categorie: CategoriePenale) {
    const tous = await toutesLesPages<DetenuListeApi>("/detenus", {
      categorie_penale: CATEGORIE_SLUG[categorie],
    });
    return tous.map((d) => ({ ...versResume(d), categoriePenale: categorie }));
  },

  async creerDetenu(entree) {
    const corps = await requete<{ data: { id: number } }>("/detenus", {
      method: "POST",
      body: JSON.stringify(versCorpsDetenu(entree)),
    });
    return { id: corps.data.id };
  },

  async majDetenu(id, entree) {
    await requete(`/detenus/${id}`, {
      method: "PUT",
      body: JSON.stringify(versCorpsDetenu(entree, "maj")),
    });
  },

  async desactiverDetenu(id) {
    await requete(`/detenus/${id}`, { method: "DELETE" });
  },

  async restaurerDetenu(id) {
    await requete(`/detenus/${id}/restore`, { method: "POST" });
  },

  async televerserPhotos({ face, profil }) {
    if (!face && !profil) return {};

    const formulaire = new FormData();
    if (face) formulaire.append("photo_face", face);
    if (profil) formulaire.append("photo_profil", profil);

    // Seul appel multipart de l'API : on ne pose pas de Content-Type, le
    // navigateur (ici Node) doit écrire lui-même la frontière du formulaire.
    const corps = await requete<{
      data: {
        photo_face?: { url: string; public_id: string };
        photo_profil?: { url: string; public_id: string };
      };
    }>("/detenus/photos", { method: "POST", body: formulaire, multipart: true });

    return {
      face: corps.data.photo_face
        ? { url: corps.data.photo_face.url, publicId: corps.data.photo_face.public_id }
        : undefined,
      profil: corps.data.photo_profil
        ? { url: corps.data.photo_profil.url, publicId: corps.data.photo_profil.public_id }
        : undefined,
    };
  },

  async creerMandat(detenuId, entree) {
    const corps = await requete<{ data: { id: number } }>(`/detenus/${detenuId}/mandas`, {
      method: "POST",
      body: JSON.stringify(versCorpsMandat(entree)),
    });
    return { id: corps.data.id };
  },

  async getMandat(mandatId) {
    const corps = await requete<{ data: MandasApi & { detenu?: { nom: string; numero_ecrou: string } } } | null>(
      `/mandas/${mandatId}`,
      { nullSur404: true },
    );
    if (!corps?.data) return null;
    const m = corps.data;
    return {
      ...versMandas(m),
      detenuNom: m.detenu?.nom ?? "",
      numeroEcrou: m.detenu?.numero_ecrou ?? "",
      actif: mandatActif(m),
      ouvert: m.est_actif,
    };
  },

  async majMandat(mandatId, entree) {
    await requete(`/mandas/${mandatId}`, {
      method: "PUT",
      body: JSON.stringify(versCorpsMandat(entree)),
    });
  },

  async desactiverMandat(mandatId) {
    await requete(`/mandas/${mandatId}`, { method: "DELETE" });
  },

  // -------------------------------------------------------------------------
  // Discipline — GUIDE_FRONTEND.md §9
  // -------------------------------------------------------------------------

  async listCellules() {
    return (await toutesLesPages<CelluleApi>("/cellules")).map(versCellule);
  },

  async getCellule(id) {
    const corps = await requete<{ data: CelluleApi } | null>(`/cellules/${id}`, { nullSur404: true });
    if (!corps?.data) return null;
    return versCellule(corps.data);
  },

  async listDetenusCellule(celluleId, filtre = {}) {
    const corps = await requete<{ data: DetenuListeApi[]; meta?: MetaPagination }>(
      `/cellules/${celluleId}/detenus`,
      { query: { page: filtre.page } },
    );
    return {
      items: (corps?.data ?? []).map(versResume),
      total: corps?.meta?.total ?? 0,
      page: corps?.meta?.current_page ?? 1,
      parPage: corps?.meta?.per_page ?? 10,
    };
  },

  async creerCellule(entree) {
    const corps = await requete<{ data: { id: number } }>("/cellules", {
      method: "POST",
      body: JSON.stringify(
        sansVides({
          numero: entree.numero,
          bloc: entree.bloc,
          type_cellule: entree.typeCellule,
          capacite_max: entree.capaciteMax,
        }),
      ),
    });
    return { id: corps.data.id };
  },

  async majCellule(id, entree) {
    await requete(`/cellules/${id}`, {
      method: "PUT",
      // Mise à jour complète : un quartier ou un type vidé doit partir à null
      body: JSON.stringify({
        numero: entree.numero,
        bloc: entree.bloc || null,
        type_cellule: entree.typeCellule || null,
        capacite_max: entree.capaciteMax,
      }),
    });
  },

  async affecterDetenu(detenuId, entree) {
    await requete(`/detenus/${detenuId}/affectations`, {
      method: "POST",
      body: JSON.stringify(
        sansVides({
          cellule_id: entree.celluleId,
          date_affectation: entree.dateAffectation,
          motif_affectation: entree.motif,
        }),
      ),
    });
  },

  async listTypesSanction() {
    const corps = await requete<{ data: Array<{ id: number; libelle: string; est_actif: boolean }> }>(
      "/types-sanction",
    );
    return (corps?.data ?? []).map((t) => ({ id: t.id, libelle: t.libelle, estActif: t.est_actif }));
  },

  async creerTypeSanction(libelle) {
    const corps = await requete<{ data: { id: number } }>("/types-sanction", {
      method: "POST",
      body: JSON.stringify({ libelle }),
    });
    return { id: corps.data.id };
  },

  async majTypeSanction(id, entree) {
    await requete(`/types-sanction/${id}`, {
      method: "PUT",
      body: JSON.stringify({ libelle: entree.libelle, est_actif: entree.estActif }),
    });
  },

  async creerSanction(detenuId, entree) {
    const corps = await requete<{ data: { id: number } }>(`/detenus/${detenuId}/sanctions`, {
      method: "POST",
      body: JSON.stringify(
        sansVides({
          type_sanction_id: entree.typeSanctionId,
          motif: entree.motif,
          date_faute: entree.dateFaute,
          date_debut: entree.dateDebut,
          date_fin: entree.dateFin,
          cellule_disciplinaire_id: entree.celluleDisciplinaireId,
        }),
      ),
    });
    return { id: corps.data.id };
  },

  async terminerSanction(sanctionId) {
    const corps = await requete<{ message?: string }>(`/sanctions/${sanctionId}/terminer`, {
      method: "POST",
    });
    // Le message de l'API rappelle la cellule d'origine : il est affiché tel quel
    return { message: corps?.message ?? "Sanction terminée." };
  },

  async desactiverSanction(sanctionId) {
    await requete(`/sanctions/${sanctionId}`, { method: "DELETE" });
  },

  async listSanctions() {
    const sanctions = await toutesLesPages<SanctionApi>("/sanctions", {}, 20);
    return sanctions.map((s) => versSanction(s));
  },

  async listAffectations() {
    const affectations = await toutesLesPages<AffectationApi & { detenu?: { nom: string; numero_ecrou: string } }>(
      "/affectations",
      {},
      20,
    );
    return affectations.map((a) =>
      versAffectation(a, { nom: a.detenu?.nom ?? "", numeroEcrou: a.detenu?.numero_ecrou ?? "" }),
    );
  },

  async listDetenusNonLoges() {
    const tous = await toutesLesPages<DetenuListeApi>("/detenus", { sans_cellule: 1 });
    return tous.map(versResume);
  },

  // -------------------------------------------------------------------------
  // Santé et visites — GUIDE_FRONTEND.md §12
  // -------------------------------------------------------------------------

  async listSuivisMedicaux() {
    const suivis = await toutesLesPages<SuiviMedicalApi>("/suivis-medicaux");
    return suivis.map((s) => versSuiviMedical(s));
  },

  async creerSuiviMedical(detenuId, entree) {
    const corps = await requete<{ data: { id: number } }>(`/detenus/${detenuId}/suivis-medicaux`, {
      method: "POST",
      body: JSON.stringify(
        sansVides({
          date_consultation: entree.dateConsultation,
          type_consultation: entree.typeConsultation,
          nom_medecin: entree.nomMedecin,
          symptomes: entree.symptomes,
          diagnostic: entree.diagnostic,
          temperature: entree.temperature,
          tension_arterielle: entree.tensionArterielle,
          poids: entree.poids,
          medicaments_prescrits: entree.medicamentsPrescrits,
          duree_traitement: entree.dureeTraitement,
          date_suivi: entree.dateSuivi,
          observations: entree.observations,
        }),
      ),
    });
    return { id: corps.data.id };
  },

  async listVisites() {
    const visites = await toutesLesPages<VisiteApi>("/visites");
    return visites.map((v) => versVisite(v));
  },

  async creerVisite(detenuId, entree) {
    const corps = await requete<{ data: { id: number } }>(`/detenus/${detenuId}/visites`, {
      method: "POST",
      body: JSON.stringify(
        // Les booléens partent toujours : `sansVides` effacerait un `false`
        {
          ...sansVides({
            date_visite: entree.dateVisite,
            heure_arrivee: entree.heureArrivee,
            duree_prevue_minutes: entree.dureePrevueMinutes,
            type_visite: entree.typeVisite,
            lieu_visite: entree.lieuVisite,
            nom_visiteur: entree.nomVisiteur,
            sexe_visiteur: entree.sexeVisiteur,
            type_piece_identite: entree.typePieceIdentite,
            numero_piece_identite: entree.numeroPieceIdentite,
            telephone_visiteur: entree.telephoneVisiteur,
            lien_parente: entree.lienParente,
            adresse_visiteur: entree.adresseVisiteur,
            agent_controle: entree.agentControle,
            objets_deposes: entree.objetsDeposes,
            observations_securite: entree.observationsSecurite,
            heure_debut: entree.heureDebut,
            heure_fin: entree.heureFin,
            observations_visite: entree.observationsVisite,
          }),
          autorisation_prealable: entree.autorisationPrealable,
          fouille_corporelle: entree.fouilleCorporelle ?? false,
        },
      ),
    });
    return { id: corps.data.id };
  },

  // -------------------------------------------------------------------------
  // Tableau de bord — GUIDE_FRONTEND.md §13
  // -------------------------------------------------------------------------

  async getTableauDeBord() {
    const corps = await requete<{ data: TableauDeBordApi }>("/tableau-de-bord");
    return versTableauDeBord(corps.data);
  },

  // -------------------------------------------------------------------------
  // Sorties — GUIDE_FRONTEND.md §10
  // -------------------------------------------------------------------------

  async listSorties(type) {
    const sorties = await toutesLesPages<SortieApi>(
      "/sorties",
      { type_sortie: type ? TYPE_SORTIE_API[type] : undefined },
      10,
    );
    return sorties.map((x) => versSortie(x));
  },

  async enregistrerSortie(detenuId, entree) {
    const corps = await requete<{ data: { id: number; sortie_definitive: boolean } }>(
      `/detenus/${detenuId}/sorties/${ROUTE_SORTIE[entree.type]}`,
      {
        method: "POST",
        body: JSON.stringify(
          sansVides({
            mandas_id: entree.type === "LiberationNormale" ? entree.mandatId : undefined,
            date_sortie: entree.dateSortie,
            motif: entree.type === "LiberationNormale" || entree.type === "Transfert" ? entree.motif : undefined,
            destination: entree.type === "Transfert" ? entree.destination : undefined,
            cause: entree.type === "Deces" || entree.type === "Evasion" ? entree.cause : undefined,
            observation: entree.observation,
          }),
        ),
      },
    );
    return { id: corps.data.id, definitive: corps.data.sortie_definitive };
  },

  // -------------------------------------------------------------------------
  // Modules que l'API n'expose pas encore (cf. bloc A signalé au back).
  // `async` : l'échec doit être une promesse rejetée, comme pour toute méthode
  // du contrat — une exception synchrone échapperait à qui attend la promesse.
  // -------------------------------------------------------------------------

  listMandats: async () => nonLivre("GET /mandats"),
  listMandatsExpires: async () => nonLivre("GET /mandats/expires"),
  listUtilisateurs: async () => nonLivre("GET /utilisateurs"),
  getParametres: async () => nonLivre("GET /parametres"),
};
