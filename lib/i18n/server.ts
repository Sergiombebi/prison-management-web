import "server-only";

import { cookies } from "next/headers";
import { COOKIE_LOCALE, LOCALE_PAR_DEFAUT, estLocale, type Locale } from "./locale";
import { fr, type Messages } from "./fr";
import { en } from "./en";

/** Locale du visiteur courant, déduite du cookie posé par le sélecteur de langue. */
export async function getLocale(): Promise<Locale> {
  const brute = (await cookies()).get(COOKIE_LOCALE)?.value;
  return estLocale(brute) ? brute : LOCALE_PAR_DEFAUT;
}

/** Dictionnaire de messages pour la requête en cours — à appeler dans chaque page/action serveur. */
export async function getT(): Promise<Messages> {
  return (await getLocale()) === "en" ? en : fr;
}
