import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/surface";
import { t } from "@/lib/i18n/fr";
import { getProfil, peut } from "@/lib/session";
import { DetenuForm } from "./detenu-form";

export const metadata: Metadata = { title: "Nouvel enregistrement" };

export default async function NouveauDetenuPage() {
  const profil = await getProfil();
  const retour = (
    <ButtonLink href="/detenus" variante="discret" icone="arrowLeft" transitionTypes={["nav-back"]}>
      Retour au registre
    </ButtonLink>
  );

  if (!profil || !peut(profil.permissions, "detenus.creer")) {
    return (
      <Page>
        <PageHeader surtitre={t.modules.detenus} titre="Fiche d’enregistrement" actions={retour} />
        <Panel variante="eleve">
          <EmptyState
            icone="lock"
            titre={t.etats.horsPerimetre}
            texte="L’écrou d’un détenu nécessite la permission dédiée."
          />
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.detenus}
        titre="Fiche d’enregistrement"
        description="Identité du détenu entrant et titre de détention qui fonde son incarcération. Les champs marqués d’un astérisque sont obligatoires."
        actions={retour}
      />
      <DetenuForm />
    </Page>
  );
}
