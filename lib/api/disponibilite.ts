import "server-only";

import { ApiErreur } from "./contract";

export type Chargement<T> =
  | { ok: true; donnees: T }
  | { ok: false; raison: "non-livre" | "erreur"; message: string };

/**
 * Charge une donnée sans faire tomber tout l'écran si la source ne sait pas la
 * fournir : une route pas encore livrée (501) ou en panne (5xx) ne concerne
 * qu'un panneau, pas la page.
 *
 * Les autres erreurs sont relancées — en particulier la redirection posée sur un
 * 401, qui doit ramener à la connexion.
 */
export async function tenter<T>(appel: () => Promise<T>): Promise<Chargement<T>> {
  try {
    // Une fonction plutôt qu'une promesse : une erreur levée avant même la
    // création de la promesse est ainsi rattrapée elle aussi.
    return { ok: true, donnees: await appel() };
  } catch (e) {
    if (e instanceof ApiErreur && (e.statut === 501 || e.statut >= 500)) {
      return { ok: false, raison: e.statut === 501 ? "non-livre" : "erreur", message: e.message };
    }
    throw e;
  }
}
