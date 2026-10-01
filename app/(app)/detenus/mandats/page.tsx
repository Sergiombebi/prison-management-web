import type { Metadata } from "next";
import { api, type MandatDetaille } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import type { CategoriePenale } from "@/lib/domain/types";
import {
  CATEGORIE_SLUG,
  LIBELLE_CATEGORIE,
  REGLE_CATEGORIE,
  TYPES_STATUT_PENAL,
} from "@/lib/domain/referentiels";
import { VIDE, formatDate, formatNombre, pluriel, tronquer } from "@/lib/format";
import { filtresActifs, hrefAvec, param, paramEntier } from "@/lib/url";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { Pagination } from "@/components/data/pagination";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SearchInput, Select } from "@/components/ui/field";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Mandats" };

const CHEMIN = "/detenus/mandats";
const PAR_PAGE_OPTIONS = [20, 50, 100];
const ORDRE: CategoriePenale[] = ["Prevenu", "Condamne", "Appellant", "Cassationnaire", "Dpac"];

export default async function MandatsPage(props: PageProps<"/detenus/mandats">) {
  const t = await getT();
  const sp = await props.searchParams;

  const recherche = param(sp, "recherche") ?? "";
  const etat = param(sp, "etat") ?? "tous";
  const statut = param(sp, "statut") ?? "tous";
  const page = paramEntier(sp, "page", 1);
  const parPage = paramEntier(sp, "parPage", 20);

  // Le compteur par catégorie vient du tableau de bord, derrière sa propre
  // permission : sans elle, la carte s'affiche sans chiffre plutôt que pas du tout.
  const [resultat, tb] = await Promise.all([
    api.listMandats({ recherche, etat: etat as "tous" | "actifs" | "expires", statut, page, parPage }),
    optionnel(() => api.getTableauDeBord(), null),
  ]);
  const visibles = resultat.items;
  const actif = filtresActifs(sp, ["recherche", "etat", "statut"]);

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.detenus}
        titre="Gestion des mandats"
        description="Titres de détention de l’établissement. La catégorie pénale de chaque détenu se déduit de ses mandats actifs."
        actions={
          <ButtonLink href="/detenus/nouveau#incarceration" variante="primaire" icone="plus" transitionTypes={["nav-forward"]}>
            Nouveau mandat
          </ButtonLink>
        }
      />

      <StatGrid colonnes={5}>
        {ORDRE.map((c, i) => (
          <Stat icone="scale"
            key={c}
            style={{ ["--i" as string]: i }}
            label={LIBELLE_CATEGORIE[c]}
            valeur={tb ? formatNombre(tb.effectifsParCategorie[c]) : VIDE}
            contexte={REGLE_CATEGORIE[c]}
            signal={c === "Dpac" && (tb?.effectifsParCategorie[c] ?? 0) > 0 ? "attention" : "neutre"}
            href={`/detenus/mandats/${CATEGORIE_SLUG[c]}`}
          />
        ))}
      </StatGrid>

      <Panel variante="eleve" flush className="overflow-hidden">
        <FilterBar action={CHEMIN} actif={actif} reinitialiserHref={CHEMIN} resultat={pluriel(resultat.total, "mandat")}>
          <SearchInput
            name="recherche"
            defaultValue={param(sp, "recherche")}
            placeholder="Détenu, écrou ou référence…"
            aria-label="Rechercher un mandat"
            className="w-full sm:w-72"
          />
          <Select name="etat" defaultValue={etat} aria-label="Filtrer par état" className="w-36">
            <option value="tous">Tous états</option>
            <option value="actifs">Actifs</option>
            <option value="expires">Expirés</option>
          </Select>
          <Select name="statut" defaultValue={statut} aria-label="Filtrer par statut pénal" className="w-48">
            <option value="tous">Tous statuts pénaux</option>
            {TYPES_STATUT_PENAL.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </FilterBar>

        <DataTable<MandatDetaille>
          legende="Liste des mandats"
          lignes={visibles}
          cleLigne={(m) => m.id}
          lienLigne={(m) => `/detenus/${m.detenuId}?onglet=mandats`}
          libelleLien={(m) => `Mandat ${m.referenceMandat ?? ""} de ${m.detenuNom}`}
          colonnes={[
            {
              cle: "detenu",
              titre: "Détenu",
              rendu: (m) => (
                <div className="min-w-0">
                  <p className="max-w-[24ch] truncate font-medium">{m.detenuNom}</p>
                  <Ecrou className="text-xs text-muted">{m.numeroEcrou}</Ecrou>
                </div>
              ),
            },
            { cle: "type", titre: "Type de mandat", masquerSous: "lg", rendu: (m) => <span className="text-muted">{tronquer(m.typeMandat, 30)}</span> },
            { cle: "statut", titre: "Statut pénal", rendu: (m) => <Badge ton="neutre" point={false}>{m.typeStatutPenal ?? "—"}</Badge> },
            { cle: "ref", titre: "Référence", masquerSous: "xl", rendu: (m) => <Ecrou className="text-xs text-muted">{m.referenceMandat}</Ecrou> },
            { cle: "motif", titre: "Motif", masquerSous: "lg", rendu: (m) => <span className="text-muted">{tronquer(m.motifDetention, 28)}</span> },
            { cle: "incarceration", titre: "Incarcération", masquerSous: "md", rendu: (m) => formatDate(m.dateIncarceration) },
            {
              cle: "expiration",
              titre: "Expiration",
              align: "droite",
              rendu: (m) => (
                <span className="inline-flex items-center gap-2">
                  {formatDate(m.dateSortieMandat)}
                  <Badge ton={m.actif ? "succes" : "danger"} className="hidden sm:inline-flex">
                    {m.actif ? "Actif" : "Expiré"}
                  </Badge>
                </span>
              ),
            },
            {
              cle: "actions",
              titre: "",
              align: "droite",
              rendu: (m) => (
                <ButtonLink
                  href={`/detenus/${m.detenuId}/mandats/${m.id}`}
                  taille="sm"
                  icone="edit"
                  title="Faire évoluer ce mandat"
                  aria-label="Faire évoluer ce mandat"
                  className="w-8 rounded-full border-0 bg-accent-soft px-0 text-accent shadow-none hover:bg-accent/20"
                />
              ),
            },
          ]}
          vide={
            <EmptyState
              icone="search"
              titre={t.etats.aucunResultatTitre}
              texte={t.etats.aucunResultatTexte}
              action={<ButtonLink href={CHEMIN} taille="sm" icone="close">{t.actions.effacerFiltres}</ButtonLink>}
            />
          }
        />

        {resultat.total > resultat.parPage && (
          <Pagination
            page={resultat.page}
            parPage={resultat.parPage}
            total={resultat.total}
            href={(p) => hrefAvec(CHEMIN, sp, { page: p === 1 ? null : p })}
            parPageOptions={PAR_PAGE_OPTIONS}
          />
        )}
      </Panel>
    </Page>
  );
}
