"use client";

import { useState } from "react";
import type { Parametres, Visite } from "@/lib/domain/types";
import { ticketDepuisVisite } from "@/lib/domain/ticket";
import { Button } from "@/components/ui/button";
import { TicketModal } from "@/components/sante/ticket-visite";

/** Bouton d'action de la fiche visite : ouvre l'aperçu du ticket. */
export function ActionsVisite({ visite, parametres }: { visite: Visite; parametres: Parametres }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button type="button" variante="secondaire" icone="printer" onClick={() => setOuvert(true)}>
        Voir le ticket
      </Button>
      <TicketModal
        open={ouvert}
        ticket={ticketDepuisVisite(visite)}
        parametres={parametres}
        onClose={() => setOuvert(false)}
      />
    </>
  );
}
