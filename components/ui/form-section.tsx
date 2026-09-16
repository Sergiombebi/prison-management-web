import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Section numérotée d'un long formulaire, posée comme une carte autonome :
 * numéro et intitulé à gauche, champs à droite. Sous `lg`, tout passe en une
 * colonne. Découper un formulaire de quarante champs en cartes rend le
 * défilement lisible et donne un repère de progression.
 */
export function FormSection({
  id,
  numero,
  titre,
  description,
  children,
  className,
}: {
  id?: string;
  numero?: string;
  titre: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-titre` : undefined}
      className={cn(
        "grid scroll-mt-24 gap-x-8 gap-y-5 rounded-lg border border-hairline bg-surface p-5 shadow-e1 sm:p-6 lg:grid-cols-[210px_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-2.5">
          {numero && (
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent-soft font-mono text-2xs font-bold text-accent-ink">
              {numero}
            </span>
          )}
          <h2 id={id ? `${id}-titre` : undefined} className="text-md font-semibold tracking-[-0.01em] text-ink">
            {titre}
          </h2>
        </div>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Force un champ à occuper toute la largeur de la grille de section. */
export function Pleine({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
