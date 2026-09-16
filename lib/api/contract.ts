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
  Sexe,
  SortieDetenu,
  SuiviMedical,
  TableauDeBord,
  TypeSortie,
  TypeStatutPenal,
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

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------

/** Photo déjà déposée sur le service de stockage : l'URL et son identifiant. */
export interface PhotoTeleversee {
  url: string;
  publicId: string;
}

/** Fiche d'un détenu à créer ou à mettre à jour. */
export interface EntreeDetenu {
  numeroEcrou: string;
  nom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  profession: string;
  nomPere: string;
  nomMere: string;

  nationalite?: string | null;
  langue?: string | null;
  ethnie?: string | null;
  religion?: string | null;
  departement?: string | null;
  arrondissement?: string | null;
  residence?: string | null;
  statutMatrimonial?: string | null;
  nombreEnfants?: number | null;
  niveauEtudes?: string | null;
  numeroCNI?: string | null;
  numeroPasseport?: string | null;
  anthropometrie?: string | null;

  contactUrgence?: {
    nom?: string | null;
    lienParente?: string | null;
    telephone?: string | null;
    adresse?: string | null;
  };

  photoFace?: PhotoTeleversee | null;
  photoProfil?: PhotoTeleversee | null;
}

/** Mandat à créer, ou à faire évoluer (mêmes champs dans les deux cas). */
export interface EntreeMandat {
  typeStatutPenal: TypeStatutPenal;
  dateIncarceration: string;
  autoriteSignataire: string;
  motifDetention: string;
  typeMandat: string;
  referenceMandat: string;
  dateSignatureMandat: string;
  dateExpirationMandat: string;

  objetsPersonnels?: string | null;
  autoritePenitentiaire?: string | null;
  etatPhysiqueArrivee?: string | null;
  observationsStatut?: string | null;

  dateJugement?: string | null;
  referenceJugement?: string | null;
  tribunalJugement?: string | null;
  motifJugement?: string | null;
  peinePrononcee?: string | null;

  dateAppel?: string | null;
  tribunalAppel?: string | null;
  decisionAppel?: string | null;
  observationsAppel?: string | null;

  dateCassation?: string | null;
  tribunalCassation?: string | null;
  decisionCassation?: string | null;
  observationsCassation?: string | null;
}

/** Conflit renvoyé par l'API (409) : un dossier désactivé existe déjà. */
export interface ConflitApi {
  field?: string;
  value?: string;
  detenu_id?: number;
  numero_ecrou?: string;
  nom?: string;
  restore_url?: string;
}

export class ApiErreur extends Error {
  constructor(
    message: string,
    public readonly statut: number,
    public readonly code?: string,
    /** Erreurs de validation par champ (422), au format Laravel. */
    public readonly erreurs?: Record<string, string[]>,
    /** Détail du conflit (409) — permet de proposer une restauration. */
    public readonly conflit?: ConflitApi,
  ) {
    super(message);
    this.name = "ApiErreur";
  }

  /** Message d'erreur d'un champ précis, à afficher sous ce champ. */
  erreurDe(champ: string): string | undefined {
    return this.erreurs?.[champ]?.[0];
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

  /** GET /detenus?page=&search=&categorie_penale= */
  listDetenus(filtre?: FiltreDetenus): Promise<PageResultat<DetenuResume>>;
  /** GET /detenus/{id} — fiche complète avec ses mandats */
  getDossierDetenu(id: number): Promise<DossierDetenu | null>;
  /** GET /detenus?categorie_penale= — règle calculée côté serveur */
  listParCategorie(categorie: CategoriePenale): Promise<DetenuResume[]>;
  /** POST /detenus — 409 si un dossier désactivé porte la même CNI */
  creerDetenu(entree: EntreeDetenu): Promise<{ id: number }>;
  /** POST /detenus/{id}/restore — réactive le dossier et ses mandats */
  restaurerDetenu(id: number): Promise<void>;
  /** POST /detenus/photos — seul appel multipart de l'API */
  televerserPhotos(fichiers: {
    face?: File | null;
    profil?: File | null;
  }): Promise<{ face?: PhotoTeleversee; profil?: PhotoTeleversee }>;

  /** POST /detenus/{id}/mandas */
  creerMandat(detenuId: number, entree: EntreeMandat): Promise<{ id: number }>;
  /** GET /mandas/{id} */
  getMandat(mandatId: number): Promise<MandatDetaille | null>;
  /** PUT /mandas/{id} — fait évoluer le statut pénal, reclasse le détenu */
  majMandat(mandatId: number, entree: EntreeMandat): Promise<void>;

  /** GET /detenus/non-loges (à livrer) */
  listDetenusNonLoges(): Promise<DetenuResume[]>;
  /** GET /mandats (à livrer) */
  listMandats(): Promise<MandatDetaille[]>;
  /** GET /mandats/expires (à livrer) */
  listMandatsExpires(): Promise<MandatDetaille[]>;

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
