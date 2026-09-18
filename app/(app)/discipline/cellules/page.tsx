import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Cellule } from "@/lib/domain/types";
import { TYPES_CELLULE } from "@/lib/domain/referentiels";
import { formatNombre, ouVide, pluriel } from "@/lib/format";
import { filtresActifs, hrefAvec, param } from "@/lib/url";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { FilterBar } from "@/components/data/filter-bar";
import { JaugeRadiale } from "@/components/data/charts";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SearchInput, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Panel } from "@/components/ui/surface";
import { FormulaireCellule } from "@/components/discipline/formulaires";
import { modifierCellule } from "../actions";

export const metadata: Metadata = { title: "Logement & cellules" };

const CHEMIN = "/discipline/cellules";

function etatCellule(c: Cellule) {
  if (c.effectifReel > c.capaciteMax) return { label: "Surpeuplée", ton: "danger" as const };
  if (c.effectifReel === c.capaciteMax) return { label: "Pleine", ton: "alerte" as const };
  if (c.effectifReel >= c.capaciteMax * 0.8) return { label: "Presque pleine", ton: "alerte" as const };
  return { label: "Disponible", ton: "succes" as const };
}

export default async function CellulesPage(props: PageProps<"/discipline/cellules">) {
  const sp = await props.searchParams;
  const cellules = await api.listCellules();
  const selectionnee = cellules.find((c) => String(c.id) === param(sp, "modifier"));
  // La liste ne porte pas les occupants : ils viennent de la fiche de la cellule
  const celluleModifiee = selectionnee ? ((await api.getCellule(selectionnee.id)) ?? selectionnee) : undefined;

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const bloc = param(sp, "bloc") ?? "tous";
  const etat = param(sp, "etat") ?? "tous";
  const blocs = [...new Set(cellules.map((c) => c.bloc).filter(Boolean))] as string[];
  // Les types réellement utilisés en base ; le référentiel ne sert qu'à amorcer une base vide
  const typesExistants = [...new Set(cellules.map((c) => c.typeCellule).filter(Boolean))] as string[];
  const types = typesExistants.length > 0 ? typesExistants : [...TYPES_CELLULE];

  const filtrees = cellules.filter((c) => {
    const e = etatCellule(c).label;
    return (
      (bloc === "tous" || c.bloc === bloc) &&
      (etat === "tous" || (etat === "disponibles" ? e === "Disponible" : e !== "Disponible")) &&
      (!recherche || c.numero.toLowerCase().includes(recherche))
    );
  });

  const capacite = cellules.reduce((s, c) => s + c.capaciteMax, 0);
  const effectif = cellules.reduce((s, c) => s + c.effectifReel, 0);
  const saturees = cellules.filter((c) => c.effectifReel >= c.capaciteMax).length;

  // Regroupement par quartier : c'est ainsi que les agents pensent le bâtiment
  const parQuartier = filtrees.reduce<Record<string, Cellule[]>>((acc, c) => {
    const cle = c.bloc ?? "Sans quartier";
    (acc[cle] ??= []).push(c);
    return acc;
  }, {});

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.discipline}
        titre="Logement & cellules"
        description="Capacité d’accueil par cellule et taux d’occupation réel, calculé à partir des affectations en cours."
        actions={
          <ButtonLink
            href="/discipline/affectations"
            variante="primaire"
            icone="arrowRight"
            transitionTypes={["nav-forward"]}
          >
            Affecter un détenu
          </ButtonLink>
        }
      />

      <StatGrid colonnes={4}>
        <Stat
          style={{ ["--i" as string]: 0 }}
          icone="cell"
          label="Cellules"
          nombre={cellules.length}
          contexte={pluriel(blocs.length, "quartier")}
        />
        <Stat
          style={{ ["--i" as string]: 1 }}
          icone="door"
          label="Capacité totale"
          nombre={capacite}
          contexte={`${formatNombre(Math.max(capacite - effectif, 0))} places disponibles`}
        />
        <Stat
          style={{ ["--i" as string]: 2 }}
          icone="detenus"
          label="Occupation moyenne"
          nombre={capacite ? Math.round((effectif / capacite) * 1000) / 10 : 0}
          decimales={1}
          unite="%"
          signal={effectif > capacite ? "critique" : effectif / (capacite || 1) >= 0.9 ? "attention" : "neutre"}
          contexte={`${formatNombre(effectif)} détenus logés`}
        />
        <Stat
          style={{ ["--i" as string]: 3 }}
          icone="alert"
          label="Cellules pleines"
          nombre={saturees}
          signal={saturees > 0 ? "attention" : "positif"}
          contexte={saturees > 0 ? "Aucune nouvelle affectation possible" : "Toutes ont de la place"}
        />
      </StatGrid>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Panel flush variante="eleve">
            <FilterBar
              action={CHEMIN}
              actif={filtresActifs(sp, ["recherche", "bloc", "etat"])}
              reinitialiserHref={CHEMIN}
              resultat={pluriel(filtrees.length, "cellule")}
              className="border-b-0"
            >
              <SearchInput
                name="recherche"
                defaultValue={param(sp, "recherche")}
                placeholder="Numéro de cellule…"
                aria-label="Rechercher une cellule"
                className="w-full sm:w-56"
              />
              <Select name="bloc" defaultValue={bloc} aria-label="Filtrer par quartier" className="w-44">
                <option value="tous">Tous quartiers</option>
                {blocs.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
              <Select name="etat" defaultValue={etat} aria-label="Filtrer par disponibilité" className="w-40">
                <option value="tous">Tous états</option>
                <option value="disponibles">Disponibles</option>
                <option value="pleines">Pleines ou presque</option>
              </Select>
            </FilterBar>
          </Panel>

          {filtrees.length === 0 ? (
            <Panel variante="eleve">
              <EmptyState icone="cell" titre={t.etats.aucunResultatTitre} texte={t.etats.aucunResultatTexte} />
            </Panel>
          ) : (
            Object.entries(parQuartier).map(([quartier, liste]) => (
              <section key={quartier} aria-labelledby={`q-${quartier}`}>
                <div className="mb-2.5 flex items-baseline gap-3">
                  <h2 id={`q-${quartier}`} className="text-sm font-semibold text-ink">
                    {quartier}
                  </h2>
                  <span className="h-px flex-1 bg-hairline" />
                  <span className="tnum text-xs text-muted">{pluriel(liste.length, "cellule")}</span>
                </div>

                <ul className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {liste.map((c, i) => {
                    const e = etatCellule(c);
                    const enModification = celluleModifiee?.id === c.id;
                    return (
                      // Deux liens distincts, jamais imbriqués : la carte entière mène à
                      // l'affectation, le bouton « Modifier » est posé par-dessus.
                      <li key={c.id} style={{ ["--i" as string]: Math.min(i, 12) }} className="relative">
                        <Link
                          href={`/discipline/affectations?cellule=${c.id}`}
                          transitionTypes={["nav-forward"]}
                          aria-label={`Affecter un détenu en ${c.bloc ? `${c.bloc} · ` : ""}${c.numero}`}
                          className={cn(
                            "lift flex h-full items-center gap-4 rounded-lg border bg-surface p-4 pr-20 shadow-e1",
                            enModification
                              ? "border-accent ring-2 ring-accent/20"
                              : e.ton === "danger"
                                ? "border-danger/25"
                                : e.ton === "alerte"
                                  ? "border-warning/25"
                                  : "border-hairline hover:border-accent/30",
                          )}
                        >
                          <JaugeRadiale valeur={c.effectifReel} max={c.capaciteMax} />
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-lg font-semibold tracking-tight text-ink">
                              {c.numero}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {ouVide(c.typeCellule)}
                            </p>
                            <div className="mt-2.5">
                              <Badge ton={e.ton}>{e.label}</Badge>
                            </div>
                          </div>
                        </Link>
                        <Link
                          href={`/discipline/cellules/${c.id}`}
                          transitionTypes={["nav-forward"]}
                          aria-label={`Voir les détenus de la cellule ${c.bloc ? `${c.bloc} · ` : ""}${c.numero}`}
                          className="absolute right-11 top-2.5 grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink focus-visible:bg-sunken focus-visible:text-ink"
                        >
                          <Icon name="eye" size={14} />
                        </Link>
                        <Link
                          // L'ancre ramène au formulaire quand il est sous la grille (écrans étroits)
                          href={`${hrefAvec(CHEMIN, sp, { modifier: String(c.id) })}#edition-cellule`}
                          aria-label={`Modifier la cellule ${c.bloc ? `${c.bloc} · ` : ""}${c.numero}`}
                          aria-current={enModification ? "true" : undefined}
                          className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink focus-visible:bg-sunken focus-visible:text-ink"
                        >
                          <Icon name="edit" size={14} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <div id="edition-cellule" className="scroll-mt-24 xl:sticky xl:top-20">
        {celluleModifiee ? (
          <Panel
            titre={`Modifier la cellule ${celluleModifiee.bloc ? `${celluleModifiee.bloc} · ` : ""}${celluleModifiee.numero}`}
            sousTitre={`${pluriel(celluleModifiee.effectifReel, "occupant")} actuellement`}
            variante="eleve"
            accent
          >
            <FormulaireCellule
              key={celluleModifiee.id}
              quartiers={blocs}
              types={types}
              cellule={celluleModifiee}
              action={modifierCellule.bind(null, celluleModifiee.id)}
            />

            {celluleModifiee.effectifReel > 0 && (
              <div className="mt-5 border-t border-hairline pt-4">
                <Link
                  href={`/discipline/cellules/${celluleModifiee.id}`}
                  transitionTypes={["nav-forward"]}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-accent transition-colors hover:bg-sunken"
                >
                  <span>Voir les {pluriel(celluleModifiee.effectifReel, "détenu")} de cette cellule</span>
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            )}
          </Panel>
        ) : (
          <Panel titre="Nouvelle cellule" variante="eleve">
            <FormulaireCellule key="creation" quartiers={blocs} types={types} />
          </Panel>
        )}
        </div>
      </div>
    </Page>
  );
}
