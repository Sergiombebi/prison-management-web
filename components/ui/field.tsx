import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/*
 * Champs de formulaire. Règles appliquées partout :
 * - le libellé est toujours visible au-dessus du champ (un placeholder n'est pas un libellé) ;
 * - l'aide et l'erreur sont reliées au champ via aria-describedby ;
 * - l'obligation est signalée par un astérisque ET annoncée aux lecteurs d'écran.
 */

const CONTROLE =
  "w-full rounded-md border border-rule bg-surface text-ink placeholder:text-faint " +
  "transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out " +
  "hover:border-rule-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 " +
  "disabled:bg-sunken disabled:text-faint aria-invalid:border-danger aria-invalid:focus:ring-danger/15";

interface ChampProps {
  label: string;
  requis?: boolean;
  aide?: string;
  erreur?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
    required?: boolean;
  }) => ReactNode;
}

export function Field({ label, requis, aide, erreur, className, children }: ChampProps) {
  const id = useId();
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decrit = [idErreur, idAide].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-ink">
        {label}
        {requis && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children({
        id,
        "aria-describedby": decrit,
        "aria-invalid": erreur ? true : undefined,
        required: requis,
      })}
      {erreur ? (
        <p id={idErreur} className="flex items-center gap-1 text-xs text-danger">
          <Icon name="alert" size={12} />
          {erreur}
        </p>
      ) : (
        aide && (
          <p id={idAide} className="text-xs text-faint">
            {aide}
          </p>
        )
      )}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(CONTROLE, "h-9 px-3 text-base", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(CONTROLE, "min-h-20 px-3 py-2 text-base leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  placeholder,
  ...rest
}: ComponentProps<"select"> & { placeholder?: string }) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROLE, "h-9 appearance-none pl-3 pr-8 text-base", className)}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  );
}

/** Champ de recherche avec icône, pour les barres de filtres. */
export function SearchInput({ className, ...rest }: ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Icon
        name="search"
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        type="search"
        className={cn(CONTROLE, "h-9 pl-9 pr-3 text-base")}
        {...rest}
      />
    </div>
  );
}
