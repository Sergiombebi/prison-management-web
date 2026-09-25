/**
 * Langues prises en charge — sans préfixe d'URL, choisies via un cookie
 * (comme le thème et la palette), pas la mode i18n routing de Next.js.
 */

export type Locale = "fr" | "en";

export const LOCALES: readonly Locale[] = ["fr", "en"];
export const LOCALE_PAR_DEFAUT: Locale = "fr";
export const COOKIE_LOCALE = "sgp-locale";

export function estLocale(valeur: string | undefined | null): valeur is Locale {
  return valeur === "fr" || valeur === "en";
}
