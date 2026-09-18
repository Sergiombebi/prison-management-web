import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { DetenuResume } from "@/lib/domain/types";
import { formatNombre, initiales, pluriel } from "@/lib/format";
import { hrefAvec, paramEntier } from "@/lib/url";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable, type Colonne } from "@/components/data/data-table";
import { Pagination } from "@/components/data/pagination";
import { JaugeRadiale } from "@/components/data/charts";
import { BadgeCategorie } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, EmptyState, Ecrou, Panel } from "@/components/ui/surface";

export async function generateMetadata(props: PageProps<"/discipline/cellules/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const cellule = await api.getCellule(Number(id));
  return { title: cellule ? `Cellule ${cellule.numero}` : "Cellule introuvable" };
}

export default async function CelluleDetenusPage(props: PageProps<"/discipline/cellules/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const celluleId = Number(id);

  const cellule = await api.getCellule(celluleId);
  if (!cellule) notFound();

  const CHEMIN = `/discipline/cellules/${celluleId}`;
  const page = paramEntier(sp, "page", 1);
  const resultat = await api.listDetenusCellule(celluleId, { page });

  const colonnes: Colonne<DetenuResume>[] = [
    {
      cle: "numeroEcrou",
      titre: t.champs.numeroEcrou,
      rendu: (d) => <Ecrou className="font-medium">{d.numeroEcrou}</Ecrou>,
    },
    {
      cle: "nom",
      titre: t.champs.nom,
      rendu: (d) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar initiales={initiales(d.nom)} taille="sm" />
          <div className="min-w-0">
            <p className="max-w-[26ch] truncate font-medium text-ink" title={d.nom}>
              {d.nom}
            </p>
            <p className="text-xs text-muted">
              {d.sexe === "Féminin" ? "F" : "M"}
              {d.age ? ` · ${d.age} ans` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      cle: "categorie",
      titre: t.champs.categoriePenale,
      rendu: (d) => <BadgeCategorie categorie={d.categoriePenale} />,
    },
    {
      cle: "depuis",
      titre: "Depuis",
      align: "droite",
      masquerSous: "sm",
      rendu: (d) => <span className="text-muted">{d.mandatCourant?.dateIncarceration ?? "—"}</span>,
    },
  ];

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.discipline}
        titre={`Cellule ${cellule.bloc ? `${cellule.bloc} · ` : ""}${cellule.numero}`}
        description={`${pluriel(cellule.effectifReel, "détenu")} sur ${formatNombre(cellule.capaciteMax)} places.`}
        actions={
          <div className="flex gap-2">
            <ButtonLink href="/discipline/cellules" icone="arrowLeft">
              Toutes les cellules
            </ButtonLink>
            <ButtonLink
              href={`/discipline/affectations?cellule=${celluleId}`}
              variante="primaire"
              icone="arrowRight"
              transitionTypes={["nav-forward"]}
            >
              Affecter un détenu
            </ButtonLink>
          </div>
        }
      />

      <Panel flush variante="eleve" className="overflow-hidden">
        <div className="flex items-center gap-4 border-b border-hairline px-4 py-3.5">
          <JaugeRadiale valeur={cellule.effectifReel} max={cellule.capaciteMax} />
          <div className="text-sm text-muted">
            <span className="font-medium text-ink">{pluriel(resultat.total, "détenu")}</span> actuellement
            {cellule.typeCellule ? ` · ${cellule.typeCellule}` : ""}
          </div>
        </div>

        <DataTable
          legende={`Détenus de la cellule ${cellule.numero}`}
          colonnes={colonnes}
          lignes={resultat.items}
          cleLigne={(d) => d.id}
          lienLigne={(d) => `/detenus/${d.id}`}
          libelleLien={(d) => `Ouvrir le dossier de ${d.nom}, écrou ${d.numeroEcrou}`}
          vide={
            <EmptyState
              icone="cell"
              titre="Cellule vide"
              texte="Aucun détenu n’est actuellement affecté à cette cellule."
              action={
                <ButtonLink
                  href={`/discipline/affectations?cellule=${celluleId}`}
                  taille="sm"
                  icone="arrowRight"
                >
                  Affecter un détenu
                </ButtonLink>
              }
            />
          }
        />

        {resultat.total > resultat.parPage && (
          <Pagination
            page={resultat.page}
            parPage={resultat.parPage}
            total={resultat.total}
            href={(p) => hrefAvec(CHEMIN, sp, { page: p === 1 ? null : p })}
          />
        )}
      </Panel>
    </Page>
  );
}
