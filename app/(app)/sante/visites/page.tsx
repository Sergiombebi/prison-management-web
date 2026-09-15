import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Visite } from "@/lib/domain/types";
import { DUREES_VISITE, LIENS_PARENTE, PIECES_IDENTITE, SEXES, TYPES_VISITE } from "@/lib/domain/referentiels";
import { formatDate, formatNombre, pluriel } from "@/lib/format";
import { filtresActifs, param } from "@/lib/url";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { DemoSubmit } from "@/components/ui/client-actions";
import { Field, Input, SearchInput, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Gestion des visites" };

const CHEMIN = "/sante/visites";

export default async function VisitesPage(props: PageProps<"/sante/visites">) {
  const sp = await props.searchParams;
  const [visites, detenus] = await Promise.all([api.listVisites(), api.listDetenus({ parPage: 1000, tri: "nom" })]);

  const maintenant = new Date();
  const aujourdhui = maintenant.toDateString();
  const ilYa7j = new Date(maintenant.getTime() - 7 * 86_400_000);

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const periode = param(sp, "periode") ?? "tous";
  const type = param(sp, "type") ?? "tous";

  const filtrees = visites.filter((v) => {
    const d = new Date(v.dateVisite);
    return (
      (periode === "tous" || (periode === "aujourdhui" ? d.toDateString() === aujourdhui : d >= ilYa7j)) &&
      (type === "tous" || v.typeVisite === type) &&
      (!recherche ||
        v.detenuNom.toLowerCase().includes(recherche) ||
        v.nomVisiteur.toLowerCase().includes(recherche) ||
        v.numeroEcrou.toLowerCase().includes(recherche))
    );
  });

  const duJour = visites.filter((v) => new Date(v.dateVisite).toDateString() === aujourdhui).length;
  const semaine = visites.filter((v) => new Date(v.dateVisite) >= ilYa7j).length;
  const sansAutorisation = visites.filter((v) => !v.autorisationPrealable && new Date(v.dateVisite) >= ilYa7j).length;

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.sante}
        titre="Gestion des visites"
        description="Parloirs, identité des visiteurs et contrôles de sécurité effectués à l’entrée."
      />

      <StatGrid colonnes={3}>
        <Stat style={{ ["--i" as string]: 0 }} label="Visites du jour" valeur={formatNombre(duJour)} contexte="Enregistrées aujourd’hui" href="/sante/visites?periode=aujourdhui" />
        <Stat style={{ ["--i" as string]: 1 }} label="7 derniers jours" valeur={formatNombre(semaine)} contexte={`${formatNombre(visites.length)} au total`} href="/sante/visites?periode=semaine" />
        <Stat style={{ ["--i" as string]: 2 }} label="Sans autorisation préalable" valeur={formatNombre(sansAutorisation)} signal={sansAutorisation > 0 ? "attention" : "positif"} contexte="Sur les 7 derniers jours" />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel flush className="overflow-hidden">
          <FilterBar action={CHEMIN} actif={filtresActifs(sp, ["recherche", "periode", "type"])} reinitialiserHref={CHEMIN} resultat={pluriel(filtrees.length, "visite")}>
            <SearchInput name="recherche" defaultValue={param(sp, "recherche")} placeholder="Détenu ou visiteur…" aria-label="Rechercher une visite" className="w-full sm:w-56" />
            <Select name="periode" defaultValue={periode} aria-label="Période" className="w-40">
              <option value="tous">Toutes dates</option>
              <option value="aujourdhui">Aujourd’hui</option>
              <option value="semaine">7 derniers jours</option>
            </Select>
            <Select name="type" defaultValue={type} aria-label="Type de visite" className="w-44">
              <option value="tous">Tous types</option>
              {TYPES_VISITE.map((ty) => (
                <option key={ty}>{ty}</option>
              ))}
            </Select>
          </FilterBar>

          <DataTable<Visite>
            legende="Registre des visites"
            lignes={filtrees}
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
            ]}
            vide={<EmptyState icone="user" titre={t.etats.aucunResultatTitre} texte={t.etats.aucunResultatTexte} />}
          />
        </Panel>

        <Panel titre="Enregistrer une visite" className="xl:sticky xl:top-20">
          <form className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-faint">Visite</legend>
              <Field label="Détenu visité" requis>
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
              <div className="grid grid-cols-3 gap-3">
                <Field label="Date" requis className="col-span-3 sm:col-span-1">
                  {(p) => <Input {...p} type="date" name="dateVisite" defaultValue={maintenant.toISOString().slice(0, 10)} />}
                </Field>
                <Field label="Arrivée" requis>
                  {(p) => <Input {...p} type="time" name="heureArrivee" />}
                </Field>
                <Field label="Durée" requis>
                  {(p) => (
                    <Select {...p} name="dureePrevueMinutes" defaultValue="30">
                      {DUREES_VISITE.map((d) => (
                        <option key={d} value={d}>
                          {d} min
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type" requis>
                  {(p) => (
                    <Select {...p} name="typeVisite" defaultValue="" placeholder="Choisir…">
                      {TYPES_VISITE.map((ty) => (
                        <option key={ty}>{ty}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Autorisation préalable" requis>
                  {(p) => (
                    <Select {...p} name="autorisationPrealable" defaultValue="oui">
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </Select>
                  )}
                </Field>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3 border-t border-hairline pt-4">
              <legend className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-faint">Visiteur</legend>
              <Field label="Nom complet" requis>
                {(p) => <Input {...p} name="nomVisiteur" />}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sexe" requis>
                  {(p) => (
                    <Select {...p} name="sexeVisiteur" defaultValue="" placeholder="Choisir…">
                      {SEXES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Lien de parenté" requis>
                  {(p) => (
                    <Select {...p} name="lienParente" defaultValue="" placeholder="Choisir…">
                      {LIENS_PARENTE.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Pièce d’identité" requis>
                  {(p) => (
                    <Select {...p} name="typePieceIdentite" defaultValue="" placeholder="Choisir…">
                      {PIECES_IDENTITE.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="N° de la pièce" requis>
                  {(p) => <Input {...p} name="numeroPieceIdentite" className="font-mono" />}
                </Field>
              </div>
              <Field label="Téléphone">
                {(p) => <Input {...p} name="telephoneVisiteur" type="tel" inputMode="tel" />}
              </Field>
            </fieldset>

            <fieldset className="flex flex-col gap-3 border-t border-hairline pt-4">
              <legend className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-faint">Sécurité</legend>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Agent de contrôle" requis>
                  {(p) => <Input {...p} name="agentControle" />}
                </Field>
                <Field label="Fouille corporelle">
                  {(p) => (
                    <Select {...p} name="fouilleCorporelle" defaultValue="oui">
                      <option value="oui">Effectuée</option>
                      <option value="non">Non effectuée</option>
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="Objets déposés">
                {(p) => <Textarea {...p} name="objetsDeposes" rows={2} />}
              </Field>
            </fieldset>

            <div className="border-t border-hairline pt-4">
              <DemoSubmit icone="check" endpoint="POST /visites">Enregistrer la visite</DemoSubmit>
            </div>
          </form>
        </Panel>
      </div>
    </Page>
  );
}
