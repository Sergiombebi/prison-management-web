import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { ACCUEIL } from "@/lib/acces";
import { getProfil, peut } from "@/lib/session";
import type { CategoriePenale } from "@/lib/domain/types";
import {
  CATEGORIE_SLUG,
  LIBELLE_CATEGORIE,
  LIBELLE_TYPE_SORTIE,
  REGLE_CATEGORIE,
} from "@/lib/domain/referentiels";
import {
  formatDate,
  formatDateHeure,
  formatDateLongue,
  formatNombre,
  formatPourcent,
  joursRestants,
  pluriel,
} from "@/lib/format";
import { Page, PageHeader } from "@/components/layout/page";
import { Salutation } from "@/components/layout/salutation";
import { Stat, StatGrid } from "@/components/data/stat";
import { AreaChart, BarChart, BubbleChart } from "@/components/data/charts";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.modules.tableauDeBord };
}

const ORDRE_CATEGORIES: CategoriePenale[] = [
  "Prevenu",
  "Condamne",
  "Appellant",
  "Cassationnaire",
  "Dpac",
];

export default async function TableauDeBordPage() {
  const [profil, t, locale] = await Promise.all([getProfil(), getT(), getLocale()]);
  // Garde-fou : le proxy filtre déjà, mais cet écran reste la cible historique de
  // plusieurs liens. Sans droit, l'appel ci-dessous renverrait un 403 et l'écran
  // d'erreur générique — l'accueil condensé dit bien mieux ce qui est ouvert.
  if (profil && !peut(profil.permissions, "tableau_bord.consulter")) redirect(ACCUEIL);

  const tb = await api.getTableauDeBord();
  const ct = t.ecranTableauDeBord;

  const ecart = tb.effectif - tb.effectifMoisPrecedent;
  const evolution = tb.effectifMoisPrecedent > 0 ? (ecart / tb.effectifMoisPrecedent) * 100 : 0;
  const placesLibres = tb.capaciteTotale - tb.effectif;
  const totalCategories = ORDRE_CATEGORIES.reduce((s, c) => s + tb.effectifsParCategorie[c], 0);
  /*
   * Population des six derniers mois. L'API la reconstitue depuis l'effectif actuel,
   * faute de table d'historique : quand les dossiers sont tous récents, elle ne
   * contient que des zéros. Mieux vaut ne rien tracer que tracer une courbe fausse.
   */
  const points = tb.populationDerniersMois.map((p) => p.population);
  const courbe = points.some((v) => v > 0) ? points : undefined;

  const mouvements = [
    { label: ct.incarcerations, valeur: tb.mouvements.incarcerations, href: "/detenus/mandats" },
    { label: LIBELLE_TYPE_SORTIE.LiberationNormale, valeur: tb.mouvements.liberations, href: "/detenus/liberation/normale" },
    { label: LIBELLE_TYPE_SORTIE.Transfert, valeur: tb.mouvements.transferements, href: "/detenus/liberation/transfert" },
    { label: LIBELLE_TYPE_SORTIE.Evasion, valeur: tb.mouvements.evasions, href: "/detenus/liberation/evasion", accent: tb.mouvements.evasions > 0 },
    { label: LIBELLE_TYPE_SORTIE.Deces, valeur: tb.mouvements.deces, href: "/detenus/liberation/deces", accent: tb.mouvements.deces > 0 },
  ];

  // « Y a-t-il quelque chose à traiter maintenant ? » — la question de cet écran.
  const pointsAttention = [
    tb.mandatsExpires > 0 && {
      ton: "critique" as const,
      texte: `${pluriel(tb.mandatsExpires, ct.mandatExpireSingulier, ct.mandatsExpiresPluriel, locale)} : ${ct.titreARegulariser}`,
      href: "/etats/mandats-expires",
    },
    tb.tauxOccupation > 100 && {
      ton: "critique" as const,
      texte: `${ct.surpopulation} : ${formatPourcent(tb.tauxOccupation, 1, locale)} ${ct.deLaCapaciteAccueil}`,
      href: "/discipline/cellules",
    },
    tb.mouvements.evasions > 0 && {
      ton: "critique" as const,
      texte: `${pluriel(tb.mouvements.evasions, ct.evasion, undefined, locale)} ${ct.enregistreesSur30j}`,
      href: "/detenus/liberation/evasion",
    },
    tb.liberablesCeMois.length > 0 && {
      ton: "attention" as const,
      texte: `${pluriel(tb.liberablesCeMois.length, ct.detenuLiberableSingulier, ct.detenusLiberablesPluriel, locale)} ${ct.dIciFinMois}`,
      href: "#liberables",
    },
    tb.traitementsARenouveler > 0 && {
      ton: "attention" as const,
      texte: `${pluriel(tb.traitementsARenouveler, ct.traitementARenouvelerSingulier, ct.traitementsARenouvelerPluriel, locale)} ${ct.dIci3Jours}`,
      href: "/sante/traitements",
    },
  ].filter(Boolean) as Array<{ ton: "critique" | "attention"; texte: string; href: string }>;

  return (
    <Page>
      <PageHeader
        surtitre={formatDateLongue(new Date(), locale)}
        titre={<Salutation prenom={profil?.prenom} />}
        description={ct.description}
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={12} />
            {ct.donneesArreteesLe} {formatDateHeure(tb.genereLe, locale)}
          </span>
        }
        actions={
          <ButtonLink
            href="/detenus/nouveau"
            variante="primaire"
            icone="plus"
            transitionTypes={["nav-forward"]}
          >
            {ct.nouvelEnregistrement}
          </ButtonLink>
        }
      />

      {/* Points d'attention */}
      <section aria-labelledby="attention-titre">
        <h2 id="attention-titre" className="sr-only">
          {ct.pointsAttentionTitre}
        </h2>
        {pointsAttention.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-muted shadow-e1 animate-rise">
            <Icon name="check" size={16} className="text-success" />
            {ct.aucunPointBloquant}
          </div>
        ) : (
          <ul className="stagger grid gap-3 md:grid-cols-2">
            {pointsAttention.map((p, i) => (
              <li key={p.texte} style={{ ["--i" as string]: i }}>
                <Link
                  href={p.href}
                  className={cn(
                    "lift group flex h-full items-center gap-3 rounded-lg border bg-surface px-4 py-3.5 shadow-e1",
                    p.ton === "critique"
                      ? "border-danger/25 hover:border-danger/50"
                      : "border-warning/25 hover:border-warning/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg",
                      p.ton === "critique"
                        ? "bg-danger-soft text-danger"
                        : "bg-warning-soft text-warning",
                    )}
                  >
                    <Icon name={p.ton === "critique" ? "alert" : "calendar"} size={16} />
                  </span>
                  <span className="text-sm text-ink">{p.texte}</span>
                  <Icon
                    name="arrowRight"
                    size={14}
                    className="ml-auto shrink-0 text-faint transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Indicateurs clés — six cartes, chacune avec sa tendance */}
      <StatGrid colonnes={6}>
        <Stat
          style={{ ["--i" as string]: 0 }}
          icone="detenus"
          label={ct.populationDetenue}
          nombre={tb.effectif}
          delta={evolution}
          deltaLibelle={ct.vsMoisDernier}
          sparkline={courbe}
          href="/detenus"
          locale={locale}
        />
        <Stat
          style={{ ["--i" as string]: 1 }}
          icone="cell"
          label={ct.tauxOccupation}
          nombre={tb.tauxOccupation}
          decimales={1}
          unite="%"
          signal={tb.tauxOccupation > 100 ? "critique" : tb.tauxOccupation >= 90 ? "attention" : "neutre"}
          contexte={
            placesLibres >= 0
              ? `${pluriel(placesLibres, ct.placeLibreSingulier, ct.placesLibresPluriel, locale)} ${t.tableau.surTotal} ${formatNombre(tb.capaciteTotale, locale)}`
              : `${formatNombre(-placesLibres, locale)} ${ct.auDelaCapacite}`
          }
          href="/discipline/cellules"
          locale={locale}
        />
        <Stat
          style={{ ["--i" as string]: 2 }}
          icone="file"
          label={ct.mandatsExpiresLabel}
          nombre={tb.mandatsExpires}
          signal={tb.mandatsExpires > 0 ? "critique" : "positif"}
          contexte={tb.mandatsExpires > 0 ? ct.aRegulariserSansDelai : ct.aucunTitreEchu}
          href="/etats/mandats-expires"
        />
        <Stat
          style={{ ["--i" as string]: 3 }}
          icone="user"
          label={ct.visitesDuJour}
          nombre={tb.visitesAujourdhui}
          contexte={ct.parloirsEnregistres}
          href="/sante/visites?periode=aujourdhui"
        />
        <Stat
          style={{ ["--i" as string]: 4 }}
          icone="scale"
          label={ct.sanctionsEnCours}
          nombre={tb.sanctionsEnCours}
          signal={tb.sanctionsEnCours > 0 ? "attention" : "positif"}
          contexte={tb.sanctionsEnCours > 0 ? ct.mesuresDisciplinairesActives : ct.aucuneSanctionActive}
          href="/discipline/sanctions?statut=en-cours"
        />
        <Stat
          style={{ ["--i" as string]: 5 }}
          icone="clock"
          label={ct.traitementsARenouvelerLabel}
          nombre={tb.traitementsARenouveler}
          signal={tb.traitementsARenouveler > 0 ? "attention" : "positif"}
          contexte={tb.traitementsARenouveler > 0 ? ct.echeanceSous3Jours : ct.aucuneEcheanceProche}
          href="/sante/traitements"
        />
      </StatGrid>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          titre={ct.evolutionPopulation}
          sousTitre={ct.effectifFinMois}
          variante="eleve"
          accent
          className="reveal"
        >
          <AreaChart
            legende={ct.evolutionPopulationLegende}
            points={tb.populationDerniersMois.map((p) => ({ label: p.label, valeur: p.population }))}
          />
        </Panel>

        <Panel
          titre={ct.repartitionCategorie}
          sousTitre={ct.calculeeSurMandats}
          variante="eleve"
          className="reveal"
        >
          <BubbleChart
            legende={ct.repartitionCategorieLegende}
            items={ORDRE_CATEGORIES.map((c) => ({
              label: LIBELLE_CATEGORIE[c],
              valeur: tb.effectifsParCategorie[c],
              aide: REGLE_CATEGORIE[c],
              href: `/detenus/mandats/${CATEGORIE_SLUG[c]}`,
            }))}
          />
          {tb.effectif - totalCategories > 0 && (
            <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted">
              {pluriel(tb.effectif - totalCategories, ct.detenuSingulier, ct.detenusPluriel, locale)} {ct.sansMandatActif}
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Panel
          titre={ct.mouvementsTitre}
          sousTitre={ct.derniers30Jours}
          variante="eleve"
          className="reveal"
        >
          <BarChart legende={ct.mouvementsLegende} items={mouvements} />
        </Panel>

        <div id="liberables" className="scroll-mt-20">
          <Panel
            titre={ct.liberablesCeMois}
            sousTitre={ct.dateSortieAvantFinMois}
            flush
            variante="eleve"
            className="reveal"
          >
            {tb.liberablesCeMois.length === 0 ? (
              <EmptyState
                compact
                icone="calendar"
                titre={ct.aucunDetenuLiberable}
                texte={ct.aucunMandatDateConnue}
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {tb.liberablesCeMois.slice(0, 7).map((l) => {
                  const jours = joursRestants(l.dateSortie) ?? 0;
                  return (
                    <li key={`${l.numeroEcrou}-${l.dateSortie}`}>
                      <Link
                        href={`/detenus?recherche=${encodeURIComponent(l.numeroEcrou)}`}
                        className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-raised"
                      >
                        <div
                          className={cn(
                            "grid w-14 shrink-0 place-items-center rounded-lg py-1.5",
                            jours <= 7 ? "bg-warning-soft" : "bg-accent-soft",
                          )}
                        >
                          <span
                            className={cn(
                              "tnum text-lg font-semibold leading-none",
                              jours <= 7 ? "text-warning" : "text-accent-ink",
                            )}
                          >
                            {jours}
                          </span>
                          <span className="mt-0.5 text-2xs text-muted">
                            {jours > 1 ? ct.jours : ct.jour}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{l.nom}</p>
                          <p className="text-xs text-muted">
                            <Ecrou className="text-xs text-muted">{l.numeroEcrou}</Ecrou> ·{" "}
                            {l.statut || ct.statutNonRenseigne}
                          </p>
                        </div>
                        <p className="tnum hidden shrink-0 text-xs text-muted sm:block">
                          {ct.sortie} {formatDate(l.dateSortie, locale)}
                        </p>
                        <Icon
                          name="arrowRight"
                          size={14}
                          className="shrink-0 text-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
