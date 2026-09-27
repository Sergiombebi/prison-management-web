import type { Metadata } from "next";
import { api } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import { TYPES_VISITE } from "@/lib/domain/referentiels";
import { formatNombre, pluriel } from "@/lib/format";
import { filtresActifs, hrefAvec, param, paramEntier } from "@/lib/url";
import { getProfil, peut } from "@/lib/session";
import { Page, PageHeader } from "@/components/layout/page";
import { FilterBar } from "@/components/data/filter-bar";
import { Pagination } from "@/components/data/pagination";
import { Stat, StatGrid } from "@/components/data/stat";
import { SearchInput, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/surface";
import { SansDroit } from "@/components/ui/en-attente-api";
import { FormulaireVisite } from "@/components/sante/formulaires";
import { VisitesTable } from "@/components/sante/visites-table";

export const metadata: Metadata = { title: "Gestion des visites" };

const CHEMIN = "/sante/visites";

export default async function VisitesPage(props: PageProps<"/sante/visites">) {
  const sp = await props.searchParams;
  const recherche = param(sp, "recherche") ?? "";
  const periode = (param(sp, "periode") as "tous" | "aujourdhui" | "semaine" | undefined) ?? "tous";
  const type = param(sp, "type") ?? "tous";
  const page = paramEntier(sp, "page", 1);

  const [resultat, detenus, profil, parametres] = await Promise.all([
    api.listVisites({ recherche, periode, type, page, parPage: 10, avecStats: true }),
    // Domaine voisin (GET /detenus) : un droit manquant ne doit coûter que le sélecteur.
    optionnel(() => api.listOptionsDetenus(), null),
    getProfil(),
    api.getParametres(),
  ]);

  const detenuBrut = Number.parseInt(param(sp, "detenu") ?? "", 10);
  const detenuInitial = Number.isFinite(detenuBrut) ? detenuBrut : undefined;
  const stats = resultat.stats;

  return (
    // Le ticket sort désormais dans une modale portée hors de cette page : elle échappe
    // à ce conteneur masqué à l'impression, qui n'a donc plus rien à afficher sur papier.
    <div data-print-hide>
    <Page>
      <PageHeader
        titre="Gestion des visites"
        description="Parloirs, identité des visiteurs et contrôles de sécurité effectués à l’entrée."
      />

      <StatGrid colonnes={3}>
        <Stat icone="user" style={{ ["--i" as string]: 0 }} label="Visites du jour" valeur={formatNombre(stats?.duJour ?? 0)} contexte="Enregistrées aujourd’hui" href="/sante/visites?periode=aujourdhui" />
        <Stat icone="user" style={{ ["--i" as string]: 1 }} label="7 derniers jours" valeur={formatNombre(stats?.semaine ?? 0)} contexte={`${formatNombre(stats?.total ?? resultat.total)} au total`} href="/sante/visites?periode=semaine" />
        <Stat
          icone="user"
          style={{ ["--i" as string]: 2 }}
          label="Sans autorisation préalable"
          valeur={formatNombre(stats?.sansAutorisation ?? 0)}
          signal={(stats?.sansAutorisation ?? 0) > 0 ? "attention" : "positif"}
          contexte="Sur les 7 derniers jours"
        />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel variante="eleve" flush className="overflow-hidden">
          <FilterBar action={CHEMIN} actif={filtresActifs(sp, ["recherche", "periode", "type"])} reinitialiserHref={CHEMIN} resultat={pluriel(resultat.total, "visite")}>
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

          <VisitesTable visites={resultat.items} parametres={parametres} />

          {resultat.total > resultat.parPage && (
            <Pagination
              page={resultat.page}
              parPage={resultat.parPage}
              total={resultat.total}
              href={(p) => hrefAvec(CHEMIN, sp, { page: p === 1 ? null : p })}
            />
          )}
        </Panel>

        {profil && peut(profil.permissions, "visites.creer") && (
          <Panel
            variante="eleve"
            titre="Enregistrer une visite"
            className="xl:sticky xl:top-20 xl:flex xl:max-h-[calc(100vh-7rem)] xl:flex-col"
            corpsClassName="xl:min-h-0 xl:flex-1 xl:overflow-y-auto"
          >
            {detenus ? (
              <FormulaireVisite detenus={detenus} detenuInitial={detenuInitial} parametres={parametres} />
            ) : (
              <SansDroit
                compact
                texte="L’enregistrement d’une visite demande aussi le droit de consulter le registre des détenus."
              />
            )}
          </Panel>
        )}
      </div>
    </Page>
    </div>
  );
}
