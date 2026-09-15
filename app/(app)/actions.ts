"use server";

import { redirect } from "next/navigation";
import { fermerSession } from "@/lib/session";

export async function seDeconnecter() {
  await fermerSession();
  redirect("/connexion");
}
