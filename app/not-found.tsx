import { ButtonLink } from "@/components/ui/button";

export default function Introuvable() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-faint">Erreur 404</p>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Cette page n&apos;existe pas</h1>
        <p className="mt-2 max-w-md text-base text-muted">
          Le lien est peut-être incomplet, ou l&apos;enregistrement a été retiré du registre.
        </p>
      </div>
      <ButtonLink href="/tableau-de-bord" variante="primaire" icone="arrowLeft">
        Retour au tableau de bord
      </ButtonLink>
    </div>
  );
}
