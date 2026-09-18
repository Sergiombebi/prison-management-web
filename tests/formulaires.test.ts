import { describe, expect, it } from "vitest";
import { construireDetenu, construireMandat, valeursSaisies } from "@/lib/api/formulaires";
import { entier, etatDepuisErreur, optionnel, texte } from "@/lib/api/actions";
import { ApiErreur } from "@/lib/api/contract";

/** Construit un FormData comme celui qu'un navigateur enverrait. */
function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) f.append(cle, valeur);
  return f;
}

const MINIMUM = {
  numero_ecrou: " E-1 ",
  nom: "  Nkolo Jean ",
  sexe: "Masculin",
  date_naissance: "1990-05-12",
  lieu_naissance: "Yaoundé",
  profession: "Menuisier",
  nom_pere: "Pierre",
  nom_mere: "Marie",
};

describe("construireDetenu", () => {
  it("nettoie les espaces autour des saisies", () => {
    const e = construireDetenu(formulaire(MINIMUM));
    expect(e.numeroEcrou).toBe("E-1");
    expect(e.nom).toBe("Nkolo Jean");
  });

  it("transforme un champ optionnel vide en null, pas en chaîne vide", () => {
    const e = construireDetenu(formulaire({ ...MINIMUM, religion: "   ", nationalite: "Camerounaise" }));
    expect(e.religion).toBeNull();
    expect(e.nationalite).toBe("Camerounaise");
  });

  it("convertit le nombre d'enfants, et le laisse nul s'il n'est pas renseigné", () => {
    expect(construireDetenu(formulaire({ ...MINIMUM, nombre_enfants: "2" })).nombreEnfants).toBe(2);
    expect(construireDetenu(formulaire(MINIMUM)).nombreEnfants).toBeNull();
  });

  it("regroupe le contact d'urgence", () => {
    const e = construireDetenu(
      formulaire({ ...MINIMUM, contact_urgence_nom: "Marie", contact_urgence_telephone: "699000111" }),
    );
    expect(e.contactUrgence).toEqual({
      nom: "Marie",
      lienParente: null,
      telephone: "699000111",
      adresse: null,
    });
  });

  it("retombe sur « Masculin » si le sexe n'a pas été choisi", () => {
    expect(construireDetenu(formulaire({ ...MINIMUM, sexe: "" })).sexe).toBe("Masculin");
  });
});

describe("construireMandat", () => {
  it("garde les rubriques renseignées et annule les autres", () => {
    const m = construireMandat(
      formulaire({
        type_statut_penal: "Exécution de peine",
        date_incarceration: "2026-01-10",
        autorite_signataire: "Procureur",
        motif_detention: "Vol",
        type_mandat: "Mandat de dépôt",
        reference_mandat: "REF-1",
        date_signature_mandat: "2026-01-09",
        date_expiration_mandat: "2027-01-09",
        date_jugement: "2026-02-01",
        peine_prononcee: "24 mois",
        date_appel: "",
      }),
    );
    expect(m.typeStatutPenal).toBe("Exécution de peine");
    expect(m.dateJugement).toBe("2026-02-01");
    expect(m.peinePrononcee).toBe("24 mois");
    expect(m.dateAppel).toBeNull();
  });
});

describe("valeursSaisies", () => {
  it("renvoie les saisies non vides, pour les réafficher après une erreur", () => {
    const f = formulaire({ nom: "Nkolo", religion: "", numero_ecrou: "E-1" });
    expect(valeursSaisies(f)).toEqual({ nom: "Nkolo", numero_ecrou: "E-1" });
  });

  it("ignore les fichiers : une photo ne se réaffiche pas dans un champ texte", () => {
    const f = formulaire({ nom: "Nkolo" });
    f.append("photo_face", new File(["x"], "face.png", { type: "image/png" }));
    expect(valeursSaisies(f)).toEqual({ nom: "Nkolo" });
  });
});

describe("lecture des champs", () => {
  it("texte, optionnel et entier interprètent les saisies vides de la même façon", () => {
    const f = formulaire({ a: " x ", vide: "  ", n: "12", pasUnNombre: "abc" });
    expect(texte(f, "a")).toBe("x");
    expect(texte(f, "absent")).toBe("");
    expect(optionnel(f, "vide")).toBeNull();
    expect(entier(f, "n")).toBe(12);
    expect(entier(f, "pasUnNombre")).toBeNull();
    expect(entier(f, "absent")).toBeNull();
  });
});

describe("etatDepuisErreur", () => {
  it("transforme une erreur de validation en état de formulaire, saisies conservées", () => {
    const f = formulaire({ numero_ecrou: "E-1" });
    const etat = etatDepuisErreur(
      new ApiErreur("Ce numéro d'écrou est déjà utilisé.", 422, "VALIDATION", {
        numero_ecrou: ["Ce numéro d'écrou est déjà utilisé."],
      }),
      f,
    );
    expect(etat.message).toBe("Ce numéro d'écrou est déjà utilisé.");
    expect(etat.erreurs?.numero_ecrou?.[0]).toContain("déjà utilisé");
    expect(etat.valeurs).toEqual({ numero_ecrou: "E-1" });
    expect(etat.ok).toBeUndefined();
  });

  it("relance ce qui n'est pas une erreur d'API — la redirection de Next doit passer", () => {
    const controle = new Error("NEXT_REDIRECT");
    expect(() => etatDepuisErreur(controle)).toThrow(controle);
  });
});
