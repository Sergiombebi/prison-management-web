import { describe, expect, it } from "vitest";
import { formatDate, initiales, joursRestants, ouVide, pluriel, tronquer, VIDE } from "@/lib/format";
import { filtresActifs, hrefAvec, param, paramEntier } from "@/lib/url";
import {
  CATEGORIE_SLUG,
  LIBELLE_CATEGORIE,
  LIBELLE_TYPE_SORTIE,
  SLUG_TYPE_SORTIE,
  TYPES_STATUT_PENAL,
} from "@/lib/domain/referentiels";
import type { CategoriePenale, TypeSortie } from "@/lib/domain/types";

describe("mise en forme", () => {
  it("affiche un tiret plutôt qu'un vide ou une date invalide", () => {
    expect(formatDate(null)).toBe(VIDE);
    expect(formatDate("pas une date")).toBe(VIDE);
    expect(ouVide(null)).toBe(VIDE);
    expect(ouVide(0)).toBe("0");
  });

  it("compte les jours restants, négatifs quand l'échéance est passée", () => {
    const dans10 = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const ilYa5 = new Date(Date.now() - 5 * 86_400_000).toISOString();
    expect(joursRestants(dans10)).toBe(10);
    expect(joursRestants(ilYa5)).toBeLessThan(0);
    expect(joursRestants(null)).toBeNull();
  });

  it("accorde les libellés au pluriel", () => {
    expect(pluriel(0, "mandat")).toBe("0 mandat");
    expect(pluriel(1, "mandat")).toBe("1 mandat");
    expect(pluriel(3, "mandat")).toBe("3 mandats");
    expect(pluriel(2, "place libre", "places libres")).toBe("2 places libres");
  });

  it("tronque sans couper au milieu d'un mot invisible", () => {
    expect(tronquer("Vol aggravé en réunion", 10).length).toBeLessThanOrEqual(11);
    expect(tronquer(null)).toBe(VIDE);
  });

  it("construit des initiales lisibles", () => {
    expect(initiales("Owona Patrice")).toBe("OP");
    // Une pastille d'avatar affiche « ? » plutôt qu'un tiret
    expect(initiales(null)).toBe("?");
  });
});

describe("paramètres d'URL", () => {
  it("lit un paramètre simple ou répété", () => {
    expect(param({ recherche: "nkolo" }, "recherche")).toBe("nkolo");
    expect(param({ page: ["2", "3"] }, "page")).toBe("2");
    expect(param({}, "absent")).toBeUndefined();
  });

  it("retombe sur la valeur par défaut si l'entier est absurde", () => {
    expect(paramEntier({ page: "3" }, "page", 1)).toBe(3);
    expect(paramEntier({ page: "abc" }, "page", 1)).toBe(1);
  });

  it("conserve les filtres en changeant de page, et retire une valeur vidée", () => {
    const href = hrefAvec("/detenus", { recherche: "nkolo", page: "2" }, { page: 3 });
    expect(href).toContain("recherche=nkolo");
    expect(href).toContain("page=3");
    expect(hrefAvec("/detenus", { recherche: "nkolo" }, { recherche: null })).toBe("/detenus");
  });

  it("détecte qu'au moins un filtre est actif", () => {
    expect(filtresActifs({ recherche: "x" }, ["recherche", "categorie"])).toBe(true);
    expect(filtresActifs({ onglet: "mandats" }, ["recherche", "categorie"])).toBe(false);
  });
});

describe("référentiels partagés avec l'API", () => {
  it("chaque catégorie pénale a un code d'API et un libellé", () => {
    for (const categorie of Object.keys(LIBELLE_CATEGORIE) as CategoriePenale[]) {
      expect(CATEGORIE_SLUG[categorie]).toBeTruthy();
      expect(LIBELLE_CATEGORIE[categorie]).toBeTruthy();
    }
  });

  it("chaque type de sortie a un segment d'URL réversible", () => {
    for (const [slug, type] of Object.entries(SLUG_TYPE_SORTIE)) {
      expect(LIBELLE_TYPE_SORTIE[type as TypeSortie]).toBeTruthy();
      expect(slug).not.toContain("/");
    }
    // Les quatre types du domaine sont tous joignables par une URL
    expect(new Set(Object.values(SLUG_TYPE_SORTIE)).size).toBe(4);
  });

  it("ne propose à la saisie que les statuts pénaux acceptés par l'API", () => {
    expect([...TYPES_STATUT_PENAL]).toEqual([
      "Détention provisoire",
      "Exécution de peine",
      "Appellant",
      "Cassationnaire",
    ]);
  });
});
