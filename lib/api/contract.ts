/**
 * Contrat d'API — ce que les écrans consomment.
 *
 * Les écrans ne connaissent QUE ces types (camelCase, vocabulaire du domaine).
 * L'API Laravel parle snake_case avec ses propres enveloppes : la traduction se
 * fait dans `live.ts`, jamais dans les écrans.
 *
 * Les routes indiquées sont relatives à `SGP_API_URL` (…/api/v1). Celles marquées
 * « à livrer » n'existent pas encore côté API : leur domaine reste en mock.
 */

import type {
  Affectation,
  CategoriePenale,
  Cellule,
  DetenuResume,
  FiltreDetenus,
  Mandas,
  PageResultat,
  Parametres,
  Sanction,
  SortieDetenu,
  SuiviMedical,
  TableauDeBord,
  TypeSortie,
  Utilisateur,
  Visite,
} from "@/lib/domain/types";

export interface MandatDetaille extends Mandas {
  detenuNom: string;
  numeroEcrou: string;
  actif: boolean;
}

export interface DossierDetenu {
  detenu: DetenuResume;
  mandats: MandatDetaille[];
  affectations: Affectation[];
  sanctions: Sanction[];
  visites: Visite[];
  suivisMedicaux: SuiviMedical[];
  sorties: SortieDetenu[];
}

/** Ce que le front conserve de l'utilisateur connecté. */
export type ProfilUtilisateur = Pick<
  Utilisateur,
  "id" | "username" | "nom" | "prenom" | "email" | "role" | "estActif"
>;

export interface SessionUtilisateur {
  utilisateur: ProfilUtilisateur;
  jeton: string;
}

/** Provenance des données, affichée dans le shell. */
export type EtatApi = "mock" | "hybride" | "live";

export class ApiErreur extends Error {
  constructor(
    message: string,
    public readonly statut: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiErreur";
  }
}

export interface ApiClient {
  /** POST /auth/login — `identifiant` accepte le nom d'utilisateur ou l'email */
  connexion(identifiant: string, motDePasse: string): Promise<SessionUtilisateur>;
  /** POST /auth/logout — révoque le jeton côté serveur */
  deconnexion(): Promise<void>;
  /** GET /auth/me — 401 si le jeton est invalide ou expiré */
  getUtilisateurCourant(): Promise<ProfilUtilisateur>;

  /** GET /tableau-de-bord (à livrer) */
  getTableauDeBord(): Promise<TableauDeBord>;

  /** GET /detenus?page= — recherche, filtres et tri à livrer (retours A1, A2) */
  listDetenus(filtre?: FiltreDetenus): Promise<PageResultat<DetenuResume>>;
  /** GET /detenus/{id} — fiche complète avec ses mandats */
  getDossierDetenu(id: number): Promise<DossierDetenu | null>;
  /** GET /detenus/non-loges (à livrer) */
  listDetenusNonLoges(): Promise<DetenuResume[]>;

  /** GET /mandats (à livrer) */
  listMandats(): Promise<MandatDetaille[]>;
  /** GET /mandats/expires (à livrer) */
  listMandatsExpires(): Promise<MandatDetaille[]>;
  /** GET /detenus?categorie= (à livrer) — règle calculée côté serveur */
  listParCategorie(categorie: CategoriePenale): Promise<DetenuResume[]>;

  /** GET /cellules (à livrer) */
  listCellules(): Promise<Cellule[]>;
  /** GET /affectations (à livrer) */
  listAffectations(): Promise<Affectation[]>;
  /** GET /sanctions (à livrer) */
  listSanctions(): Promise<Sanction[]>;

  /** GET /suivis-medicaux (à livrer) */
  listSuivisMedicaux(): Promise<SuiviMedical[]>;
  /** GET /visites (à livrer) */
  listVisites(): Promise<Visite[]>;

  /** GET /sorties?type= (à livrer — retour A4) */
  listSorties(type?: TypeSortie): Promise<SortieDetenu[]>;

  /** GET /utilisateurs (à livrer) */
  listUtilisateurs(): Promise<Utilisateur[]>;
  /** GET /parametres (à livrer) */
  getParametres(): Promise<Parametres>;
}
