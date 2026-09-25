"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { Icon, type NomIcone } from "@/components/ui/icon";
import { useT } from "./i18n-provider";
import type { Messages } from "@/lib/i18n/fr";

type Choix = "light" | "dark" | "system";

const CLE = "sgp-theme";

function optionsTheme(t: Messages): Array<{ valeur: Choix; icone: NomIcone; label: string }> {
  return [
    { valeur: "light", icone: "sun", label: t.nav.themeClair },
    { valeur: "system", icone: "monitor", label: t.nav.themeSysteme },
    { valeur: "dark", icone: "moon", label: t.nav.themeSombre },
  ];
}

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
  const t = useT();
  const OPTIONS = optionsTheme(t);
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

// ---------------------------------------------------------------------------
// Palette de couleur — un second réglage, indépendant du clair/sombre ci-dessus :
// le choix (violet / bleu ciel / marron clair mat) fixe `--sgp-accent` et les
// surfaces associées (voir globals.css), quel que soit le mode clair ou sombre.
// ---------------------------------------------------------------------------

type Palette = "violet" | "bleu-ciel" | "marron-clair";

const CLE_PALETTE = "sgp-palette";

const PALETTES: Array<{ valeur: Palette; label: string; teinte: string }> = [
  { valeur: "violet", label: "Violet", teinte: "#6c3fed" },
  { valeur: "bleu-ciel", label: "Bleu ciel", teinte: "#0f8fe0" },
  { valeur: "marron-clair", label: "Marron clair mat", teinte: "#8a6d3a" },
];

const PALETTES_VALIDES = new Set<string>(PALETTES.map((p) => p.valeur));

/** Script bloquant injecté dans <head> : fixe la palette avant la première peinture. */
export const SCRIPT_PALETTE = `(function(){try{var c=localStorage.getItem('${CLE_PALETTE}');if(c&&c!=='violet'){document.documentElement.dataset.palette=c;}}catch(e){}})();`;

const abonnesPalette = new Set<() => void>();

function lirePalette(): Palette {
  try {
    const v = localStorage.getItem(CLE_PALETTE);
    return v && PALETTES_VALIDES.has(v) ? (v as Palette) : "violet";
  } catch {
    return "violet";
  }
}

function abonnerPalette(rappel: () => void) {
  abonnesPalette.add(rappel);
  window.addEventListener("storage", rappel);
  return () => {
    abonnesPalette.delete(rappel);
    window.removeEventListener("storage", rappel);
  };
}

function appliquerPalette(palette: Palette) {
  // "violet" est la valeur par défaut : ne pas poser l'attribut évite un
  // sélecteur CSS de plus à faire correspondre sur chaque page pour le cas courant.
  if (palette === "violet") {
    delete document.documentElement.dataset.palette;
  } else {
    document.documentElement.dataset.palette = palette;
  }
}

export function PaletteToggle({ className }: { className?: string }) {
  const palette = useSyncExternalStore(abonnerPalette, lirePalette, () => "violet" as Palette);

  function choisir(valeur: Palette) {
    try {
      localStorage.setItem(CLE_PALETTE, valeur);
    } catch {
      /* stockage indisponible : la palette s'applique quand même pour la session */
    }
    abonnesPalette.forEach((rappel) => rappel());

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const transition = doc.startViewTransition(() => appliquerPalette(valeur));
      transition.ready.catch(() => {});
      transition.finished.catch(() => {});
    } else {
      appliquerPalette(valeur);
    }
  }

  return (
    <div role="radiogroup" aria-label="Palette de couleur" className={cn("inline-flex items-center gap-1.5", className)}>
      {PALETTES.map((p) => (
        <button
          key={p.valeur}
          type="button"
          role="radio"
          aria-checked={palette === p.valeur}
          title={p.label}
          onClick={() => choisir(p.valeur)}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border transition-[transform,box-shadow] duration-[var(--dur-fast)]",
            palette === p.valeur
              ? "scale-110 border-ink/70 shadow-e1"
              : "border-hairline hover:scale-105",
          )}
          style={{ backgroundColor: p.teinte }}
        >
          <span className="sr-only">{p.label}</span>
        </button>
      ))}
    </div>
  );
}
