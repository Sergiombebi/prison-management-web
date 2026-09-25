"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Fine barre en haut de page, visible pendant qu'une navigation est en cours : le clic
 * sur un lien la déclenche aussitôt, avant même que la réponse serveur n'arrive. Sans
 * elle, un changement de page lent (API qui traîne) ne donne aucun signe de vie entre le
 * clic et l'affichage de la page suivante.
 *
 * L'API Router de Next n'expose pas d'événement « navigation en cours » : on déclenche
 * donc sur le clic d'un lien interne, et on l'éteint quand l'URL a effectivement changé.
 */
export function BarreProgression() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [enCours, setEnCours] = useState(false);
  const urlActuelle = `${pathname}?${searchParams.toString()}`;
  const derniereUrl = useRef(urlActuelle);

  useEffect(() => {
    if (derniereUrl.current !== urlActuelle) {
      derniereUrl.current = urlActuelle;
      setEnCours(false);
    }
  }, [urlActuelle]);

  useEffect(() => {
    function surClic(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as HTMLElement | null)?.closest("a");
      if (!lien || lien.target === "_blank" || lien.hasAttribute("download")) return;
      const href = lien.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let cible: URL;
      try {
        cible = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (cible.origin !== window.location.origin) return;
      if (cible.pathname + cible.search === urlActuelle) return;
      setEnCours(true);
    }
    document.addEventListener("click", surClic);
    return () => document.removeEventListener("click", surClic);
  }, [urlActuelle]);

  if (!enCours) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-accent/15" role="status" aria-label="Chargement de la page">
      <div className="progression h-full w-1/3 rounded-full bg-accent" />
    </div>
  );
}
