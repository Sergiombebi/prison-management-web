/**
 * Point d'entrée unique de la couche données.
 *
 *   import { api } from "@/lib/api";
 *   const dossier = await api.getDossierDetenu(12);
 *
 * Réservé aux composants serveur, aux Server Actions et aux route handlers
 * (`server-only`). Un composant client reçoit ses données en props.
 */

import "server-only";

import type { ApiClient } from "./contract";
import { liveApi } from "./live";
import { mockApi } from "./mock";

export const MODE_API: "mock" | "live" =
  process.env.SGP_API_MODE === "live" ? "live" : "mock";

export const api: ApiClient = MODE_API === "live" ? liveApi : mockApi;

export { ApiErreur } from "./contract";
export type { DossierDetenu, MandatDetaille, SessionUtilisateur } from "./contract";
