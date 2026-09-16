/**
 * Adaptateur LIVE — appelle l'API Laravel réelle.
 *
 * C'est le seul fichier qui connaît la forme exacte de l'API : routes, snake_case,
 * enveloppes `{ data, meta }`, valeurs de rôles… Les écrans ne consomment que les
 * types de `contract.ts`.
 *
 * Référence : GUIDE_FRONTEND.md et SGP-API.postman_collection.json (backend).
 */

import "server-only";

import { redirect } from "next/navigation";
import type { CategoriePenale, FiltreDetenus, RoleUtilisateur } from "@/lib/domain/types";
import { ROLES_UTILISATEUR } from "@/lib/domain/referentiels";
import { getJeton } from "@/lib/session";
import { ApiErreur, type ApiClient, type ProfilUtilisateur } from "./contract";

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
  redirigerSur401?: boolean;
}

async function requete<T>(
  chemin: string,
  { query, redirigerSur401 = true, ...init }: OptionsRequete = {},
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
        ...(init.body ? { "Content-Type": "application/json" } : {}),
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

  if (reponse.status === 401 && redirigerSur401) {
    // Jeton expiré ou révoqué. redirect() lève une exception de contrôle : ne jamais
    // envelopper un appel api.* dans un try/catch qui avalerait toutes les erreurs.
    redirect("/deconnexion?raison=expiree");
  }

  if (reponse.status === 404) return null as T;

  if (!reponse.ok) {
    let message = `Erreur ${reponse.status}`;
    try {
      const corps = await reponse.json();
      // Laravel (422) : { message, errors: { champ: ["…"] } } — la première erreur est la plus lisible
      const premiere = corps?.errors ? Object.values(corps.errors as Record<string, string[]>).flat()[0] : undefined;
      message = premiere ?? corps?.message ?? message;
    } catch {
      /* corps non JSON : on garde le message générique */
    }
    throw new ApiErreur(message, reponse.status);
  }

  const texte = await reponse.text();
  return (texte ? JSON.parse(texte) : undefined) as T;
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

export const liveApi: ApiClient = {
  async connexion(identifiant, motDePasse) {
    const corps = await requete<{ user?: UtilisateurApi; token?: string } | null>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifiant, password: motDePasse }),
      redirigerSur401: false,
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
    await requete("/auth/logout", { method: "POST", redirigerSur401: false });
  },

  async getUtilisateurCourant() {
    const corps = await requete<Record<string, unknown> | null>("/auth/me", { redirigerSur401: false });
    // Le guide ne précise pas l'enveloppe de /auth/me : { user }, { data } ou l'objet nu
    const brut = (corps?.user ?? corps?.data ?? corps) as UtilisateurApi | null;
    if (!brut?.id) {
      throw new ApiErreur("Réponse /auth/me inattendue de l'API.", 502, "REPONSE_INVALIDE");
    }
    return versProfil(brut);
  },

  // -------------------------------------------------------------------------
  // Domaines pas encore adaptés : routes suggérées, à traduire au fil des livraisons
  // -------------------------------------------------------------------------

  getTableauDeBord: () => requete("/tableau-de-bord"),

  listDetenus: (filtre: FiltreDetenus = {}) => requete("/detenus", { query: { ...filtre } }),
  getDossierDetenu: (id) => requete(`/detenus/${id}`),
  listDetenusNonLoges: () => requete("/detenus/non-loges"),

  listMandats: () => requete("/mandats"),
  listMandatsExpires: () => requete("/mandats/expires"),
  listParCategorie: (categorie: CategoriePenale) =>
    requete(`/detenus/categories/${categorie.toLowerCase()}`),

  listCellules: () => requete("/cellules"),
  listAffectations: () => requete("/affectations"),
  listSanctions: () => requete("/sanctions"),

  listSuivisMedicaux: () => requete("/suivis-medicaux"),
  listVisites: () => requete("/visites"),

  listSorties: (type) => requete("/sorties", { query: { type } }),

  listUtilisateurs: () => requete("/utilisateurs"),
  getParametres: () => requete("/parametres"),
};
