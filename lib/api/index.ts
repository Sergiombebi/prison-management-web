/**
 * Point d'entrée unique de la couche données.
 *
 *   import { api } from "@/lib/api";
 *   const dossier = await api.getDossierDetenu(12);
 *
 * Réservé aux composants serveur, Server Actions et route handlers (`server-only`).
 *
 * Mode hybride : chaque domaine bascule indépendamment entre données de démonstration
 * et API réelle, au rythme où le backend livre ses routes.
 *
 *   SGP_API_LIVE=auth,detenus   → ces domaines sur l'API, le reste en démo
 *   SGP_API_MODE=live           → tout sur l'API (prioritaire)
 *   (rien)                      → tout en démo
 */

import "server-only";

import type { ApiClient, EtatApi } from "./contract";
import { liveApi } from "./live";
import { mockApi } from "./mock";

export type DomaineApi =
  | "auth"
  | "tableauDeBord"
  | "detenus"
  | "mandats"
  | "discipline"
  | "sante"
  | "sorties"
  | "administration";

/** Rattachement de chaque méthode à son domaine — TypeScript refuse un oubli. */
const DOMAINE_DE: Record<keyof ApiClient, DomaineApi> = {
  connexion: "auth",
  deconnexion: "auth",
  getUtilisateurCourant: "auth",
  majProfil: "auth",
  changerMonMotDePasse: "auth",
  getTableauDeBord: "tableauDeBord",
  listDetenus: "detenus",
  getDossierDetenu: "detenus",
  // Volontairement rattaché à « sante », pas « detenus » : c'est justement ce qui
  // permet à ce module de rester en direct même quand detenus ne l'est pas.
  getDossierMedical: "sante",
  // Écran d'affectation : il appartient à la discipline, pas au registre — ainsi
  // basculer « detenus » en réel ne casse pas un module que l'API n'expose pas.
  listDetenusNonLoges: "discipline",
  verifierIdentiteDetenu: "detenus",
  creerDetenu: "detenus",
  majDetenu: "detenus",
  majDossierMedical: "sante",
  desactiverDetenu: "detenus",
  restaurerDetenu: "detenus",
  televerserPhotos: "detenus",
  // Les écritures de mandats vivent sous /detenus/{id}/mandas : elles suivent le
  // registre, sinon créer un détenu réel puis un mandat fictif casserait le flux.
  creerMandat: "detenus",
  getMandat: "detenus",
  majMandat: "detenus",
  desactiverMandat: "detenus",
  listMandats: "mandats",
  listMandatsExpires: "mandats",
  // Même point d'entrée que le registre (`GET /detenus?categorie_penale=`) :
  // il suit donc le domaine « detenus », pas « mandats ».
  listParCategorie: "detenus",
  listCellules: "discipline",
  getCellule: "discipline",
  creerCellule: "discipline",
  majCellule: "discipline",
  listDetenusCellule: "discipline",
  listAffectations: "discipline",
  affecterDetenu: "discipline",
  listSanctions: "discipline",
  listTypesSanction: "discipline",
  creerTypeSanction: "discipline",
  majTypeSanction: "discipline",
  creerSanction: "discipline",
  terminerSanction: "discipline",
  desactiverSanction: "discipline",
  listSuivisMedicaux: "sante",
  creerSuiviMedical: "sante",
  listEvacuations: "sante",
  creerEvacuation: "sante",
  enregistrerRetourEvacuation: "sante",
  listPrescriptions: "sante",
  creerPrescription: "sante",
  arreterPrescription: "sante",
  listVisites: "sante",
  getVisite: "sante",
  creerVisite: "sante",
  listSorties: "sorties",
  getSortie: "sorties",
  majSortie: "sorties",
  reintegrerEvasion: "sorties",
  enregistrerSortie: "sorties",
  listUtilisateurs: "administration",
  creerUtilisateur: "administration",
  majUtilisateur: "administration",
  desactiverUtilisateur: "administration",
  restaurerUtilisateur: "administration",
  reinitialiserMotDePasse: "administration",
  getParametres: "administration",
  majParametres: "administration",
  televerserLogo: "administration",
};

const TOUS_LES_DOMAINES = [...new Set(Object.values(DOMAINE_DE))];

function estDomaine(valeur: string): valeur is DomaineApi {
  return (TOUS_LES_DOMAINES as string[]).includes(valeur);
}

function lireDomainesLive(): Set<DomaineApi> {
  if (process.env.SGP_API_MODE === "live") return new Set(TOUS_LES_DOMAINES);

  const demandes = (process.env.SGP_API_LIVE ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const inconnus = demandes.filter((d) => !estDomaine(d));
  if (inconnus.length > 0) {
    console.warn(
      `[SGP] SGP_API_LIVE : domaine(s) inconnu(s) ignoré(s) : ${inconnus.join(", ")}. ` +
        `Valeurs possibles : ${TOUS_LES_DOMAINES.join(", ")}.`,
    );
  }
  return new Set(demandes.filter(estDomaine));
}

const DOMAINES_LIVE = lireDomainesLive();

export function modeDe(domaine: DomaineApi): "mock" | "live" {
  return DOMAINES_LIVE.has(domaine) ? "live" : "mock";
}

export const ETAT_API: EtatApi =
  DOMAINES_LIVE.size === 0
    ? "mock"
    : DOMAINES_LIVE.size === TOUS_LES_DOMAINES.length
      ? "live"
      : "hybride";

export const api = Object.fromEntries(
  (Object.keys(DOMAINE_DE) as Array<keyof ApiClient>).map((methode) => [
    methode,
    (modeDe(DOMAINE_DE[methode]) === "live" ? liveApi : mockApi)[methode],
  ]),
) as unknown as ApiClient;

export { ApiErreur } from "./contract";
export type {
  ConflitApi,
  DossierDetenu,
  EntreeAffectation,
  EntreeCellule,
  EntreeDetenu,
  EntreeMandat,
  EntreeSanction,
  EntreeSortie,
  EntreeSuiviMedical,
  EntreeVisite,
  EtatApi,
  MandatDetaille,
  PhotoTeleversee,
  ProfilUtilisateur,
  SessionUtilisateur,
  VerificationIdentite,
} from "./contract";
