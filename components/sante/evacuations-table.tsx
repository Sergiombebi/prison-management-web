"use client";

import type { EvacuationSanitaire } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { BoutonRetourEvacuation } from "@/components/sante/retour-evacuation";

/**
 * Registre des évacuations sanitaires : la page courante vient déjà paginée du
 * serveur (`api.listEvacuations`), la pagination se fait via le composant
 * `<Pagination>` de la page, pas ici.
 */
export function EvacuationsTable({ evacuations }: { evacuations: EvacuationSanitaire[] }) {
  return (
    <DataTable<EvacuationSanitaire>
      legende="Registre des évacuations sanitaires"
      lignes={evacuations}
      cleLigne={(e) => e.id}
      lienLigne={(e) => `/sante/dossier-medical/${e.detenuId}`}
      colonnes={[
        {
          cle: "date",
          titre: "Départ",
          rendu: (e) => <span className="font-medium">{formatDate(e.dateDepart)}</span>,
        },
        {
          cle: "detenu",
          titre: "Détenu",
          rendu: (e) => (
            <div>
              <p className="max-w-[20ch] truncate">{e.detenuNom}</p>
              <Ecrou className="text-xs text-muted">{e.numeroEcrou}</Ecrou>
            </div>
          ),
        },
        {
          cle: "structure",
          titre: "Structure",
          masquerSous: "md",
          rendu: (e) => <span className="text-muted">{e.structureDestination}</span>,
        },
        {
          cle: "statut",
          titre: "Statut",
          rendu: (e) =>
            e.dateRetour ? (
              <Badge ton="succes">Rentré le {formatDate(e.dateRetour)}</Badge>
            ) : (
              <Badge ton="alerte">En évacuation</Badge>
            ),
        },
        {
          cle: "motif",
          titre: "Motif",
          masquerSous: "lg",
          rendu: (e) => <span className="text-muted">{ouVide(e.motif)}</span>,
        },
        {
          cle: "actions",
          titre: "",
          align: "droite",
          rendu: (e) => (!e.dateRetour ? <BoutonRetourEvacuation evacuation={e} /> : null),
        },
      ]}
      vide={<EmptyState icone="pulse" titre="Aucune évacuation enregistrée" texte="Aucune évacuation sanitaire n’a encore été consignée." />}
    />
  );
}
