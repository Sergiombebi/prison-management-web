"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { Icon, type NomIcone } from "@/components/ui/icon";
import { t } from "@/lib/i18n/fr";

type Choix = "light" | "dark" | "system";

const CLE = "sgp-theme";

const OPTIONS: Array<{ valeur: Choix; icone: NomIcone; label: string }> = [
  { valeur: "light", icone: "sun", label: t.nav.themeClair },
  { valeur: "system", icone: "monitor", label: t.nav.themeSysteme },
  { valeur: "dark", icone: "moon", label: t.nav.themeSombre },
];

/** Script bloquant injecté dans <head> : fixe le thème avant la première peinture. */
export const SCRIPT_THEME = `(function(){try{var c=localStorage.getItem('${CLE}')||'system';var d=c==='dark'||(c==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

// ---------------------------------------------------------------------------
// Le choix vit dans localStorage : c'est une source externe à React, qu'on lit
// avec useSyncExternalStore (et non un useState recopié dans un effet).
// ---------------------------------------------------------------------------

const abonnes = new Set<() => void>();

function lireChoix(): Choix {
  try {
    const v = localStorage.getItem(CLE);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function abonner(rappel: () => void) {
  abonnes.add(rappel);
  window.addEventListener("storage", rappel); // synchronise les autres onglets
  return () => {
    abonnes.delete(rappel);
    window.removeEventListener("storage", rappel);
  };
}

function appliquer(choix: Choix) {
  const sombre =
    choix === "dark" ||
    (choix === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = sombre ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  // Côté serveur on ne connaît pas le choix : « système » par défaut
  const choix = useSyncExternalStore(abonner, lireChoix, () => "system" as Choix);

  // En mode « système », suivre les changements du réglage de l'OS
  useEffect(() => {
    if (choix !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const suivre = () => appliquer("system");
    mq.addEventListener("change", suivre);
    return () => mq.removeEventListener("change", suivre);
  }, [choix]);

  function choisir(valeur: Choix) {
    try {
      localStorage.setItem(CLE, valeur);
    } catch {
      /* stockage indisponible : le thème s'applique quand même pour la session */
    }
    abonnes.forEach((rappel) => rappel());

    // Bascule en fondu via l'API View Transitions quand elle existe
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const transition = doc.startViewTransition(() => appliquer(valeur));
      // Onglet en arrière-plan, navigateur qui l'annule… l'échec est sans conséquence,
      // le thème est déjà appliqué : on évite juste le rejet de promesse non intercepté.
      transition.ready.catch(() => {});
      transition.finished.catch(() => {});
    } else {
      appliquer(valeur);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.nav.theme}
      className={cn("inline-flex rounded-md border border-hairline bg-sunken p-0.5", className)}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={choix === o.valeur}
          title={o.label}
          onClick={() => choisir(o.valeur)}
          className={cn(
            "grid size-7 place-items-center rounded-sm transition-colors duration-[var(--dur-fast)]",
            choix === o.valeur
              ? "bg-surface text-ink shadow-[0_0_0_1px_var(--sgp-hairline)]"
              : "text-faint hover:text-ink",
          )}
        >
          <Icon name={o.icone} size={14} />
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
