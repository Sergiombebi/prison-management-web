import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDateLongue } from "@/lib/format";
import { Compteur } from "@/components/data/compteur";
import { Icon, type NomIcone } from "@/components/ui/icon";
import type { ModuleMetier } from "@/lib/domain/modules";

/**
 * Briques des quatre sous-tableaux de bord.
 *
 * Chaque module porte sa teinte (`--teinte`, `--voile`) héritée depuis le bandeau :
 * un seul jeu de composants sert les quatre écrans sans qu'ils se ressemblent. Le
 * mouvement y est toujours porteur — une jauge se remplit à la hauteur de sa
 * valeur, une tuile s'allume à sa place dans le plan — jamais décoratif.
 */

/** Enveloppe qui pose la teinte du module pour tous ses enfants. */
export function CadreModule({
  module,
  children,
  className,
}: {
  module: ModuleMetier;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      style={
        {
          "--teinte": module.teinte.trait,
          "--voile": module.teinte.voile,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * Bandeau d'identité du module : c'est lui qui rend l'écran reconnaissable au
 * premier coup d'œil. Le voile coloré dérive lentement derrière le titre, et le
 * point « en direct » signale que les chiffres viennent d'être relevés.
 */
export function BandeauModule({
  module,
  titre,
  phrase,
  actions,
  children,
}: {
  module: ModuleMetier;
  titre: string;
  /** Une phrase qui résume la situation, écrite avec les chiffres du jour. */
  phrase: ReactNode;
  actions?: ReactNode;
  /** Indicateurs en pied de bandeau. */
  children?: ReactNode;
}) {
  return (
    <section
      data-print-hide
      className="relative overflow-hidden rounded-xl border border-hairline bg-surface shadow-e2"
    >
      {/* Deux voiles décalés : la couleur du module respire sans jamais gêner la lecture */}
      <span
        aria-hidden
        className="aurore pointer-events-none absolute -left-24 -top-32 size-[26rem] rounded-full blur-3xl"
        style={{ background: "var(--voile)" }}
      />
      <span
        aria-hidden
        className="aurore pointer-events-none absolute -right-28 -top-20 size-[20rem] rounded-full blur-3xl"
        style={{ background: "var(--voile)", animationDelay: "-7s" }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--teinte), transparent)",
        }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              aria-hidden
              className="relative grid size-12 shrink-0 place-items-center rounded-xl text-[color:var(--teinte)] shadow-e1 ring-1 ring-inset ring-[color:var(--teinte)]/25 animate-pop"
              style={{ backgroundColor: "var(--voile)" }}
            >
              <Icon name={module.icone} size={22} />
            </span>
            <div className="min-w-0 animate-rise">
              <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.14em] text-[color:var(--teinte)]">
                <span className="relative grid size-1.5 place-items-center">
                  <span
                    aria-hidden
                    className="onde absolute size-1.5 rounded-full"
                    style={{ backgroundColor: "var(--teinte)" }}
                  />
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: "var(--teinte)" }}
                  />
                </span>
                {module.label}
              </p>
              <h1 className="mt-1.5 text-balance text-xl font-semibold tracking-[-0.025em] text-ink md:text-2xl">
                {titre}
              </h1>
              <p className="mt-2 max-w-[62ch] text-pretty text-base leading-relaxed text-muted">
                {phrase}
              </p>
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-faint">
                <Icon name="clock" size={12} />
                {formatDateLongue(new Date())}
              </p>
            </div>
          </div>

          {actions && (
            <div
              className="flex shrink-0 flex-wrap items-center gap-2 animate-rise"
              style={{ animationDelay: "80ms" }}
            >
              {actions}
            </div>
          )}
        </div>

        {children && <div className="border-t border-hairline pt-5">{children}</div>}
      </div>
    </section>
  );
}

/**
 * Chiffre du bandeau : grand, avec sa part visualisée dessous.
 *
 * La barre ne mesure pas une échelle absolue mais la part de ce chiffre dans son
 * total — c'est ce qui fait qu'on la lit d'un regard sans lire l'axe.
 */
export function Chiffre({
  label,
  valeur,
  decimales = 0,
  unite,
  aide,
  part,
  ton = "teinte",
  href,
  index = 0,
}: {
  label: string;
  valeur: number;
  decimales?: number;
  unite?: string;
  aide?: ReactNode;
  /** Part de 0 à 1 — longueur de la jauge sous le chiffre. */
  part?: number;
  ton?: "teinte" | "attention" | "critique" | "positif";
  href?: string;
  index?: number;
}) {
  const couleur =
    ton === "critique"
      ? "var(--sgp-danger)"
      : ton === "attention"
        ? "var(--sgp-warning)"
        : ton === "positif"
          ? "var(--sgp-success)"
          : "var(--teinte)";

  const contenu = (
    <>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="tnum text-2xl font-semibold tracking-[-0.035em] text-ink">
          <Compteur valeur={valeur} decimales={decimales} />
        </span>
        {unite && <span className="text-sm font-medium text-muted">{unite}</span>}
      </p>
      {part !== undefined && (
        <span aria-hidden className="mt-2.5 block h-1 overflow-hidden rounded-full bg-sunken">
          <span
            className="jauge block h-full rounded-full"
            style={
              {
                backgroundColor: couleur,
                "--part": Math.max(0, Math.min(1, part)),
                "--i": index,
                transform: `scaleX(${Math.max(0, Math.min(1, part))})`,
              } as CSSProperties
            }
          />
        </span>
      )}
      {aide && <p className="mt-2 text-2xs leading-relaxed text-muted">{aide}</p>}
    </>
  );

  const classes =
    "block min-w-0 rounded-lg px-3 py-2.5 transition-colors duration-[var(--dur-fast)]";

  return (
    <div style={{ ["--i" as string]: index }}>
      {href ? (
        <Link href={href} className={cn(classes, "group hover:bg-sunken/70")}>
          {contenu}
        </Link>
      ) : (
        <div className={classes}>{contenu}</div>
      )}
    </div>
  );
}

/** Rangée de chiffres du bandeau — deux colonnes en poche, quatre au large. */
export function RangeeChiffres({ children }: { children: ReactNode }) {
  return (
    <div className="stagger grid grid-cols-2 gap-x-2 gap-y-4 divide-hairline sm:grid-cols-4 sm:divide-x">
      {children}
    </div>
  );
}

/**
 * Carte de contenu d'un sous-tableau de bord. Plus sobre que `Panel` : pas de
 * bordure d'en-tête, un titre qui respire, et la teinte du module sur l'icône.
 */
export function Bloc({
  titre,
  sousTitre,
  icone,
  actions,
  className,
  flush,
  children,
}: {
  titre: string;
  sousTitre?: ReactNode;
  icone?: NomIcone;
  actions?: ReactNode;
  className?: string;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "reveal relative overflow-hidden rounded-xl border border-hairline bg-surface shadow-e1",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {icone && (
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-md text-[color:var(--teinte)] ring-1 ring-inset ring-[color:var(--teinte)]/20"
              style={{ backgroundColor: "var(--voile)" }}
            >
              <Icon name={icone} size={14} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{titre}</h2>
            {sousTitre && <p className="truncate text-xs text-muted">{sousTitre}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn(!flush && "px-4 pb-4")}>{children}</div>
    </section>
  );
}

/**
 * Barre nommée : un libellé, une valeur, et une jauge qui part de zéro.
 *
 * Sert partout où l'on compare quelques catégories entre elles — la lecture se
 * fait sur la longueur relative, sans axe ni graduation à déchiffrer.
 */
export function Barre({
  label,
  valeur,
  total,
  href,
  couleur,
  index = 0,
  aide,
}: {
  label: string;
  valeur: number;
  total: number;
  href?: string;
  couleur?: string;
  index?: number;
  aide?: string;
}) {
  const part = total > 0 ? valeur / total : 0;
  const corps = (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-ink">{label}</span>
        <span className="tnum shrink-0 text-sm font-semibold text-ink">{valeur}</span>
      </span>
      <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sunken">
        <span
          className="jauge block h-full rounded-full"
          style={
            {
              backgroundColor: couleur ?? "var(--teinte)",
              "--part": part,
              "--i": index,
              transform: `scaleX(${part})`,
            } as CSSProperties
          }
        />
      </span>
      {aide && <span className="mt-1 block text-2xs text-muted">{aide}</span>}
    </>
  );

  return (
    <li style={{ ["--i" as string]: index }}>
      {href ? (
        <Link
          href={href}
          className="group block rounded-md px-1.5 py-1.5 transition-colors hover:bg-sunken/70"
        >
          {corps}
        </Link>
      ) : (
        <div className="px-1.5 py-1.5">{corps}</div>
      )}
    </li>
  );
}

export function ListeBarres({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-0.5">{children}</ul>;
}

/**
 * Ligne « à traiter » : ce qui demande une action, avec le repère chiffré à gauche.
 * C'est la seule partie de l'écran qui doit pouvoir se lire en diagonale.
 */
export function LigneAction({
  repere,
  uniteRepere,
  titre,
  detail,
  href,
  ton = "teinte",
  index = 0,
}: {
  repere: ReactNode;
  uniteRepere?: string;
  titre: string;
  detail?: ReactNode;
  href: string;
  ton?: "teinte" | "attention" | "critique";
  index?: number;
}) {
  return (
    <li style={{ ["--i" as string]: index }}>
      <Link
        href={href}
        className="group flex items-center gap-3.5 px-4 py-2.5 transition-colors hover:bg-sunken/70"
      >
        <span
          aria-hidden
          className={cn(
            "grid w-14 shrink-0 place-items-center rounded-lg py-1.5",
            ton === "critique" && "bg-danger-soft text-danger",
            ton === "attention" && "bg-warning-soft text-warning",
          )}
          style={
            ton === "teinte"
              ? { backgroundColor: "var(--voile)", color: "var(--teinte)" }
              : undefined
          }
        >
          <span className="tnum text-lg font-semibold leading-none">{repere}</span>
          {uniteRepere && <span className="mt-0.5 text-2xs text-muted">{uniteRepere}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{titre}</span>
          {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
        </span>
        <Icon
          name="arrowRight"
          size={14}
          className="shrink-0 text-faint opacity-0 transition-all duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </Link>
    </li>
  );
}

export function ListeActions({ children }: { children: ReactNode }) {
  return <ul className="stagger divide-y divide-hairline">{children}</ul>;
}

/** Rien à signaler — dit sobrement, sans la mise en scène d'un état vide. */
export function RienASignaler({ texte }: { texte: string }) {
  return (
    <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
      <Icon name="check" size={15} className="shrink-0 text-success" />
      {texte}
    </p>
  );
}

/** Raccourcis de bas d'écran vers les écrans de travail du module. */
export function Raccourcis({
  liens,
}: {
  liens: { href: string; label: string; aide: string; icone: NomIcone }[];
}) {
  return (
    <ul className="stagger grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {liens.map((l, i) => (
        <li key={l.href} style={{ ["--i" as string]: i }}>
          <Link
            href={l.href}
            transitionTypes={["nav-forward"]}
            className="lift group flex h-full items-center gap-3 rounded-lg border border-hairline bg-surface px-3.5 py-3 shadow-e1 hover:border-[color:var(--teinte)]/40"
          >
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-lg text-[color:var(--teinte)] ring-1 ring-inset ring-[color:var(--teinte)]/20"
              style={{ backgroundColor: "var(--voile)" }}
            >
              <Icon name={l.icone} size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{l.label}</span>
              <span className="block truncate text-2xs text-muted">{l.aide}</span>
            </span>
            <Icon
              name="arrowRight"
              size={13}
              className="shrink-0 text-faint transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
