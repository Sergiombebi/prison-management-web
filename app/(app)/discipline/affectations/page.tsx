import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Affectation } from "@/lib/domain/types";
import { formatDate, initiales, ouVide, pluriel } from "@/lib/format";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Badge } from "@/components/ui/badge";
import { DemoSubmit } from "@/components/ui/client-actions";
import { Field, Input, Select } from "@/components/ui/field";
import { Avatar, EmptyState, Ecrou, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Affectations" };

export default async function AffectationsPage() {
  const [nonLoges, cellules, affectations, detenus] = await Promise.all([
    api.listDetenusNonLoges(),
    api.listCellules(),
    api.listAffectations(),
    api.listDetenus({ parPage: 1000, tri: "nom" }),
  ]);

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.discipline}
        titre="Affectation des détenus"
        description="Attribuer une cellule à un détenu entrant, ou le réaffecter. Les cellules pleines ne sont pas proposées."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Panel variante="eleve"
            titre="Détenus non logés"
            sousTitre={nonLoges.length ? `${pluriel(nonLoges.length, "détenu")} en attente d’affectation` : undefined}
            actions={nonLoges.length > 0 && <Badge ton="alerte">À traiter</Badge>}
            flush
          >
            {nonLoges.length === 0 ? (
              <EmptyState compact icone="check" titre="Tous les détenus sont logés" texte="Aucun détenu n’attend d’affectation." />
            ) : (
              <ul className="stagger divide-y divide-hairline">
                {nonLoges.map((d, i) => (
                  <li key={d.id} style={{ ["--i" as string]: i }} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar initiales={initiales(d.nom)} taille="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{d.nom}</p>
                      <p className="text-xs text-muted">
                        <Ecrou className="text-xs text-muted">{d.numeroEcrou}</Ecrou> · {d.sexe}
                      </p>
                    </div>
                    <p className="hidden text-xs text-faint sm:block">écroué le {formatDate(d.mandatCourant?.dateIncarceration)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel variante="eleve" titre="Affectations récentes" flush className="overflow-hidden">
            <DataTable<Affectation>
              legende="Historique des affectations"
              lignes={affectations.slice(0, 25)}
              cleLigne={(a) => a.id}
              lienLigne={(a) => `/detenus/${a.detenuId}?onglet=detention`}
              colonnes={[
                {
                  cle: "detenu",
                  titre: "Détenu",
                  rendu: (a) => (
                    <div>
                      <p className="font-medium">{a.detenuNom}</p>
                      <Ecrou className="text-xs text-muted">{a.numeroEcrou}</Ecrou>
                    </div>
                  ),
                },
                { cle: "cellule", titre: "Cellule", rendu: (a) => a.celluleLibelle },
                { cle: "motif", titre: "Motif", masquerSous: "md", rendu: (a) => <span className="text-muted">{ouVide(a.motifAffectation)}</span> },
                { cle: "date", titre: "Date", align: "droite", rendu: (a) => formatDate(a.dateAffectation) },
              ]}
              vide={<EmptyState icone="cell" titre="Aucune affectation enregistrée" />}
            />
          </Panel>
        </div>

        <Panel variante="eleve" titre="Affecter à une cellule" className="lg:sticky lg:top-20">
          <form className="flex flex-col gap-4">
            <Field label="Détenu" requis aide={nonLoges.length ? "Les détenus non logés apparaissent en premier." : undefined}>
              {(p) => (
                <Select {...p} name="detenuId" defaultValue="" placeholder="Sélectionner un détenu…">
                  {nonLoges.length > 0 && (
                    <optgroup label="Non logés">
                      {nonLoges.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nom} — {d.numeroEcrou}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Réaffectation">
                    {detenus.items
                      .filter((d) => d.cellule)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nom} — actuellement {d.cellule!.numero}
                        </option>
                      ))}
                  </optgroup>
                </Select>
              )}
            </Field>
            <Field label="Cellule" requis>
              {(p) => (
                <Select {...p} name="celluleId" defaultValue="" placeholder="Sélectionner une cellule…">
                  {cellules.map((c) => {
                    const libres = c.capaciteMax - c.effectifReel;
                    return (
                      <option key={c.id} value={c.id} disabled={libres <= 0}>
                        {c.bloc} · {c.numero} — {libres > 0 ? pluriel(libres, "place") : "pleine"}
                      </option>
                    );
                  })}
                </Select>
              )}
            </Field>
            <Field label="Motif de l’affectation">
              {(p) => <Input {...p} name="motifAffectation" placeholder="Ex. Affectation initiale" />}
            </Field>
            <div className="border-t border-hairline pt-4">
              <DemoSubmit icone="arrowRight" endpoint="POST /affectations">Affecter le détenu</DemoSubmit>
            </div>
          </form>
        </Panel>
      </div>
    </Page>
  );
}
