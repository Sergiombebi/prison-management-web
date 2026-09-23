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
import { FormulairePrescription } from "@/components/sante/formulaire-prescription";
import { PrescriptionsTable } from "@/components/sante/prescriptions-table";

export const metadata: Metadata = { title: "Traitements" };

const CHEMIN = "/sante/traitements";

export default async function TraitementsPage(props: PageProps<"/sante/traitements">) {
  const sp = await props.searchParams;
  const [prescriptions, detenus, profil] = await Promise.all([
    api.listPrescriptions(),
    optionnel(() => api.listDetenus({ parPage: 1000, tri: "nom" }), null),
    getProfil(),
  ]);

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const statut = param(sp, "statut") ?? "tous";
  const detenuBrut = Number.parseInt(param(sp, "detenu") ?? "", 10);
  const detenuInitial = Number.isFinite(detenuBrut) ? detenuBrut : undefined;

  const filtrees = prescriptions.filter(
    (p) =>
      (statut === "tous" || p.statut === statut) &&
      (!recherche ||
        p.detenuNom.toLowerCase().includes(recherche) ||
        p.numeroEcrou.toLowerCase().includes(recherche) ||
        p.medicament.toLowerCase().includes(recherche)),
  );

  const enCours = prescriptions.filter((p) => p.statut === "en_cours").length;
  const maintenant = new Date();
  const dans3Jours = new Date(maintenant.getTime() + 3 * 86_400_000);
  const aRenouveler = prescriptions.filter(
    (p) => p.statut === "en_cours" && p.dateFin && new Date(p.dateFin) >= maintenant && new Date(p.dateFin) <= dans3Jours,
  ).length;

  return (
    <Page>
      <PageHeader
        titre="Traitements"
        description="Prescriptions en cours, terminées et arrêtées — le « traitement en cours » du dossier médical se calcule à partir de ce registre."
      />

      <StatGrid colonnes={3}>
        <Stat
          icone="sante"
          style={{ ["--i" as string]: 0 }}
          label="En cours"
          valeur={formatNombre(enCours)}
          contexte={`${formatNombre(prescriptions.length)} au total`}
        />
        <Stat
          icone="clock"
          style={{ ["--i" as string]: 1 }}
          label="À renouveler"
          valeur={formatNombre(aRenouveler)}
          signal={aRenouveler > 0 ? "attention" : "positif"}
          contexte={aRenouveler > 0 ? "Échéance sous 3 jours" : "Aucune échéance proche"}
        />
        <Stat icone="sante" style={{ ["--i" as string]: 2 }} label="Total" valeur={formatNombre(prescriptions.length)} contexte="Depuis l’ouverture du registre" />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel variante="eleve" flush className="overflow-hidden">
          <FilterBar action={CHEMIN} actif={filtresActifs(sp, ["recherche", "statut"])} reinitialiserHref={CHEMIN} resultat={pluriel(filtrees.length, "traitement")}>
            <SearchInput name="recherche" defaultValue={param(sp, "recherche")} placeholder="Détenu, écrou ou médicament…" aria-label="Rechercher un traitement" className="w-full sm:w-64" />
            <Select name="statut" defaultValue={statut} aria-label="Filtrer par statut" className="w-44">
              <option value="tous">Tous statuts</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminés</option>
              <option value="arrete">Arrêtés</option>
            </Select>
          </FilterBar>

          <PrescriptionsTable prescriptions={filtrees} />
        </Panel>

        {profil && peut(profil.permissions, "sante.traitements.creer") && (
          <Panel
            variante="eleve"
            titre="Prescrire un traitement"
            className="xl:sticky xl:top-20 xl:flex xl:max-h-[calc(100vh-7rem)] xl:flex-col"
            corpsClassName="xl:min-h-0 xl:flex-1 xl:overflow-y-auto"
          >
            {detenus ? (
              <FormulairePrescription detenus={detenus.items} detenuInitial={detenuInitial} />
            ) : (
              <SansDroit
                compact
                texte="Prescrire un traitement demande aussi le droit de consulter le registre des détenus."
              />
            )}
          </Panel>
        )}
      </div>
    </Page>
  );
}
