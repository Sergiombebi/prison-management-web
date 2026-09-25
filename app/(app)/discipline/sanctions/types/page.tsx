import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getProfil, peut } from "@/lib/session";
import { pluriel } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/surface";
import { FormulaireTypeSanction, LigneTypeSanction } from "@/components/discipline/types-sanction";
import { majTypeSanction } from "../../actions";

export const metadata: Metadata = { title: "Types de sanction" };

export default async function TypesSanctionPage() {
  const t = await getT();
  const profil = await getProfil();
  const retour = (
    <ButtonLink href="/discipline/sanctions" variante="discret" icone="arrowLeft" transitionTypes={["nav-back"]}>
      Sanctions
    </ButtonLink>
  );

  if (!profil || !peut(profil.permissions, "discipline.types_sanction.gerer")) {
    return (
      <Page>
        <PageHeader surtitre={t.modules.discipline} titre="Types de sanction" actions={retour} />
        <Panel variante="eleve">
          <EmptyState
            icone="lock"
            titre={t.etats.horsPerimetre}
            texte="La liste des types de sanction n’est modifiable qu’avec la permission dédiée."
          />
        </Panel>
      </Page>
    );
  }

  const types = await api.listTypesSanction();
  // Les types utilisables d'abord, puis les désactivés, chacun par ordre alphabétique
  const tries = [...types].sort(
    (a, b) => Number(b.estActif) - Number(a.estActif) || a.libelle.localeCompare(b.libelle, "fr"),
  );
  const actifs = types.filter((ty) => ty.estActif).length;

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.discipline}
        titre="Types de sanction"
        description="Les sanctions proposées à la saisie. Un type n’est jamais supprimé : désactivé, il disparaît des choix mais reste attaché aux sanctions déjà prononcées."
        actions={retour}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          variante="eleve"
          titre="Référentiel"
          sousTitre={`${pluriel(actifs, "type proposé", "types proposés")} à la saisie${
            types.length > actifs ? `, ${pluriel(types.length - actifs, "désactivé")}` : ""
          }`}
          flush
        >
          {tries.length === 0 ? (
            <EmptyState compact icone="scale" titre="Aucun type de sanction" texte="Ajoutez le premier avec le formulaire." />
          ) : (
            <ul className="divide-y divide-hairline">
              {tries.map((ty) => (
                <LigneTypeSanction key={ty.id} type={ty} action={majTypeSanction.bind(null, ty.id)} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel variante="eleve" titre="Nouveau type" className="xl:sticky xl:top-20">
          <FormulaireTypeSanction />
        </Panel>
      </div>
    </Page>
  );
}
