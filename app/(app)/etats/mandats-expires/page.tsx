import type { Metadata } from "next";
import { api, type MandatDetaille } from "@/lib/api";
import { formatDate, formatNombre, joursRestants, pluriel, tronquer } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/ui/client-actions";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Mandats expirés" };

export default async function MandatsExpiresPage() {
  const t = await getT();
  const mandats = await api.listMandatsExpires();

  const depassement = (m: MandatDetaille) => -(joursRestants(m.dateSortieMandat) ?? 0);
  const plus30 = mandats.filter((m) => depassement(m) > 30).length;
  const detenusConcernes = new Set(mandats.map((m) => m.detenuId)).size;

  return (
    <Page className="print:p-0">
      <PageHeader
        surtitre={t.modules.etats}
        titre="Aperçu des mandats expirés"
        description="Titres de détention dont la date d’expiration est dépassée. Chaque ligne appelle une régularisation : prolongation, jugement ou levée d’écrou."
        actions={<PrintButton />}
      />

      <StatGrid colonnes={3}>
        <Stat icone="file" style={{ ["--i" as string]: 0 }} label="Mandats expirés" valeur={formatNombre(mandats.length)} signal={mandats.length > 0 ? "critique" : "positif"} contexte="À régulariser" />
        <Stat icone="file" style={{ ["--i" as string]: 1 }} label="Détenus concernés" valeur={formatNombre(detenusConcernes)} contexte="Au moins un titre échu" />
        <Stat icone="file" style={{ ["--i" as string]: 2 }} label="Échus depuis plus de 30 jours" valeur={formatNombre(plus30)} signal={plus30 > 0 ? "critique" : "neutre"} contexte="Situation la plus urgente" />
      </StatGrid>

      <Panel variante="eleve" titre="Mandats à régulariser" sousTitre={`Du plus ancien dépassement au plus récent — ${pluriel(mandats.length, "mandat")}`} flush className="overflow-hidden">
        <DataTable<MandatDetaille>
          legende="Mandats expirés"
          lignes={[...mandats].sort((a, b) => depassement(b) - depassement(a))}
          cleLigne={(m) => m.id}
          lienLigne={(m) => `/detenus/${m.detenuId}?onglet=mandats`}
          libelleLien={(m) => `Dossier de ${m.detenuNom}`}
          colonnes={[
            {
              cle: "detenu",
              titre: "Détenu",
              rendu: (m) => (
                <div>
                  <p className="font-medium">{m.detenuNom}</p>
                  <Ecrou className="text-xs text-muted">{m.numeroEcrou}</Ecrou>
                </div>
              ),
            },
            { cle: "type", titre: "Type de mandat", masquerSous: "lg", rendu: (m) => <span className="text-muted">{tronquer(m.typeMandat, 30)}</span> },
            { cle: "statut", titre: "Statut pénal", masquerSous: "md", rendu: (m) => <Badge ton="neutre" point={false}>{m.typeStatutPenal ?? "—"}</Badge> },
            { cle: "ref", titre: "Référence", masquerSous: "xl", rendu: (m) => <Ecrou className="text-xs text-muted">{m.referenceMandat}</Ecrou> },
            { cle: "expire", titre: "Expiré le", rendu: (m) => formatDate(m.dateSortieMandat) },
            {
              cle: "depassement",
              titre: "Dépassement",
              align: "droite",
              rendu: (m) => {
                const j = depassement(m);
                return <span className={cn("tnum font-semibold", j > 30 ? "text-danger" : "text-warning")}>{pluriel(j, "jour")}</span>;
              },
            },
          ]}
          vide={<EmptyState icone="check" titre="Aucun mandat expiré" texte="Tous les titres de détention sont en cours de validité." />}
        />
      </Panel>
    </Page>
  );
}
