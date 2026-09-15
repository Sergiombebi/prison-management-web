import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { getProfil } from "@/lib/session";
import type { CategoriePenale } from "@/lib/domain/types";
import {
  CATEGORIE_SLUG,
  LIBELLE_CATEGORIE,
  REGLE_CATEGORIE,
} from "@/lib/domain/referentiels";
import {
  formatDate,
  formatDateHeure,
  formatDateLongue,
  formatEcart,
  formatNombre,
  formatPourcent,
  joursRestants,
  pluriel,
} from "@/lib/format";
import { Page, PageHeader } from "@/components/layout/page";
import { Stat, StatGrid } from "@/components/data/stat";
import { AreaChart, BarList } from "@/components/data/charts";
import { EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Tableau de bord" };

const ORDRE_CATEGORIES: CategoriePenale[] = [
  "Prevenu",
  "Condamne",
  "Appellant",
  "Cassationnaire",
  "Dpac",
];

export default async function TableauDeBordPage() {
  const [tb, profil] = await Promise.all([api.getTableauDeBord(), getProfil()]);

  const ecart = tb.effectif - tb.effectifMoisPrecedent;
  const placesLibres = tb.capaciteTotale - tb.effectif;
  const totalCategories = ORDRE_CATEGORIES.reduce(
    (s, c) => s + tb.effectifsParCategorie[c],
    0,
  );

  // « Y a-t-il quelque chose à traiter maintenant ? » — la question de cet écran.
  const pointsAttention = [
    tb.mandatsExpires > 0 && {
      ton: "critique" as const,
      texte: `${pluriel(tb.mandatsExpires, "mandat expiré", "mandats expirés")} : titre de détention à régulariser`,
      href: "/etats/mandats-expires",
    },
    tb.tauxOccupation > 100 && {
      ton: "critique" as const,
      texte: `Surpopulation : ${formatPourcent(tb.tauxOccupation)} de la capacité d’accueil`,
      href: "/discipline/cellules",
    },
    tb.mouvements.evasions > 0 && {
      ton: "critique" as const,
      texte: `${pluriel(tb.mouvements.evasions, "évasion")} enregistrée(s) sur les 30 derniers jours`,
      href: "/detenus/liberation/evasion",
    },
    tb.liberablesCeMois.length > 0 && {
      ton: "attention" as const,
      texte: `${pluriel(tb.liberablesCeMois.length, "détenu libérable", "détenus libérables")} d’ici la fin du mois`,
      href: "#liberables",
    },
  ].filter(Boolean) as Array<{ ton: "critique" | "attention"; texte: string; href: string }>;

  return (
    <Page>
      <PageHeader
        surtitre={formatDateLongue(new Date())}
        titre={`Bonjour${profil ? `, ${profil.prenom}` : ""}`}
        description="Situation de l’établissement et points qui demandent une action aujourd’hui."
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={12} />
            Données arrêtées le {formatDateHeure(tb.genereLe)}
          </span>
        }
        actions={
          <ButtonLink href="/detenus/nouveau" variante="primaire" icone="plus" transitionTypes={["nav-forward"]}>
            Nouvel enregistrement
          </ButtonLink>
        }
      />

      {/* Points d'attention */}
      <section aria-labelledby="attention-titre">
        <h2 id="attention-titre" className="sr-only">
          Points d’attention
        </h2>
        {pointsAttention.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-muted animate-rise">
            <Icon name="check" size={16} className="text-success" />
            Aucun point bloquant : pas de mandat expiré, pas de surpopulation, pas d’incident signalé.
          </div>
        ) : (
          <ul className="stagger grid gap-2 md:grid-cols-2">
            {pointsAttention.map((p, i) => (
              <li key={p.texte} style={{ ["--i" as string]: i }}>
                <Link
                  href={p.href}
                  className={cn(
                    "group flex h-full items-center gap-3 rounded-lg border bg-surface px-4 py-3 transition-colors",
                    p.ton === "critique"
                      ? "border-danger/25 hover:border-danger/50"
                      : "border-warning/25 hover:border-warning/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full",
                      p.ton === "critique" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
                    )}
                  >
                    <Icon name={p.ton === "critique" ? "alert" : "calendar"} size={14} />
                  </span>
                  <span className="text-sm text-ink">{p.texte}</span>
                  <Icon
                    name="arrowRight"
                    size={14}
                    className="ml-auto shrink-0 text-faint transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StatGrid>
        <Stat
          style={{ ["--i" as string]: 0 }}
          label="Population détenue"
          valeur={formatNombre(tb.effectif)}
          contexte={`${formatEcart(ecart)} depuis le mois dernier`}
          href="/detenus"
        />
        <Stat
          style={{ ["--i" as string]: 1 }}
          label="Taux d’occupation"
          valeur={formatNombre(tb.tauxOccupation)}
          unite="%"
          signal={tb.tauxOccupation > 100 ? "critique" : tb.tauxOccupation >= 90 ? "attention" : "neutre"}
          contexte={
            placesLibres >= 0
              ? `${pluriel(placesLibres, "place libre", "places libres")} sur ${formatNombre(tb.capaciteTotale)}`
              : `${formatNombre(-placesLibres)} au-delà de la capacité`
          }
          href="/discipline/cellules"
        />
        <Stat
          style={{ ["--i" as string]: 2 }}
          label="Mandats expirés"
          valeur={formatNombre(tb.mandatsExpires)}
          signal={tb.mandatsExpires > 0 ? "critique" : "positif"}
          contexte={tb.mandatsExpires > 0 ? "À régulariser sans délai" : "Aucun titre échu"}
          href="/etats/mandats-expires"
        />
        <Stat
          style={{ ["--i" as string]: 3 }}
          label="Sorties prévues"
          valeur={formatNombre(tb.sortiesPrevuesMoisProchain)}
          contexte="Mandats échus le mois prochain"
          href="/detenus/liberation/normale"
        />
        <Stat
          style={{ ["--i" as string]: 4 }}
          label="Visites du jour"
          valeur={formatNombre(tb.visitesAujourdhui)}
          contexte="Parloirs enregistrés aujourd’hui"
          href="/sante/visites?periode=aujourdhui"
        />
        <Stat
          style={{ ["--i" as string]: 5 }}
          label="Sanctions en cours"
          valeur={formatNombre(tb.sanctionsEnCours)}
          signal={tb.sanctionsEnCours > 5 ? "attention" : "neutre"}
          contexte="Mesures disciplinaires actives"
          href="/discipline/sanctions?statut=en-cours"
        />
      </StatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Panel
          titre="Évolution de la population"
          sousTitre="Effectif en fin de mois, six derniers mois"
          className="animate-rise"
          style={{ animationDelay: "120ms" }}
        >
          <AreaChart
            legende="Évolution de la population détenue sur six mois"
            points={tb.populationDerniersMois.map((p) => ({ label: p.label, valeur: p.population }))}
          />
        </Panel>

        <Panel
          titre="Répartition par catégorie pénale"
          sousTitre="Calculée sur les mandats actifs, par détenu"
          className="animate-rise"
          style={{ animationDelay: "180ms" }}
        >
          <BarList
            total={totalCategories}
            items={ORDRE_CATEGORIES.map((c) => ({
              label: LIBELLE_CATEGORIE[c],
              valeur: tb.effectifsParCategorie[c],
              aide: REGLE_CATEGORIE[c],
              href: `/detenus/mandats/${CATEGORIE_SLUG[c]}`,
              accent: c === "Dpac",
            }))}
          />
          {tb.effectif - totalCategories > 0 && (
            <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted">
              {pluriel(tb.effectif - totalCategories, "détenu")} sans mandat actif — situation à vérifier.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
        <Panel
          titre="Mouvements"
          sousTitre="30 derniers jours"
          className="animate-rise"
          style={{ animationDelay: "220ms" }}
        >
          <dl className="divide-y divide-hairline">
            {[
              { label: "Incarcérations", valeur: tb.mouvements.incarcerations, href: "/detenus/mandats", grave: false },
              { label: "Libérations", valeur: tb.mouvements.liberations, href: "/detenus/liberation/normale", grave: false },
              { label: "Transfèrements", valeur: tb.mouvements.transferements, href: "/detenus/liberation/transfert", grave: false },
              { label: "Évasions", valeur: tb.mouvements.evasions, href: "/detenus/liberation/evasion", grave: true },
              { label: "Décès", valeur: tb.mouvements.deces, href: "/detenus/liberation/deces", grave: true },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <dt>
                  <Link href={m.href} className="text-sm text-muted transition-colors hover:text-ink">
                    {m.label}
                  </Link>
                </dt>
                <dd
                  className={cn(
                    "tnum text-md font-semibold",
                    m.grave && m.valeur > 0 ? "text-danger" : "text-ink",
                  )}
                >
                  {formatNombre(m.valeur)}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        <div id="liberables" className="scroll-mt-20">
          <Panel
            titre="Libérables ce mois"
            sousTitre="Mandats arrivant à échéance d’ici la fin du mois"
            flush
            className="animate-rise"
            style={{ animationDelay: "260ms" }}
          >
            {tb.liberablesCeMois.length === 0 ? (
              <EmptyState
                compact
                icone="calendar"
                titre="Aucun détenu libérable ce mois-ci"
                texte="Aucun mandat actif n’arrive à échéance avant la fin du mois."
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {tb.liberablesCeMois.slice(0, 7).map((l) => {
                  const jours = joursRestants(l.dateExpiration) ?? 0;
                  return (
                    <li key={`${l.numeroEcrou}-${l.dateExpiration}`}>
                      <Link
                        href={`/detenus?recherche=${encodeURIComponent(l.numeroEcrou)}`}
                        className="flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-raised"
                      >
                        <div className="w-14 shrink-0 text-center">
                          <p className={cn("tnum text-lg font-semibold leading-none", jours <= 7 ? "text-warning" : "text-ink")}>
                            {jours}
                          </p>
                          <p className="mt-0.5 text-2xs text-faint">{jours > 1 ? "jours" : "jour"}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{l.nom}</p>
                          <p className="text-xs text-muted">
                            <Ecrou className="text-xs text-muted">{l.numeroEcrou}</Ecrou> · {l.statut || "Statut non renseigné"}
                          </p>
                        </div>
                        <p className="tnum hidden shrink-0 text-xs text-muted sm:block">
                          échéance {formatDate(l.dateExpiration)}
                        </p>
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
