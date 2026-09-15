"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { t } from "@/lib/i18n/fr";
import { connecter, type EtatConnexion } from "./actions";

export function LoginForm({ suite, demo }: { suite?: string; demo: boolean }) {
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(connecter, {});
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {suite && <input type="hidden" name="suite" value={suite} />}

      {etat.erreur && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger animate-rise"
        >
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          {etat.erreur}
        </div>
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
                {visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              </span>
            </button>
          </div>
        )}
      </Field>

      <Button type="submit" variante="primaire" chargement={enCours} className="h-10 w-full">
        {enCours ? t.connexion.enCours : t.actions.seConnecter}
      </Button>

      {demo && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          Démonstration — identifiant et mot de passe :{" "}
          <code className="rounded-xs bg-sunken px-1.5 py-0.5 font-mono text-2xs text-ink">admin</code>
        </p>
      )}
    </form>
  );
}
