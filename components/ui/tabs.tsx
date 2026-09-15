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
      <ul className="flex min-w-max gap-5 border-b border-hairline">
        {items.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              scroll={false}
              aria-current={o.actif ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-2 text-sm transition-colors duration-[var(--dur-fast)]",
                o.actif ? "font-medium text-ink" : "text-muted hover:text-ink",
              )}
            >
              {o.label}
              {o.compte !== undefined && (
                <span
                  className={cn(
                    "tnum rounded-xs px-1.5 text-2xs",
                    o.actif ? "bg-accent-soft text-accent-ink" : "bg-sunken text-faint",
                  )}
                >
                  {formatNombre(o.compte)}
                </span>
              )}
              {o.actif && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-px h-0.5 origin-left rounded-full bg-accent"
                  style={{ animation: "sgp-grow-x var(--dur-slow) var(--ease-out) both" }}
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
