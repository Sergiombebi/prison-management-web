"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { hrefAvec } from "@/lib/url";

/**
 * Saut direct à un numéro de page — complète Précédent/Suivant, indispensable dès que
 * la liste dépasse quelques dizaines de pages (ex. 15 000 détenus). L'état de la
 * pagination vit dans l'URL ; ce composant y écrit comme le ferait un lien, mais a
 * besoin de JS pour lire la valeur saisie.
 */
export function AllerALaPage({
  pages,
  label,
  bouton,
}: {
  pages: number;
  label: string;
  bouton: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valeur, setValeur] = useState("");

  const aller = () => {
    const n = Number.parseInt(valeur, 10);
    if (!Number.isFinite(n) || n < 1 || n > pages) return;
    const courant = Object.fromEntries(searchParams.entries());
    router.push(hrefAvec(pathname, courant, { page: n === 1 ? null : n }), { scroll: false });
    setValeur("");
  };

  if (pages <= 1) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        aller();
      }}
      className="flex items-center gap-1.5"
    >
      <label htmlFor="pagination-aller" className="sr-only">
        {label}
      </label>
      <input
        id="pagination-aller"
        type="number"
        inputMode="numeric"
        min={1}
        max={pages}
        placeholder="N°"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        aria-label={label}
        className="h-8 w-14 rounded-md border border-hairline bg-surface px-2 text-center text-xs tnum text-ink outline-none transition-colors focus:border-accent"
      />
      <button
        type="submit"
        disabled={!valeur}
        className="h-8 shrink-0 rounded-md border border-hairline bg-surface px-2.5 text-xs text-muted transition-colors hover:border-rule hover:text-ink disabled:pointer-events-none disabled:opacity-40"
      >
        {bouton}
      </button>
    </form>
  );
}

/**
 * Choix du nombre de lignes par page — réduit d'autant le nombre total de pages à
 * parcourir. Remet toujours `page` à 1 : une page 40 peut ne plus exister une fois la
 * taille de page changée.
 */
export function LignesParPage({
  valeur,
  options,
  label,
}: {
  valeur: number;
  options: number[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={valeur}
      onChange={(e) => {
        const courant = Object.fromEntries(searchParams.entries());
        router.push(hrefAvec(pathname, courant, { parPage: e.target.value, page: null }), { scroll: false });
      }}
      aria-label={label}
      className="h-8 rounded-md border border-hairline bg-surface px-2 text-xs text-muted outline-none transition-colors focus:border-accent"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o} / page
        </option>
      ))}
    </select>
  );
}
