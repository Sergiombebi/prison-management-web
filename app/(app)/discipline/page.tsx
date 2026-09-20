import type { Metadata } from "next";
import { api } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import { moduleMetier } from "@/lib/domain/modules";
import { formatDate, formatNombre, formatPourcent, joursRestants, pluriel } from "@/lib/format";
import { Page } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import {
  BandeauModule,
  Barre,
  Bloc,
  CadreModule,
  Chiffre,
  LigneAction,
  ListeActions,
  ListeBarres,
  Raccourcis,
  RangeeChiffres,
  RienASignaler,
} from "@/components/modules/tableau-module";
import { PlanCellules } from "@/components/modules/visuels";

export const metadata: Metadata = { title: "Discipline · Vue d’ensemble" };

const MODULE = moduleMetier("discipline");

/**
 * Sous-tableau de bord du module « Discipline ».
 *
 * Le plan des cellules tient la moitié haute de l'écran : c'est la vue dont on a
 * besoin pour décider d'une affectation, et elle répond plus vite qu'un tableau à
 * « où reste-t-il de la place ? ».
 */
export default async function ApercuDisciplinePage() {
  const [cellules, sanctions, nonLoges, affectations] = await Promise.all([
    api.listCellules(),
    optionnel(() => api.listSanctions(), []),
    optionnel(() => api.listDetenusNonLoges(), []),
    optionnel(() => api.listAffectations(), []),
  ]);

  const capacite = cellules.reduce((s, c) => s + c.capaciteMax, 0);
  const loges = cellules.reduce((s, c) => s + c.effectifReel, 0);
  const taux = capacite > 0 ? (loges / capacite) * 100 : 0;
  const libres = capacite - loges;
  const pleines = cellules.filter((c) => c.effectifReel >= c.capaciteMax).length;

  const enCours = sanctions.filter((s) => s.statut === "En cours");
  const isoles = sanctions.filter((s) => s.isolementEnCours).length;

  // Une sanction en cours se lit par ce qu'il lui reste à courir.
  const aSuivre = [...enCours]
    .map((s) => ({ sanction: s, jours: s.dateFin ? (joursRestants(s.dateFin) ?? 0) : null }))
    .sort((a, b) => (a.jours ?? 999) - (b.jours ?? 999));

  const parType = Object.entries(
    enCours.reduce<Record<string, number>>((acc, s) => {
      const cle = s.typeSanction ?? "Non précisé";
      acc[cle] = (acc[cle] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const maintenant = new Date();
  const ilYa7j = new Date(maintenant.getTime() - 7 * 86_400_000);
  const mouvements = affectations
    .filter((a) => new Date(a.dateAffectation) >= ilYa7j)
    .sort((a, b) => b.dateAffectation.localeCompare(a.dateAffectation));

  const plan = [...cellules]
    .sort((a, b) => (a.bloc ?? "").localeCompare(b.bloc ?? "") || a.numero.localeCompare(b.numero))
    .map((c) => ({
      id: c.id,
      numero: c.numero,
      bloc: c.bloc,
      effectif: c.effectifReel,
      capacite: c.capaciteMax,
    }));

  return (
    <Page>
      <CadreModule module={MODULE}>
        <BandeauModule
          module={MODULE}
          titre="Logement & discipline"
          phrase={
            <>
              {pluriel(loges, "détenu logé", "détenus logés")} sur {formatNombre(capacite)} places,{" "}
              {libres >= 0 ? (
                <>
                  {pluriel(libres, "place libre", "places libres")}
                  {pleines > 0 && <> — {pluriel(pleines, "cellule complète", "cellules complètes")}</>}
                </>
              ) : (
                <strong className="font-medium text-danger">
                  {formatNombre(-libres)} au-delà de la capacité d’accueil
                </strong>
              )}
              .{nonLoges.length > 0 && <> {pluriel(nonLoges.length, "détenu attend", "détenus attendent")} une affectation.</>}
            </>
          }
          actions={
            <>
              <ButtonLink href="/discipline/cellules" icone="cell">
                Cellules
              </ButtonLink>
              <ButtonLink
                href="/discipline/affectations"
                variante="primaire"
                icone="arrowRight"
                transitionTypes={["nav-forward"]}
              >
                Affecter un détenu
              </ButtonLink>
            </>
          }
        >
          <RangeeChiffres>
            <Chiffre
              index={0}
              label="Taux d’occupation"
              valeur={taux}
              decimales={1}
              unite="%"
              part={Math.min(taux / 100, 1)}
              ton={taux > 100 ? "critique" : taux >= 90 ? "attention" : "teinte"}
              aide={`${formatNombre(loges)} sur ${formatNombre(capacite)} places`}
              href="/discipline/cellules"
            />
            <Chiffre
              index={1}
              label="Places libres"
              valeur={Math.max(libres, 0)}
              part={capacite > 0 ? Math.max(libres, 0) / capacite : 0}
              ton={libres <= 0 ? "critique" : "teinte"}
              aide={`${pluriel(pleines, "cellule complète", "cellules complètes")}`}
            />
            <Chiffre
              index={2}
              label="Sanctions en cours"
              valeur={enCours.length}
              part={sanctions.length > 0 ? enCours.length / sanctions.length : 0}
              ton={enCours.length > 0 ? "attention" : "positif"}
              aide={`sur ${formatNombre(sanctions.length)} prononcées`}
              href="/discipline/sanctions"
            />
            <Chiffre
              index={3}
              label="En isolement"
              valeur={isoles}
              part={loges > 0 ? isoles / loges : 0}
              ton={isoles > 0 ? "attention" : "positif"}
              aide={isoles > 0 ? "Détenus en cellule disciplinaire" : "Aucun détenu isolé"}
            />
          </RangeeChiffres>
        </BandeauModule>

        <Bloc
          titre="Plan des cellules"
          sousTitre={`${pluriel(cellules.length, "cellule")} · ${formatPourcent(taux, 1)} d’occupation`}
          icone="cell"
          actions={
            nonLoges.length > 0 ? (
              <ButtonLink href="/discipline/affectations" taille="sm" icone="arrowRight">
                {pluriel(nonLoges.length, "détenu à loger", "détenus à loger")}
              </ButtonLink>
            ) : undefined
          }
        >
          {plan.length === 0 ? (
            <RienASignaler texte="Aucune cellule enregistrée pour le moment." />
          ) : (
            <PlanCellules cellules={plan} />
          )}
        </Bloc>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Bloc
            titre="Mesures en cours"
            sousTitre="Les plus proches de leur terme d’abord"
            icone="scale"
            flush
          >
            {aSuivre.length === 0 ? (
              <RienASignaler texte="Aucune sanction n’est en cours dans l’établissement." />
            ) : (
              <ListeActions>
                {aSuivre.slice(0, 6).map(({ sanction, jours }, i) => (
                  <LigneAction
                    key={sanction.id}
                    index={i}
                    repere={jours === null ? "—" : Math.max(jours, 0)}
                    uniteRepere={jours === null ? "sans fin" : jours > 1 ? "jours" : "jour"}
                    ton={jours !== null && jours <= 1 ? "attention" : "teinte"}
                    titre={sanction.detenuNom}
                    detail={`${sanction.numeroEcrou} · ${sanction.typeSanction ?? "Sanction"}${
                      sanction.celluleLibelle ? ` · ${sanction.celluleLibelle}` : ""
                    }`}
                    href={`/detenus/${sanction.detenuId}?onglet=discipline`}
                  />
                ))}
              </ListeActions>
            )}
          </Bloc>

          <div className="flex flex-col gap-4">
            <Bloc titre="Nature des mesures" sousTitre="Sanctions actuellement en cours" icone="discipline">
              {parType.length === 0 ? (
                <p className="py-4 text-sm text-muted">Aucune mesure en cours à répartir.</p>
              ) : (
                <ListeBarres>
                  {parType.map(([type, n], i) => (
                    <Barre
                      key={type}
                      index={i}
                      label={type}
                      valeur={n}
                      total={enCours.length}
                      href="/discipline/sanctions"
                    />
                  ))}
                </ListeBarres>
              )}
            </Bloc>

            <Bloc
              titre="Mouvements de cellule"
              sousTitre="Sept derniers jours"
              icone="door"
              flush
            >
              {mouvements.length === 0 ? (
                <RienASignaler texte="Aucune affectation sur les sept derniers jours." />
              ) : (
                <ListeActions>
                  {mouvements.slice(0, 4).map((a, i) => (
                    <LigneAction
                      key={a.id}
                      index={i}
                      repere={formatDate(a.dateAffectation).slice(0, 5)}
                      titre={a.detenuNom}
                      detail={`${a.numeroEcrou} → ${a.celluleLibelle}`}
                      href={`/detenus/${a.detenuId}?onglet=detention`}
                    />
                  ))}
                </ListeActions>
              )}
            </Bloc>
          </div>
        </div>

        <Raccourcis
          liens={[
            { href: "/discipline/cellules", label: "Logement & cellules", aide: "Capacités et effectifs", icone: "cell" },
            { href: "/discipline/affectations", label: "Affectations", aide: "Attribuer une cellule", icone: "door" },
            { href: "/discipline/sanctions", label: "Sanctions", aide: "Fautes et mesures prononcées", icone: "scale" },
            { href: "/discipline/sanctions/types", label: "Types de sanction", aide: "Table de référence", icone: "edit" },
          ]}
        />
      </CadreModule>
    </Page>
  );
}
