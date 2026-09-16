import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatNombre } from "@/lib/format";

export interface Onglet {
  href: string;
  label: string;
  compte?: number;
  actif: boolean;
}

/**
 * Onglets par liens : l'onglet ouvert vit dans l'URL, se partage et survit au
 * rafraîchissement. Pas de JavaScript nécessaire.
 *
 * Le repère actif porte un `view-transition-name` : d'un onglet à l'autre, il
 * glisse au lieu de sauter.
 */
export function TabsNav({
  items,
  label,
  className,
}: {
  items: Onglet[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("-mb-px overflow-x-auto", className)}>
      <ul className="flex min-w-max items-center gap-1 border-b border-hairline">
        {items.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              scroll={false}
              aria-current={o.actif ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-2 rounded-t-md px-3 text-sm transition-colors duration-[var(--dur-fast)]",
                o.actif
                  ? "font-medium text-ink"
                  : "text-muted hover:bg-raised hover:text-ink",
              )}
            >
              {o.label}
              {o.compte !== undefined && (
                <span
                  className={cn(
                    "tnum rounded-full px-1.5 text-2xs transition-colors",
                    o.actif ? "bg-accent text-ink-inverse" : "bg-sunken text-faint",
                  )}
                >
                  {formatNombre(o.compte)}
                </span>
              )}
              {o.actif && (
                <span
                  aria-hidden
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
                  style={{ viewTransitionName: "sgp-onglet" }}
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
