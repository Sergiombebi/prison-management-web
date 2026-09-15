import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { CategoriePenale, DetenuResume, Sexe } from "@/lib/domain/types";
import { LIBELLE_CATEGORIE } from "@/lib/domain/referentiels";
import { formatDate, formatNombre, initiales, joursRestants, ouVide, pluriel, tronquer } from "@/lib/format";
import { filtresActifs, hrefAvec, param, paramEntier } from "@/lib/url";
import { t } from "@/lib/i18n/fr";
import { cn } from "@/lib/cn";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable, type Colonne } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { Pagination } from "@/components/data/pagination";
import { BadgeCategorie } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SearchInput, Select } from "@/components/ui/field";
import { Avatar, EmptyState, Ecrou, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Liste des détenus" };

const PAR_PAGE = 15;
const CHEMIN = "/detenus";

export default async function DetenusPage(props: PageProps<"/detenus">) {
  const sp = await props.searchParams;

  const recherche = param(sp, "recherche") ?? "";
  const categorieBrute = param(sp, "categorie");
  const categorie =
    categorieBrute && categorieBrute in LIBELLE_CATEGORIE
      ? (categorieBrute as CategoriePenale)
      : "toutes";
  const sexeBrut = param(sp, "sexe");
  const sexe: Sexe | "tous" = sexeBrut === "Masculin" || sexeBrut === "Féminin" ? sexeBrut : "tous";
  const tri = param(sp, "tri") ?? "numeroEcrou";
  const sens = param(sp, "sens") === "desc" ? "desc" : "asc";
  const page = paramEntier(sp, "page", 1);

  const resultat = await api.listDetenus({
    recherche,
    categorie,
    sexe,
    tri,
    sens,
    page,
    parPage: PAR_PAGE,
  });

  const actif = filtresActifs(sp, ["recherche", "categorie", "sexe"]);

  const colonnes: Colonne<DetenuResume>[] = [
    {
      cle: "numeroEcrou",
      titre: t.champs.numeroEcrou,
      triable: true,
      rendu: (d) => <Ecrou className="font-medium">{d.numeroEcrou}</Ecrou>,
    },
    {
      cle: "nom",
      titre: t.champs.nom,
      triable: true,
      rendu: (d) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar initiales={initiales(d.nom)} taille="sm" />
          <div className="min-w-0">
            <p className="max-w-[26ch] truncate font-medium text-ink" title={d.nom}>
              {d.nom}
            </p>
            <p className="text-xs text-muted">
              {d.sexe === "Féminin" ? "F" : "M"} · {d.age ? `${d.age} ans` : "âge inconnu"}
            </p>
          </div>
        </div>
      ),
    },
    {
      cle: "categorie",
      titre: t.champs.categoriePenale,
      triable: true,
      rendu: (d) => <BadgeCategorie categorie={d.categoriePenale} />,
    },
    {
      cle: "motif",
      titre: t.champs.motifDetention,
      masquerSous: "lg",
      rendu: (d) => (
        <span className="text-muted" title={d.mandatCourant?.motifDetention ?? undefined}>
          {tronquer(d.mandatCourant?.motifDetention, 34)}
        </span>
      ),
    },
    {
      cle: "dateIncarceration",
      titre: "Incarcéré le",
      triable: true,
      masquerSous: "md",
      rendu: (d) => <span className="text-muted">{formatDate(d.mandatCourant?.dateIncarceration)}</span>,
    },
    {
      cle: "cellule",
      titre: t.champs.cellule,
      masquerSous: "xl",
      rendu: (d) =>
        d.cellule ? (
          <span className="text-muted">{d.cellule.numero}</span>
        ) : (
          <span className="text-xs text-warning">Non logé</span>
        ),
    },
    {
      cle: "expiration",
      titre: "Fin du mandat",
      align: "droite",
      masquerSous: "sm",
      rendu: (d) => {
        const jours = joursRestants(d.mandatCourant?.dateSortieMandat);
        if (jours === null) return <span className="text-faint">{ouVide(null)}</span>;
        return (
          <span className="inline-flex flex-col items-end leading-tight">
            <span className={cn(jours <= 30 ? "font-medium text-warning" : "text-ink")}>
              {formatDate(d.mandatCourant?.dateSortieMandat)}
            </span>
            <span className="text-2xs text-faint">
              {jours <= 0 ? "échu" : `dans ${formatNombre(jours)} j`}
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.detenus}
        titre="Registre d’écrou"
        description="Tous les détenus présents dans l’établissement, avec leur situation pénale calculée à partir des mandats actifs."
        actions={
          <ButtonLink href="/detenus/nouveau" variante="primaire" icone="plus" transitionTypes={["nav-forward"]}>
            Nouvel enregistrement
          </ButtonLink>
        }
      />

      <Panel flush className="overflow-hidden">
        <FilterBar
          action={CHEMIN}
          actif={actif}
          reinitialiserHref={CHEMIN}
          resultat={pluriel(resultat.total, "détenu")}
        >
          {tri !== "numeroEcrou" && <input type="hidden" name="tri" value={tri} />}
          {sens !== "asc" && <input type="hidden" name="sens" value={sens} />}
          <SearchInput
            name="recherche"
            defaultValue={recherche}
            placeholder="Nom, n° d’écrou ou motif…"
            aria-label="Rechercher un détenu"
            className="w-full sm:w-72"
          />
          <Select name="categorie" defaultValue={categorie} aria-label="Filtrer par catégorie pénale" className="w-44">
            <option value="toutes">Toutes catégories</option>
            {Object.entries(LIBELLE_CATEGORIE).map(([valeur, label]) => (
              <option key={valeur} value={valeur}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="sexe" defaultValue={sexe} aria-label="Filtrer par sexe" className="w-36">
            <option value="tous">Tous sexes</option>
            <option value="Masculin">Hommes</option>
            <option value="Féminin">Femmes</option>
          </Select>
        </FilterBar>

        <DataTable
          legende="Registre d’écrou"
          colonnes={colonnes}
          lignes={resultat.items}
          cleLigne={(d) => d.id}
          lienLigne={(d) => `/detenus/${d.id}`}
          libelleLien={(d) => `Ouvrir le dossier de ${d.nom}, écrou ${d.numeroEcrou}`}
          tri={{
            cle: tri,
            sens,
            href: (cle, s) => hrefAvec(CHEMIN, sp, { tri: cle, sens: s, page: null }),
          }}
          vide={
            actif ? (
              <EmptyState
                icone="search"
                titre={t.etats.aucunResultatTitre}
                texte={
                  recherche
                    ? `Aucun détenu ne correspond à « ${recherche} » avec les filtres appliqués.`
                    : t.etats.aucunResultatTexte
                }
                action={
                  <ButtonLink href={CHEMIN} taille="sm" icone="close">
                    {t.actions.effacerFiltres}
                  </ButtonLink>
                }
              />
            ) : (
              <EmptyState
                icone="detenus"
                titre="Le registre est vide"
                texte="Aucun détenu n’a encore été enregistré dans l’établissement."
                action={
                  <ButtonLink href="/detenus/nouveau" variante="primaire" taille="sm" icone="plus">
                    Enregistrer le premier détenu
                  </ButtonLink>
                }
              />
            )
          }
        />

        {resultat.total > PAR_PAGE && (
          <Pagination
            page={resultat.page}
            parPage={resultat.parPage}
            total={resultat.total}
            href={(p) => hrefAvec(CHEMIN, sp, { page: p === 1 ? null : p })}
          />
        )}
      </Panel>
    </Page>
  );
}
