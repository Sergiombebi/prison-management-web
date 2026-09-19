import Image from "next/image";
import { cn } from "@/lib/cn";

/** Logo de l'établissement (paramètres) ; à défaut, un cercle « LOGO » en pointillé. */
export function LogoEtablissement({
  url,
  className,
  sizes = "80px",
}: {
  url: string | null | undefined;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn("relative grid size-14 shrink-0 place-items-center overflow-hidden", className)}>
      {url ? (
        <Image src={url} alt="Logo de l’établissement" fill unoptimized sizes={sizes} className="object-contain" />
      ) : (
        <span className="grid size-full place-items-center rounded-full border border-neutral-400 font-mono text-[10px] text-neutral-500">
          LOGO
        </span>
      )}
    </div>
  );
}
