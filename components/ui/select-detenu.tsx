"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { DetenuOption } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const CONTROLE =
  "w-full rounded-md border border-hairline bg-surface text-ink placeholder:text-faint shadow-e1 " +
  "transition-[border-color,box-shadow,background-color] duration-[var(--dur-fast)] ease-out " +
  "hover:border-rule focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/18 " +
  "disabled:bg-sunken disabled:text-faint disabled:shadow-none " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/18";

function etiquette(d: DetenuOption) {
  return `${d.nom} — ${d.numeroEcrou}`;
}

function libelleCellule(c: NonNullable<DetenuOption["cellule"]>) {
  return c.bloc ? `${c.bloc} · ${c.numero}` : c.numero;
}

/**
 * Champ de sélection d'un détenu : à la fois select (on clique, un panneau s'ouvre déjà
 * peuplé) et recherche (on tape, la liste se filtre par nom ou numéro d'écrou) — pas besoin
 * de taper pour obtenir un résultat. Remplace un `<select>` listant toute la population
 * présente : avec plusieurs milliers de détenus, un select natif devient à la fois
 * inutilisable au clavier/à la souris et coûteux à charger. Ici, l'API ne renvoie jamais plus
 * de 20 détenus à la fois (les 20 premiers par ordre alphabétique sans recherche, ou les 20
 * meilleures correspondances avec un terme) : le panneau reste toujours léger.
 *
 * La vraie valeur soumise voyage dans un input caché (`name`) ; le champ texte visible ne
 * porte pas de `name`, pour ne pas polluer le FormData avec le libellé affiché.
 */
export function SelectDetenu({
  id,
  name,
  requis,
  initial = null,
  onSelection,
  placeholder = "Nom ou numéro d’écrou…",
  className,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  name: string;
  requis?: boolean;
  initial?: DetenuOption | null;
  /** Le formulaire appelant a besoin du détenu choisi (pas seulement son id), par ex.
   * pour reconstruire un ticket imprimable après soumission sans le recharger. */
  onSelection?: (d: DetenuOption | null) => void;
  placeholder?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}) {
  const idGenere = useId();
  const champId = id ?? idGenere;
  const listeId = `${champId}-liste`;

  const [texte, setTexte] = useState(initial ? etiquette(initial) : "");
  const [selection, setSelection] = useState<DetenuOption | null>(initial);
  const [resultats, setResultats] = useState<DetenuOption[]>([]);
  const [aPlus, setAPlus] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [chargementPlus, setChargementPlus] = useState(false);
  const [surligne, setSurligne] = useState(-1);

  const delai = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requeteEnCours = useRef(0);
  const aOuvertUneFois = useRef(false);
  const termeCourant = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => clearTimeout(delai.current);
  }, []);

  // Cohérence native du formulaire : un champ requis mais non résolu en un détenu précis
  // (texte tapé puis liste refermée sans choix) bloque la soumission, comme le faisait
  // le `<select required>` qu'il remplace.
  useEffect(() => {
    if (!inputRef.current) return;
    const invalide = Boolean(requis) && (!selection || etiquette(selection) !== texte);
    inputRef.current.setCustomValidity(invalide ? "Sélectionnez un détenu dans la liste." : "");
  }, [requis, selection, texte]);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, []);

  async function executer(terme: string, decalage: number) {
    const jeton = ++requeteEnCours.current;
    try {
      const reponse = await fetch(`/detenus/options?q=${encodeURIComponent(terme)}&decalage=${decalage}`, {
        headers: { Accept: "application/json" },
      });
      const corps = reponse.ok ? await reponse.json() : { data: [], aPlus: false };
      if (jeton !== requeteEnCours.current) return;
      setResultats((precedents) => (decalage > 0 ? [...precedents, ...(corps.data ?? [])] : (corps.data ?? [])));
      setAPlus(Boolean(corps.aPlus));
    } catch {
      if (jeton === requeteEnCours.current && decalage === 0) {
        setResultats([]);
        setAPlus(false);
      }
    } finally {
      if (jeton === requeteEnCours.current) {
        setChargement(false);
        setChargementPlus(false);
      }
    }
  }

  /** Débattue pendant la frappe ; `immediat` pour la première ouverture, sans délai artificiel. */
  function chercher(terme: string, immediat = false) {
    clearTimeout(delai.current);
    termeCourant.current = terme;
    setChargement(true);
    if (immediat) {
      void executer(terme, 0);
    } else {
      delai.current = setTimeout(() => void executer(terme, 0), 300);
    }
  }

  function voirPlus() {
    setChargementPlus(true);
    void executer(termeCourant.current, resultats.length);
  }

  function choisir(d: DetenuOption) {
    setSelection(d);
    setTexte(etiquette(d));
    setResultats([]);
    setAPlus(false);
    setOuvert(false);
    setSurligne(-1);
    onSelection?.(d);
  }

  function surTouche(e: KeyboardEvent<HTMLInputElement>) {
    if (!ouvert || resultats.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSurligne((i) => (i + 1) % resultats.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurligne((i) => (i <= 0 ? resultats.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (surligne >= 0) {
        e.preventDefault();
        choisir(resultats[surligne]);
      }
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  }

  return (
    <div ref={conteneurRef} className="group/select relative">
      <input type="hidden" name={name} value={selection ? String(selection.id) : ""} />
      <input
        ref={inputRef}
        id={champId}
        type="text"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={listeId}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        aria-autocomplete="list"
        autoComplete="off"
        required={requis}
        placeholder={placeholder}
        className={cn(CONTROLE, "h-9 pl-3 pr-8 text-base", className)}
        value={texte}
        onChange={(e) => {
          const v = e.target.value;
          setTexte(v);
          setSelection(null);
          onSelection?.(null);
          setSurligne(-1);
          setOuvert(true);
          chercher(v);
        }}
        onFocus={() => {
          setOuvert(true);
          if (!aOuvertUneFois.current) {
            aOuvertUneFois.current = true;
            // Premier ouverture : la liste par défaut, pas une recherche sur l'étiquette
            // déjà affichée (ex. une sélection préremplie) qui ne correspondrait à rien.
            chercher("", true);
          }
        }}
        onClick={() => setOuvert(true)}
        onKeyDown={surTouche}
      />
      {chargement && (
        <span
          className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-current border-r-transparent text-faint animate-spin-slow"
          aria-hidden
        />
      )}
      {ouvert && (
        <ul
          id={listeId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-hairline bg-surface py-1 shadow-e2"
        >
          {chargement ? (
            <li className="px-3 py-2 text-xs text-faint">Recherche…</li>
          ) : resultats.length === 0 ? (
            <li className="px-3 py-2 text-xs text-faint">Aucun détenu ne correspond.</li>
          ) : (
            <>
              {resultats.map((d, i) => (
                <li
                  key={d.id}
                  role="option"
                  aria-selected={selection?.id === d.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choisir(d);
                  }}
                  onMouseEnter={() => setSurligne(i)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm",
                    i === surligne ? "bg-accent/10 text-accent" : "text-ink hover:bg-sunken",
                  )}
                >
                  {d.nom} <span className="text-faint">— {d.numeroEcrou}{d.cellule ? ` (${libelleCellule(d.cellule)})` : ""}</span>
                </li>
              ))}
              {aPlus && (
                <li>
                  <button
                    type="button"
                    disabled={chargementPlus}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={voirPlus}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-accent hover:bg-sunken disabled:text-faint"
                  >
                    {chargementPlus ? "Chargement…" : "Voir les 20 suivants"}
                  </button>
                </li>
              )}
            </>
          )}
        </ul>
      )}
      {!chargement && (
        <Icon
          name="chevronDown"
          size={14}
          className={cn(
            "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint transition-transform duration-[var(--dur-fast)]",
            ouvert && "rotate-180",
          )}
        />
      )}
    </div>
  );
}
