import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { SortieDetenu, TypeSortie } from "@/lib/domain/types";
import { LIBELLE_TYPE_SORTIE, SLUG_TYPE_SORTIE } from "@/lib/domain/referentiels";
import { formatDate, ouVide, pluriel } from "@/lib/format";
import { param } from "@/lib/url";
import { cn } from "@/lib/cn";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { TabsNav } from "@/components/ui/tabs";
import { FormulaireSortie } from "@/components/detenus/formulaire-sortie";
import { TransfertsTable } from "@/components/detenus/transferts-table";
import { consignerSortie } from "../actions";

const CONFIG: Record<TypeSortie, { description: string; detail: string; grave: boolean }> = {
  LiberationNormale: {
    description:
      "Levée d’un mandat à son expiration ou sur décision de justice. Le détenu ne quitte l’effectif qu’à la levée de son dernier mandat actif.",
    detail: "Fondement",
    grave: false,
  },
  Transfert: {
    description: "Transfèrement du détenu vers un autre établissement : tous ses mandats sont clôturés.",
    detail: "Destination",
    grave: false,
  },
  Evasion: {
    description: "Constat d’évasion. L’avis est adressé aux autorités ampliataires définies dans les paramètres.",
    detail: "Circonstances",
    grave: true,
  },
  Deces: {
    description: "Constat de décès en détention, à consigner avec la cause établie par le service médical.",
    detail: "Cause",
    grave: true,
  },
};

const SLUGS: Record<TypeSortie, string> = {
  LiberationNormale: "normale",
  Transfert: "transfert",
  Evasion: "evasion",
  Deces: "deces",
};

export async function generateMetadata(props: PageProps<"/detenus/liberation/[type]">): Promise<Metadata> {
  const { type } = await props.params;
  const ts = SLUG_TYPE_SORTIE[type];
  return { title: ts ? LIBELLE_TYPE_SORTIE[ts] : "Libération" };
}

export default async function LiberationPage(props: PageProps<"/detenus/liberation/[type]">) {
  const { type } = await props.params;
  const typeSortie = SLUG_TYPE_SORTIE[type];
  if (!typeSortie) notFound();

  const config = CONFIG[typeSortie];
  const sp = await props.searchParams;
  const detenuId = Number.parseInt(param(sp, "detenu") ?? "", 10);
  const choisi = Number.isFinite(detenuId) ? detenuId : undefined;

  const [sorties, detenus, parametres, dossier] = await Promise.all([
    api.listSorties(typeSortie),
    api.listDetenus({ parPage: 1000, tri: "nom" }),
    api.getParametres(),
    // Une libération normale porte sur un mandat précis : il faut ceux du détenu choisi
    choisi && typeSortie === "LiberationNormale" ? api.getDossierDetenu(choisi) : null,
  ]);

  return (
    // Le bulletin s'imprime depuis une modale portée hors de cette page : tout le reste est masqué sur papier
    <div data-print-hide>
    <Page>
      <PageHeader surtitre="Libération" titre={LIBELLE_TYPE_SORTIE[typeSortie]} description={config.description} />

      <TabsNav
        label="Types de sortie"
        items={(Object.keys(SLUGS) as TypeSortie[]).map((ts) => ({
          // Le détenu choisi suit le changement d'onglet
          href: `/detenus/liberation/${SLUGS[ts]}${choisi ? `?detenu=${choisi}` : ""}`,
          label: LIBELLE_TYPE_SORTIE[ts],
          actif: ts === typeSortie,
        }))}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel variante="eleve" titre="Historique" sousTitre={pluriel(sorties.length, "sortie enregistrée", "sorties enregistrées")} flush className="overflow-hidden">
          {typeSortie === "Transfert" ? (
            <TransfertsTable sorties={sorties} parametres={parametres} />
          ) : (
          <DataTable<SortieDetenu>
            legende={`Historique : ${LIBELLE_TYPE_SORTIE[typeSortie]}`}
            lignes={sorties}
            cleLigne={(s) => s.id}
            lienLigne={(s) => `/detenus/${s.detenuId}?onglet=detention`}
            colonnes={[
              { cle: "date", titre: "Date", rendu: (s) => <span className="font-medium">{formatDate(s.dateSortie)}</span> },
              {
                cle: "detenu",
                titre: "Détenu",
                rendu: (s) => (
                  <div>
                    <p className="font-medium">{s.detenuNom}</p>
                    <Ecrou className="text-xs text-muted">{s.numeroEcrou}</Ecrou>
                  </div>
                ),
              },
              { cle: "situation", titre: "Situation pénale", masquerSous: "md", rendu: (s) => <span className="text-muted">{ouVide(s.situationPenale)}</span> },
              {
                cle: "detail",
                titre: config.detail,
                masquerSous: "lg",
                rendu: (s) => (
                  <span className="text-muted">
                    {ouVide(s.destination ?? s.cause ?? s.motif)}
                    {s.definitive === false && (
                      <span className="mt-0.5 block text-2xs">Mandat levé — détenu toujours écroué</span>
                    )}
                  </span>
                ),
              },
            ]}
            vide={
              <EmptyState
                icone="door"
                titre="Aucune sortie de ce type"
                texte={config.grave ? "Aucun incident de cette nature n’a été enregistré." : "Aucune sortie n’a encore été consignée."}
              />
            }
          />
          )}
        </Panel>

        <Panel variante="eleve"
          titre="Consigner une sortie"
          sousTitre="La levée d’écrou retire le détenu de l’effectif"
          className={cn("xl:sticky xl:top-20", config.grave && "border-danger/30")}
        >
          {config.grave && (
            <div className="mb-4 flex items-start gap-2.5 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
              <p>Événement grave : un avis sera généré pour les autorités ampliataires.</p>
            </div>
          )}
          {typeSortie === "Evasion" && (
            <div className="mb-4 rounded-md border border-hairline bg-raised px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Ampliations</p>
              <p className="mt-1 whitespace-pre-line font-mono text-2xs leading-5 text-muted">{parametres.autoritesAmpliataires}</p>
            </div>
          )}
          <FormulaireSortie
            type={typeSortie}
            action={consignerSortie.bind(null, typeSortie)}
            detenus={detenus.items}
            detenuId={choisi}
            mandats={dossier ? dossier.mandats.filter((m) => m.ouvert) : null}
            grave={config.grave}
            parametres={parametres}
          />
        </Panel>
      </div>
    </Page>
    </div>
  );
}
