"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import type { EtatAction } from "@/lib/api/actions";
import { reinitialiserMotDePasse } from "@/app/(app)/administration/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

/**
 * Réinitialisation du mot de passe d'un compte, dans une boîte de dialogue native.
 * Un succès referme la boîte après un court délai, le temps que le message soit lu.
 */
export function BoutonReinitialiserMotDePasse({ utilisateurId, nom }: { utilisateurId: number; nom: string }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const idTitre = useId();
  const router = useRouter();
  const action = reinitialiserMotDePasse.bind(null, utilisateurId);
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(action, {});

  useEffect(() => {
    if (!etat.ok) return;
    const delai = setTimeout(() => {
      dialogue.current?.close();
      router.refresh();
    }, 1200);
    return () => clearTimeout(delai);
  }, [etat.ok, router]);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="lock"
        onClick={() => dialogue.current?.showModal()}
      >
        Réinitialiser le mot de passe
      </Button>

      <dialog
        ref={dialogue}
        aria-labelledby={idTitre}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-hairline bg-surface p-0 text-ink shadow-e4 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        <form action={envoyer} className="flex flex-col gap-4 p-5">
          <h2 id={idTitre} className="text-md font-semibold">
            Réinitialiser le mot de passe de {nom}
          </h2>
          <RetourAction etat={etat} />
          <Field label="Nouveau mot de passe" requis aide="8 caractères minimum" erreur={etat.erreurs?.password?.[0]}>
            {(p) => <Input {...p} type="password" name="password" required minLength={8} autoFocus />}
          </Field>
          <p className="text-xs text-muted">Les sessions actives de ce compte seront déconnectées.</p>
          <div className="flex justify-end gap-2 border-t border-hairline pt-4">
            <Button type="button" onClick={() => dialogue.current?.close()} disabled={enCours}>
              Annuler
            </Button>
            <Button type="submit" variante="primaire" chargement={enCours}>
              Réinitialiser
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
