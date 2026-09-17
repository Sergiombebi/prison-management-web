/**
 * Types du domaine SGP.
 *
 * Source de vérité : `SGP-Version1/SGPCore/Entities/` (et NON `sgpBD.sql`, qui est
 * périmé — cf. docs/SPEC-FRONTEND-V1.md §5).
 *
 * Convention : toutes les dates transitent en ISO 8601 (chaîne). La conversion en
 * `Date` se fait au moment de l'affichage, jamais dans le modèle.
 */

// ---------------------------------------------------------------------------
// Énumérations
// ---------------------------------------------------------------------------

/** `SGPCore.Entities.StatutDetenu` */
export type StatutDetenu =
  | "Present"
  | "Sorti"
  | "Transfere"
  | "EnAttente"
  | "Hospitalise"
  | "Evasion";

/** `SGPCore.Entities.TypeSortieDetenu` */
export type TypeSortie = "LiberationNormale" | "Deces" | "Evasion" | "Transfert";

/**
 * Rôles renvoyés par l'API (`user.role`). Ils remplacent ceux du desktop
 * (Administrateur / Gestionnaire / Consultation) ; la matrice des droits reste à confirmer.
 */
export type RoleUtilisateur = "admin" | "agent" | "medecin";

/**
 * Catégorie pénale. Ce n'est PAS une colonne en base : elle se déduit des mandats
 * actifs d'un détenu. La règle appartient au serveur (cf. MandasService.cs) ; le
 * front ne fait que l'afficher.
 */
export type CategoriePenale =
  | "Prevenu"
  | "Condamne"
  | "Appellant"
  | "Cassationnaire"
  | "Dpac";

/** Valeur stockée dans `Mandas.TypeStatutPenal`, saisie au formulaire. */
export type TypeStatutPenal =
  | "Détention provisoire"
  | "Exécution de peine"
  | "Appellant"
  | "Cassationnaire";

export type Sexe = "Masculin" | "Féminin";

// ---------------------------------------------------------------------------
// Entités
// ---------------------------------------------------------------------------

export interface Detenu {
  id: number;
  numeroEcrou: string;
  nom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  age: string | null;
  nationalite: string | null;
  langue: string | null;
  ethnie: string | null;
  religion: string | null;
  profession: string;
  departement: string | null;
  arrondissement: string | null;
  residence: string | null;
  statutMatrimonial: string | null;
  nombreEnfants: string | null;
  niveauEtudes: string | null;
  numeroCNI: string | null;
  numeroPasseport: string | null;
  contact: string | null;
  /**
   * Contact d'urgence complet — seulement sur la fiche détaillée. `contact` n'en
   * garde que le téléphone, pour les listes.
   */
  contactUrgence?: {
    nom: string | null;
    lienParente: string | null;
    telephone: string | null;
    adresse: string | null;
  };
  nomPere: string;
  nomMere: string;
  photoFaceUrl: string | null;
  photoProfilUrl: string | null;
  anthropometrie: string | null;
  statut: StatutDetenu;
  dateCreation: string;
  dateModification: string | null;
}

/** Détenu enrichi des informations calculées dont les listes ont besoin. */
export interface DetenuResume extends Detenu {
  categoriePenale: CategoriePenale | null;
  /** Mandat actif le plus récent, s'il existe. */
  mandatCourant: Pick<
    Mandas,
    | "id"
    | "dateIncarceration"
    | "typeMandat"
    | "motifDetention"
    | "dateSortieMandat"
    | "typeStatutPenal"
  > | null;
  cellule: { id: number; numero: string; bloc: string | null } | null;
  nombreMandatsActifs: number;
}

export interface Mandas {
  id: number;
  detenuId: number;
  dateIncarceration: string;
  autoriteSignataire: string | null;
  motifDetention: string | null;
  typeMandat: string | null;
  referenceMandat: string | null;
  dateSignatureMandat: string | null;
  /** Colonne `DateExpirationMandat` en base — renommée côté domaine. */
  dateSortieMandat: string | null;
  observationsStatut: string | null;
  objetsPersonnels: string | null;
  autoritePenitentiaire: string | null;
  etatPhysiqueArrivee: string | null;
  typeStatutPenal: TypeStatutPenal | null;

  // Jugement (exécution de peine)
  dateJugement: string | null;
  referenceJugement: string | null;
  tribunalJugement: string | null;
  motifJugement: string | null;
  peinePrononcee: string | null;

  // Appel
  dateAppel: string | null;
  tribunalAppel: string | null;
  decisionAppel: string | null;
  observationsAppel: string | null;

  // Cassation
  dateCassation: string | null;
  tribunalCassation: string | null;
  decisionCassation: string | null;
  observationsCassation: string | null;
}

export interface Cellule {
  id: number;
  numero: string;
  bloc: string | null;
  typeCellule: string | null;
  capaciteMax: number;
  effectifTheorique: number;
  /** Nombre de détenus réellement affectés — calculé côté serveur. */
  effectifReel: number;
  /** Détenus présents dans la cellule — seulement sur la fiche d'une cellule. */
  occupants?: Array<{ detenuId: number; nom: string; numeroEcrou: string; dateAffectation: string }>;
}

export interface Affectation {
  id: number;
  detenuId: number;
  detenuNom: string;
  numeroEcrou: string;
  celluleId: number;
  celluleLibelle: string;
  dateAffectation: string;
  motifAffectation: string | null;
  /** Fin de l'affectation (réaffectation, sanction, sortie) ; nulle tant qu'elle court. */
  dateFin?: string | null;
}

export interface Sanction {
  id: number;
  detenuId: number;
  detenuNom: string;
  numeroEcrou: string;
  celluleId: number | null;
  celluleLibelle: string | null;
  dateFaute: string;
  dateDebut: string;
  dateFin: string | null;
  typeSanction: string | null;
  motif: string | null;
  statut: "À venir" | "En cours" | "Terminée" | "Annulée" | null;
  dateCreation: string;
  /** Fiche encore valable ; `false` = saisie annulée, conservée pour l'historique. */
  estActif?: boolean;
  /** Le détenu est-il encore dans la cellule disciplinaire de cette sanction ? */
  isolementEnCours?: boolean;
  /** Cellule d'où il a été retiré, à lui rendre quand la sanction se termine. */
  celluleOrigine?: { id: number; libelle: string } | null;
}

/** Type de sanction : table de référence gérée côté API, désactivable mais jamais supprimée. */
export interface TypeSanction {
  id: number;
  libelle: string;
  estActif: boolean;
}

export interface SuiviMedical {
  id: number;
  detenuId: number;
  detenuNom: string;
  numeroEcrou: string;
  dateConsultation: string;
  typeConsultation: string;
  nomMedecin: string;
  temperature: string | null;
  tensionArterielle: string | null;
  poids: string | null;
  symptomes: string | null;
  diagnostic: string | null;
  medicamentsPrescrits: string | null;
  dureeTraitement: string | null;
  dateSuivi: string | null;
  observations: string | null;
}

export interface Visite {
  id: number;
  detenuId: number;
  detenuNom: string;
  numeroEcrou: string;
  dateVisite: string;
  heureArrivee: string;
  dureePrevueMinutes: number;
  typeVisite: string;
  lieuVisite: string;
  autorisationPrealable: boolean;
  nomVisiteur: string;
  sexeVisiteur: Sexe;
  typePieceIdentite: string;
  numeroPieceIdentite: string;
  telephoneVisiteur: string | null;
  lienParente: string;
  adresseVisiteur: string | null;
  agentControle: string;
  objetsDeposes: string | null;
  fouilleCorporelle: boolean | null;
  observationsSecurite: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  observationsVisite: string | null;
}

export interface SortieDetenu {
  id: number;
  detenuId: number;
  detenuNom: string;
  numeroEcrou: string;
  typeSortie: TypeSortie;
  dateSortie: string;
  situationPenale: string | null;
  motif: string | null;
  destination: string | null;
  cause: string | null;
  observation: string | null;
  dateEnregistrement: string;
  /**
   * La sortie a-t-elle fait quitter l'établissement ? Une libération normale ne lève
   * qu'un mandat : le détenu reste écroué s'il en a d'autres (cas des DPAC).
   */
  definitive?: boolean;
}

export interface Utilisateur {
  id: number;
  username: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
  email: string | null;
  estActif: boolean;
  dateCreation: string;
  derniereConnexion: string | null;
}

export interface Parametres {
  id: number;
  nomPrison: string;
  ville: string;
  telephone: string;
  fax: string;
  enteteGauche: string;
  enteteDroite: string;
  logoUrl: string | null;
  ageMajorite: number;
  autoritesAmpliataires: string;
}

// ---------------------------------------------------------------------------
// Tableau de bord
// ---------------------------------------------------------------------------

export interface PointPopulation {
  label: string;
  population: number;
}

export interface LiberableProchain {
  numeroEcrou: string;
  nom: string;
  dateIncarceration: string;
  dateExpiration: string;
  statut: string;
}

export interface TableauDeBord {
  /** Horodatage de production des données, affiché à l'utilisateur. */
  genereLe: string;
  effectif: number;
  capaciteTotale: number;
  tauxOccupation: number;
  /** Effectif au même jour du mois précédent, pour donner un point de comparaison. */
  effectifMoisPrecedent: number;
  visitesAujourdhui: number;
  sortiesPrevuesMoisProchain: number;
  mandatsExpires: number;
  sanctionsEnCours: number;

  mouvements: {
    incarcerations: number;
    liberations: number;
    transferements: number;
    evasions: number;
    deces: number;
  };

  effectifsParCategorie: Record<CategoriePenale, number>;
  populationDerniersMois: PointPopulation[];
  liberablesCeMois: LiberableProchain[];
}

// ---------------------------------------------------------------------------
// Enveloppes génériques
// ---------------------------------------------------------------------------

export interface PageResultat<T> {
  items: T[];
  total: number;
  page: number;
  parPage: number;
}

export interface FiltreDetenus {
  recherche?: string;
  statut?: StatutDetenu | "tous";
  categorie?: CategoriePenale | "toutes";
  sexe?: Sexe | "tous";
  page?: number;
  parPage?: number;
  tri?: string;
  sens?: "asc" | "desc";
}
