import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Cellule } from "@/lib/domain/types";
import { TYPES_CELLULE } from "@/lib/domain/referentiels";
import { formatNombre, formatPourcent, ouVide, pluriel } from "@/lib/format";
import { filtresActifs, param } from "@/lib/url";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { Jauge } from "@/components/data/charts";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DemoSubmit } from "@/components/ui/client-actions";
import { Field, Input, SearchInput, Select } from "@/components/ui/field";
import { EmptyState, Panel } from "@/components/ui/surface";

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

  const recherche = (param(sp, "recherche") ?? "").toLowerCase();
  const bloc = param(sp, "bloc") ?? "tous";
  const etat = param(sp, "etat") ?? "tous";
  const blocs = [...new Set(cellules.map((c) => c.bloc).filter(Boolean))] as string[];

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

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.discipline}
        titre="Logement & cellules"
        description="Capacité d’accueil par cellule et taux d’occupation réel, calculé à partir des affectations en cours."
        actions={
          <ButtonLink href="/discipline/affectations" icone="arrowRight" transitionTypes={["nav-forward"]}>
            Affecter un détenu
          </ButtonLink>
        }
      />

      <StatGrid colonnes={4}>
        <Stat style={{ ["--i" as string]: 0 }} label="Cellules" valeur={formatNombre(cellules.length)} contexte={pluriel(blocs.length, "quartier")} />
        <Stat style={{ ["--i" as string]: 1 }} label="Capacité totale" valeur={formatNombre(capacite)} contexte={`${formatNombre(Math.max(capacite - effectif, 0))} places disponibles`} />
        <Stat
          style={{ ["--i" as string]: 2 }}
          label="Occupation moyenne"
          valeur={formatNombre(capacite ? Math.round((effectif / capacite) * 1000) / 10 : 0)}
          unite="%"
          signal={effectif > capacite ? "critique" : effectif / (capacite || 1) >= 0.9 ? "attention" : "neutre"}
          contexte={`${formatNombre(effectif)} détenus logés`}
        />
        <Stat
          style={{ ["--i" as string]: 3 }}
          label="Cellules pleines"
          valeur={formatNombre(saturees)}
          signal={saturees > 0 ? "attention" : "positif"}
          contexte={saturees > 0 ? "Aucune nouvelle affectation possible" : "Toutes ont de la place"}
        />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel flush className="overflow-hidden">
          <FilterBar action={CHEMIN} actif={filtresActifs(sp, ["recherche", "bloc", "etat"])} reinitialiserHref={CHEMIN} resultat={pluriel(filtrees.length, "cellule")}>
            <SearchInput name="recherche" defaultValue={param(sp, "recherche")} placeholder="Numéro de cellule…" aria-label="Rechercher une cellule" className="w-full sm:w-56" />
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

          <DataTable<Cellule>
            legende="Cellules de l’établissement"
            lignes={filtrees}
            cleLigne={(c) => c.id}
            colonnes={[
              { cle: "numero", titre: "Cellule", rendu: (c) => <span className="font-mono font-medium">{c.numero}</span> },
              { cle: "bloc", titre: "Quartier", rendu: (c) => ouVide(c.bloc) },
              { cle: "type", titre: "Type", masquerSous: "md", rendu: (c) => <span className="text-muted">{ouVide(c.typeCellule)}</span> },
              {
                cle: "effectif",
                titre: "Effectif",
                align: "droite",
                rendu: (c) => (
                  <span className={cn("tnum", c.effectifReel > c.capaciteMax && "font-semibold text-danger")}>
                    {c.effectifReel}
                    <span className="text-faint"> / {c.capaciteMax}</span>
                  </span>
                ),
              },
              { cle: "occupation", titre: "Occupation", masquerSous: "sm", rendu: (c) => <Jauge valeur={c.effectifReel} max={c.capaciteMax} /> },
              {
                cle: "etat",
                titre: "État",
                rendu: (c) => {
                  const e = etatCellule(c);
                  return <Badge ton={e.ton}>{e.label}</Badge>;
                },
              },
            ]}
            vide={<EmptyState icone="cell" titre={t.etats.aucunResultatTitre} texte={t.etats.aucunResultatTexte} />}
          />
        </Panel>

        <Panel titre="Nouvelle cellule" className="xl:sticky xl:top-20">
          <form className="flex flex-col gap-4">
            <Field label="Numéro de la cellule" requis aide="Unique au sein du quartier">
              {(p) => <Input {...p} name="numero" className="font-mono uppercase" placeholder="Ex. B-04" />}
            </Field>
            <Field label="Quartier" requis>
              {(p) => <Input {...p} name="bloc" list="quartiers" placeholder="Ex. Bloc B" />}
            </Field>
            <datalist id="quartiers">
              {blocs.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <Field label="Type de cellule">
              {(p) => (
                <Select {...p} name="typeCellule" defaultValue="Standard">
                  {TYPES_CELLULE.map((ty) => (
                    <option key={ty}>{ty}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Capacité maximale" requis aide="Nombre de places réglementaires">
              {(p) => <Input {...p} name="capaciteMax" type="number" min={1} max={200} inputMode="numeric" />}
            </Field>
            <div className="border-t border-hairline pt-4">
              <DemoSubmit icone="plus" endpoint="POST /cellules">Créer la cellule</DemoSubmit>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted">Taux cible : {formatPourcent(90, 0)} maximum par cellule.</p>
        </Panel>
      </div>
    </Page>
  );
}
