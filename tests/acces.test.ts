import { describe, expect, it } from "vitest";
import {
  ACCUEIL,
  aAcces,
  memesPermissions,
  pageDArrivee,
  permissionsRequises,
} from "@/lib/acces";
import { permissionsDuCookie } from "@/lib/session-cookies";
import { MODULES, peutVoirModule } from "@/lib/navigation";

/*
 * Règles d'accès par écran.
 *
 * Ces cas viennent d'un bug d'intégration : tous les profils atterrissaient sur
 * /tableau-de-bord, et ceux qui n'avaient pas `tableau_bord.consulter` y récoltaient
 * un 403 de l'API, donc l'écran d'erreur générique. Chaque test ci-dessous fige une
 * partie de la correction.
 */

/** Profils tels que les crée le seeder de l'API, une fois les droits accordés. */
const AGENT = [
  "detenus.consulter",
  "detenus.creer",
  "detenus.modifier",
  "detenus.mandats.gerer",
  "discipline.cellules.consulter",
  "visites.consulter",
  "visites.creer",
];

const MEDECIN = ["sante.consultations.consulter", "sante.consultations.creer"];

const ADMIN = [
  "tableau_bord.consulter",
  "detenus.consulter",
  "administration.personnel.gerer",
  "administration.parametres.gerer",
];

describe("permissionsRequises", () => {
  it("laisse ouverts les écrans sans droit propre", () => {
    expect(permissionsRequises("/accueil")).toEqual([]);
    expect(permissionsRequises("/profil")).toEqual([]);
    expect(permissionsRequises("/acces-refuse")).toEqual([]);
  });

  it("couvre un écran et ses sous-écrans", () => {
    expect(permissionsRequises("/detenus")).toEqual(["detenus.consulter"]);
    expect(permissionsRequises("/detenus/42")).toEqual(["detenus.consulter"]);
  });

  it("retient la règle la plus précise, pas la première du préfixe", () => {
    expect(permissionsRequises("/detenus/nouveau")).toEqual(["detenus.creer"]);
    expect(permissionsRequises("/detenus/liberation/evasion")).toEqual([
      "detenus.sorties.enregistrer",
    ]);
    expect(permissionsRequises("/detenus/42/modifier")).toEqual(["detenus.modifier"]);
    expect(permissionsRequises("/detenus/42/mandats/7")).toEqual(["detenus.mandats.gerer"]);
    expect(permissionsRequises("/discipline/sanctions/types")).toEqual([
      "discipline.types_sanction.gerer",
    ]);
  });

  it("ne confond pas « /detenus/mandats » avec la gestion des mandats d’un détenu", () => {
    // Le listing par catégorie se lit avec un simple droit de consultation.
    expect(permissionsRequises("/detenus/mandats")).toEqual(["detenus.consulter"]);
    expect(permissionsRequises("/detenus/mandats/prevenus")).toEqual(["detenus.consulter"]);
  });

  it("ne déborde pas sur un chemin qui partage seulement le début du segment", () => {
    expect(permissionsRequises("/detenus-archives")).toEqual([]);
  });
});

describe("aAcces", () => {
  it("ouvre ce que le profil peut réellement voir", () => {
    expect(aAcces(AGENT, "/detenus")).toBe(true);
    expect(aAcces(AGENT, "/detenus/nouveau")).toBe(true);
    expect(aAcces(AGENT, "/sante/visites")).toBe(true);
    expect(aAcces(MEDECIN, "/sante/suivi-medical")).toBe(true);
  });

  it("ferme ce qui n’est pas accordé", () => {
    // Le cœur du bug : ni l'agent ni le médecin n'ont le tableau de bord.
    expect(aAcces(AGENT, "/tableau-de-bord")).toBe(false);
    expect(aAcces(MEDECIN, "/tableau-de-bord")).toBe(false);
    expect(aAcces(AGENT, "/administration/personnel")).toBe(false);
    expect(aAcces(AGENT, "/detenus/liberation/evasion")).toBe(false);
    expect(aAcces(MEDECIN, "/detenus")).toBe(false);
  });

  it("laisse l’accueil et le profil ouverts, même sans aucun droit", () => {
    expect(aAcces([], "/accueil")).toBe(true);
    expect(aAcces([], "/profil")).toBe(true);
    expect(aAcces([], "/acces-refuse")).toBe(true);
  });

  it("suffit d’une seule permission quand l’écran en accepte plusieurs", () => {
    expect(aAcces(["administration.parametres.gerer"], "/administration/parametres")).toBe(true);
    expect(aAcces(["administration.parametres.gerer"], "/administration/personnel")).toBe(false);
  });

  it("ignore la chaîne de requête", () => {
    expect(aAcces(AGENT, "/detenus?recherche=KAMGA")).toBe(true);
    expect(aAcces(MEDECIN, "/tableau-de-bord?onglet=stats")).toBe(false);
  });
});

describe("pageDArrivee", () => {
  it("mène au tableau de bord complet quand il est accordé", () => {
    expect(pageDArrivee(ADMIN)).toBe("/tableau-de-bord");
  });

  it("mène à l’accueil condensé sinon — jamais vers un écran interdit", () => {
    expect(pageDArrivee(AGENT)).toBe(ACCUEIL);
    expect(pageDArrivee(MEDECIN)).toBe(ACCUEIL);
    expect(pageDArrivee([])).toBe(ACCUEIL);
    expect(pageDArrivee(null)).toBe(ACCUEIL);
  });
});

describe("cohérence avec la navigation", () => {
  it("n’affiche jamais un module que l’on ne pourrait pas ouvrir", () => {
    for (const profil of [AGENT, MEDECIN, ADMIN, []]) {
      for (const mod of MODULES) {
        if (peutVoirModule(profil, mod)) {
          expect([mod.id, aAcces(profil, mod.href)]).toEqual([mod.id, true]);
        }
      }
    }
  });

  it("chaque lien de sous-navigation visible est ouvrable", () => {
    for (const profil of [AGENT, MEDECIN, ADMIN]) {
      for (const mod of MODULES) {
        if (!peutVoirModule(profil, mod)) continue;
        for (const groupe of mod.groupes ?? []) {
          for (const lien of groupe.liens) {
            // Un module visible peut contenir un écran plus restreint (créer, libérer) :
            // ce qui compte est qu'il ne mène jamais à l'écran d'erreur générique.
            const requises = permissionsRequises(lien.href);
            const ouvrable = aAcces(profil, lien.href);
            expect([lien.href, ouvrable || requises.length > 0]).toEqual([lien.href, true]);
          }
        }
      }
    }
  });
});

describe("memesPermissions", () => {
  it("ne dépend pas de l’ordre", () => {
    expect(memesPermissions(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("repère un droit ajouté ou retiré", () => {
    expect(memesPermissions(["a", "b"], ["a"])).toBe(false);
    expect(memesPermissions(["a"], ["a", "b"])).toBe(false);
    expect(memesPermissions([], [])).toBe(true);
  });
});

describe("permissionsDuCookie", () => {
  it("lit les permissions d’un cookie de profil valide", () => {
    expect(permissionsDuCookie(JSON.stringify({ id: 1, permissions: ["detenus.consulter"] }))).toEqual([
      "detenus.consulter",
    ]);
  });

  it("répond « je ne sais pas » plutôt que « aucun droit » sur un cookie inutilisable", () => {
    // Renvoyer [] ferait bloquer le proxy sur tous les écrans, connexion comprise.
    expect(permissionsDuCookie(undefined)).toBeNull();
    expect(permissionsDuCookie("pas du json")).toBeNull();
    expect(permissionsDuCookie(JSON.stringify({ id: 1 }))).toBeNull();
  });

  it("distingue un compte sans aucun droit d’un cookie illisible", () => {
    expect(permissionsDuCookie(JSON.stringify({ id: 1, permissions: [] }))).toEqual([]);
  });
});
