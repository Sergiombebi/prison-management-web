import "server-only";

import type { DetenuOption } from "@/lib/domain/types";
import { api } from "@/lib/api";
import { optionnel } from "./disponibilite";

/**
 * Résout un détenu déjà connu (id passé en paramètre d'URL, ex. `?detenu=123` depuis sa
 * fiche) en l'option minimale attendue par `SelectDetenu`, pour préremplir le champ sans
 * avoir à précharger toute la population présente. Un seul appel ciblé, et seulement
 * quand un id est effectivement fourni — pas à chaque affichage du formulaire.
 */
export async function resoudreDetenuInitial(id: number | undefined): Promise<DetenuOption | null> {
  if (!id || !Number.isFinite(id) || id <= 0) return null;
  const dossier = await optionnel(() => api.getDossierDetenu(id), null);
  if (!dossier) return null;
  const { detenu } = dossier;
  return { id: detenu.id, nom: detenu.nom, numeroEcrou: detenu.numeroEcrou, cellule: detenu.cellule };
}
