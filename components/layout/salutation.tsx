"use client";

import { useEffect, useState } from "react";

function calculerSalutation(): string {
  // format() ajoute un suffixe (« 01 h ») en fr-FR : Number() dessus vaut NaN,
  // ce qui retombe toujours sur "Bonjour". formatToParts() isole l'heure seule.
  const parties = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    hour12: false,
    timeZone: "Africa/Douala",
  }).formatToParts(new Date());
  const heureLocale = Number(parties.find((p) => p.type === "hour")?.value ?? NaN);

  return heureLocale < 6 ? "Bonne nuit" : heureLocale >= 18 ? "Bonsoir" : "Bonjour";
}

export function Salutation({ prenom }: { prenom?: string }) {
  const [salutation, setSalutation] = useState("Bonjour");

  useEffect(() => {
    const actualiser = () => setSalutation(calculerSalutation());
    actualiser();
    const intervalle = window.setInterval(actualiser, 60_000);

    return () => window.clearInterval(intervalle);
  }, []);

  return <>{salutation}{prenom ? `, ${prenom}` : ""} 👋</>;
}
