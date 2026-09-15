/** Utilitaires de paramètres d'URL — l'état des filtres vit dans l'URL. */

export type SearchParams = Record<string, string | string[] | undefined>;

/** Première valeur d'un paramètre, ou `undefined`. */
export function param(sp: SearchParams, cle: string): string | undefined {
  const v = sp[cle];
  const s = Array.isArray(v) ? v[0] : v;
  return s === "" ? undefined : s;
}

/** Paramètre numérique entier positif, avec valeur par défaut. */
export function paramEntier(sp: SearchParams, cle: string, defaut: number): number {
  const n = Number.parseInt(param(sp, cle) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : defaut;
}

/**
 * Construit un lien en conservant les paramètres courants et en appliquant les
 * mises à jour (`null`/`undefined`/`""` suppriment la clé).
 */
export function hrefAvec(
  chemin: string,
  courant: SearchParams,
  maj: Record<string, string | number | null | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(courant)) {
    const v = Array.isArray(valeur) ? valeur[0] : valeur;
    if (v) q.set(cle, v);
  }
  for (const [cle, valeur] of Object.entries(maj)) {
    if (valeur === null || valeur === undefined || valeur === "") q.delete(cle);
    else q.set(cle, String(valeur));
  }
  const s = q.toString();
  return s ? `${chemin}?${s}` : chemin;
}

/** Vrai si au moins un des filtres listés est actif. */
export function filtresActifs(sp: SearchParams, cles: string[]): boolean {
  return cles.some((c) => {
    const v = param(sp, c);
    return v !== undefined && v !== "tous" && v !== "toutes";
  });
}
