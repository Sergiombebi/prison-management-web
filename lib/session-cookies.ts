/**
 * Noms des cookies de session, isolés de `lib/session.ts`.
 *
 * `lib/session.ts` est marqué `server-only` et importe `next/headers` : le proxy ne
 * peut donc pas s'en servir. Ces deux constantes, elles, n'ont aucune dépendance et
 * restent lisibles partout — proxy compris.
 */

export const COOKIE_JETON = "sgp_session";
export const COOKIE_PROFIL = "sgp_profil";

/**
 * Permissions portées par le cookie de profil, ou `null` s'il est absent, illisible
 * ou d'un ancien format. `null` ne veut pas dire « aucun droit » : il veut dire
 * « on ne sait pas », et l'appelant doit laisser l'API trancher.
 */
export function permissionsDuCookie(brut: string | undefined): string[] | null {
  if (!brut) return null;
  try {
    const profil = JSON.parse(brut) as { permissions?: unknown };
    return Array.isArray(profil.permissions) ? (profil.permissions as string[]) : null;
  } catch {
    return null;
  }
}
