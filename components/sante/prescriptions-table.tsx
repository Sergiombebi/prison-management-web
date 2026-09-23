"use client";

import { useState } from "react";
import type { Prescription } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { PaginationLocale } from "@/components/data/pagination-locale";
import { Badge, type Ton } from "@/components/ui/badge";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { BoutonArreterPrescription } from "@/components/sante/arreter-prescription";

const PAR_PAGE = 10;

const TON_STATUT: Record<Prescription["statut"], Ton> = {
  en_cours: "accent",
  termine: "neutre",
  arrete: "danger",
};

const LIBELLE_STATUT: Record<Prescription["statut"], string> = {
  en_cours: "En cours",
  termine: "Terminé",
  arrete: "Arrêté",
};

/**
 * Registre des traitements prescrits, paginé côté client (10 par page) — même
 * patron que le registre des évacuations sanitaires.
 */
export function PrescriptionsTable({ prescriptions }: { prescriptions: Prescription[] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(prescriptions.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = prescriptions.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  return (
    <>
      <DataTable<Prescription>
        legende="Registre des traitements prescrits"
        lignes={visibles}
        cleLigne={(p) => p.id}
        lienLigne={(p) => `/sante/dossier-medical/${p.detenuId}`}
        colonnes={[
          {
            cle: "date",
            titre: "Début",
            rendu: (p) => <span className="font-medium">{formatDate(p.dateDebut)}</span>,
          },
          {
            cle: "detenu",
            titre: "Détenu",
            rendu: (p) => (
              <div>
                <p className="max-w-[20ch] truncate">{p.detenuNom}</p>
                <Ecrou className="text-xs text-muted">{p.numeroEcrou}</Ecrou>
              </div>
            ),
          },
          {
            cle: "medicament",
            titre: "Médicament",
            rendu: (p) => (
              <div>
                <p className="max-w-[24ch] truncate font-medium">{p.medicament}</p>
                <p className="max-w-[24ch] truncate text-xs text-muted">{p.posologie}</p>
              </div>
            ),
          },
          {
            cle: "fin",
            titre: "Échéance",
            masquerSous: "md",
            rendu: (p) => <span className="text-muted">{ouVide(p.dateFin && formatDate(p.dateFin))}</span>,
          },
          {
            cle: "prescripteur",
            titre: "Prescripteur",
            masquerSous: "lg",
            rendu: (p) => <span className="text-muted">{p.prescripteur}</span>,
          },
          {
            cle: "statut",
            titre: "Statut",
            rendu: (p) => <Badge ton={TON_STATUT[p.statut]}>{LIBELLE_STATUT[p.statut]}</Badge>,
          },
          {
            cle: "actions",
            titre: "",
            align: "droite",
            rendu: (p) => (p.statut === "en_cours" ? <BoutonArreterPrescription prescription={p} /> : null),
          },
        ]}
        vide={<EmptyState icone="sante" titre="Aucun traitement prescrit" texte="Aucune prescription n’a encore été consignée." />}
      />

      {prescriptions.length > 0 && (
        <PaginationLocale page={pageCourante} parPage={PAR_PAGE} total={prescriptions.length} onChange={setPage} />
      )}
    </>
  );
}
