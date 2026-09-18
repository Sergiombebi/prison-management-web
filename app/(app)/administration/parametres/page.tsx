import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getProfil, peut } from "@/lib/session";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/surface";
import { ParametresForm } from "./parametres-form";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const profil = await getProfil();

  if (!profil || !peut(profil.permissions, "administration.parametres.gerer")) {
    return (
      <Page>
        <PageHeader surtitre={t.modules.administration} titre="Paramètres" />
        <Panel variante="eleve">
          <EmptyState
            icone="lock"
            titre={t.etats.horsPerimetre}
            texte="Les paramètres de l’établissement ne sont modifiables que par un administrateur."
            action={<ButtonLink href="/tableau-de-bord" taille="sm">{t.modules.tableauDeBord}</ButtonLink>}
          />
        </Panel>
      </Page>
    );
  }

  const parametres = await api.getParametres();

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.administration}
        titre="Paramètres de l’établissement"
        description="Ces informations alimentent l’en-tête de tous les états imprimés et certaines règles de gestion."
      />
      <ParametresForm initial={parametres} />
    </Page>
  );
}
