"use client";

import { useState } from "react";
import type { Parametres, Visite } from "@/lib/domain/types";
import { ticketDepuisVisite } from "@/lib/domain/ticket";
import { formatDate } from "@/lib/format";
import { useT } from "@/components/layout/i18n-provider";
import { DataTable } from "@/components/data/data-table";
import { PaginationLocale } from "@/components/data/pagination-locale";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { BoutonTicket } from "@/components/sante/ticket-visite";
import { BoutonVoirVisite } from "@/components/sante/bouton-voir-visite";

const PAR_PAGE = 10;

/**
 * Registre des visites, paginé côté client (10 par page) : la liste est déjà
 * entièrement filtrée côté serveur (`FilterBar`), inutile de la redemander à
 * l'API pour changer de page.
 */
export function VisitesTable({ visites, parametres }: { visites: Visite[]; parametres: Parametres }) {
  const t = useT();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(visites.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = visites.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  return (
    <>
      <DataTable<Visite>
        legende="Registre des visites"
        lignes={visibles}
        cleLigne={(v) => v.id}
        lienLigne={(v) => `/detenus/${v.detenuId}?onglet=visites`}
        colonnes={[
          {
            cle: "date",
            titre: "Date",
            rendu: (v) => (
              <div className="leading-tight">
                <p className="font-medium">{formatDate(v.dateVisite)}</p>
                <p className="tnum text-xs text-muted">{v.heureArrivee} · {v.dureePrevueMinutes} min</p>
              </div>
            ),
          },
          {
            cle: "detenu",
            titre: "Détenu",
            rendu: (v) => (
              <div>
                <p className="max-w-[20ch] truncate">{v.detenuNom}</p>
                <Ecrou className="text-xs text-muted">{v.numeroEcrou}</Ecrou>
              </div>
            ),
          },
          {
            cle: "visiteur",
            titre: "Visiteur",
            masquerSous: "md",
            rendu: (v) => (
              <div>
                <p className="max-w-[22ch] truncate">{v.nomVisiteur}</p>
                <p className="text-xs text-muted">{v.lienParente}</p>
              </div>
            ),
          },
          { cle: "type", titre: "Parloir", masquerSous: "lg", rendu: (v) => <span className="text-muted">{v.typeVisite}</span> },
          {
            cle: "controle",
            titre: "Contrôle",
            rendu: (v) => (
              <Badge ton={v.autorisationPrealable ? "succes" : "alerte"}>{v.autorisationPrealable ? "Autorisée" : "Sans autorisation"}</Badge>
            ),
          },
          {
            cle: "actions",
            titre: "",
            align: "droite",
            rendu: (v) => (
              <div className="flex justify-end gap-1.5">
                <BoutonVoirVisite visiteId={v.id} />
                <BoutonTicket ticket={ticketDepuisVisite(v)} parametres={parametres} />
              </div>
            ),
          },
        ]}
        vide={<EmptyState icone="user" titre={t.etats.aucunResultatTitre} texte={t.etats.aucunResultatTexte} />}
      />

      {visites.length > 0 && (
        <PaginationLocale page={pageCourante} parPage={PAR_PAGE} total={visites.length} onChange={setPage} />
      )}
    </>
  );
}
