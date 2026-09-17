/**
 * Outils communs aux Server Actions d'écriture.
 *
 * Module ordinaire (pas `"use server"`) : il exporte un type et des fonctions
 * synchrones, ce qu'un fichier d'actions n'a pas le droit de faire.
 */

import { ApiErreur } from "./contract";
import { valeursSaisies } from "./formulaires";

/** Ce qu'un formulaire reçoit après l'envoi. */
export interface EtatAction {
  ok?: boolean;
  /** Message principal : confirmation si `ok`, sinon l'erreur la plus lisible. */
  message?: string;
  /** Erreurs par champ (422), clés identiques aux noms des champs du formulaire. */
  erreurs?: Record<string, string[]>;
  /** Saisies renvoyées pour qu'une erreur ne fasse rien perdre. */
  valeurs?: Record<string, string>;
}

/**
 * Transforme une erreur d'API en état de formulaire.
 *
 * Toute autre erreur est relancée : c'est notamment le cas du `redirect()` posé
 * sur un 401, qui doit continuer son chemin jusqu'à Next.
 */
export function etatDepuisErreur(e: unknown, formulaire?: FormData): EtatAction {
  if (!(e instanceof ApiErreur)) throw e;
  return {
    message: e.message,
    erreurs: e.erreurs,
    valeurs: formulaire ? valeursSaisies(formulaire) : undefined,
  };
}

export const texte = (f: FormData, cle: string): string => String(f.get(cle) ?? "").trim();
export const optionnel = (f: FormData, cle: string): string | null => texte(f, cle) || null;
export const entier = (f: FormData, cle: string): number | null => {
  const brut = texte(f, cle);
  const n = Number.parseInt(brut, 10);
  return brut && Number.isFinite(n) ? n : null;
};
