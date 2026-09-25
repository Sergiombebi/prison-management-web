"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useT } from "@/components/layout/i18n-provider";
import { connecter, type EtatConnexion } from "./actions";

export interface AideConnexion {
  source: string;
  identifiant: string;
  motDePasse: string;
}

export function LoginForm({
  suite,
  aide,
  avis,
}: {
  suite?: string;
  /** Identifiants de test, affichés hors production uniquement. */
  aide?: AideConnexion;
  /** Information non bloquante, ex. « votre session a expiré ». */
  avis?: string;
}) {
  const t = useT();
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(connecter, {});
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {suite && <input type="hidden" name="suite" value={suite} />}

      {etat.erreur ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger animate-rise"
        >
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          {etat.erreur}
        </div>
      ) : (
        avis && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-md border border-hairline bg-info-soft px-3 py-2.5 text-sm text-info animate-rise"
          >
            <Icon name="clock" size={15} className="mt-0.5 shrink-0" />
            {avis}
          </div>
        )
      )}

      <Field label={t.connexion.identifiant} requis>
        {(p) => (
          <Input
            {...p}
            name="identifiant"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={etat.identifiant}
            autoFocus
            className="h-10"
          />
        )}
      </Field>

      <Field label={t.connexion.motDePasse} requis>
        {(p) => (
          <div className="relative">
            <Input
              {...p}
              name="motDePasse"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              className="h-10 pr-10"
              autoFocus={Boolean(etat.erreur)}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-pressed={visible}
              className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-faint transition-colors hover:text-ink"
            >
              <Icon name={visible ? "eyeOff" : "eye"} size={15} />
              <span className="sr-only">
                {visible ? t.connexion.masquerMotDePasse : t.connexion.afficherMotDePasse}
              </span>
            </button>
          </div>
        )}
      </Field>

      <Button type="submit" variante="primaire" chargement={enCours} className="h-10 w-full">
        {enCours ? t.connexion.enCours : t.actions.seConnecter}
      </Button>

      {aide && (
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          {aide.source} :
          <code className="rounded-xs bg-sunken px-1.5 py-0.5 font-mono text-2xs text-ink">{aide.identifiant}</code>
          /
          <code className="rounded-xs bg-sunken px-1.5 py-0.5 font-mono text-2xs text-ink">{aide.motDePasse}</code>
        </p>
      )}
    </form>
  );
}
