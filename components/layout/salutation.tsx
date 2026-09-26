"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/layout/i18n-provider";

/** Moment de la journée, indépendant de la locale : `Salutation` choisit le mot
 * traduit correspondant au moment du rendu (mêmes clés que `t.salutation`). */
type Moment = "bonjour" | "bonsoir" | "bonneNuit";

function calculerMoment(): Moment {
  // format() ajoute un suffixe (« 01 h ») en fr-FR : Number() dessus vaut NaN,
  // ce qui retombe toujours sur "bonjour". formatToParts() isole l'heure seule.
  const parties = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    hour12: false,
    timeZone: "Africa/Douala",
  }).formatToParts(new Date());
  const heureLocale = Number(parties.find((p) => p.type === "hour")?.value ?? NaN);

  return heureLocale < 6 ? "bonneNuit" : heureLocale >= 18 ? "bonsoir" : "bonjour";
}

export function Salutation({ prenom }: { prenom?: string }) {
  const t = useT();
  const [moment, setMoment] = useState<Moment>("bonjour");

  useEffect(() => {
    const actualiser = () => setMoment(calculerMoment());
    actualiser();
    const intervalle = window.setInterval(actualiser, 60_000);

    return () => window.clearInterval(intervalle);
  }, []);

  return <>{t.salutation[moment]}{prenom ? `, ${prenom}` : ""} 👋</>;
}
