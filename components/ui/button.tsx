import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type NomIcone } from "./icon";

type Variante = "primaire" | "secondaire" | "discret" | "danger";
type Taille = "sm" | "md" | "lg";

const BASE =
  "group/bouton relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium select-none " +
  "rounded-md transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-out " +
  "active:translate-y-px active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

const VARIANTES: Record<Variante, string> = {
  primaire: "bg-accent text-ink-inverse shadow-e2 hover:bg-accent-hover hover:shadow-e3",
  secondaire:
    "bg-surface text-ink border border-hairline shadow-e1 hover:border-rule hover:bg-raised hover:shadow-e2",
  discret: "text-muted hover:bg-sunken hover:text-ink",
  danger:
    "bg-surface text-danger border border-hairline shadow-e1 hover:border-danger/40 hover:bg-danger-soft hover:shadow-e2",
};

const TAILLES: Record<Taille, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-11 px-5 text-md",
};

const ICONE_TAILLE: Record<Taille, number> = { sm: 14, md: 16, lg: 17 };

/** Balayage lumineux au survol — uniquement sur l'action principale. */
function Reflet() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[var(--dur-base)] group-hover/bouton:opacity-100"
    >
      <span
        className="absolute inset-y-0 -left-full w-1/2 skew-x-12 bg-white/15 group-hover/bouton:animate-[sgp-sweep_900ms_var(--ease-soft)]"
      />
    </span>
  );
}

interface Commun {
  variante?: Variante;
  taille?: Taille;
  icone?: NomIcone;
  iconeDroite?: NomIcone;
  children?: ReactNode;
}

type BoutonProps = Commun & ComponentProps<"button"> & { chargement?: boolean };

export function Button({
  variante = "secondaire",
  taille = "md",
  icone,
  iconeDroite,
  chargement,
  className,
  children,
  disabled,
  ...rest
}: BoutonProps) {
  return (
    <button
      className={cn(BASE, VARIANTES[variante], TAILLES[taille], className)}
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      {...rest}
    >
      {variante === "primaire" && <Reflet />}
      {chargement ? (
        <span
          className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin-slow"
          aria-hidden
        />
      ) : (
        icone && <Icon name={icone} size={ICONE_TAILLE[taille]} />
      )}
      {children}
      {iconeDroite && (
        <Icon
          name={iconeDroite}
          size={ICONE_TAILLE[taille]}
          className="transition-transform duration-[var(--dur-base)] ease-out group-hover/bouton:translate-x-0.5"
        />
      )}
    </button>
  );
}

type LienBoutonProps = Commun &
  ComponentProps<typeof Link> & { transitionTypes?: string[] };

export function ButtonLink({
  variante = "secondaire",
  taille = "md",
  icone,
  iconeDroite,
  className,
  children,
  ...rest
}: LienBoutonProps) {
  return (
    <Link
      className={cn(BASE, VARIANTES[variante], TAILLES[taille], className)}
      {...rest}
    >
      {variante === "primaire" && <Reflet />}
      {icone && <Icon name={icone} size={ICONE_TAILLE[taille]} />}
      {children}
      {iconeDroite && (
        <Icon
          name={iconeDroite}
          size={ICONE_TAILLE[taille]}
          className="transition-transform duration-[var(--dur-base)] ease-out group-hover/bouton:translate-x-0.5"
        />
      )}
    </Link>
  );
}
