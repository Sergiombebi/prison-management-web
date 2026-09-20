import "server-only";

import { ApiErreur } from "./contract";

export type Chargement<T> =
  | { ok: true; donnees: T }
  | { ok: false; raison: "non-livre" | "interdit" | "erreur"; message: string };

/**
 * Charge une donnée sans faire tomber tout l'écran si la source ne sait pas — ou
 * ne veut pas — la fournir :
 * - 501 : route pas encore livrée ;
 * - 5xx : source en panne ;
 * - 403 : le compte n'a pas ce droit-là. Un écran mêle souvent plusieurs domaines
 *   (les affectations lisent le registre ET la discipline) ; un droit manquant sur
 *   l'un ne doit masquer qu'un panneau, pas renvoyer toute la page sur l'écran
 *   d'erreur.
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
    if (e instanceof ApiErreur && (e.statut === 403 || e.statut === 501 || e.statut >= 500)) {
      const raison = e.statut === 403 ? "interdit" : e.statut === 501 ? "non-livre" : "erreur";
      return { ok: false, raison, message: e.message };
    }
    throw e;
  }
}

/**
 * Donnée secondaire : la page vit sans elle.
 *
 * Beaucoup d'écrans lisent un domaine voisin pour se compléter — la liste des
 * détenus alimente le sélecteur d'un formulaire de consultation, le tableau de
 * bord fournit un compteur à un listing de mandats. Ces appels traversent une
 * frontière de permissions : un médecin qui n'a que `sante.consultations.*`
 * reçoit un 403 sur `GET /detenus`, et l'écran entier tombait alors sur l'erreur
 * générique. Ici, le manque se réduit à une valeur de repli.
 */
export async function optionnel<T>(appel: () => Promise<T>, repli: T): Promise<T> {
  const resultat = await tenter(appel);
  return resultat.ok ? resultat.donnees : repli;
}
