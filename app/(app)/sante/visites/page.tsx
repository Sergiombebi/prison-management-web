import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Visite } from "@/lib/domain/types";
import { TYPES_VISITE } from "@/lib/domain/referentiels";
import { formatDate, formatNombre, pluriel } from "@/lib/format";
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
import { FormulaireVisite } from "@/components/sante/formulaires";

export const metadata: Metadata = { title: "Gestion des visites" };

const CHEMIN = "/sante/visites";

export default async function VisitesPage(props: PageProps<"/sante/visites">) {
  const sp = await props.searchParams;
  const [visites, detenus, profil] = await Promise.all([
    api.listVisites(),
    api.listDetenus({ parPage: 1000, tri: "nom" }),
    getProfil(),
  ]);

  const maintenant = new Date();
  const aujourdhui = maintenant.toDateString();
  const ilYa7j = new Date(maintenant.getTime() - 7 * 86_400_000);

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const periode = param(sp, "periode") ?? "tous";
  const type = param(sp, "type") ?? "tous";
  const detenuBrut = Number.parseInt(param(sp, "detenu") ?? "", 10);
  const detenuInitial = Number.isFinite(detenuBrut) ? detenuBrut : undefined;

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
        titre="Gestion des visites"
        description="Parloirs, identité des visiteurs et contrôles de sécurité effectués à l’entrée."
      />

      <StatGrid colonnes={3}>
        <Stat icone="user" style={{ ["--i" as string]: 0 }} label="Visites du jour" valeur={formatNombre(duJour)} contexte="Enregistrées aujourd’hui" href="/sante/visites?periode=aujourdhui" />
        <Stat icone="user" style={{ ["--i" as string]: 1 }} label="7 derniers jours" valeur={formatNombre(semaine)} contexte={`${formatNombre(visites.length)} au total`} href="/sante/visites?periode=semaine" />
        <Stat icone="user" style={{ ["--i" as string]: 2 }} label="Sans autorisation préalable" valeur={formatNombre(sansAutorisation)} signal={sansAutorisation > 0 ? "attention" : "positif"} contexte="Sur les 7 derniers jours" />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel variante="eleve" flush className="overflow-hidden">
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

        {profil && peut(profil.permissions, "visites.creer") && (
          <Panel variante="eleve" titre="Enregistrer une visite" className="xl:sticky xl:top-20">
            <FormulaireVisite detenus={detenus.items} detenuInitial={detenuInitial} />
          </Panel>
        )}
      </div>
    </Page>
  );
}
