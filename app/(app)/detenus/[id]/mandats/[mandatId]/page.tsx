import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Page, PageHeader } from "@/components/layout/page";
import { MandatForm } from "@/components/detenus/mandat-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Ecrou } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Évolution du mandat" };

export default async function EvolutionMandatPage(
  props: PageProps<"/detenus/[id]/mandats/[mandatId]">,
) {
  const { id, mandatId } = await props.params;
  const numero = Number.parseInt(mandatId, 10);
  if (!Number.isFinite(numero)) notFound();

  const mandat = await api.getMandat(numero);
  // On vérifie que le mandat appartient bien au détenu de l'URL
  if (!mandat || String(mandat.detenuId) !== id) notFound();

  return (
    <Page>
      <PageHeader
        surtitre="Gestion des mandats"
        titre="Faire évoluer le mandat"
        description="Un mandat suit l’affaire dans le temps : une détention provisoire qui reçoit son jugement devient une exécution de peine, puis un appel, puis une cassation. On fait évoluer le mandat existant plutôt que d’en créer un nouveau."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {mandat.detenuNom || "Détenu"} · <Ecrou className="text-xs">{mandat.numeroEcrou}</Ecrou>
            </span>
            <span>Référence {mandat.referenceMandat ?? "—"}</span>
            <span>Incarcéré le {formatDate(mandat.dateIncarceration)}</span>
            <Badge ton={mandat.actif ? "succes" : "danger"}>{mandat.actif ? "Actif" : "Expiré"}</Badge>
          </>
        }
        actions={
          <ButtonLink
            href={`/detenus/${id}?onglet=mandats`}
            variante="discret"
            icone="arrowLeft"
            transitionTypes={["nav-back"]}
          >
            Retour au dossier
          </ButtonLink>
        }
      />

      <MandatForm detenuId={mandat.detenuId} mandat={mandat} />
    </Page>
  );
}
