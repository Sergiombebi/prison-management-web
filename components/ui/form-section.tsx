import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Section numérotée d'un long formulaire, composée comme une rubrique de registre :
 * numéro et intitulé à gauche, champs à droite. Sous `lg`, tout passe en une colonne.
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
        "grid scroll-mt-20 gap-x-8 gap-y-4 border-b border-hairline py-7 first:pt-0 last:border-b-0 lg:grid-cols-[220px_minmax(0,1fr)]",
        className,
      )}
    >
      <div>
        {numero && <p className="font-mono text-2xs text-faint">{numero}</p>}
        <h2 id={id ? `${id}-titre` : undefined} className="text-base font-semibold text-ink">
          {titre}
        </h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Force un champ à occuper toute la largeur de la grille de section. */
export function Pleine({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
