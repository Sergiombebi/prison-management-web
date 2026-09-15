import { ViewTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Enveloppe de chaque écran.
 *
 * Porte la transition de vue directionnelle : un lien marqué `nav-forward` fait
 * glisser l'écran vers la gauche, `nav-back` vers la droite. Elle doit vivre dans
 * chaque page (et non dans le layout, qui persiste et ne déclenche jamais d'entrée).
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "reveal" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "reveal" }}
      default="none"
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:px-8",
          className,
        )}
      >
        {children}
      </div>
    </ViewTransition>
  );
}

/**
 * En-tête d'écran : où suis-je (sur-titre + titre), à quoi sert l'écran
 * (description), et l'action principale — une seule, à droite.
 */
export function PageHeader({
  surtitre,
  titre,
  description,
  actions,
  meta,
}: {
  surtitre?: ReactNode;
  titre: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-rule pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 animate-rise">
        {surtitre && (
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-accent">
            {surtitre}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-[-0.015em] text-ink text-balance">{titre}</h1>
        {description && (
          <p className="mt-1.5 max-w-[68ch] text-base text-muted text-pretty">{description}</p>
        )}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">{meta}</div>}
      </div>
      {actions && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 animate-rise"
          style={{ animationDelay: "60ms" }}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
