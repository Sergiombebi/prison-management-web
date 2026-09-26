/**
 * Formatage — un seul endroit pour toute mise en forme visible par l'utilisateur.
 *
 * Toutes les fonctions acceptent `null`/`undefined` et renvoient un tiret cadratin.
 * Aucun écran ne doit afficher « null », « Invalid Date » ou une chaîne vide muette.
 *
 * Locale : dernier paramètre optionnel, "fr" par défaut — les très nombreux appels
 * déjà existants (non encore adaptés à l'anglais) continuent de fonctionner tels
 * quels. Un écran traduit passe la locale courante (`getLocale()`/`useLocale()`).
 */

import type { Locale } from "@/lib/i18n/locale";

export const VIDE = "—";

const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

/** Code BCP 47 pour les `Intl.*` natifs — exporté pour les composants qui en ont
 * besoin directement (ex. `Compteur`, animé, hors des fonctions ci-dessous). */
export function intl(locale: Locale): string {
  return INTL_LOCALE[locale];
}

function toDate(valeur: string | Date | null | undefined): Date | null {
  if (!valeur) return null;
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 04/01/2026 */
export function formatDate(valeur: string | Date | null | undefined, locale: Locale = "fr"): string {
  const d = toDate(valeur);
  if (!d) return VIDE;
  return new Intl.DateTimeFormat(intl(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** 4 janvier 2026 */
export function formatDateLongue(
  valeur: string | Date | null | undefined,
  locale: Locale = "fr",
): string {
  const d = toDate(valeur);
  if (!d) return VIDE;
  return new Intl.DateTimeFormat(intl(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** 04/01/2026 à 11:10 */
export function formatDateHeure(
  valeur: string | Date | null | undefined,
  locale: Locale = "fr",
): string {
  const d = toDate(valeur);
  if (!d) return VIDE;
  const connecteur = locale === "en" ? "at" : "à";
  return `${formatDate(d, locale)} ${connecteur} ${new Intl.DateTimeFormat(intl(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)}`;
}

/** 1 245 */
export function formatNombre(valeur: number | null | undefined, locale: Locale = "fr"): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur))
    return VIDE;
  return new Intl.NumberFormat(intl(locale)).format(valeur);
}

/** 82,5 % */
export function formatPourcent(
  valeur: number | null | undefined,
  decimales = 1,
  locale: Locale = "fr",
): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur))
    return VIDE;
  return `${new Intl.NumberFormat(intl(locale), {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur)} %`;
}

/** +12 / −3 / = — pour les comparaisons d'une période à l'autre. */
export function formatEcart(valeur: number, locale: Locale = "fr"): string {
  if (valeur === 0) return "=";
  return valeur > 0 ? `+${formatNombre(valeur, locale)}` : `−${formatNombre(-valeur, locale)}`;
}

/** « il y a 3 jours », « dans 2 mois » */
export function formatRelatif(
  valeur: string | Date | null | undefined,
  reference: Date = new Date(),
  locale: Locale = "fr",
): string {
  const d = toDate(valeur);
  if (!d) return VIDE;

  const diffJours = Math.round(
    (d.getTime() - reference.getTime()) / 86_400_000,
  );
  const rtf = new Intl.RelativeTimeFormat(intl(locale), { numeric: "auto" });

  if (Math.abs(diffJours) < 31) return rtf.format(diffJours, "day");
  if (Math.abs(diffJours) < 365)
    return rtf.format(Math.round(diffJours / 30), "month");
  return rtf.format(Math.round(diffJours / 365), "year");
}

/** Nombre de jours entiers séparant deux dates (négatif si la date est passée). */
export function joursRestants(
  valeur: string | Date | null | undefined,
  reference: Date = new Date(),
): number | null {
  const d = toDate(valeur);
  if (!d) return null;
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  return Math.round((a - b) / 86_400_000);
}

/** Initiales pour les pastilles d'identité : « Kenfack Zegou » → « KZ ». */
export function initiales(nom: string | null | undefined): string {
  if (!nom) return "?";
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

/** Coupe proprement une chaîne trop longue sans casser un mot en plein milieu. */
export function tronquer(texte: string | null | undefined, max = 60): string {
  if (!texte) return VIDE;
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()}…`;
}

/** Affiche une valeur potentiellement absente sans jamais laisser un trou. */
export function ouVide(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined) return VIDE;
  const s = String(valeur).trim();
  return s.length === 0 ? VIDE : s;
}

/**
 * Accord pluriel simple : `pluriel(3, "mandat")` → « 3 mandats ». La règle (pluriel
 * seulement au-delà de 1) reste celle du français même en anglais - l'anglais dirait
 * "0 mandates", pas "0 mandate" - imprécision assumée plutôt que réécrire la règle
 * pour ce seul cas encore rare dans l'app traduite.
 */
export function pluriel(n: number, singulier: string, plurielForme?: string, locale: Locale = "fr") {
  const mot = n > 1 ? (plurielForme ?? `${singulier}s`) : singulier;
  return `${formatNombre(n, locale)} ${mot}`;
}
