import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate, formatDateLongue, ouVide } from "@/lib/format";
import { Page, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DataPair, Ecrou, Panel } from "@/components/ui/surface";
import { ActionsVisite } from "@/components/sante/actions-visite";

export async function generateMetadata(props: PageProps<"/sante/visites/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const numero = Number.parseInt(id, 10);
  const visite = Number.isFinite(numero) ? await api.getVisite(numero) : null;
  return { title: visite ? `Visite de ${visite.nomVisiteur}` : "Visite introuvable" };
}

export default async function VisiteDetailPage(props: PageProps<"/sante/visites/[id]">) {
  const { id } = await props.params;
  const numero = Number.parseInt(id, 10);
  if (!Number.isFinite(numero)) notFound();

  const [visite, parametres] = await Promise.all([api.getVisite(numero), api.getParametres()]);
  if (!visite) notFound();

  return (
    <Page>
      <PageHeader
        surtitre="Gestion des visites"
        titre={visite.nomVisiteur}
        description={`Visite reçue par ${visite.detenuNom} le ${formatDateLongue(visite.dateVisite)}.`}
        meta={
          <>
            <Ecrou>{visite.numeroEcrou}</Ecrou>
            <Badge ton={visite.autorisationPrealable ? "succes" : "alerte"}>
              {visite.autorisationPrealable ? "Autorisée" : "Sans autorisation"}
            </Badge>
          </>
        }
        actions={
          <>
            <ButtonLink href={`/detenus/${visite.detenuId}?onglet=visites`} variante="discret" icone="user">
              Voir le détenu
            </ButtonLink>
            <ButtonLink href="/sante/visites" variante="discret" icone="arrowLeft" transitionTypes={["nav-back"]}>
              Retour au registre
            </ButtonLink>
            <ActionsVisite visite={visite} parametres={parametres} />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel titre="Détenu et créneau" variante="eleve">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DataPair label="Détenu">{visite.detenuNom}</DataPair>
            <DataPair label="Numéro d’écrou" mono>{visite.numeroEcrou}</DataPair>
            <DataPair label="Date">{formatDate(visite.dateVisite)}</DataPair>
            <DataPair label="Arrivée" mono>{visite.heureArrivee}</DataPair>
            <DataPair label="Durée prévue">{visite.dureePrevueMinutes} min</DataPair>
            <DataPair label="Type de visite">{visite.typeVisite}</DataPair>
            <DataPair label="Lieu">{ouVide(visite.lieuVisite)}</DataPair>
            <DataPair label="Autorisation préalable">{visite.autorisationPrealable ? "Oui" : "Non"}</DataPair>
          </dl>
        </Panel>

        <Panel titre="Visiteur" variante="eleve">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DataPair label="Nom">{visite.nomVisiteur}</DataPair>
            <DataPair label="Sexe">{visite.sexeVisiteur}</DataPair>
            <DataPair label="Lien de parenté">{visite.lienParente}</DataPair>
            <DataPair label="Pièce d’identité">{visite.typePieceIdentite}</DataPair>
            <DataPair label="Numéro de pièce" mono>{visite.numeroPieceIdentite}</DataPair>
            <DataPair label="Téléphone" mono>{ouVide(visite.telephoneVisiteur)}</DataPair>
            <DataPair label="Adresse" className="sm:col-span-2">{ouVide(visite.adresseVisiteur)}</DataPair>
          </dl>
        </Panel>

        <Panel titre="Contrôle de sécurité" variante="eleve">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DataPair label="Agent de contrôle">{visite.agentControle}</DataPair>
            <DataPair label="Fouille corporelle">{visite.fouilleCorporelle ? "Effectuée" : "Non effectuée"}</DataPair>
            <DataPair label="Objets déposés" className="sm:col-span-2">{ouVide(visite.objetsDeposes)}</DataPair>
            <DataPair label="Observations de sécurité" className="sm:col-span-2">{ouVide(visite.observationsSecurite)}</DataPair>
          </dl>
        </Panel>

        {(visite.heureDebut || visite.heureFin || visite.observationsVisite) && (
          <Panel titre="Déroulement réel" variante="eleve">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DataPair label="Début réel" mono>{ouVide(visite.heureDebut)}</DataPair>
              <DataPair label="Fin réelle" mono>{ouVide(visite.heureFin)}</DataPair>
              <DataPair label="Observations" className="sm:col-span-2">{ouVide(visite.observationsVisite)}</DataPair>
            </dl>
          </Panel>
        )}
      </div>
    </Page>
  );
}
