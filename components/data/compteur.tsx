"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatNombre } from "@/lib/format";

// useLayoutEffect côté client (pas de scintillement), useEffect côté serveur (pas d'avertissement)
const useIsomorphique = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Chiffre qui se compose à l'arrivée.
 *
 * Le rendu serveur affiche déjà la valeur finale : si le JavaScript ne charge pas,
 * ou si l'utilisateur a demandé moins d'animations, le chiffre est simplement là.
 */
export function Compteur({
  valeur,
  duree = 900,
  decimales = 0,
}: {
  valeur: number;
  duree?: number;
  decimales?: number;
}) {
  const [affiche, setAffiche] = useState(valeur);
  const image = useRef(0);

  useIsomorphique(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || valeur === 0) {
      setAffiche(valeur);
      return;
    }

    const depart = performance.now();
    setAffiche(0);

    const avancer = (maintenant: number) => {
      const progression = Math.min((maintenant - depart) / duree, 1);
      // Décélération franche : le chiffre file puis se pose
      const adouci = 1 - Math.pow(1 - progression, 4);
      setAffiche(valeur * adouci);
      if (progression < 1) image.current = requestAnimationFrame(avancer);
    };

    image.current = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image.current);
  }, [valeur, duree]);

  const arrondi =
    decimales > 0
      ? Number(affiche.toFixed(decimales))
      : Math.round(affiche);

  return (
    <span className="tnum tabular-nums">
      {decimales > 0
        ? new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales,
          }).format(arrondi)
        : formatNombre(arrondi)}
    </span>
  );
}
