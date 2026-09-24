import type { Metadata } from "next";
import { api } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import { formatNombre, pluriel } from "@/lib/format";
import { filtresActifs, param } from "@/lib/url";
import { getProfil, peut } from "@/lib/session";
import { Page, PageHeader } from "@/components/layout/page";
import { FilterBar } from "@/components/data/filter-bar";
import { Stat, StatGrid } from "@/components/data/stat";
import { SearchInput, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/surface";
import { SansDroit } from "@/components/ui/en-attente-api";
import { FormulaireEvacuation } from "@/components/sante/formulaire-evacuation";
import { EvacuationsTable } from "@/components/sante/evacuations-table";

export const metadata: Metadata = { title: "Évacuations sanitaires" };

const CHEMIN = "/sante/evacuations";

export default async function EvacuationsPage(props: PageProps<"/sante/evacuations">) {
  const sp = await props.searchParams;
  const [evacuations, detenus, profil] = await Promise.all([
    api.listEvacuations(),
    optionnel(() => api.listOptionsDetenus(), null),
    getProfil(),
  ]);

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const statut = param(sp, "statut") ?? "tous";
  const detenuBrut = Number.parseInt(param(sp, "detenu") ?? "", 10);
  const detenuInitial = Number.isFinite(detenuBrut) ? detenuBrut : undefined;

  const filtrees = evacuations.filter(
    (e) =>
      (statut === "tous" || (statut === "en-cours" ? !e.dateRetour : Boolean(e.dateRetour))) &&
      (!recherche ||
        e.detenuNom.toLowerCase().includes(recherche) ||
        e.numeroEcrou.toLowerCase().includes(recherche) ||
        e.structureDestination.toLowerCase().includes(recherche)),
  );

  const enCours = evacuations.filter((e) => !e.dateRetour).length;
  const maintenant = new Date();
  const ilYa30j = new Date(maintenant.getTime() - 30 * 86_400_000);
  const ceMois = evacuations.filter((e) => new Date(e.dateDepart) >= ilYa30j).length;

  return (
    <Page>
      <PageHeader
        titre="Évacuations sanitaires"
        description="Détenus évacués vers une structure hospitalière extérieure — ils restent présents dans l’effectif et gardent leur cellule."
      />

      <StatGrid colonnes={3}>
        <Stat
          icone="pulse"
          style={{ ["--i" as string]: 0 }}
          label="En évacuation"
          valeur={formatNombre(enCours)}
          signal={enCours > 0 ? "attention" : "positif"}
          contexte={enCours > 0 ? "Actuellement hors de l’établissement" : "Aucune évacuation en cours"}
        />
        <Stat icone="pulse" style={{ ["--i" as string]: 1 }} label="30 derniers jours" valeur={formatNombre(ceMois)} contexte={`${formatNombre(evacuations.length)} au total`} />
        <Stat icone="pulse" style={{ ["--i" as string]: 2 }} label="Total" valeur={formatNombre(evacuations.length)} contexte="Depuis l’ouverture du registre" />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel variante="eleve" flush className="overflow-hidden">
          <FilterBar action={CHEMIN} actif={filtresActifs(sp, ["recherche", "statut"])} reinitialiserHref={CHEMIN} resultat={pluriel(filtrees.length, "évacuation")}>
            <SearchInput name="recherche" defaultValue={param(sp, "recherche")} placeholder="Détenu, écrou ou structure…" aria-label="Rechercher une évacuation" className="w-full sm:w-64" />
            <Select name="statut" defaultValue={statut} aria-label="Filtrer par statut" className="w-44">
              <option value="tous">Tous statuts</option>
              <option value="en-cours">En évacuation</option>
              <option value="rentre">Rentrés</option>
            </Select>
          </FilterBar>

          <EvacuationsTable evacuations={filtrees} />
        </Panel>

        {profil && peut(profil.permissions, "sante.evacuations.creer") && (
          <Panel
            variante="eleve"
            titre="Enregistrer une évacuation"
            className="xl:sticky xl:top-20 xl:flex xl:max-h-[calc(100vh-7rem)] xl:flex-col"
            corpsClassName="xl:min-h-0 xl:flex-1 xl:overflow-y-auto"
          >
            {detenus ? (
              <FormulaireEvacuation detenus={detenus} detenuInitial={detenuInitial} />
            ) : (
              <SansDroit
                compact
                texte="Enregistrer une évacuation demande aussi le droit de consulter le registre des détenus."
              />
            )}
          </Panel>
        )}
      </div>
    </Page>
  );
}
