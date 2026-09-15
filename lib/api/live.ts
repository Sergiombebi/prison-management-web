/**
 * Adaptateur LIVE — appelle l'API REST réelle.
 *
 * Le jour où l'API répond : `SGP_API_MODE=live` et `SGP_API_URL=https://…` dans
 * `.env.local`. Si les routes ou les noms de champs diffèrent du contrat, c'est ICI
 * qu'on les traduit — les écrans ne doivent jamais le savoir.
 */

import "server-only";

import { cookies } from "next/headers";
import type { CategoriePenale, FiltreDetenus } from "@/lib/domain/types";
import { ApiErreur, type ApiClient } from "./contract";

const BASE_URL = process.env.SGP_API_URL ?? "http://localhost:5000/api";

async function requete<T>(
  chemin: string,
  init: RequestInit & { query?: Record<string, unknown> } = {},
): Promise<T> {
  const url = new URL(chemin.replace(/^\//, ""), BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`);
  for (const [cle, valeur] of Object.entries(init.query ?? {})) {
    if (valeur !== undefined && valeur !== null && valeur !== "") {
      url.searchParams.set(cle, String(valeur));
    }
  }

  const jeton = (await cookies()).get("sgp_session")?.value;

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
      "Le serveur de l'API est injoignable. Vérifiez qu'il est démarré.",
      0,
      "RESEAU",
    );
  }

  if (reponse.status === 404) return null as T;

  if (!reponse.ok) {
    let message = `Erreur ${reponse.status}`;
    try {
      const corps = await reponse.json();
      message = corps.message ?? corps.title ?? message;
    } catch {
      /* corps non JSON : on garde le message générique */
    }
    throw new ApiErreur(message, reponse.status);
  }

  return (await reponse.json()) as T;
}

export const liveApi: ApiClient = {
  connexion: (identifiant, motDePasse) =>
    requete("/auth/connexion", {
      method: "POST",
      body: JSON.stringify({ identifiant, motDePasse }),
    }),

  getTableauDeBord: () => requete("/tableau-de-bord"),

  listDetenus: (filtre: FiltreDetenus = {}) =>
    requete("/detenus", { query: { ...filtre } }),
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
