import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr";
import { DetenuForm } from "./detenu-form";

export const metadata: Metadata = { title: "Nouvel enregistrement" };

export default function NouveauDetenuPage() {
  return (
    <Page>
      <PageHeader
        surtitre={t.modules.detenus}
        titre="Fiche d’enregistrement"
        description="Identité du détenu entrant et titre de détention qui fonde son incarcération. Les champs marqués d’un astérisque sont obligatoires."
        actions={
          <ButtonLink href="/detenus" variante="discret" icone="arrowLeft" transitionTypes={["nav-back"]}>
            Retour au registre
          </ButtonLink>
        }
      />
      <DetenuForm />
    </Page>
  );
}
