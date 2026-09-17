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
  TypeSanction,
  TypeSortie,
  TypeStatutPenal,
  Utilisateur,
  Visite,
} from "@/lib/domain/types";

export interface MandatDetaille extends Mandas {
  detenuNom: string;
  numeroEcrou: string;
  /** En vigueur : ni désactivé ni échu. */
  actif: boolean;
  /**
   * Non désactivé ni levé, qu'il soit échu ou non. Un mandat échu mais ouvert est
   * précisément celui qu'une libération doit lever.
   */
  ouvert: boolean;
}

export interface DossierDetenu {
  detenu: DetenuResume;
  mandats: MandatDetaille[];
  affectations: Affectation[];
  sanctions: Sanction[];
  visites: Visite[];
  suivisMedicaux: SuiviMedical[];
  sorties: SortieDetenu[];
  /**
   * Rubriques que la source ne sait pas encore fournir. Une liste vide ne dit pas
   * « aucune sanction » : l'écran doit pouvoir distinguer les deux cas.
   */
  indisponibles?: Array<"sanctions" | "visites" | "suivisMedicaux">;
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

/** Cellule à créer. */
export interface EntreeCellule {
  numero: string;
  bloc?: string | null;
  typeCellule?: string | null;
  capaciteMax: number;
}

/** Affectation (ou réaffectation) d'un détenu : l'API clôt l'affectation en cours. */
export interface EntreeAffectation {
  celluleId: number;
  dateAffectation?: string | null;
  motif?: string | null;
}

/** Sanction à prononcer. Une cellule disciplinaire déplace réellement le détenu. */
export interface EntreeSanction {
  typeSanctionId: number;
  motif: string;
  dateFaute: string;
  dateDebut: string;
  dateFin?: string | null;
  celluleDisciplinaireId?: number | null;
}

/** Sortie à consigner : chaque type a ses propres champs obligatoires. */
export type EntreeSortie =
  | { type: "LiberationNormale"; mandatId: number; dateSortie: string; motif: string; observation?: string | null }
  | { type: "Transfert"; dateSortie: string; destination: string; motif?: string | null; observation?: string | null }
  | { type: "Evasion"; dateSortie: string; cause?: string | null; observation?: string | null }
  | { type: "Deces"; dateSortie: string; cause: string; observation?: string | null };

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
  /** PUT /detenus/{id} — 409 si le dossier est désactivé */
  majDetenu(id: number, entree: EntreeDetenu): Promise<void>;
  /**
   * DELETE /detenus/{id} — correction administrative (doublon, erreur de saisie).
   * N'enregistre aucune sortie : une vraie sortie passe par `enregistrerSortie`.
   */
  desactiverDetenu(id: number): Promise<void>;
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
  /** DELETE /mandas/{id} — mandat saisi par erreur ; une levée d'écrou passe par une sortie */
  desactiverMandat(mandatId: number): Promise<void>;

  /** GET /detenus/non-loges (à livrer) */
  listDetenusNonLoges(): Promise<DetenuResume[]>;
  /** GET /mandats (à livrer) */
  listMandats(): Promise<MandatDetaille[]>;
  /** GET /mandats/expires (à livrer) */
  listMandatsExpires(): Promise<MandatDetaille[]>;

  /** GET /cellules — occupation calculée par le serveur */
  listCellules(): Promise<Cellule[]>;
  /** POST /cellules */
  creerCellule(entree: EntreeCellule): Promise<{ id: number }>;
  /** GET /affectations (à livrer : l'API n'expose que l'historique d'un détenu) */
  listAffectations(): Promise<Affectation[]>;
  /** POST /detenus/{id}/affectations — 422 si la cellule est pleine */
  affecterDetenu(detenuId: number, entree: EntreeAffectation): Promise<void>;
  /** GET /sanctions (à livrer : l'API ne sait pas encore lister les sanctions) */
  listSanctions(): Promise<Sanction[]>;
  /** GET /types-sanction — actifs et désactivés ; filtrer sur `estActif` pour saisir */
  listTypesSanction(): Promise<TypeSanction[]>;
  /** POST /detenus/{id}/sanctions */
  creerSanction(detenuId: number, entree: EntreeSanction): Promise<{ id: number }>;

  /** GET /suivis-medicaux (à livrer) */
  listSuivisMedicaux(): Promise<SuiviMedical[]>;
  /** GET /visites (à livrer) */
  listVisites(): Promise<Visite[]>;

  /** GET /sorties?type_sortie= — archive de toutes les sorties */
  listSorties(type?: TypeSortie): Promise<SortieDetenu[]>;
  /** POST /detenus/{id}/sorties/{type} */
  enregistrerSortie(detenuId: number, entree: EntreeSortie): Promise<{ id: number; definitive: boolean }>;

  /** GET /utilisateurs (à livrer) */
  listUtilisateurs(): Promise<Utilisateur[]>;
  /** GET /parametres (à livrer) */
  getParametres(): Promise<Parametres>;
}
