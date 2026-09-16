/**
 * Adaptateur LIVE — appelle l'API Laravel réelle.
 *
 * C'est le seul fichier qui connaît la forme exacte de l'API : routes, snake_case,
 * enveloppes `{ data, meta }`, valeurs de rôles… Les écrans ne consomment que les
 * types de `contract.ts`.
 *
 * Référence : docs/GUIDE_FRONTEND.md du dépôt `prison-management-api`.
 * Les routes absentes de l'API (sorties, visites, suivi médical, tableau de bord…)
 * lèvent une erreur explicite : leur domaine doit rester en démonstration.
 */

import "server-only";

import { redirect } from "next/navigation";
import type {
  CategoriePenale,
  DetenuResume,
  FiltreDetenus,
  Mandas,
  RoleUtilisateur,
  Sexe,
  TypeStatutPenal,
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
interface UtilisateurApi {
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

function versProfil(u: UtilisateurApi): ProfilUtilisateur {
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

interface MetaPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

/** Vue résumée renvoyée par `GET /detenus` (colonnes de l'ancienne app C#). */
interface DetenuListeApi {
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
  est_present: boolean;
}

interface MandasApi {
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

interface DetenuDetailApi extends Omit<DetenuListeApi, "contact" | "statut_penal" | "date_incarceration" | "motif_detention" | "type_mandat"> {
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
  created_at: string | null;
  updated_at: string | null;
}

const versSexe = (s: string): Sexe => (s === "Féminin" ? "Féminin" : "Masculin");

/**
 * Un mandat est actif si l'API ne l'a pas désactivé ET que sa date d'expiration
 * n'est pas passée — même règle que l'ancienne application desktop.
 */
function mandatActif(m: MandasApi): boolean {
  if (!m.est_actif) return false;
  if (!m.date_expiration_mandat) return true;
  return new Date(m.date_expiration_mandat) > new Date();
}

function versMandas(m: MandasApi): Mandas {
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
 * `categoriePenale` et la cellule restent nuls : l'API ne les expose pas encore
 * dans la liste (retours A2 et A3). Les écrans masquent ces colonnes en mode réel
 * plutôt que d'afficher une valeur inventée.
 */
function versResume(d: DetenuListeApi): DetenuResume {
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
    categoriePenale: null,
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
    cellule: null,
  };
}

/** Fiche complète → résumé, mandats compris (là, tout est disponible). */
function versResumeDetail(d: DetenuDetailApi, mandats: Mandas[]): DetenuResume {
  const actifs = mandats
    .filter((m) => !m.dateSortieMandat || new Date(m.dateSortieMandat) > new Date())
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
    cellule: null,
  };
}

/**
 * Corps JSON attendu par l'API pour un détenu.
 *
 * Les clés absentes ne sont pas envoyées : sur un PUT, l'API conserve alors la
 * valeur existante (contrairement à ce qu'annonce son guide — retour A17).
 */
function versCorpsDetenu(e: EntreeDetenu): Record<string, unknown> {
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

  for (const cle of Object.keys(corps)) {
    if (corps[cle] === undefined || corps[cle] === null || corps[cle] === "") delete corps[cle];
  }
  return corps;
}

/** Corps JSON attendu par l'API pour un mandat. */
function versCorpsMandat(e: EntreeMandat): Record<string, unknown> {
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

  for (const cle of Object.keys(corps)) {
    if (corps[cle] === undefined || corps[cle] === null || corps[cle] === "") delete corps[cle];
  }
  return corps;
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
    const corps = await requete<{ data: DetenuDetailApi } | null>(`/detenus/${id}`, {
      nullSur404: true,
    });
    if (!corps?.data) return null;

    const brut = corps.data;
    const mandatsApi = brut.mandas ?? [];
    const mandats: MandatDetaille[] = mandatsApi
      .map((m) => ({
        ...versMandas(m),
        detenuNom: brut.nom,
        numeroEcrou: brut.numero_ecrou,
        actif: mandatActif(m),
      }))
      .sort((a, b) => b.dateIncarceration.localeCompare(a.dateIncarceration));

    return {
      detenu: versResumeDetail(brut, mandats),
      mandats,
      // Modules absents de l'API : les onglets correspondants restent vides
      affectations: [],
      sanctions: [],
      visites: [],
      suivisMedicaux: [],
      sorties: [],
    };
  },

  async listParCategorie(categorie: CategoriePenale) {
    const slug = CATEGORIE_SLUG[categorie];
    const tous: DetenuResume[] = [];

    // L'API pagine à 10 : on parcourt, avec un garde-fou pour ne pas boucler sans fin
    for (let page = 1; page <= 20; page += 1) {
      const corps = await requete<{ data: DetenuListeApi[]; meta: MetaPagination }>("/detenus", {
        query: { categorie_penale: slug, page },
      });
      tous.push(...(corps?.data ?? []).map(versResume));
      if (!corps?.meta || page >= corps.meta.last_page) break;
    }

    return tous.map((d) => ({ ...d, categoriePenale: categorie }));
  },

  async creerDetenu(entree) {
    const corps = await requete<{ data: { id: number } }>("/detenus", {
      method: "POST",
      body: JSON.stringify(versCorpsDetenu(entree)),
    });
    return { id: corps.data.id };
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
    };
  },

  async majMandat(mandatId, entree) {
    await requete(`/mandas/${mandatId}`, {
      method: "PUT",
      body: JSON.stringify(versCorpsMandat(entree)),
    });
  },

  // -------------------------------------------------------------------------
  // Modules que l'API n'expose pas encore (cf. bloc A signalé au back)
  // -------------------------------------------------------------------------

  getTableauDeBord: () => nonLivre("GET /tableau-de-bord"),
  listDetenusNonLoges: () => nonLivre("GET /detenus/non-loges"),
  listMandats: () => nonLivre("GET /mandats"),
  listMandatsExpires: () => nonLivre("GET /mandats/expires"),
  listCellules: () => nonLivre("GET /cellules"),
  listAffectations: () => nonLivre("GET /affectations"),
  listSanctions: () => nonLivre("GET /sanctions"),
  listSuivisMedicaux: () => nonLivre("GET /suivis-medicaux"),
  listVisites: () => nonLivre("GET /visites"),
  listSorties: () => nonLivre("GET /sorties"),
  listUtilisateurs: () => nonLivre("GET /utilisateurs"),
  getParametres: () => nonLivre("GET /parametres"),
};
