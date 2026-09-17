"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { Icon, type NomIcone } from "./icon";

/**
 * Action à conséquence, confirmée dans une boîte de dialogue native.
 *
 * `<dialog>` ouvert par `showModal()` apporte gratuitement ce qu'on attend d'une
 * modale : focus piégé, Échap pour fermer, arrière-plan inerte, focus rendu au
 * bouton à la fermeture.
 */
export function BoutonConfirmation({
  libelle,
  titre,
  description,
  confirmer = "Confirmer",
  icone = "alert",
  variante = "danger",
  taille = "md",
  action,
}: {
  libelle: string;
  titre: string;
  description: ReactNode;
  confirmer?: string;
  icone?: NomIcone;
  variante?: "danger" | "secondaire";
  taille?: "sm" | "md";
  /** Server Action : `ok: false` garde la boîte ouverte et affiche le message. */
  action: () => Promise<{ ok: boolean; message?: string }>;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const idTitre = useId();
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string>();

  return (
    <>
      <Button
        type="button"
        variante={variante === "danger" ? "discret" : "secondaire"}
        taille={taille}
        icone={icone}
        className={variante === "danger" ? "text-danger hover:bg-danger-soft" : undefined}
        onClick={() => {
          setErreur(undefined);
          dialogue.current?.showModal();
        }}
      >
        {libelle}
      </Button>

      <dialog
        ref={dialogue}
        aria-labelledby={idTitre}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-hairline bg-surface p-0 text-ink shadow-e4 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span
              className={
                variante === "danger"
                  ? "grid size-9 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"
                  : "grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"
              }
            >
              <Icon name={icone} size={16} />
            </span>
            <div className="min-w-0">
              <h2 id={idTitre} className="text-md font-semibold">
                {titre}
              </h2>
              <div className="mt-1.5 text-sm leading-relaxed text-muted">{description}</div>
            </div>
          </div>

          {erreur && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {erreur}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-hairline pt-4">
            <Button type="button" onClick={() => dialogue.current?.close()} disabled={enCours}>
              Annuler
            </Button>
            <Button
              type="button"
              variante={variante === "danger" ? "danger" : "primaire"}
              chargement={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await action();
                  if (!r.ok) {
                    setErreur(r.message ?? "L’opération a échoué.");
                    return;
                  }
                  dialogue.current?.close();
                  router.refresh();
                })
              }
            >
              {confirmer}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
