import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ACCUEIL, aAcces, permissionsRequises } from "@/lib/acces";
import { libellePermission } from "@/lib/domain/referentiels";
import { MODULES, peutVoirModule } from "@/lib/navigation";
import { getProfil } from "@/lib/session";
import { param } from "@/lib/url";
import { Page, PageHeader } from "@/components/layout/page";
import { CarteModule } from "@/components/accueil/carte-module";
import { Panel } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accès refusé" };

/**
 * Refus d'accès — une explication, pas une erreur.
 *
 * L'écran d'erreur générique (`error.tsx`) disait seulement « le chargement a
 * échoué » quand l'API répondait 403 : l'utilisateur ne savait ni ce qui lui
 * manquait, ni où aller. Ici on nomme le droit requis et on propose ce qui, dans
 * son compte, est réellement ouvert.
 */
export default async function AccesRefusePage(props: PageProps<"/acces-refuse">) {
  const sp = await props.searchParams;
  const profil = await getProfil();
  if (!profil) redirect("/deconnexion?raison=session-invalide");

  // On n'accepte qu'un chemin interne : le paramètre vient d'une redirection, mais
  // rien n'empêche quelqu'un de le forger à la main.
  const demande = param(sp, "vers") ?? "";
  const vers = demande.startsWith("/") && !demande.startsWith("//") ? demande : "";

  // Droits élargis depuis la redirection (reconnexion, permission accordée) :
  // inutile de laisser l'utilisateur devant une porte désormais ouverte.
  if (vers && aAcces(profil.permissions, vers)) redirect(vers);

  const manquantes = vers ? permissionsRequises(vers) : [];
  const modulesOuverts = MODULES.filter((m) => peutVoirModule(profil.permissions, m));

  return (
    <Page>
      <PageHeader
        surtitre="Accès refusé"
        titre="Cet écran n’est pas ouvert à votre compte"
        description={
          vers
            ? "Votre compte est bien connecté ; il n’a simplement pas le droit nécessaire pour cet écran."
            : "Votre compte n’a pas le droit nécessaire pour l’écran demandé."
        }
      />

      <Panel variante="eleve" accent className="reveal">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning">
            <Icon name="lock" size={18} />
          </span>
          <div className="min-w-0 text-sm">
            {vers && (
              <p className="text-ink">
                Écran demandé :{" "}
                <code className="rounded-sm bg-sunken px-1.5 py-0.5 font-mono text-xs text-muted">
                  {vers}
                </code>
              </p>
            )}
            {manquantes.length > 0 ? (
              <>
                <p className="mt-2 text-muted">
                  {manquantes.length > 1
                    ? "Il faut l’un de ces droits :"
                    : "Il faut ce droit :"}
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {manquantes.map((cle) => (
                    <li
                      key={cle}
                      className="rounded-full border border-hairline bg-sunken px-2.5 py-1 text-xs text-ink"
                    >
                      {libellePermission(cle)}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-muted">
                Aucun droit correspondant n’est accordé à votre compte.
              </p>
            )}
            <p className="mt-3 text-muted">
              Les droits s’accordent compte par compte, depuis{" "}
              <strong className="font-medium text-ink">Administration › Personnel</strong>.
              Adressez-vous à l’administrateur de l’établissement.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
          <ButtonLink href={ACCUEIL} variante="primaire" icone="arrowRight">
            Revenir à mon accueil
          </ButtonLink>
          <ButtonLink href="/profil" icone="user">
            Voir mes droits
          </ButtonLink>
        </div>
      </Panel>

      {modulesOuverts.length > 0 && (
        <Panel titre="Ce que vous pouvez ouvrir" variante="eleve" className="reveal">
          <ul className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modulesOuverts.map((m, rang) => (
              <CarteModule key={m.id} module={m} index={rang} />
            ))}
          </ul>
        </Panel>
      )}
    </Page>
  );
}
