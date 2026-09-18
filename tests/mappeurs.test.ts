import { describe, expect, it } from "vitest";
import {
  mandatActif,
  versAffectation,
  versCellule,
  versCorpsDetenu,
  versCorpsMandat,
  versResume,
  versResumeDetail,
  versSanction,
  versSortie,
  versSuiviMedical,
  versTableauDeBord,
  versVisite,
  type DetenuDetailApi,
  type DetenuListeApi,
  type MandasApi,
  type SanctionApi,
  type TableauDeBordApi,
} from "@/lib/api/live";
import type { MandatDetaille } from "@/lib/api/contract";

/*
 * Traduction API → domaine. C'est la couche où les malentendus coûtent le plus cher :
 * chaque cas ci-dessous correspond à un comportement attendu par un écran, et
 * plusieurs viennent de bugs réellement rencontrés pendant l'intégration.
 */

const DANS_UN_AN = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
const IL_Y_A_UN_AN = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

const mandatApi = (surcharge: Partial<MandasApi> = {}): MandasApi =>
  ({
    id: 1,
    detenu_id: 1,
    type_statut_penal: "Détention provisoire",
    date_incarceration: "2026-01-10",
    autorite_signataire: "Procureur",
    motif_detention: "Vol",
    type_mandat: "Mandat de dépôt",
    reference_mandat: "REF-1",
    date_signature_mandat: "2026-01-09",
    date_expiration_mandat: DANS_UN_AN,
    observations_statut: null,
    objets_personnels: null,
    autorite_penitentiaire: null,
    etat_physique_arrivee: null,
    date_jugement: null,
    reference_jugement: null,
    tribunal_jugement: null,
    motif_jugement: null,
    peine_prononcee: null,
    date_appel: null,
    tribunal_appel: null,
    decision_appel: null,
    observations_appel: null,
    date_cassation: null,
    tribunal_cassation: null,
    decision_cassation: null,
    observations_cassation: null,
    est_actif: true,
    ...surcharge,
  }) as MandasApi;

const ligneApi = (surcharge: Partial<DetenuListeApi> = {}): DetenuListeApi =>
  ({
    id: 7,
    numero_ecrou: "DEMO-P-007",
    nom: "Owona Patrice",
    sexe: "Masculin",
    date_naissance: "1992-04-11",
    lieu_naissance: "Yaoundé",
    nationalite: "Camerounaise",
    profession: "Chauffeur",
    contact: "699000111",
    statut_penal: "Détention provisoire",
    date_incarceration: "2026-01-10",
    motif_detention: "Vol",
    type_mandat: "Mandat de dépôt",
    est_present: true,
    ...surcharge,
  }) as DetenuListeApi;

describe("mandatActif", () => {
  it("écarte un mandat désactivé par l'API, même à échéance future", () => {
    expect(mandatActif(mandatApi({ est_actif: false }))).toBe(false);
  });

  it("retient un mandat sans échéance", () => {
    expect(mandatActif(mandatApi({ date_expiration_mandat: null }))).toBe(true);
  });

  it("écarte un mandat échu", () => {
    expect(mandatActif(mandatApi({ date_expiration_mandat: IL_Y_A_UN_AN }))).toBe(false);
  });
});

describe("versResume (ligne du registre)", () => {
  it("traduit le code de catégorie de l'API en nom du domaine", () => {
    expect(versResume(ligneApi({ categorie_penale: "condamnes" })).categoriePenale).toBe("Condamne");
    expect(versResume(ligneApi({ categorie_penale: "dpac" })).categoriePenale).toBe("Dpac");
  });

  it("laisse la catégorie nulle quand l'API ne la fournit pas", () => {
    expect(versResume(ligneApi()).categoriePenale).toBeNull();
  });

  it("reprend la cellule actuelle, ou signale son absence", () => {
    const loge = versResume(ligneApi({ cellule_actuelle: { id: 3, numero: "C4", bloc: "A" } }));
    expect(loge.cellule).toEqual({ id: 3, numero: "C4", bloc: "A" });
    expect(versResume(ligneApi({ cellule_actuelle: null })).cellule).toBeNull();
  });

  it("marque « Sorti » un détenu qui n'est plus présent", () => {
    expect(versResume(ligneApi({ est_present: false })).statut).toBe("Sorti");
  });

  it("n'invente pas de mandat courant quand la ligne n'en porte aucun", () => {
    const sansMandat = versResume(ligneApi({ statut_penal: null, date_incarceration: null }));
    expect(sansMandat.mandatCourant).toBeNull();
    expect(sansMandat.nombreMandatsActifs).toBe(0);
  });
});

describe("versResumeDetail (fiche détenu)", () => {
  const detail = (mandats: MandatDetaille[]) =>
    versResumeDetail(
      {
        ...ligneApi(),
        age: 34,
        langue: null,
        ethnie: null,
        religion: null,
        departement: null,
        arrondissement: null,
        residence: null,
        statut_matrimonial: null,
        nombre_enfants: 2,
        niveau_etudes: null,
        numero_cni: "123",
        numero_passeport: null,
        nom_pere: "Owona",
        nom_mere: "Mballa",
        contact_urgence: { nom: "Marie", lien_parente: "Époux/Épouse", telephone: "699", adresse: "Mvog-Ada" },
        photo_face_url: null,
        photo_profil_url: null,
        anthropometrie: null,
        cellule_actuelle: {
          id: 9,
          detenu_id: 7,
          cellule: { id: 3, numero: "C4", bloc: "A" },
          date_affectation: "2026-01-10T00:00:00+01:00",
          date_fin: null,
          est_active: true,
          motif_affectation: null,
        },
        created_at: "2026-01-10T08:00:00+01:00",
        updated_at: null,
      } as unknown as DetenuDetailApi,
      mandats,
    );

  const mandatDomaine = (id: number, actif: boolean, ouvert = true): MandatDetaille =>
    ({
      id,
      detenuId: 7,
      dateIncarceration: `2026-0${id}-10`,
      dateSortieMandat: null,
      typeMandat: "Mandat de dépôt",
      motifDetention: "Vol",
      typeStatutPenal: "Détention provisoire",
      detenuNom: "Owona Patrice",
      numeroEcrou: "DEMO-P-007",
      actif,
      ouvert,
    }) as MandatDetaille;

  it("ne compte que les mandats en vigueur (et non les mandats levés)", () => {
    const d = detail([mandatDomaine(3, true), mandatDomaine(2, false, false), mandatDomaine(1, false)]);
    expect(d.nombreMandatsActifs).toBe(1);
    expect(d.mandatCourant?.id).toBe(3);
  });

  it("ne désigne aucun mandat courant si tous sont levés ou échus", () => {
    const d = detail([mandatDomaine(1, false), mandatDomaine(2, false)]);
    expect(d.mandatCourant).toBeNull();
    expect(d.nombreMandatsActifs).toBe(0);
  });

  it("remonte la cellule actuelle et le contact d'urgence complet", () => {
    const d = detail([mandatDomaine(1, true)]);
    expect(d.cellule).toEqual({ id: 3, numero: "C4", bloc: "A" });
    expect(d.contactUrgence).toEqual({
      nom: "Marie",
      lienParente: "Époux/Épouse",
      telephone: "699",
      adresse: "Mvog-Ada",
    });
  });
});

describe("versCorpsDetenu (corps envoyé à l'API)", () => {
  const entree = {
    numeroEcrou: "E-1",
    nom: "Nkolo",
    sexe: "Masculin" as const,
    dateNaissance: "1990-01-01",
    lieuNaissance: "Yaoundé",
    profession: "Menuisier",
    nomPere: "Pierre",
    nomMere: "Marie",
    religion: null,
    contactUrgence: { nom: null, lienParente: null, telephone: "699", adresse: null },
  };

  it("à la création, n'envoie pas les champs vides", () => {
    const corps = versCorpsDetenu(entree);
    expect(corps).not.toHaveProperty("religion");
    expect(corps).not.toHaveProperty("contact_urgence_nom");
    expect(corps.contact_urgence_telephone).toBe("699");
  });

  it("en mise à jour, envoie null pour un champ vidé — sinon l'ancienne valeur resterait", () => {
    const corps = versCorpsDetenu(entree, "maj");
    expect(corps.religion).toBeNull();
    expect(corps.contact_urgence_nom).toBeNull();
    expect(corps.contact_urgence_telephone).toBe("699");
  });

  it("n'envoie les photos que si une nouvelle a été déposée", () => {
    expect(versCorpsDetenu(entree, "maj")).not.toHaveProperty("photo_face_url");
    const avecPhoto = versCorpsDetenu(
      { ...entree, photoFace: { url: "https://x/y.jpg", publicId: "y" } },
      "maj",
    );
    expect(avecPhoto.photo_face_url).toBe("https://x/y.jpg");
    expect(avecPhoto.photo_face_public_id).toBe("y");
  });
});

describe("versCorpsMandat", () => {
  it("n'envoie que les rubriques renseignées", () => {
    const corps = versCorpsMandat({
      typeStatutPenal: "Exécution de peine",
      dateIncarceration: "2026-01-10",
      autoriteSignataire: "Procureur",
      motifDetention: "Vol",
      typeMandat: "Mandat de dépôt",
      referenceMandat: "REF-1",
      dateSignatureMandat: "2026-01-09",
      dateExpirationMandat: DANS_UN_AN,
      dateJugement: "2026-02-01",
      dateAppel: null,
    });
    expect(corps.date_jugement).toBe("2026-02-01");
    expect(corps).not.toHaveProperty("date_appel");
    expect(corps.type_statut_penal).toBe("Exécution de peine");
  });
});

describe("versSanction", () => {
  const sanctionApi = (surcharge: Partial<SanctionApi> = {}): SanctionApi =>
    ({
      id: 5,
      detenu_id: 4,
      detenu: { id: 4, numero_ecrou: "DEMO-P-004", nom: "Bikoro Claude" },
      type_sanction: { id: 1, libelle: "Isolement" },
      motif: "Bagarre",
      date_faute: "2026-09-10",
      date_debut: "2026-09-11",
      date_fin: null,
      statut: "En cours",
      est_actif: true,
      cellule_disciplinaire: { id: 8, numero: "ISO3", bloc: "ISOLEMENT" },
      cellule_origine: { id: 4, numero: "C1", bloc: "B" },
      affectation_disciplinaire_active: true,
      created_at: "2026-09-11T08:00:00+01:00",
      ...surcharge,
    }) as SanctionApi;

  it("présente une fiche désactivée comme annulée, quoi que disent ses dates", () => {
    expect(versSanction(sanctionApi({ est_actif: false })).statut).toBe("Annulée");
  });

  it("reprend le statut calculé par l'API et les deux cellules", () => {
    const s = versSanction(sanctionApi());
    expect(s.statut).toBe("En cours");
    expect(s.celluleLibelle).toBe("ISOLEMENT · ISO3");
    expect(s.celluleOrigine).toEqual({ id: 4, libelle: "B · C1" });
    expect(s.isolementEnCours).toBe(true);
  });

  it("utilise l'identité fournie quand la sanction vient de la fiche du détenu", () => {
    const s = versSanction(sanctionApi({ detenu: undefined }), { nom: "Ada", numeroEcrou: "E-9" });
    expect(s.detenuNom).toBe("Ada");
    expect(s.numeroEcrou).toBe("E-9");
  });
});

describe("versSortie", () => {
  const brut = {
    id: 3,
    detenu_id: 15,
    mandas_id: 16,
    mandas: { id: 16, type_statut_penal: "Exécution de peine", reference_mandat: "REF-A" },
    type_sortie: "liberation_normale",
    date_sortie: "2026-09-17",
    motif: "Fin de peine",
    destination: null,
    cause: null,
    observation: null,
    sortie_definitive: false,
    created_at: "2026-09-17T10:00:00+01:00",
  };

  it("traduit le code de type de sortie et retient si elle est définitive", () => {
    const s = versSortie(brut, { nom: "Etoundi Rose", numeroEcrou: "DEMO-DP-002" });
    expect(s.typeSortie).toBe("LiberationNormale");
    expect(s.definitive).toBe(false);
    expect(s.situationPenale).toBe("Exécution de peine");
    expect(s.detenuNom).toBe("Etoundi Rose");
  });

  it("reconnaît les trois autres types", () => {
    for (const [code, attendu] of [
      ["deces", "Deces"],
      ["transfert", "Transfert"],
      ["evasion", "Evasion"],
    ] as const) {
      expect(versSortie({ ...brut, type_sortie: code }).typeSortie).toBe(attendu);
    }
  });
});

describe("versCellule et versAffectation", () => {
  it("prend l'occupation calculée par le serveur", () => {
    const c = versCellule({
      id: 3,
      numero: "C4",
      bloc: "A",
      type_cellule: "Normale",
      capacite_max: 4,
      effectif_actuel: 3,
      places_disponibles: 1,
    });
    expect(c.effectifReel).toBe(3);
    expect(c.capaciteMax).toBe(4);
  });

  it("libelle une cellule sans quartier sans séparateur orphelin", () => {
    const a = versAffectation(
      {
        id: 1,
        detenu_id: 7,
        cellule: { id: 2, numero: "ISO1", bloc: null },
        date_affectation: "2026-09-01T00:00:00+01:00",
        date_fin: "2026-09-10T00:00:00+01:00",
        est_active: false,
        motif_affectation: "Sanction",
      },
      { nom: "Owona", numeroEcrou: "E-7" },
    );
    expect(a.celluleLibelle).toBe("ISO1");
    expect(a.dateFin).toBe("2026-09-10T00:00:00+01:00");
  });
});

describe("versSuiviMedical et versVisite", () => {
  it("remplace une date absente par une chaîne vide plutôt que null", () => {
    const s = versSuiviMedical({
      id: 1,
      detenu_id: 2,
      date_consultation: null,
      type_consultation: "Contrôle",
      nom_medecin: "Dr Kamga",
      temperature: null,
      tension_arterielle: null,
      poids: null,
      symptomes: "—",
      diagnostic: "—",
      medicaments_prescrits: null,
      duree_traitement: null,
      date_suivi: null,
      observations: null,
    });
    expect(s.dateConsultation).toBe("");
  });

  it("normalise le sexe du visiteur", () => {
    const base = {
      id: 1,
      detenu_id: 2,
      date_visite: "2026-09-17",
      heure_arrivee: "10:30",
      duree_prevue_minutes: 30,
      type_visite: "Parloir familial",
      lieu_visite: null,
      autorisation_prealable: true,
      nom_visiteur: "Abena",
      sexe_visiteur: "Masculin",
      type_piece_identite: "Passeport",
      numero_piece_identite: "P1",
      telephone_visiteur: null,
      lien_parente: "Ami(e)",
      adresse_visiteur: null,
      agent_controle: "Agent",
      objets_deposes: null,
      fouille_corporelle: null,
      observations_securite: null,
      heure_debut: null,
      heure_fin: null,
      observations_visite: null,
    };
    expect(versVisite({ ...base, sexe_visiteur: "Féminin" }).sexeVisiteur).toBe("Féminin");
    expect(versVisite({ ...base, sexe_visiteur: "n'importe quoi" }).sexeVisiteur).toBe("Masculin");
    expect(versVisite({ ...base, lieu_visite: null }).lieuVisite).toBe("");
  });
});

describe("versTableauDeBord", () => {
  const brut = (categories: Record<string, number>): TableauDeBordApi =>
    ({
      genere_le: "2026-09-17T21:00:00+00:00",
      effectif: 15,
      capacite_totale: 39,
      taux_occupation: 33.3,
      effectif_mois_precedent: 0,
      visites_aujourdhui: 1,
      sorties_prevues_mois_prochain: 0,
      mandats_expires: 0,
      sanctions_en_cours: 2,
      mouvements: { incarcerations: 19, liberations: 1, transferements: 1, evasions: 1, deces: 1 },
      effectifs_par_categorie: categories,
      population_derniers_mois: [{ label: "Sept.", population: 15 }],
      liberables_ce_mois: [
        { numero_ecrou: "E-1", nom: "Nkolo", date_incarceration: "2026-01-10", date_expiration: null, statut: null },
      ],
    }) as TableauDeBordApi;

  it("complète à zéro les catégories absentes de la réponse", () => {
    const tb = versTableauDeBord(brut({ Prevenu: 6 }));
    expect(tb.effectifsParCategorie).toEqual({
      Prevenu: 6,
      Condamne: 0,
      Appellant: 0,
      Cassationnaire: 0,
      Dpac: 0,
    });
  });

  it("n'expose jamais null dans la liste des libérables", () => {
    const tb = versTableauDeBord(brut({}));
    expect(tb.liberablesCeMois[0]).toEqual({
      numeroEcrou: "E-1",
      nom: "Nkolo",
      dateIncarceration: "2026-01-10",
      dateExpiration: "",
      statut: "",
    });
  });
});
