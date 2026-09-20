import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import type { ModuleMetier } from "@/lib/domain/modules";

/**
 * Porte d'entrée d'un module, sur l'écran d'accueil.
 *
 * L'accueil ne montre que les modules réellement ouverts au compte connecté : une
 * carte affichée est une carte cliquable, jamais une invitation à se faire refuser
 * l'accès. Chaque carte prend la teinte de son module — la même que dans la
 * sidebar, sur les puces du Personnel et sur son sous-tableau de bord — pour que
 * la couleur serve de repère d'un écran à l'autre.
 */
export function CarteModule({
  module,
  chiffre,
  legende,
  index = 0,
}: {
  module: ModuleMetier;
  chiffre?: ReactNode;
  legende?: string;
  index?: number;
}) {
  return (
    <li
      style={
        {
          "--i": index,
          "--teinte": module.teinte.trait,
          "--voile": module.teinte.voile,
        } as CSSProperties
      }
    >
      <Link
        href={module.accueil}
        transitionTypes={["nav-forward"]}
        className={cn(
          "lift group relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-hairline bg-surface p-4 shadow-e1",
          "transition-colors hover:border-[color:var(--teinte)]/45",
        )}
      >
        {/* Le voile du module monte au survol : la carte s'identifie avant d'être ouverte */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-0 blur-2xl transition-opacity duration-[var(--dur-slow)] group-hover:opacity-100"
          style={{ background: "var(--voile)" }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-x-100"
          style={{ backgroundColor: "var(--teinte)" }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-xl text-[color:var(--teinte)] shadow-e1 ring-1 ring-inset ring-[color:var(--teinte)]/25"
            style={{ backgroundColor: "var(--voile)" }}
          >
            <Icon name={module.icone} size={18} />
          </span>
          <Icon
            name="arrowRight"
            size={14}
            className="mt-1 shrink-0 text-faint transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-[color:var(--teinte)]"
          />
        </div>

        <div className="relative min-w-0">
          <p className="text-sm font-semibold tracking-[-0.01em] text-ink">{module.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{module.resume}</p>
        </div>

        {chiffre !== undefined && (
          <p className="relative mt-auto flex items-baseline gap-1.5 border-t border-hairline pt-3">
            <span className="tnum text-xl font-semibold tracking-[-0.03em] text-ink">{chiffre}</span>
            {legende && <span className="text-2xs text-muted">{legende}</span>}
          </p>
        )}
      </Link>
    </li>
  );
}
