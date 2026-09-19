import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { SuiviMedical } from "@/lib/domain/types";
import { TYPES_CONSULTATION } from "@/lib/domain/referentiels";
import { formatDate, formatNombre, ouVide, pluriel, tronquer } from "@/lib/format";
import { filtresActifs, param } from "@/lib/url";
import { t } from "@/lib/i18n/fr";
import { getProfil, peut } from "@/lib/session";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { SearchInput, Select } from "@/components/ui/field";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { FormulaireConsultation } from "@/components/sante/formulaires";

export const metadata: Metadata = { title: "Suivi médical" };

const CHEMIN = "/sante/suivi-medical";

export default async function SuiviMedicalPage(props: PageProps<"/sante/suivi-medical">) {
  const sp = await props.searchParams;
  const [suivis, detenus, profil] = await Promise.all([
    api.listSuivisMedicaux(),
    api.listDetenus({ parPage: 1000, tri: "nom" }),
    getProfil(),
  ]);

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const type = param(sp, "type") ?? "tous";
  const detenuBrut = Number.parseInt(param(sp, "detenu") ?? "", 10);
  const detenuInitial = Number.isFinite(detenuBrut) ? detenuBrut : undefined;
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
        titre="Suivi médical"
        description="Consultations réalisées à l’infirmerie, diagnostics posés et traitements prescrits."
      />

      <StatGrid colonnes={4}>
        <Stat icone="pulse" style={{ ["--i" as string]: 0 }} label="Consultations" valeur={formatNombre(suivis.length)} contexte="Au total" />
        <Stat icone="pulse" style={{ ["--i" as string]: 1 }} label="Ce mois-ci" valeur={formatNombre(ceMois)} contexte="Depuis le 1er du mois" />
        <Stat icone="pulse" style={{ ["--i" as string]: 2 }} label="Urgences (7 jours)" valeur={formatNombre(urgences)} signal={urgences > 0 ? "attention" : "neutre"} contexte={urgences > 0 ? "À surveiller" : "Aucune urgence récente"} />
        <Stat icone="pulse" style={{ ["--i" as string]: 3 }} label="Suivis programmés" valeur={formatNombre(suivisPrevus)} contexte="Rendez-vous à venir" />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel variante="eleve" flush className="overflow-hidden">
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

        {profil && peut(profil.permissions, "sante.consultations.creer") && (
          <Panel
            variante="eleve"
            titre="Nouvelle consultation"
            className="xl:sticky xl:top-20 xl:flex xl:max-h-[calc(100vh-7rem)] xl:flex-col"
            corpsClassName="xl:min-h-0 xl:flex-1 xl:overflow-y-auto"
          >
            <FormulaireConsultation detenus={detenus.items} detenuInitial={detenuInitial} />
          </Panel>
        )}
      </div>
    </Page>
  );
}
