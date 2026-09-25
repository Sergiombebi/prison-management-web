"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ACCUEIL } from "@/lib/acces";
import { useT } from "@/components/layout/i18n-provider";

export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-danger-soft text-danger">
        <Icon name="alert" size={20} />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-ink">{t.etats.erreurTitre}</h1>
        <p className="mt-1.5 text-base text-muted">{t.etats.erreurTexte}</p>
        {error.message && (
          <p className="mt-3 rounded-md border border-hairline bg-sunken px-3 py-2 font-mono text-xs text-muted">
            {error.message}
            {error.digest && <span className="block text-faint">réf. {error.digest}</span>}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variante="primaire" icone="arrowRight" onClick={reset}>
          {t.actions.reessayer}
        </Button>
        {/*
          Vers l'accueil et non le tableau de bord : tous les profils n'y ont pas
          droit, et proposer une porte fermée après une erreur enfermerait
          l'utilisateur dans une boucle d'écrans d'erreur.
        */}
        <ButtonLink href={ACCUEIL}>{t.nav.monAccueil}</ButtonLink>
      </div>
    </div>
  );
}
