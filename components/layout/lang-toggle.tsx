"use client";

import { cn } from "@/lib/cn";
import { COOKIE_LOCALE, type Locale } from "@/lib/i18n/locale";
import { useLocale } from "./i18n-provider";

const LANGUES: Array<{ valeur: Locale; label: string }> = [
  { valeur: "fr", label: "FR" },
  { valeur: "en", label: "EN" },
];

/** Hors composant à dessein : la règle react-hooks/immutability interdit de muter
 * `document` directement dans un composant ou un hook. */
function poserCookieLocale(valeur: Locale) {
  document.cookie = `${COOKIE_LOCALE}=${valeur}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Bascule de langue. Contrairement au thème/à la palette, changer de langue
 * recharge la page : une bonne partie des textes traduits vient de composants
 * serveur (rendus une fois, pas réactifs), et certains composants clients
 * les lisent au chargement du module — un rechargement complet est la façon
 * la plus simple et la plus fiable de tout remettre en cohérence.
 */
export function LangToggle({ className }: { className?: string }) {
  const locale = useLocale();

  function choisir(valeur: Locale) {
    if (valeur === locale) return;
    poserCookieLocale(valeur);
    window.location.reload();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Langue"
      className={cn("inline-flex rounded-md border border-hairline bg-sunken p-0.5", className)}
    >
      {LANGUES.map((l) => (
        <button
          key={l.valeur}
          type="button"
          role="radio"
          aria-checked={locale === l.valeur}
          title={l.label}
          onClick={() => choisir(l.valeur)}
          className={cn(
            "grid h-7 w-9 place-items-center rounded-sm text-2xs font-semibold tracking-wide transition-colors duration-[var(--dur-fast)]",
            locale === l.valeur
              ? "bg-surface text-ink shadow-[0_0_0_1px_var(--sgp-hairline)]"
              : "text-faint hover:text-ink",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
