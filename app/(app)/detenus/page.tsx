import type { Metadata } from "next";
import Link from "next/link";
import { api, modeDe } from "@/lib/api";
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
import { Badge, BadgeCategorie } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SearchInput, Select } from "@/components/ui/field";
import { Avatar, EmptyState, Ecrou, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Liste des détenus" };

const CHEMIN = "/detenus";

export default async function DetenusPage(props: PageProps<"/detenus">) {
  const sp = await props.searchParams;

  // L'API impose 10 par page et n'expose ni tri, ni filtre par sexe, ni échéance de
  // mandat dans la liste. On adapte l'écran au lieu d'afficher des contrôles qui mentent.
  const reel = modeDe("detenus") === "live";
  const parPage = reel ? 10 : 15;

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
    sexe: reel ? "tous" : sexe,
    tri,
    sens,
    page,
    parPage,
  });

  const actif = filtresActifs(sp, reel ? ["recherche", "categorie"] : ["recherche", "categorie", "sexe"]);

  const colonneEcrou: Colonne<DetenuResume> = {
    cle: "numeroEcrou",
    titre: t.champs.numeroEcrou,
    triable: !reel,
    rendu: (d) => <Ecrou className="font-medium">{d.numeroEcrou}</Ecrou>,
  };

  const colonneNom: Colonne<DetenuResume> = {
    cle: "nom",
    titre: t.champs.nom,
    triable: !reel,
    rendu: (d) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar initiales={initiales(d.nom)} taille="sm" />
        <div className="min-w-0">
          <p className="max-w-[26ch] truncate font-medium text-ink" title={d.nom}>
            {d.nom}
          </p>
          <p className="text-xs text-muted">
            {d.sexe === "Féminin" ? "F" : "M"}
            {d.age ? ` · ${d.age} ans` : ""}
          </p>
        </div>
      </div>
    ),
  };

  const colonneMotif: Colonne<DetenuResume> = {
    cle: "motif",
    titre: t.champs.motifDetention,
    masquerSous: "lg",
    rendu: (d) => (
      <span className="text-muted" title={d.mandatCourant?.motifDetention ?? undefined}>
        {tronquer(d.mandatCourant?.motifDetention, 34)}
      </span>
    ),
  };

  const colonneIncarceration: Colonne<DetenuResume> = {
    cle: "dateIncarceration",
    titre: "Incarcéré le",
    triable: !reel,
    masquerSous: "md",
    rendu: (d) => <span className="text-muted">{formatDate(d.mandatCourant?.dateIncarceration)}</span>,
  };

  const colonneCategorie: Colonne<DetenuResume> = {
    cle: "categorie",
    titre: t.champs.categoriePenale,
    triable: !reel,
    rendu: (d) => <BadgeCategorie categorie={d.categoriePenale} />,
  };

  const colonneCellule: Colonne<DetenuResume> = {
    cle: "cellule",
    titre: t.champs.cellule,
    masquerSous: "xl",
    rendu: (d) =>
      d.cellule ? (
        <span className="rounded-md bg-sunken px-2 py-1 font-mono text-xs text-muted">
          {d.cellule.numero}
        </span>
      ) : (
        <span className="text-xs text-warning">Non logé</span>
      ),
  };

  const colonnes: Colonne<DetenuResume>[] = [
    colonneEcrou,
    colonneNom,
    colonneCategorie,
    colonneMotif,
    colonneIncarceration,
    colonneCellule,
    // L'échéance du mandat n'est pas dans la liste de l'API : en mode réel, on montre
    // le statut pénal du mandat courant, qui y est.
    reel
      ? {
          cle: "statutPenal",
          titre: "Statut pénal",
          align: "droite",
          masquerSous: "sm",
          rendu: (d) =>
            d.mandatCourant?.typeStatutPenal ? (
              <Badge ton="info" point={false}>
                {d.mandatCourant.typeStatutPenal}
              </Badge>
            ) : (
              <span className="text-xs text-faint">Aucun mandat</span>
            ),
        }
      : {
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

  const categories: Array<{ cle: CategoriePenale | "toutes"; label: string }> = [
    { cle: "toutes", label: "Toutes" },
    ...(Object.keys(LIBELLE_CATEGORIE) as CategoriePenale[]).map((c) => ({
      cle: c,
      label: LIBELLE_CATEGORIE[c],
    })),
  ];

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.detenus}
        titre="Registre d’écrou"
        description="Tous les détenus présents dans l’établissement, avec leur situation pénale calculée à partir des mandats actifs."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="tnum font-medium text-ink">{formatNombre(resultat.total)}</span>
              {resultat.total > 1 ? "détenus correspondent" : "détenu correspond"} aux filtres
            </span>
            {reel && (
              <span className="inline-flex items-center gap-1.5 text-accent">
                <Icon name="pulse" size={12} />
                Données réelles de l’API
              </span>
            )}
          </>
        }
        actions={
          <ButtonLink
            href="/detenus/nouveau"
            variante="primaire"
            icone="plus"
            transitionTypes={["nav-forward"]}
          >
            Nouvel enregistrement
          </ButtonLink>
        }
      />

      {/* Filtre par catégorie : des pastilles, plus rapides qu'une liste déroulante */}
      <nav aria-label="Filtrer par catégorie pénale" className="-mt-1 flex flex-wrap gap-2">
        {categories.map((c) => {
          const courant = categorie === c.cle;
          return (
            <Link
              key={c.cle}
              href={hrefAvec(CHEMIN, sp, { categorie: c.cle === "toutes" ? null : c.cle, page: null })}
              scroll={false}
              aria-current={courant ? "true" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-all duration-[var(--dur-fast)]",
                courant
                  ? "border-accent bg-accent text-ink-inverse shadow-accent"
                  : "border-hairline bg-surface text-muted shadow-e1 hover:-translate-y-px hover:border-accent/40 hover:text-ink",
              )}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      <Panel flush variante="eleve" className="overflow-hidden">
        <FilterBar
          action={CHEMIN}
          actif={actif}
          reinitialiserHref={CHEMIN}
          resultat={pluriel(resultat.total, "détenu")}
        >
          {!reel && tri !== "numeroEcrou" && <input type="hidden" name="tri" value={tri} />}
          {!reel && sens !== "asc" && <input type="hidden" name="sens" value={sens} />}
          {categorie !== "toutes" && <input type="hidden" name="categorie" value={categorie} />}
          <SearchInput
            name="recherche"
            defaultValue={recherche}
            placeholder={reel ? "Nom, écrou, CNI ou passeport…" : "Nom, n° d’écrou ou motif…"}
            aria-label="Rechercher un détenu"
            className="w-full sm:w-80"
          />
          {!reel && (
            <Select name="sexe" defaultValue={sexe} aria-label="Filtrer par sexe" className="w-36">
              <option value="tous">Tous sexes</option>
              <option value="Masculin">Hommes</option>
              <option value="Féminin">Femmes</option>
            </Select>
          )}
        </FilterBar>

        <DataTable
          legende="Registre d’écrou"
          colonnes={colonnes}
          lignes={resultat.items}
          cleLigne={(d) => d.id}
          lienLigne={(d) => `/detenus/${d.id}`}
          libelleLien={(d) => `Ouvrir le dossier de ${d.nom}, écrou ${d.numeroEcrou}`}
          tri={
            reel
              ? undefined
              : {
                  cle: tri,
                  sens,
                  href: (cle, s) => hrefAvec(CHEMIN, sp, { tri: cle, sens: s, page: null }),
                }
          }
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

        {resultat.total > resultat.parPage && (
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
