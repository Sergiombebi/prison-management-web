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
  EntreeParametres,
  EntreeProfil,
  EntreeUtilisateur,
  EvacuationSanitaire,
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

/**
 * Vue « dossier médical » d'un détenu : identité, résumé pénal et cellule pour le
 * situer, plus son état de santé persistant. Volontairement plus légère que
 * `DetenuResume` — accessible avec la seule permission `sante.consultations.consulter`,
 * sans passer par le module Détenus.
 */
export interface FicheMedicale {
  id: number;
  numeroEcrou: string;
  nom: string;
  sexe: Sexe;
  dateNaissance: string;
  age: string | null;
  lieuNaissance: string;
  photoFaceUrl: string | null;
  estPresent: boolean;
  groupeSanguin: string | null;
  allergies: string | null;
  maladiesChroniques: string | null;
  traitementEnCours: string | null;
  cellule: { id: number; numero: string; bloc: string | null } | null;
  mandatCourant: {
    typeStatutPenal: TypeStatutPenal | null;
    dateIncarceration: string | null;
    motifDetention: string | null;
    dateExpirationMandat: string | null;
  } | null;
  categoriePenale: CategoriePenale | null;
  evacuationActive: Pick<EvacuationSanitaire, "id" | "dateDepart" | "structureDestination" | "motif"> | null;
}

/** Dossier médical complet : la fiche ci-dessus, avec l'historique santé du détenu. */
export interface DossierMedical {
  detenu: FicheMedicale;
  suivisMedicaux: SuiviMedical[];
  evacuations: EvacuationSanitaire[];
}

export interface DossierDetenu {
  detenu: DetenuResume;
  mandats: MandatDetaille[];
  affectations: Affectation[];
  sanctions: Sanction[];
  visites: Visite[];
  suivisMedicaux: SuiviMedical[];
  sorties: SortieDetenu[];
  evacuations: EvacuationSanitaire[];
  /**
   * Rubriques que la source ne sait pas encore fournir. Une liste vide ne dit pas
   * « aucune sanction » : l'écran doit pouvoir distinguer les deux cas.
   */
  indisponibles?: Array<"sanctions" | "visites" | "suivisMedicaux">;
}

/** Ce que le front conserve de l'utilisateur connecté. */
export type ProfilUtilisateur = Pick<
  Utilisateur,
  "id" | "username" | "nom" | "prenom" | "email" | "role" | "permissions" | "estActif" | "derniereConnexion"
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

/** Correction d'un transfert déjà consigné. */
export interface EntreeTransfert {
  dateSortie: string;
  destination: string;
  motif?: string | null;
  observation?: string | null;
}

/** Réintégration d'un détenu évadé et repris. */
export interface EntreeReintegration {
  dateReintegration: string;
  celluleDisciplinaireId: number;
  lieuReintegration?: string | null;
  autoriteReintegration?: string | null;
  observationsReintegration?: string | null;
}

/** État de santé persistant du détenu — indépendant de toute consultation précise. */
export interface EntreeDossierMedical {
  groupeSanguin?: string | null;
  allergies?: string | null;
  maladiesChroniques?: string | null;
  traitementEnCours?: string | null;
}

/** Départ en évacuation sanitaire à consigner. */
export interface EntreeEvacuation {
  dateDepart: string;
  structureDestination: string;
  motif?: string | null;
  escorte?: string | null;
  observationsDepart?: string | null;
}

/** Retour d'une évacuation sanitaire. */
export interface EntreeRetourEvacuation {
  dateRetour: string;
  observationsRetour?: string | null;
}

/** Consultation médicale à enregistrer. */
export interface EntreeSuiviMedical {
  dateConsultation: string;
  typeConsultation: string;
  nomMedecin: string;
  symptomes: string;
  diagnostic: string;
  temperature?: string | null;
  tensionArterielle?: string | null;
  poids?: string | null;
  medicamentsPrescrits?: string | null;
  dureeTraitement?: string | null;
  dateSuivi?: string | null;
  observations?: string | null;
}

/** Visite au parloir à enregistrer. */
export interface EntreeVisite {
  dateVisite: string;
  heureArrivee: string;
  dureePrevueMinutes: number;
  typeVisite: string;
  autorisationPrealable: boolean;
  nomVisiteur: string;
  sexeVisiteur: Sexe;
  typePieceIdentite: string;
  numeroPieceIdentite: string;
  lienParente: string;
  agentControle: string;
  lieuVisite?: string | null;
  telephoneVisiteur?: string | null;
  adresseVisiteur?: string | null;
  objetsDeposes?: string | null;
  fouilleCorporelle?: boolean | null;
  observationsSecurite?: string | null;
  heureDebut?: string | null;
  heureFin?: string | null;
  observationsVisite?: string | null;
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

/** Résultat d'une vérification à la volée (avant de remplir le reste de la fiche). */
export interface VerificationIdentite {
  disponible: boolean;
  /** `true` si un détenu présent détient déjà cette valeur : aucune restauration possible. */
  present?: boolean;
  message?: string;
  conflit?: ConflitApi;
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
  /** PUT /profil — modifie son propre compte (jamais le rôle ni les permissions) */
  majProfil(entree: EntreeProfil): Promise<void>;
  /** PUT /profil/mot-de-passe — exige le mot de passe actuel, contrairement à la
   * réinitialisation par un administrateur */
  changerMonMotDePasse(motDePasseActuel: string, nouveauMotDePasse: string): Promise<void>;

  /** GET /tableau-de-bord */
  getTableauDeBord(): Promise<TableauDeBord>;

  /** GET /detenus?page=&search=&categorie_penale= */
  listDetenus(filtre?: FiltreDetenus): Promise<PageResultat<DetenuResume>>;
  /** GET /detenus/{id} — fiche complète avec ses mandats */
  getDossierDetenu(id: number): Promise<DossierDetenu | null>;
  /**
   * GET /detenus/{id}/dossier-medical — identité, résumé pénal et santé, sans le
   * reste de la fiche. Gardé par `sante.consultations.consulter`, pas `detenus.consulter`.
   */
  getDossierMedical(id: number): Promise<DossierMedical | null>;
  /** GET /detenus?categorie_penale= — règle calculée côté serveur */
  listParCategorie(categorie: CategoriePenale): Promise<DetenuResume[]>;
  /**
   * GET /detenus/verifier-identite — vérification à la volée (au blur du champ),
   * avant de remplir le reste de la fiche. Toujours 200, jamais d'exception.
   */
  verifierIdentiteDetenu(
    champ: "numero_ecrou" | "numero_cni" | "numero_passeport",
    valeur: string,
  ): Promise<VerificationIdentite>;
  /** POST /detenus — 409 si un dossier désactivé porte la même CNI */
  creerDetenu(entree: EntreeDetenu): Promise<{ id: number }>;
  /** PUT /detenus/{id} — 409 si le dossier est désactivé */
  majDetenu(id: number, entree: EntreeDetenu): Promise<void>;
  /** PUT /detenus/{id}/dossier-medical */
  majDossierMedical(id: number, entree: EntreeDossierMedical): Promise<void>;
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

  /** GET /detenus?sans_cellule=1 — détenus présents sans cellule */
  listDetenusNonLoges(): Promise<DetenuResume[]>;
  /** GET /mandats (à livrer) */
  listMandats(): Promise<MandatDetaille[]>;
  /** GET /mandats/expires (à livrer) */
  listMandatsExpires(): Promise<MandatDetaille[]>;

  /** GET /cellules — occupation calculée par le serveur */
  listCellules(): Promise<Cellule[]>;
  /** GET /cellules/{id} */
  getCellule(id: number): Promise<Cellule | null>;
  /** POST /cellules */
  creerCellule(entree: EntreeCellule): Promise<{ id: number }>;
  /** PUT /cellules/{id} — 422 si la capacité passe sous l'effectif présent */
  majCellule(id: number, entree: EntreeCellule): Promise<void>;
  /** GET /cellules/{id}/detenus — paginé, détenus actuellement logés dans cette cellule */
  listDetenusCellule(celluleId: number, filtre?: { page?: number }): Promise<PageResultat<DetenuResume>>;
  /** GET /affectations — fil global des mouvements, le plus récent d'abord */
  listAffectations(): Promise<Affectation[]>;
  /** POST /detenus/{id}/affectations — 422 si la cellule est pleine */
  affecterDetenu(detenuId: number, entree: EntreeAffectation): Promise<void>;
  /** GET /sanctions — toutes les sanctions, la plus récente d'abord */
  listSanctions(): Promise<Sanction[]>;
  /** GET /types-sanction — actifs et désactivés ; filtrer sur `estActif` pour saisir */
  listTypesSanction(): Promise<TypeSanction[]>;
  /** POST /types-sanction — 422 si le libellé existe déjà */
  creerTypeSanction(libelle: string): Promise<{ id: number }>;
  /**
   * PUT /types-sanction/{id} — renommer ou (dés)activer. Un type n'est jamais
   * supprimé : les sanctions déjà prononcées le conservent.
   */
  majTypeSanction(id: number, entree: { libelle: string; estActif: boolean }): Promise<void>;
  /** POST /detenus/{id}/sanctions */
  creerSanction(detenuId: number, entree: EntreeSanction): Promise<{ id: number }>;
  /**
   * POST /sanctions/{id}/terminer — met fin à la sanction et libère la cellule
   * disciplinaire. Le détenu se retrouve alors sans cellule : le message renvoyé
   * rappelle laquelle était la sienne, l'écran invite à le réaffecter.
   */
  terminerSanction(sanctionId: number): Promise<{ message: string }>;
  /** DELETE /sanctions/{id} — saisie par erreur ; ne touche pas à la cellule */
  desactiverSanction(sanctionId: number): Promise<void>;

  /** GET /suivis-medicaux — toutes les consultations, la plus récente d'abord */
  listSuivisMedicaux(): Promise<SuiviMedical[]>;
  /** POST /detenus/{id}/suivis-medicaux */
  creerSuiviMedical(detenuId: number, entree: EntreeSuiviMedical): Promise<{ id: number }>;

  /** GET /evacuations — toutes les évacuations sanitaires, la plus récente d'abord */
  listEvacuations(): Promise<EvacuationSanitaire[]>;
  /** POST /detenus/{id}/evacuations — 409 si le détenu est déjà en évacuation */
  creerEvacuation(detenuId: number, entree: EntreeEvacuation): Promise<{ id: number }>;
  /** POST /evacuations/{id}/retour — 422 si le retour est déjà enregistré */
  enregistrerRetourEvacuation(evacuationId: number, entree: EntreeRetourEvacuation): Promise<void>;

  /** GET /visites — toutes les visites, la plus récente d'abord */
  listVisites(): Promise<Visite[]>;
  /** GET /visites/{id} */
  getVisite(visiteId: number): Promise<Visite | null>;
  /** POST /detenus/{id}/visites */
  creerVisite(detenuId: number, entree: EntreeVisite): Promise<{ id: number }>;

  /** GET /sorties?type_sortie= — archive de toutes les sorties */
  listSorties(type?: TypeSortie): Promise<SortieDetenu[]>;
  /** GET /sorties/{id} — avec l'état civil du détenu */
  getSortie(sortieId: number): Promise<SortieDetenu | null>;
  /** PUT /sorties/{id} — transferts uniquement (422 sinon) */
  majSortie(sortieId: number, entree: EntreeTransfert): Promise<void>;
  /** POST /detenus/{id}/sorties/{type} */
  enregistrerSortie(detenuId: number, entree: EntreeSortie): Promise<{ id: number; definitive: boolean }>;
  /** POST /sorties/{id}/reintegrer — évasions uniquement (422 sinon) */
  reintegrerEvasion(sortieId: number, entree: EntreeReintegration): Promise<SortieDetenu>;

  /** GET /utilisateurs — réservé aux administrateurs (403 sinon) */
  listUtilisateurs(): Promise<Utilisateur[]>;
  /** POST /utilisateurs — 422 si le nom d'utilisateur ou l'email existe déjà */
  creerUtilisateur(entree: EntreeUtilisateur & { motDePasse: string }): Promise<{ id: number }>;
  /** PUT /utilisateurs/{id} */
  majUtilisateur(id: number, entree: EntreeUtilisateur): Promise<void>;
  /** POST /utilisateurs/{id}/desactiver — 422 si c'est son propre compte */
  desactiverUtilisateur(id: number): Promise<void>;
  /** POST /utilisateurs/{id}/restaurer */
  restaurerUtilisateur(id: number): Promise<void>;
  /** POST /utilisateurs/{id}/reinitialiser-mot-de-passe — révoque aussi ses jetons actifs */
  reinitialiserMotDePasse(id: number, motDePasse: string): Promise<void>;

  /** GET /parametres — accessible à tout utilisateur connecté */
  getParametres(): Promise<Parametres>;
  /** PUT /parametres — réservé aux administrateurs */
  majParametres(entree: EntreeParametres): Promise<void>;
  /** POST /parametres/logo — réservé aux administrateurs */
  televerserLogo(fichier: File): Promise<PhotoTeleversee>;
}
