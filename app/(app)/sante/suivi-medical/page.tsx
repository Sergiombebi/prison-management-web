import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { SuiviMedical } from "@/lib/domain/types";
import { TYPES_CONSULTATION } from "@/lib/domain/referentiels";
import { formatDate, formatNombre, ouVide, pluriel, tronquer } from "@/lib/format";
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

export const metadata: Metadata = { title: "Suivi médical" };

const CHEMIN = "/sante/suivi-medical";

export default async function SuiviMedicalPage(props: PageProps<"/sante/suivi-medical">) {
  const sp = await props.searchParams;
  const [suivis, detenus] = await Promise.all([api.listSuivisMedicaux(), api.listDetenus({ parPage: 1000, tri: "nom" })]);

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const type = param(sp, "type") ?? "tous";
  const filtres = suivis.filter(
    (s) =>
      (type === "tous" || s.typeConsultation === type) &&
      (!recherche ||
        s.detenuNom.toLowerCase().includes(recherche) ||
        s.numeroEcrou.toLowerCase().includes(recherche) ||
        (s.diagnostic ?? "").toLowerCase().includes(recherche)),
  );

  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const ilYa7j = new Date(maintenant.getTime() - 7 * 86_400_000);
  const ceMois = suivis.filter((s) => new Date(s.dateConsultation) >= debutMois).length;
  const urgences = suivis.filter((s) => s.typeConsultation === "Urgence" && new Date(s.dateConsultation) >= ilYa7j).length;
  const suivisPrevus = suivis.filter((s) => s.dateSuivi && new Date(s.dateSuivi) >= maintenant).length;

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.sante}
        titre="Suivi médical"
        description="Consultations réalisées à l’infirmerie, diagnostics posés et traitements prescrits."
      />

      <StatGrid colonnes={4}>
        <Stat style={{ ["--i" as string]: 0 }} label="Consultations" valeur={formatNombre(suivis.length)} contexte="Au total" />
        <Stat style={{ ["--i" as string]: 1 }} label="Ce mois-ci" valeur={formatNombre(ceMois)} contexte="Depuis le 1er du mois" />
        <Stat style={{ ["--i" as string]: 2 }} label="Urgences (7 jours)" valeur={formatNombre(urgences)} signal={urgences > 0 ? "attention" : "neutre"} contexte={urgences > 0 ? "À surveiller" : "Aucune urgence récente"} />
        <Stat style={{ ["--i" as string]: 3 }} label="Suivis programmés" valeur={formatNombre(suivisPrevus)} contexte="Rendez-vous à venir" />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel flush className="overflow-hidden">
          <FilterBar action={CHEMIN} actif={filtresActifs(sp, ["recherche", "type"])} reinitialiserHref={CHEMIN} resultat={pluriel(filtres.length, "consultation")}>
            <SearchInput name="recherche" defaultValue={param(sp, "recherche")} placeholder="Détenu, écrou ou diagnostic…" aria-label="Rechercher une consultation" className="w-full sm:w-64" />
            <Select name="type" defaultValue={type} aria-label="Filtrer par type" className="w-48">
              <option value="tous">Tous types</option>
              {TYPES_CONSULTATION.map((ty) => (
                <option key={ty}>{ty}</option>
              ))}
            </Select>
          </FilterBar>

          <DataTable<SuiviMedical>
            legende="Historique des consultations"
            lignes={filtres}
            cleLigne={(s) => s.id}
            lienLigne={(s) => `/detenus/${s.detenuId}?onglet=sante`}
            colonnes={[
              { cle: "date", titre: "Date", rendu: (s) => <span className="font-medium">{formatDate(s.dateConsultation)}</span> },
              {
                cle: "detenu",
                titre: "Détenu",
                rendu: (s) => (
                  <div>
                    <p className="max-w-[22ch] truncate">{s.detenuNom}</p>
                    <Ecrou className="text-xs text-muted">{s.numeroEcrou}</Ecrou>
                  </div>
                ),
              },
              { cle: "type", titre: "Type", rendu: (s) => <Badge ton={s.typeConsultation === "Urgence" ? "danger" : s.typeConsultation === "Psychiatrique" ? "info" : "neutre"}>{s.typeConsultation}</Badge> },
              { cle: "diagnostic", titre: "Diagnostic", masquerSous: "md", rendu: (s) => <span className="font-medium">{tronquer(s.diagnostic, 28)}</span> },
              { cle: "medecin", titre: "Médecin", masquerSous: "lg", rendu: (s) => <span className="text-muted">{s.nomMedecin}</span> },
              { cle: "suivi", titre: "Suivi", align: "droite", masquerSous: "xl", rendu: (s) => <span className="text-muted">{ouVide(s.dateSuivi && formatDate(s.dateSuivi))}</span> },
            ]}
            vide={<EmptyState icone="sante" titre={t.etats.aucunResultatTitre} texte={t.etats.aucunResultatTexte} />}
          />
        </Panel>

        <Panel titre="Nouvelle consultation" className="xl:sticky xl:top-20">
          <form className="flex flex-col gap-4">
            <Field label="Détenu" requis>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" requis>
                {(p) => <Input {...p} type="date" name="dateConsultation" defaultValue={maintenant.toISOString().slice(0, 10)} />}
              </Field>
              <Field label="Type" requis>
                {(p) => (
                  <Select {...p} name="typeConsultation" defaultValue="" placeholder="Choisir…">
                    {TYPES_CONSULTATION.map((ty) => (
                      <option key={ty}>{ty}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Médecin" requis>
              {(p) => <Input {...p} name="nomMedecin" placeholder="Dr …" />}
            </Field>
            <fieldset className="grid grid-cols-3 gap-3">
              <legend className="sr-only">Constantes</legend>
              <Field label="Temp. (°C)">
                {(p) => <Input {...p} name="temperature" inputMode="decimal" placeholder="37,0" />}
              </Field>
              <Field label="Tension">
                {(p) => <Input {...p} name="tensionArterielle" placeholder="12/8" />}
              </Field>
              <Field label="Poids (kg)">
                {(p) => <Input {...p} name="poids" inputMode="decimal" />}
              </Field>
            </fieldset>
            <Field label="Symptômes" requis>
              {(p) => <Textarea {...p} name="symptomes" rows={2} />}
            </Field>
            <Field label="Diagnostic" requis>
              {(p) => <Input {...p} name="diagnostic" />}
            </Field>
            <Field label="Médicaments prescrits">
              {(p) => <Textarea {...p} name="medicamentsPrescrits" rows={2} />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durée du traitement">
                {(p) => <Input {...p} name="dureeTraitement" placeholder="7 jours" />}
              </Field>
              <Field label="Date de suivi">
                {(p) => <Input {...p} type="date" name="dateSuivi" />}
              </Field>
            </div>
            <div className="border-t border-hairline pt-4">
              <DemoSubmit icone="pulse" endpoint="POST /suivis-medicaux">Enregistrer la consultation</DemoSubmit>
            </div>
          </form>
        </Panel>
      </div>
    </Page>
  );
}
