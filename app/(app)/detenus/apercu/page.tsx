import type { Metadata } from "next";
import { api } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import { moduleMetier } from "@/lib/domain/modules";
import type { CategoriePenale, DetenuResume } from "@/lib/domain/types";
import {
  CATEGORIE_SLUG,
  LIBELLE_CATEGORIE,
  LIBELLE_TYPE_SORTIE,
  REGLE_CATEGORIE,
} from "@/lib/domain/referentiels";
import { formatDate, formatNombre, joursRestants, pluriel } from "@/lib/format";
import { Page } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import {
  BandeauModule,
  Bloc,
  CadreModule,
  Chiffre,
  LigneAction,
  ListeActions,
  Raccourcis,
  RangeeChiffres,
  RienASignaler,
} from "@/components/modules/tableau-module";
import { BandeCategories } from "@/components/modules/visuels";

export const metadata: Metadata = { title: "Détenus · Vue d’ensemble" };

const MODULE = moduleMetier("detenus");

const ORDRE: CategoriePenale[] = ["Prevenu", "Condamne", "Appellant", "Cassationnaire", "Dpac"];

const COULEUR_CATEGORIE: Record<CategoriePenale, string> = {
  Prevenu: "var(--sgp-viz-2)",
  Condamne: "var(--sgp-viz-1)",
  Appellant: "var(--sgp-viz-3)",
  Cassationnaire: "var(--sgp-viz-4)",
  Dpac: "var(--sgp-viz-5)",
};

/** Échéance d'un titre de détention, pour la liste « à régulariser ». */
function echeance(d: DetenuResume) {
  const date = d.mandatCourant?.dateSortieMandat;
  return date ? { date, jours: joursRestants(date) ?? 0 } : null;
}

/**
 * Sous-tableau de bord du module « Gestion des détenus ».
 *
 * Répond à trois questions, dans cet ordre : qui est là, de quelle catégorie, et
 * quel titre de détention demande une régularisation aujourd'hui.
 */
export default async function ApercuDetenusPage() {
  const [tableauDeBord, sansCelluleTotal, registre, sorties] = await Promise.all([
    // Source des chiffres agrégés (effectif, par catégorie, mandats expirés) : calculés
    // et mis en cache côté API, exacts quelle que soit la taille de la population.
    api.getTableauDeBord(),
    // Un aggrégat de plus que le tableau de bord ne fournit pas encore : une requête
    // légère (meta.total), jamais toute la population sans cellule.
    api.listDetenus({ sansCellule: true, parPage: 1 }),
    // Échantillon borné (100, pas 1000) pour reconstituer la liste « à surveiller » :
    // l'API ne sait pas encore trier par échéance de mandat. Sert uniquement à ce
    // détail, plus aux chiffres ci-dessus - voir `listDetenus()` pour le plafond.
    api.listDetenus({ parPage: 100, tri: "nom" }),
    optionnel(() => api.listSorties(), []),
  ]);

  const detenus = registre.items;
  const effectif = tableauDeBord.effectif;
  const entrees = tableauDeBord.mouvements.incarcerations;
  const sansCellule = sansCelluleTotal.total;
  const expires = tableauDeBord.mandatsExpires;

  const maintenant = new Date();
  const ilYa30j = new Date(maintenant.getTime() - 30 * 86_400_000);
  const sortiesRecentes = sorties.filter((s) => new Date(s.dateSortie) >= ilYa30j);

  const parCategorie = ORDRE.map((c) => ({
    label: LIBELLE_CATEGORIE[c],
    valeur: tableauDeBord.effectifsParCategorie[c],
    couleur: COULEUR_CATEGORIE[c],
    href: `/detenus/mandats/${CATEGORIE_SLUG[c]}`,
    aide: REGLE_CATEGORIE[c],
  }));
  const classes = parCategorie.reduce((s, c) => s + c.valeur, 0);

  // Titres échus ou sur le point de l'être, le plus urgent d'abord - reconstitué à
  // partir de l'échantillon ci-dessus (100 détenus) : incomplet dès que la population
  // dépasse ce nombre, `echeances.length` en dessous le dit alors clairement.
  const echeances = detenus
    .map((d) => ({ detenu: d, e: echeance(d) }))
    .filter((x): x is { detenu: DetenuResume; e: { date: string; jours: number } } => x.e !== null)
    .filter((x) => x.e.jours <= 30)
    .sort((a, b) => a.e.jours - b.e.jours);
  const echantillonIncomplet = effectif > detenus.length;

  return (
    <Page>
      <CadreModule module={MODULE}>
        <BandeauModule
          module={MODULE}
          titre="Registre d’écrou"
          phrase={
            <>
              {pluriel(effectif, "détenu écroué", "détenus écroués")} aujourd’hui,{" "}
              {pluriel(entrees, "entrée", "entrées")} et {pluriel(sortiesRecentes.length, "sortie")} sur
              les trente derniers jours.
              {expires > 0 && (
                <>
                  {" "}
                  <strong className="font-medium text-danger">
                    {pluriel(expires, "titre de détention expiré", "titres de détention expirés")}
                  </strong>{" "}
                  à régulariser.
                </>
              )}
            </>
          }
          actions={
            <>
              <ButtonLink href="/detenus" icone="detenus">
                Ouvrir le registre
              </ButtonLink>
              <ButtonLink
                href="/detenus/nouveau"
                variante="primaire"
                icone="plus"
                transitionTypes={["nav-forward"]}
              >
                Nouvel enregistrement
              </ButtonLink>
            </>
          }
        >
          <RangeeChiffres>
            <Chiffre index={0} label="Population détenue" valeur={effectif} href="/detenus" part={1} />
            <Chiffre
              index={1}
              label="Entrées (30 j)"
              valeur={entrees}
              part={effectif > 0 ? entrees / effectif : 0}
              aide="Écrous prononcés sur le mois glissant"
              href="/detenus/mandats"
            />
            <Chiffre
              index={2}
              label="Sorties (30 j)"
              valeur={sortiesRecentes.length}
              part={effectif > 0 ? sortiesRecentes.length / effectif : 0}
              aide="Libérations, transferts, évasions et décès"
              href="/detenus/liberation/normale"
            />
            <Chiffre
              index={3}
              label="Sans cellule"
              valeur={sansCellule}
              part={effectif > 0 ? sansCellule / effectif : 0}
              ton={sansCellule > 0 ? "attention" : "positif"}
              aide={sansCellule > 0 ? "En attente d’affectation" : "Tout l’effectif est logé"}
            />
          </RangeeChiffres>
        </BandeauModule>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Bloc
            titre="Composition de la population"
            sousTitre="Catégorie pénale calculée sur les mandats actifs"
            icone="scale"
          >
            <BandeCategories segments={parCategorie} total={classes} />
            {effectif - classes > 0 && (
              <p className="mt-3 border-t border-hairline pt-3 text-xs text-muted">
                {pluriel(effectif - classes, "détenu")} sans mandat actif — situation à vérifier.
              </p>
            )}
          </Bloc>

          <Bloc
            titre="Titres de détention à surveiller"
            sousTitre="Échéance dépassée ou dans les trente jours"
            icone="file"
            flush
            actions={
              expires > 0 ? (
                <ButtonLink href="/etats/mandats-expires" taille="sm" icone="arrowRight">
                  Voir l’état
                </ButtonLink>
              ) : undefined
            }
          >
            {echeances.length === 0 ? (
              <RienASignaler texte="Aucun titre n’arrive à échéance dans les trente jours." />
            ) : (
              <ListeActions>
                {echeances.slice(0, 6).map((x, i) => (
                  <LigneAction
                    key={x.detenu.id}
                    index={i}
                    repere={x.e.jours < 0 ? Math.abs(x.e.jours) : x.e.jours}
                    uniteRepere={x.e.jours < 0 ? "j écoulés" : x.e.jours > 1 ? "jours" : "jour"}
                    ton={x.e.jours < 0 ? "critique" : x.e.jours <= 7 ? "attention" : "teinte"}
                    titre={x.detenu.nom}
                    detail={`${x.detenu.numeroEcrou} · échéance ${formatDate(x.e.date)}`}
                    href={`/detenus/${x.detenu.id}`}
                  />
                ))}
              </ListeActions>
            )}
            {echantillonIncomplet && (
              <p className="border-t border-hairline px-4 py-2.5 text-xs text-faint">
                Reconstitué sur les {formatNombre(detenus.length)} premiers détenus (par nom) sur{" "}
                {formatNombre(effectif)} — consultez l’état complet pour le compte exact.
              </p>
            )}
          </Bloc>
        </div>

        <Bloc
          titre="Derniers mouvements"
          sousTitre={`${formatNombre(sortiesRecentes.length)} sur trente jours`}
          icone="exit"
          flush
        >
          {sortiesRecentes.length === 0 ? (
            <RienASignaler texte="Aucune sortie enregistrée sur les trente derniers jours." />
          ) : (
            <ListeActions>
              {[...sortiesRecentes]
                .sort((a, b) => b.dateSortie.localeCompare(a.dateSortie))
                .slice(0, 5)
                .map((s, i) => (
                  <LigneAction
                    key={s.id}
                    index={i}
                    repere={formatDate(s.dateSortie).slice(0, 5)}
                    ton={s.typeSortie === "Evasion" || s.typeSortie === "Deces" ? "critique" : "teinte"}
                    titre={s.detenuNom}
                    detail={`${s.numeroEcrou} · ${LIBELLE_TYPE_SORTIE[s.typeSortie]}${s.destination ? ` → ${s.destination}` : ""}`}
                    href={`/detenus/${s.detenuId}?onglet=detention`}
                  />
                ))}
            </ListeActions>
          )}
        </Bloc>

        <Raccourcis
          liens={[
            { href: "/detenus", label: "Liste des détenus", aide: "Registre complet et recherche", icone: "detenus" },
            { href: "/detenus/nouveau", label: "Nouvel enregistrement", aide: "Écrouer un entrant", icone: "plus" },
            { href: "/detenus/mandats", label: "Mandats", aide: "Titres de détention par catégorie", icone: "file" },
            { href: "/detenus/liberation/normale", label: "Libération", aide: "Lever un écrou", icone: "exit" },
            { href: "/detenus/liberation/transfert", label: "Transfert", aide: "Vers un autre établissement", icone: "send" },
            { href: "/detenus/liberation/evasion", label: "Évasion", aide: "Constat et avis de recherche", icone: "alert" },
          ]}
        />
      </CadreModule>
    </Page>
  );
}
