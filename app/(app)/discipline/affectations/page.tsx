import type { Metadata } from "next";
import { api } from "@/lib/api";
import { optionnel, tenter } from "@/lib/api/disponibilite";
import { formatDate, initiales, pluriel } from "@/lib/format";
import { param } from "@/lib/url";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { EnAttenteApi, SansDroit } from "@/components/ui/en-attente-api";
import { Avatar, EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { AffectationsRecentes } from "@/components/discipline/affectations-recentes";
import { FormulaireAffectation } from "@/components/discipline/formulaires";

export const metadata: Metadata = { title: "Affectations" };

export default async function AffectationsPage(props: PageProps<"/discipline/affectations">) {
  const sp = await props.searchParams;
  const [nonLoges, affectations, cellules, detenus] = await Promise.all([
    // Ces deux listes n'existent pas encore partout : elles ne doivent pas bloquer la saisie
    tenter(() => api.listDetenusNonLoges()),
    tenter(() => api.listAffectations()),
    // Domaines voisins : gérer les affectations n'ouvre ni les cellules ni le registre.
    optionnel(() => api.listCellules(), []),
    optionnel(() => api.listOptionsDetenus(), null),
  ]);

  const nombre = (cle: string) => {
    const n = Number.parseInt(param(sp, cle) ?? "", 10);
    return Number.isFinite(n) ? n : undefined;
  };

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.discipline}
        titre="Affectation des détenus"
        description="Attribuer une cellule à un détenu entrant, ou le réaffecter. L’affectation en cours est clôturée automatiquement ; une cellule pleine est refusée."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Panel
            variante="eleve"
            titre="Détenus non logés"
            sousTitre={
              nonLoges.ok && nonLoges.donnees.length
                ? `${pluriel(nonLoges.donnees.length, "détenu")} en attente d’affectation`
                : undefined
            }
            actions={nonLoges.ok && nonLoges.donnees.length > 0 && <Badge ton="alerte">À traiter</Badge>}
            flush
          >
            {nonLoges.ok === false && nonLoges.raison === "interdit" ? (
              <SansDroit
                compact
                texte="Votre compte ne peut pas consulter le registre : la liste des détenus non logés reste masquée."
              />
            ) : !nonLoges.ok ? (
              <EnAttenteApi
                compact
                icone="cell"
                route="GET /detenus?sans_cellule=1"
                texte="L’API ne dit pas encore quels détenus sont sans cellule. La cellule actuelle reste visible sur chaque fiche."
              />
            ) : nonLoges.donnees.length === 0 ? (
              <EmptyState compact icone="check" titre="Tous les détenus sont logés" texte="Aucun détenu n’attend d’affectation." />
            ) : (
              <ul className="stagger divide-y divide-hairline">
                {nonLoges.donnees.map((d, i) => (
                  <li key={d.id} style={{ ["--i" as string]: i }} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar initiales={initiales(d.nom)} taille="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{d.nom}</p>
                      <p className="text-xs text-muted">
                        <Ecrou className="text-xs text-muted">{d.numeroEcrou}</Ecrou> · {d.sexe}
                      </p>
                    </div>
                    <p className="hidden text-xs text-faint sm:block">écroué le {formatDate(d.mandatCourant?.dateIncarceration)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel variante="eleve" titre="Affectations récentes" flush className="overflow-hidden">
            {affectations.ok === false && affectations.raison === "interdit" ? (
              <SansDroit compact texte="Votre compte ne peut pas consulter l’historique des affectations." />
            ) : !affectations.ok ? (
              <EnAttenteApi
                compact
                icone="cell"
                route="GET /affectations"
                texte="L’historique global n’existe pas encore ; celui de chaque détenu est dans l’onglet Détention de sa fiche."
              />
            ) : (
              <AffectationsRecentes affectations={affectations.donnees} cellules={cellules} />
            )}
          </Panel>
        </div>

        <Panel variante="eleve" titre="Affecter à une cellule" className="lg:sticky lg:top-20">
          {detenus ? (
            <FormulaireAffectation
              detenus={detenus}
              nonLoges={nonLoges.ok ? nonLoges.donnees : null}
              cellules={cellules}
              detenuInitial={nombre("detenu")}
              celluleInitiale={nombre("cellule")}
            />
          ) : (
            <SansDroit
              compact
              texte="Affecter un détenu demande aussi le droit de consulter le registre des détenus."
            />
          )}
        </Panel>
      </div>
    </Page>
  );
}
