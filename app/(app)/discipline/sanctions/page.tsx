import type { Metadata } from "next";
import { api } from "@/lib/api";
import { tenter } from "@/lib/api/disponibilite";
import type { Sanction } from "@/lib/domain/types";
import { formatDate, formatNombre, pluriel, tronquer } from "@/lib/format";
import { filtresActifs, param } from "@/lib/url";
import { t } from "@/lib/i18n/fr";
import { getProfil, peutAdministrer } from "@/lib/session";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EnAttenteApi } from "@/components/ui/en-attente-api";
import { SearchInput, Select } from "@/components/ui/field";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { FormulaireSanction } from "@/components/discipline/formulaires";

export const metadata: Metadata = { title: "Sanctions" };

const CHEMIN = "/discipline/sanctions";

export default async function SanctionsPage(props: PageProps<"/discipline/sanctions">) {
  const sp = await props.searchParams;
  const [chargement, types, cellules, detenus, profil] = await Promise.all([
    // La liste n'est pas encore exposée par l'API : elle ne doit pas bloquer la saisie
    tenter(() => api.listSanctions()),
    api.listTypesSanction(),
    api.listCellules(),
    api.listDetenus({ parPage: 1000, tri: "nom" }),
    getProfil(),
  ]);

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const statut = param(sp, "statut") ?? "tous";
  const type = param(sp, "type") ?? "tous";
  const detenuInitial = Number.parseInt(param(sp, "detenu") ?? "", 10);

  const sanctions = chargement.ok ? chargement.donnees : [];
  const filtrees = sanctions.filter(
    (s) =>
      (statut === "tous" || (statut === "en-cours" ? s.statut === "En cours" : s.statut !== "En cours")) &&
      (type === "tous" || s.typeSanction === type) &&
      (!recherche || s.detenuNom.toLowerCase().includes(recherche) || s.numeroEcrou.toLowerCase().includes(recherche)),
  );

  const enCours = sanctions.filter((s) => s.statut === "En cours").length;
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const ceMois = sanctions.filter((s) => new Date(s.dateFaute) >= debutMois).length;
  const isoles = sanctions.filter((s) => s.statut === "En cours" && s.celluleId !== null).length;

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.discipline}
        titre="Sanctions disciplinaires"
        description="Registre des fautes constatées et des sanctions prononcées à l’encontre des détenus."
        actions={
          profil && peutAdministrer(profil.role) && (
            <ButtonLink href="/discipline/sanctions/types" icone="edit" transitionTypes={["nav-forward"]}>
              Types de sanction
            </ButtonLink>
          )
        }
      />

      {chargement.ok && (
        <StatGrid colonnes={3}>
          <Stat icone="scale" style={{ ["--i" as string]: 0 }} label="Sanctions en cours" valeur={formatNombre(enCours)} signal={enCours > 5 ? "attention" : "neutre"} contexte={`sur ${formatNombre(sanctions.length)} enregistrées`} />
          <Stat icone="scale" style={{ ["--i" as string]: 1 }} label="Fautes ce mois-ci" valeur={formatNombre(ceMois)} contexte="Depuis le 1er du mois" />
          <Stat icone="scale" style={{ ["--i" as string]: 2 }} label="En cellule disciplinaire" valeur={formatNombre(isoles)} contexte="Détenus actuellement isolés" />
        </StatGrid>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel variante="eleve" flush className="overflow-hidden">
          {!chargement.ok ? (
            <EnAttenteApi
              icone="scale"
              route="GET /sanctions"
              texte="Les sanctions se prononcent déjà et sont enregistrées, mais l’API ne sait pas encore les lister."
            />
          ) : (
            <>
              <FilterBar action={CHEMIN} actif={filtresActifs(sp, ["recherche", "statut", "type"])} reinitialiserHref={CHEMIN} resultat={pluriel(filtrees.length, "sanction")}>
                <SearchInput name="recherche" defaultValue={param(sp, "recherche")} placeholder="Détenu ou n° d’écrou…" aria-label="Rechercher" className="w-full sm:w-60" />
                <Select name="statut" defaultValue={statut} aria-label="Filtrer par statut" className="w-36">
                  <option value="tous">Tous statuts</option>
                  <option value="en-cours">En cours</option>
                  <option value="terminees">Terminées</option>
                </Select>
                <Select name="type" defaultValue={type} aria-label="Filtrer par type" className="w-52">
                  <option value="tous">Tous types</option>
                  {types.map((ty) => (
                    <option key={ty.id}>{ty.libelle}</option>
                  ))}
                </Select>
              </FilterBar>

              <DataTable<Sanction>
                legende="Historique des sanctions"
                lignes={filtrees}
                cleLigne={(s) => s.id}
                lienLigne={(s) => `/detenus/${s.detenuId}?onglet=discipline`}
                colonnes={[
                  {
                    cle: "detenu",
                    titre: "Détenu",
                    rendu: (s) => (
                      <div>
                        <p className="max-w-[22ch] truncate font-medium">{s.detenuNom}</p>
                        <Ecrou className="text-xs text-muted">{s.numeroEcrou}</Ecrou>
                      </div>
                    ),
                  },
                  { cle: "type", titre: "Sanction", rendu: (s) => tronquer(s.typeSanction, 26) },
                  { cle: "motif", titre: "Faute commise", masquerSous: "lg", rendu: (s) => <span className="text-muted" title={s.motif ?? undefined}>{tronquer(s.motif, 36)}</span> },
                  { cle: "faute", titre: "Faute le", masquerSous: "md", rendu: (s) => formatDate(s.dateFaute) },
                  { cle: "periode", titre: "Période", masquerSous: "xl", rendu: (s) => <span className="text-muted">{formatDate(s.dateDebut)} → {formatDate(s.dateFin)}</span> },
                  { cle: "statut", titre: "Statut", rendu: (s) => <Badge ton={s.statut === "En cours" ? "alerte" : "neutre"}>{s.statut ?? "—"}</Badge> },
                ]}
                vide={<EmptyState icone="scale" titre={t.etats.aucunResultatTitre} texte={t.etats.aucunResultatTexte} />}
              />
            </>
          )}
        </Panel>

        <Panel variante="eleve" titre="Nouvelle sanction" className="xl:sticky xl:top-20">
          <FormulaireSanction
            detenus={detenus.items}
            types={types}
            cellules={cellules}
            detenuInitial={Number.isFinite(detenuInitial) ? detenuInitial : undefined}
          />
        </Panel>
      </div>
    </Page>
  );
}
