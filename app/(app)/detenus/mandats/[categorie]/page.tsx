import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, ApiErreur } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import type { CategoriePenale, DetenuResume, PageResultat } from "@/lib/domain/types";
import {
  CATEGORIE_SLUG,
  LIBELLE_CATEGORIE,
  REGLE_CATEGORIE,
  SLUG_CATEGORIE,
} from "@/lib/domain/referentiels";
import { formatDate, joursRestants, pluriel, tronquer } from "@/lib/format";
import { hrefAvec, paramEntier } from "@/lib/url";
import { cn } from "@/lib/cn";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Pagination } from "@/components/data/pagination";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { TabsNav } from "@/components/ui/tabs";

const TITRES: Record<CategoriePenale, string> = {
  Prevenu: "Prévenus",
  Condamne: "Condamnés",
  Appellant: "Appellants",
  Cassationnaire: "Cassationnaires",
  Dpac: "DPAC",
};

export async function generateMetadata(props: PageProps<"/detenus/mandats/[categorie]">): Promise<Metadata> {
  const { categorie } = await props.params;
  const c = SLUG_CATEGORIE[categorie];
  return { title: c ? TITRES[c] : "Catégorie inconnue" };
}

const CHEMIN_PAR_CATEGORIE = (slug: string) => `/detenus/mandats/${slug}`;
const PAR_PAGE_OPTIONS = [20, 50, 100];

/**
 * Une catégorie peut échouer alors que les autres répondent (panne API ponctuelle) :
 * on isole la panne au lieu de faire tomber tout l'écran.
 */
async function chargerCategorie(
  categorie: CategoriePenale,
  page: number,
  parPage: number,
) {
  // Compteur secondaire, derrière tableau_bord.consulter : facultatif.
  const tb = await optionnel(() => api.getTableauDeBord(), null);
  try {
    const resultat = await api.listDetenus({ categorie, page, parPage });
    return [resultat, tb, null] as const;
  } catch (e) {
    if (!(e instanceof ApiErreur)) throw e;
    const vide: PageResultat<DetenuResume> = { items: [], total: 0, page: 1, parPage };
    return [vide, tb, e.message] as const;
  }
}

export default async function CategoriePage(props: PageProps<"/detenus/mandats/[categorie]">) {
  const t = await getT();
  const { categorie: slug } = await props.params;
  const categorie = SLUG_CATEGORIE[slug];
  if (!categorie) notFound();

  const sp = await props.searchParams;
  const page = paramEntier(sp, "page", 1);
  const parPage = paramEntier(sp, "parPage", 20);

  const [resultat, tb, indisponible] = await chargerCategorie(categorie, page, parPage);
  const detenus = resultat.items;

  return (
    <Page>
      <PageHeader
        surtitre="Gestion des mandats"
        titre={TITRES[categorie]}
        description={
          indisponible
            ? "Catégorie momentanément indisponible : l’API ne parvient pas à la produire."
            : pluriel(resultat.total, "détenu") + " dans cette catégorie."
        }
        actions={
          <ButtonLink href={`/etats/categories?categorie=${slug}`} icone="printer" transitionTypes={["nav-forward"]}>
            État nominatif
          </ButtonLink>
        }
      />

      <div className="flex items-start gap-3 rounded-lg border border-hairline bg-surface px-4 py-3 animate-rise">
        <Icon name="scale" size={16} className="mt-0.5 shrink-0 text-accent" />
        <div className="text-sm">
          <p className="font-medium text-ink">Règle de classement</p>
          <p className="text-muted">
            {REGLE_CATEGORIE[categorie]} Un mandat est actif tant que sa date d’expiration n’est pas dépassée.
            Les catégories s’excluent : un détenu n’apparaît que dans une seule liste.
          </p>
        </div>
      </div>

      {indisponible && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm animate-rise">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="font-medium text-danger">Catégorie indisponible côté API</p>
            <p className="mt-0.5 text-muted">
              {indisponible} Les autres catégories restent consultables.
            </p>
          </div>
        </div>
      )}

      <Panel variante="eleve" flush className="overflow-hidden">
        <div className="px-4">
          <TabsNav
            label="Catégories pénales"
            items={(Object.keys(TITRES) as CategoriePenale[]).map((c) => ({
              href: CHEMIN_PAR_CATEGORIE(CATEGORIE_SLUG[c]),
              label: LIBELLE_CATEGORIE[c],
              compte: tb?.effectifsParCategorie[c],
              actif: c === categorie,
            }))}
          />
        </div>

        <DataTable<DetenuResume>
          legende={`Liste des ${TITRES[categorie].toLowerCase()}`}
          lignes={detenus}
          cleLigne={(d) => d.id}
          lienLigne={(d) => `/detenus/${d.id}?onglet=mandats`}
          libelleLien={(d) => `Dossier de ${d.nom}`}
          colonnes={[
            { cle: "ecrou", titre: t.champs.numeroEcrou, rendu: (d) => <Ecrou className="font-medium">{d.numeroEcrou}</Ecrou> },
            { cle: "nom", titre: t.champs.nom, rendu: (d) => <span className="whitespace-nowrap font-medium">{d.nom}</span> },
            {
              cle: "mandats",
              titre: "Mandats actifs",
              align: "droite",
              rendu: (d) => (
                <span className={cn("tnum", d.nombreMandatsActifs > 1 && "font-semibold text-warning")}>{d.nombreMandatsActifs}</span>
              ),
            },
            { cle: "statut", titre: "Statut du dernier mandat", masquerSous: "md", rendu: (d) => <span className="text-muted">{d.mandatCourant?.typeStatutPenal ?? "—"}</span> },
            { cle: "motif", titre: t.champs.motifDetention, masquerSous: "lg", rendu: (d) => <span className="text-muted">{tronquer(d.mandatCourant?.motifDetention, 32)}</span> },
            { cle: "incarceration", titre: "Incarcération", masquerSous: "md", rendu: (d) => formatDate(d.mandatCourant?.dateIncarceration) },
            {
              cle: "expiration",
              titre: "Échéance",
              align: "droite",
              rendu: (d) => {
                const j = joursRestants(d.mandatCourant?.dateSortieMandat);
                return (
                  <span className={cn(j !== null && j <= 30 ? "font-medium text-warning" : "text-ink")}>
                    {formatDate(d.mandatCourant?.dateSortieMandat)}
                  </span>
                );
              },
            },
          ]}
          vide={
            indisponible ? (
              <EmptyState
                icone="alert"
                titre="Liste non chargée"
                texte="L’API n’a pas pu produire cette catégorie. Rien n’indique qu’elle soit vide : réessayez une fois le correctif livré."
              />
            ) : (
              <EmptyState
                icone="detenus"
                titre={`Aucun détenu ${LIBELLE_CATEGORIE[categorie].toLowerCase()}`}
                texte="Aucun détenu ne remplit actuellement les conditions de cette catégorie."
              />
            )
          }
        />
        {resultat.total > resultat.parPage && (
          <Pagination
            page={resultat.page}
            parPage={resultat.parPage}
            total={resultat.total}
            href={(p) => hrefAvec(CHEMIN_PAR_CATEGORIE(slug), sp, { page: p === 1 ? null : p })}
            parPageOptions={PAR_PAGE_OPTIONS}
          />
        )}
      </Panel>
    </Page>
  );
}
