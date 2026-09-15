/**
 * Contrat d'API — ce que le front ATTEND du back.
 *
 * C'est le document à discuter avec le développeur de l'API. Chaque méthode
 * correspond à un point d'entrée REST suggéré (indiqué en commentaire). Si l'API
 * réelle diffère, on adapte `live.ts` — jamais les écrans.
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

export interface SessionUtilisateur {
  utilisateur: Utilisateur;
  jeton: string;
}

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
  /** POST /auth/connexion */
  connexion(identifiant: string, motDePasse: string): Promise<SessionUtilisateur>;

  /** GET /tableau-de-bord */
  getTableauDeBord(): Promise<TableauDeBord>;

  /** GET /detenus?recherche=&statut=&categorie=&sexe=&page=&parPage=&tri=&sens= */
  listDetenus(filtre?: FiltreDetenus): Promise<PageResultat<DetenuResume>>;
  /** GET /detenus/{id}  (dossier complet : mandats, affectations, sanctions…) */
  getDossierDetenu(id: number): Promise<DossierDetenu | null>;
  /** GET /detenus/non-loges */
  listDetenusNonLoges(): Promise<DetenuResume[]>;

  /** GET /mandats */
  listMandats(): Promise<MandatDetaille[]>;
  /** GET /mandats/expires */
  listMandatsExpires(): Promise<MandatDetaille[]>;
  /** GET /detenus/categories/{categorie}  — règle calculée côté serveur */
  listParCategorie(categorie: CategoriePenale): Promise<DetenuResume[]>;

  /** GET /cellules */
  listCellules(): Promise<Cellule[]>;
  /** GET /affectations */
  listAffectations(): Promise<Affectation[]>;
  /** GET /sanctions */
  listSanctions(): Promise<Sanction[]>;

  /** GET /suivis-medicaux */
  listSuivisMedicaux(): Promise<SuiviMedical[]>;
  /** GET /visites */
  listVisites(): Promise<Visite[]>;

  /** GET /sorties?type= */
  listSorties(type?: TypeSortie): Promise<SortieDetenu[]>;

  /** GET /utilisateurs */
  listUtilisateurs(): Promise<Utilisateur[]>;
  /** GET /parametres */
  getParametres(): Promise<Parametres>;
}
