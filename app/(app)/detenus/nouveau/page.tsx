import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/surface";
import { getT } from "@/lib/i18n/server";
import { getProfil, peut } from "@/lib/session";
import { DetenuForm } from "./detenu-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.navigation.detenus.nouveau.label };
}

export default async function NouveauDetenuPage() {
  const t = await getT();
  const fd = t.formulaireDetenu;
  const profil = await getProfil();
  const retour = (
    <ButtonLink href="/detenus" variante="discret" icone="arrowLeft" transitionTypes={["nav-back"]}>
      {fd.retourRegistre}
    </ButtonLink>
  );

  if (!profil || !peut(profil.permissions, "detenus.creer")) {
    return (
      <Page>
        <PageHeader surtitre={t.modules.detenus} titre={fd.ficheEnregistrement} actions={retour} />
        <Panel variante="eleve">
          <EmptyState
            icone="lock"
            titre={t.etats.horsPerimetre}
            texte={fd.permissionRequise}
          />
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.detenus}
        titre={fd.ficheEnregistrement}
        description={fd.descriptionPage}
        actions={retour}
      />
      <DetenuForm />
    </Page>
  );
}
