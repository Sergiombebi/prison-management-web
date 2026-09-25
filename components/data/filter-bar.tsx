"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { useT } from "@/components/layout/i18n-provider";

/**
 * Barre de filtres — un formulaire GET ordinaire.
 *
 * Fonctionne sans JavaScript (soumission classique). Avec JavaScript, `next/form`
 * transforme la soumission en navigation client, et un changement de liste
 * déroulante applique le filtre immédiatement.
 */
export function FilterBar({
  action,
  children,
  reinitialiserHref,
  actif,
  resultat,
  className,
}: {
  action: string;
  children: ReactNode;
  /** Lien qui efface tous les filtres ; affiché seulement si des filtres sont actifs. */
  reinitialiserHref?: string;
  actif?: boolean;
  /** Ex. « 32 détenus » — annoncé aux lecteurs d'écran. */
  resultat?: string;
  className?: string;
}) {
  const t = useT();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <Form
      ref={ref}
      action={action}
      scroll={false}
      replace
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") ref.current?.requestSubmit();
      }}
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-hairline bg-raised/60 px-4 py-3",
        className,
      )}
    >
      {children}
      <button type="submit" className="sr-only">
        {t.actions.filtrer}
      </button>
      <div className="ml-auto flex items-center gap-3">
        {actif && reinitialiserHref && (
          <Link
            href={reinitialiserHref}
            scroll={false}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <Icon name="close" size={12} />
            {t.actions.effacerFiltres}
          </Link>
        )}
        {resultat && (
          <p
            role="status"
            aria-live="polite"
            className="tnum rounded-full bg-sunken px-2.5 py-1 text-xs text-muted"
          >
            {resultat}
          </p>
        )}
      </div>
    </Form>
  );
}
