"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type NomIcone } from "@/components/ui/icon";
import { construireModules } from "@/lib/navigation";
import { aAcces } from "@/lib/acces";
import { useT } from "./i18n-provider";

interface Commande {
  id: string;
  label: string;
  groupe: string;
  href: string;
  icone: NomIcone;
  motsCles?: string;
}

/** À plat : chaque écran de l'application devient une commande. */
function construireCommandes(modules: ReturnType<typeof construireModules>): Commande[] {
  return modules.flatMap((m) =>
    (m.groupes ?? [{ label: m.label, liens: [{ href: m.href, label: m.label }] }]).flatMap((g) =>
      g.liens.map((l) => ({
        id: l.href,
        label: l.label,
        groupe: m.label,
        href: l.href,
        icone: m.icone,
        motsCles: l.description,
      })),
    ),
  );
}

function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Palette de commandes — Ctrl/⌘ + K, ou « / ».
 *
 * Bâtie sur `<dialog>` natif : le piège du focus, la touche Échap et l'arrière-plan
 * inerte sont gérés par le navigateur, sans bibliothèque ni code d'accessibilité
 * à maintenir.
 */
export function CommandPalette({ permissions }: { permissions: string[] }) {
  const t = useT();
  const router = useRouter();
  const dialogue = useRef<HTMLDialogElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");
  const [index, setIndex] = useState(0);

  const commandes = useMemo(() => construireCommandes(construireModules(t)), [t]);

  // La palette ne propose que des écrans ouverts à ce compte : proposer une porte
  // fermée puis refuser l'entrée serait la pire des deux situations.
  const autorisees = useMemo(
    () => commandes.filter((c) => aAcces(permissions, c.href)),
    [commandes, permissions],
  );

  const resultats = useMemo(() => {
    const q = normaliser(requete.trim());
    if (!q) return autorisees;
    return autorisees.filter(
      (c) =>
        normaliser(c.label).includes(q) ||
        normaliser(c.groupe).includes(q) ||
        normaliser(c.motsCles ?? "").includes(q),
    );
  }, [requete, autorisees]);

  // Recherche directe dans le registre — seulement pour qui peut le consulter
  const peutChercherDetenu = aAcces(permissions, "/detenus");
  const rechercheDetenu =
    peutChercherDetenu && requete.trim().length >= 2 ? requete.trim() : null;
  const total = resultats.length + (rechercheDetenu ? 1 : 0);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      const dansUnChamp = cible.closest("input, textarea, select, [contenteditable]");

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !dansUnChamp)) {
        e.preventDefault();
        setOuvert(true);
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, []);

  useEffect(() => {
    const el = dialogue.current;
    if (!el) return;
    if (ouvert && !el.open) {
      el.showModal();
      setRequete("");
      setIndex(0);
      champ.current?.focus();
    } else if (!ouvert && el.open) {
      el.close();
    }
  }, [ouvert]);

  function aller(href: string) {
    setOuvert(false);
    router.push(href);
  }

  function surToucheListe(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % Math.max(total, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + Math.max(total, 1)) % Math.max(total, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rechercheDetenu && index === 0) {
        aller(`/detenus?recherche=${encodeURIComponent(rechercheDetenu)}`);
        return;
      }
      const choix = resultats[rechercheDetenu ? index - 1 : index];
      if (choix) aller(choix.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="group flex h-9 w-full max-w-72 items-center gap-2 rounded-md border border-hairline bg-surface px-3 text-sm text-faint shadow-e1 transition-colors hover:border-rule hover:text-muted"
      >
        <Icon name="search" size={15} />
        <span className="flex-1 text-left">Rechercher…</span>
        <kbd className="hidden rounded-xs border border-hairline bg-sunken px-1.5 font-mono text-2xs text-faint sm:block">
          ⌘K
        </kbd>
      </button>

      <dialog
        ref={dialogue}
        onClose={() => setOuvert(false)}
        onClick={(e) => {
          // Clic sur le fond (hors du panneau) : on ferme
          if (e.target === dialogue.current) setOuvert(false);
        }}
        aria-label="Palette de commandes"
        className={cn(
          "m-0 w-full max-w-xl rounded-xl border border-hairline bg-transparent p-0 text-ink shadow-e4",
          "fixed left-1/2 top-[12vh] -translate-x-1/2",
          "backdrop:bg-inverse/40 backdrop:backdrop-blur-sm",
          "open:animate-pop",
        )}
      >
        <div className="verre overflow-hidden rounded-xl">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4">
            <Icon name="search" size={16} className="shrink-0 text-faint" />
            <input
              ref={champ}
              value={requete}
              onChange={(e) => {
                setRequete(e.target.value);
                setIndex(0);
              }}
              onKeyDown={surToucheListe}
              placeholder={
                peutChercherDetenu ? "Aller à un écran, ou chercher un détenu…" : "Aller à un écran…"
              }
              aria-label="Rechercher une commande ou un détenu"
              className="h-12 flex-1 bg-transparent text-md text-ink outline-none placeholder:text-faint"
            />
            <kbd className="rounded-xs border border-hairline px-1.5 font-mono text-2xs text-faint">
              Échap
            </kbd>
          </div>

          <ul className="max-h-[52vh] overflow-y-auto p-2">
            {rechercheDetenu && (
              <li>
                <Ligne
                  actif={index === 0}
                  icone="detenus"
                  onClick={() => aller(`/detenus?recherche=${encodeURIComponent(rechercheDetenu)}`)}
                  label={
                    <>
                      Chercher <span className="font-semibold">« {rechercheDetenu} »</span> dans le
                      registre
                    </>
                  }
                  groupe="Registre d'écrou"
                />
              </li>
            )}

            {resultats.length === 0 && !rechercheDetenu && (
              <li className="px-3 py-8 text-center text-sm text-muted">Aucun écran ne correspond.</li>
            )}

            {resultats.map((c, i) => {
              const position = rechercheDetenu ? i + 1 : i;
              return (
                <li key={c.id}>
                  <Ligne
                    actif={index === position}
                    icone={c.icone}
                    label={c.label}
                    groupe={c.groupe}
                    onClick={() => aller(c.href)}
                  />
                </li>
              );
            })}
          </ul>

          <footer className="flex items-center gap-4 border-t border-hairline px-4 py-2 text-2xs text-faint">
            <span className="flex items-center gap-1">
              <kbd className="rounded-xs border border-hairline px-1 font-mono">↑</kbd>
              <kbd className="rounded-xs border border-hairline px-1 font-mono">↓</kbd> naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-xs border border-hairline px-1 font-mono">↵</kbd> ouvrir
            </span>
          </footer>
        </div>
      </dialog>
    </>
  );
}

function Ligne({
  actif,
  icone,
  label,
  groupe,
  onClick,
}: {
  actif: boolean;
  icone: NomIcone;
  label: React.ReactNode;
  groupe: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (actif) ref.current?.scrollIntoView({ block: "nearest" });
  }, [actif]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={(e) => e.currentTarget.focus({ preventScroll: true })}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
        actif ? "bg-accent-soft text-accent-ink" : "text-ink hover:bg-raised",
      )}
    >
      <Icon name={icone} size={16} className={cn(actif ? "text-accent" : "text-faint")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-2xs text-faint">{groupe}</span>
    </button>
  );
}
