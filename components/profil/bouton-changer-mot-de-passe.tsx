"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import type { EtatAction } from "@/lib/api/actions";
import { changerMonMotDePasse } from "@/app/(app)/profil/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

/**
 * Changement de son propre mot de passe, dans une boîte de dialogue native.
 * Contrairement à une réinitialisation par un administrateur, celle-ci exige le mot de
 * passe actuel et ne déconnecte pas la session en cours.
 */
export function BoutonChangerMotDePasse() {
  const dialogue = useRef<HTMLDialogElement>(null);
  const idTitre = useId();
  const router = useRouter();
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(changerMonMotDePasse, {});

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
      <Button type="button" variante="secondaire" icone="lock" onClick={() => dialogue.current?.showModal()}>
        Changer le mot de passe
      </Button>

      <dialog
        ref={dialogue}
        aria-labelledby={idTitre}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-hairline bg-surface p-0 text-ink shadow-e4 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        <form action={envoyer} className="flex flex-col gap-4 p-5">
          <h2 id={idTitre} className="text-md font-semibold">
            Changer mon mot de passe
          </h2>
          <RetourAction etat={etat} />
          <Field
            label="Mot de passe actuel"
            requis
            erreur={etat.erreurs?.mot_de_passe_actuel?.[0]}
          >
            {(p) => <Input {...p} type="password" name="mot_de_passe_actuel" required autoFocus />}
          </Field>
          <Field label="Nouveau mot de passe" requis aide="8 caractères minimum" erreur={etat.erreurs?.password?.[0]}>
            {(p) => <Input {...p} type="password" name="password" required minLength={8} />}
          </Field>
          <div className="flex justify-end gap-2 border-t border-hairline pt-4">
            <Button type="button" onClick={() => dialogue.current?.close()} disabled={enCours}>
              Annuler
            </Button>
            <Button type="submit" variante="primaire" chargement={enCours}>
              Changer
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
