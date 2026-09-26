import type { Metadata } from "next";
import { api } from "@/lib/api";
import { optionnel, tenter } from "@/lib/api/disponibilite";
import { resoudreDetenuInitial } from "@/lib/api/detenu-initial";
import { pluriel } from "@/lib/format";
import { param } from "@/lib/url";
import { getProfil, peut } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { EnAttenteApi, SansDroit } from "@/components/ui/en-attente-api";
import { EmptyState, Panel } from "@/components/ui/surface";
import { AffectationsRecentes } from "@/components/discipline/affectations-recentes";
import { DetenusNonLoges } from "@/components/discipline/detenus-non-loges";
import { FormulaireAffectation } from "@/components/discipline/formulaires";

export const metadata: Metadata = { title: "Affectations" };

export default async function AffectationsPage(props: PageProps<"/discipline/affectations">) {
  const t = await getT();
  const sp = await props.searchParams;
  const nombre = (cle: string) => {
    const n = Number.parseInt(param(sp, cle) ?? "", 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const [nonLoges, totalNonLoges, affectations, cellules, profil, detenuInitial] = await Promise.all([
    // Ces deux listes n'existent pas encore partout : elles ne doivent pas bloquer la saisie
    tenter(() => api.listDetenusNonLoges()),
    // Le nombre exact : `listDetenusNonLoges()` ci-dessus est plafonnée à 100 (protection
    // contre un jeu de données anormal), donc sa longueur ne dit pas le vrai total dès qu'il
    // dépasse ce plafond. `meta.total` d'une simple requête paginée le donne sans ce plafond.
    optionnel(() => api.listDetenus({ sansCellule: true, parPage: 1 }), null),
    tenter(() => api.listAffectations()),
    // Domaines voisins : gérer les affectations n'ouvre ni les cellules ni le registre.
    optionnel(() => api.listCellules(), []),
    getProfil(),
    resoudreDetenuInitial(nombre("detenu")),
  ]);
  const nombreNonLoges = totalNonLoges?.total ?? (nonLoges.ok ? nonLoges.donnees.length : 0);

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
              nonLoges.ok && nombreNonLoges > 0
                ? `${pluriel(nombreNonLoges, "détenu")} en attente d’affectation`
                : undefined
            }
            actions={nonLoges.ok && nombreNonLoges > 0 && <Badge ton="alerte">À traiter</Badge>}
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
              <DetenusNonLoges donnees={nonLoges.donnees} total={nombreNonLoges} />
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
          {profil && peut(profil.permissions, "detenus.consulter") ? (
            <FormulaireAffectation
              nombreNonLoges={nonLoges.ok ? nombreNonLoges : null}
              cellules={cellules}
              detenuInitial={detenuInitial}
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
