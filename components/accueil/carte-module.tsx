import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, IconTile } from "@/components/ui/icon";
import type { ModuleNav } from "@/lib/navigation";

/**
 * Porte d'entrée d'un module, sur l'écran d'accueil.
 *
 * L'accueil ne liste que les modules réellement ouverts au compte connecté : une
 * carte affichée est une carte cliquable, jamais une invitation à se faire refuser
 * l'accès. `chiffre` reste facultatif — tous les modules n'ont pas d'indicateur à
 * montrer, et un chiffre absent vaut mieux qu'un zéro inventé.
 */
export function CarteModule({
  module,
  chiffre,
  legende,
  index = 0,
}: {
  module: ModuleNav;
  chiffre?: ReactNode;
  legende?: string;
  index?: number;
}) {
  return (
    <li style={{ ["--i" as string]: index }}>
      <Link
        href={module.href}
        transitionTypes={["nav-forward"]}
        className={cn(
          "lift group flex h-full flex-col gap-3 rounded-lg border border-hairline bg-surface p-4 shadow-e1",
          "transition-colors hover:border-accent/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <IconTile name={module.icone} size={18} className="size-10 rounded-xl shadow-e1" />
          <Icon
            name="arrowRight"
            size={14}
            className="mt-1 shrink-0 text-faint transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[-0.01em] text-ink">{module.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{module.description}</p>
        </div>

        {chiffre !== undefined && (
          <p className="mt-auto flex items-baseline gap-1.5 border-t border-hairline pt-3">
            <span className="tnum text-xl font-semibold tracking-[-0.03em] text-ink">{chiffre}</span>
            {legende && <span className="text-2xs text-muted">{legende}</span>}
          </p>
        )}
      </Link>
    </li>
  );
}
