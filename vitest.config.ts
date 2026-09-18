import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Tests unitaires de la couche données et des utilitaires.
 *
 * `lib/api/live.ts` importe `server-only`, un marqueur destiné au bundler qui n'a
 * pas de sens ici : on le remplace par un module vide. Ses fonctions de traduction
 * API → domaine, elles, sont de simples fonctions pures, parfaitement testables.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/stubs/vide.ts", import.meta.url)),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
