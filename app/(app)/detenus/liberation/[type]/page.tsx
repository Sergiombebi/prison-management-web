import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { SortieDetenu, TypeSortie } from "@/lib/domain/types";
import { LIBELLE_TYPE_SORTIE, SLUG_TYPE_SORTIE } from "@/lib/domain/referentiels";
import { formatDate, ouVide, pluriel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { DemoSubmit } from "@/components/ui/client-actions";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { TabsNav } from "@/components/ui/tabs";

const CONFIG: Record<
  TypeSortie,
  { description: string; champ: { nom: string; label: string; aide?: string } | null; grave: boolean }
> = {
  LiberationNormale: {
    description: "Levée d’écrou à l’expiration du titre de détention ou sur décision de justice.",
    champ: null,
    grave: false,
  },
  Transfert: {
    description: "Transfèrement du détenu vers un autre établissement pénitentiaire.",
    champ: { nom: "destination", label: "Établissement de destination", aide: "Ex. Prison Principale de Douala" },
    grave: false,
  },
  Evasion: {
    description: "Constat d’évasion. L’avis est adressé aux autorités ampliataires définies dans les paramètres.",
    champ: { nom: "motif", label: "Circonstances de l’évasion" },
    grave: true,
  },
  Deces: {
    description: "Constat de décès en détention, à consigner avec la cause établie par le service médical.",
    champ: { nom: "cause", label: "Cause du décès", aide: "Telle qu’établie par le médecin" },
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
  const [sorties, detenus, parametres] = await Promise.all([
    api.listSorties(typeSortie),
    api.listDetenus({ parPage: 1000, tri: "nom" }),
    api.getParametres(),
  ]);

  return (
    <Page>
      <PageHeader surtitre="Libération" titre={LIBELLE_TYPE_SORTIE[typeSortie]} description={config.description} />

      <TabsNav
        label="Types de sortie"
        items={(Object.keys(SLUGS) as TypeSortie[]).map((ts) => ({
          href: `/detenus/liberation/${SLUGS[ts]}`,
          label: LIBELLE_TYPE_SORTIE[ts],
          actif: ts === typeSortie,
        }))}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel titre="Historique" sousTitre={pluriel(sorties.length, "sortie enregistrée", "sorties enregistrées")} flush className="overflow-hidden">
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
                titre: config.champ?.label ?? "Motif",
                masquerSous: "lg",
                rendu: (s) => <span className="text-muted">{ouVide(s.destination ?? s.cause ?? s.motif)}</span>,
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
        </Panel>

        <Panel
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
          <form className="flex flex-col gap-4">
            <Field label="Détenu concerné" requis>
              {(p) => (
                <Select {...p} name="detenuId" defaultValue="" placeholder="Sélectionner un détenu…">
                  {detenus.items.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom} — {d.numeroEcrou}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Date de sortie" requis>
              {(p) => <Input {...p} type="date" name="dateSortie" defaultValue={new Date().toISOString().slice(0, 10)} />}
            </Field>
            {config.champ && (
              <Field label={config.champ.label} requis aide={config.champ.aide}>
                {(p) => <Input {...p} name={config.champ!.nom} />}
              </Field>
            )}
            <Field label="Observations">
              {(p) => <Textarea {...p} name="observation" rows={3} />}
            </Field>
            {typeSortie === "Evasion" && (
              <div className="rounded-md border border-hairline bg-raised px-3 py-2.5">
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Ampliations</p>
                <p className="mt-1 whitespace-pre-line font-mono text-2xs leading-5 text-muted">{parametres.autoritesAmpliataires}</p>
              </div>
            )}
            <div className="border-t border-hairline pt-4">
              <DemoSubmit variante={config.grave ? "danger" : "primaire"} icone="exit" endpoint="POST /sorties">
                Consigner la sortie
              </DemoSubmit>
            </div>
          </form>
        </Panel>
      </div>
    </Page>
  );
}
