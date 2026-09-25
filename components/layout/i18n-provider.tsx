"use client";

import { createContext, useContext, type ReactNode } from "react";
import { fr, type Messages } from "@/lib/i18n/fr";
import { LOCALE_PAR_DEFAUT, type Locale } from "@/lib/i18n/locale";

/**
 * Dictionnaire de messages (+ la locale elle-même, pour le sélecteur de
 * langue), résolus une fois côté serveur (voir `getT()`/`getLocale()`) et
 * fournis par contexte à tout composant client de l'arbre — pas de prop à
 * faire traverser 10 niveaux, pas de désaccord serveur/client à
 * l'hydratation puisque la Provider est elle-même rendue depuis le layout
 * racine (serveur).
 */
const I18nContext = createContext<{ messages: Messages; locale: Locale }>({
  messages: fr,
  locale: LOCALE_PAR_DEFAUT,
});

export function I18nProvider({
  messages,
  locale,
  children,
}: {
  messages: Messages;
  locale: Locale;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ messages, locale }}>{children}</I18nContext.Provider>;
}

/** Dictionnaire de messages courant, pour tout composant client. */
export function useT(): Messages {
  return useContext(I18nContext).messages;
}

/** Locale courante — pour le sélecteur de langue. */
export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
