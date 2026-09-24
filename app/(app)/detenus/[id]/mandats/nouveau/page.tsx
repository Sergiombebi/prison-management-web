import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { Page, PageHeader } from "@/components/layout/page";
import { MandatForm } from "@/components/detenus/mandat-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Ecrou, EmptyState, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Nouveau mandat" };

export default async function NouveauMandatPage(
  props: PageProps<"/detenus/[id]/mandats/nouveau">,
) {
  const { id } = await props.params;
  const numero = Number.parseInt(id, 10);
  if (!Number.isFinite(numero)) notFound();

  const dossier = await api.getDossierDetenu(numero);
  if (!dossier) notFound();

  const { detenu: d } = dossier;
  const present = d.statut === "Present";

  return (
    <Page>
      <PageHeader
        surtitre="Gestion des mandats"
        titre="Ajouter un mandat"
        description="Un détenu déjà incarcéré peut faire l’objet d’une nouvelle affaire : ce mandat s’ajoute aux siens sans toucher aux autres (cas DPAC)."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {d.nom} · <Ecrou className="text-xs">{d.numeroEcrou}</Ecrou>
            </span>
            <Badge ton={present ? "succes" : "danger"}>{present ? "Présent" : "Sorti"}</Badge>
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

      {present ? (
        <MandatForm detenuId={numero} />
      ) : (
        <Panel variante="eleve">
          <EmptyState
            icone="alert"
            titre="Détenu non présent"
            texte="Ce détenu est désactivé ou sorti : restaurez son dossier avant de lui ajouter un mandat."
          />
        </Panel>
      )}
    </Page>
  );
}
