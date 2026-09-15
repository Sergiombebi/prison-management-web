import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { MODE_API } from "@/lib/api";
import { getProfil } from "@/lib/session";
import { seDeconnecter } from "./actions";

export default async function ApplicationLayout({ children }: LayoutProps<"/">) {
  const profil = await getProfil();
  // Le proxy filtre déjà les visiteurs sans cookie ; ceci couvre un cookie illisible.
  if (!profil) redirect("/connexion");

  return (
    <AppShell profil={profil} modeApi={MODE_API} seDeconnecter={seDeconnecter}>
      {children}
    </AppShell>
  );
}
