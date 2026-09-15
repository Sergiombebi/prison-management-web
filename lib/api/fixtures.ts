/**
 * Données de démonstration.
 *
 * Le dump `sgpBD.sql` ne contient que quatre détenus nommés « D1 » à « D4 » : inutilisable
 * pour éprouver une interface. On génère donc un jeu plausible, volontairement irrégulier
 * (noms longs, champs absents, cellules saturées) pour que les écrans soient testés sur des
 * cas réels et pas sur des lignes idéales.
 *
 * Le générateur est **déterministe** (même graine → mêmes données). Ces fixtures ne sont
 * lues que depuis des composants serveur ; aucun rendu client ne les régénère, donc pas
 * de divergence d'hydratation.
 */

import type {
  Affectation,
  CategoriePenale,
  Cellule,
  Detenu,
  Mandas,
  Parametres,
  Sanction,
  SortieDetenu,
  SuiviMedical,
  Utilisateur,
  Visite,
} from "@/lib/domain/types";
import {
  ETATS_PHYSIQUES_ARRIVEE,
  LIENS_PARENTE,
  NIVEAUX_ETUDES,
  PIECES_IDENTITE,
  STATUTS_MATRIMONIAUX,
  TYPES_CONSULTATION,
  TYPES_MANDAT,
  TYPES_SANCTION,
  TYPES_VISITE,
} from "@/lib/domain/referentiels";

// ---------------------------------------------------------------------------
// Générateur pseudo-aléatoire déterministe (Mulberry32)
// ---------------------------------------------------------------------------

function creerRandom(graine: number) {
  let a = graine >>> 0;
  return function random(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = creerRandom(20260104);

const piocher = <T,>(liste: readonly T[]): T =>
  liste[Math.floor(rnd() * liste.length)];

const entre = (min: number, max: number): number =>
  Math.floor(rnd() * (max - min + 1)) + min;

const parfois = (probabilite: number): boolean => rnd() < probabilite;

/** Date décalée de N jours par rapport à la référence, au format ISO. */
function jour(decalage: number, reference = REFERENCE): string {
  const d = new Date(reference);
  d.setDate(d.getDate() + decalage);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/** Ancre temporelle unique, fixée au chargement du module côté serveur. */
const REFERENCE = new Date();

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

const NOMS = [
  "Abanda Mballa Séraphin",
  "Nkodo Ateba Jean-Pierre",
  "Tchouameni Fotso Blaise",
  "Ngo Bakang Marie-Claire",
  "Etoundi Onana Cyrille",
  "Mbarga Zogo Ferdinand",
  "Ngassa Kemgang Pascal",
  "Fongang Tabi Rodrigue",
  "Bilounga Ndzana Albert",
  "Owona Essomba Georges",
  "Njoya Moluh Ibrahim",
  "Ateba Manga Serge",
  "Wandji Nguemo Christelle",
  "Kamdem Tchinda Valery",
  "Ndoumbe Ekwalla Josué",
  "Sali Bouba Aboubakar",
  "Moukouri Dikongue Patrice",
  "Nana Tchoupo Landry",
  "Ebongue Same Emmanuel",
  "Mfoumou Bekolo Aurélien",
  "Talla Fokou Bertrand",
  "Ngono Ayissi Florence",
  "Djoumessi Kenfack Armand",
  "Bello Hamadou Oumarou",
  "Essola Ntonga Thierry",
  "Mekouba Ngoa Vincent",
  "Tchapda Nouwou Gilbert",
  "Ayuk Tabe Frederick",
  "Ndikum Fru Lawrence",
  "Bisseck Nyobe Solange",
  "Eyenga Mvondo Pierre-Paul",
  "Sadjo Yaouba Mahamat",
  "Nkemayang Ashu Roland",
  "Fotso Djeuga Clovis",
  "Manga Bikoi Célestin",
  "Ngu Tanyi Emmanuel",
  "Bakari Souleymanou Idrissa",
  "Onguene Mbida Hervé",
  "Nzouankeu Tagne Steve",
  "Ekani Oyono Bruno",
  "Diboti Mouangue Alain",
  "Tioumbou Kana Jacqueline",
  "Nsangou Njikam Youssouf",
  "Assomo Belinga Régis",
  "Mbouombouo Njifon Adamou",
  "Tiokou Mbe Narcisse",
  "Ndjock Bilong Charles",
  "Ekoumou Atangana Guy-Roger",
];

const LIEUX = [
  "Yaoundé",
  "Douala",
  "Bafoussam",
  "Garoua",
  "Bamenda",
  "Maroua",
  "Ngaoundéré",
  "Bertoua",
  "Ebolowa",
  "Kribi",
  "Dschang",
  "Kumba",
  "Edéa",
  "Foumban",
  "Limbé",
];

const DEPARTEMENTS = [
  "Mfoundi",
  "Wouri",
  "Mifi",
  "Bénoué",
  "Mezam",
  "Diamaré",
  "Vina",
  "Lom-et-Djerem",
  "Mvila",
  "Océan",
];

const PROFESSIONS = [
  "Cultivateur",
  "Commerçant",
  "Chauffeur",
  "Menuisier",
  "Enseignant",
  "Mécanicien",
  "Maçon",
  "Couturière",
  "Élève",
  "Sans profession",
  "Transporteur",
  "Technicien de surface",
  "Vendeuse au marché",
  "Moto-taximan",
  "Pêcheur",
  "Électricien",
];

const MOTIFS_DETENTION = [
  "Vol aggravé",
  "Coups et blessures volontaires",
  "Abus de confiance",
  "Escroquerie",
  "Trouble à l'ordre public",
  "Détournement de deniers publics",
  "Faux et usage de faux",
  "Violation de domicile",
  "Recel",
  "Outrage à agent de la force publique",
  "Destruction de biens d'autrui",
  "Circulation sans titre de transport",
];

const TRIBUNAUX = [
  "Tribunal de Première Instance de Yaoundé — Centre administratif",
  "Tribunal de Grande Instance du Mfoundi",
  "Tribunal de Première Instance de Douala — Bonanjo",
  "Cour d'Appel du Centre",
  "Tribunal Militaire de Yaoundé",
];

const MEDECINS = [
  "Dr Ngaleu Christian",
  "Dr Mbassi Adèle",
  "Dr Fouda Bernard",
  "Dr Simo Estelle",
  "Dr Awono Jules",
];

const AGENTS = [
  "Brigadier Nkoa Théophile",
  "Surveillant-chef Mbida Rose",
  "Surveillant Ella Désiré",
  "Brigadier-chef Tamo Eric",
];

const NATIONALITES = [
  "Camerounaise",
  "Camerounaise",
  "Camerounaise",
  "Camerounaise",
  "Tchadienne",
  "Nigériane",
  "Centrafricaine",
  "Gabonaise",
];

// ---------------------------------------------------------------------------
// Cellules
// ---------------------------------------------------------------------------

const DEFINITION_CELLULES: Array<[string, string, number, string]> = [
  ["A-01", "Bloc A", 12, "Standard"],
  ["A-02", "Bloc A", 12, "Standard"],
  ["A-03", "Bloc A", 10, "Standard"],
  ["A-04", "Bloc A", 10, "Standard"],
  ["B-01", "Bloc B", 16, "Standard"],
  ["B-02", "Bloc B", 16, "Standard"],
  ["B-03", "Bloc B", 14, "Standard"],
  ["C-01", "Bloc C", 8, "Quartier mineurs"],
  ["C-02", "Bloc C", 8, "Quartier mineurs"],
  ["F-01", "Quartier femmes", 10, "Quartier femmes"],
  ["F-02", "Quartier femmes", 8, "Quartier femmes"],
  ["D-01", "Bloc disciplinaire", 4, "Cellule disciplinaire"],
  ["INF", "Infirmerie", 6, "Infirmerie"],
];

export const cellules: Cellule[] = DEFINITION_CELLULES.map(
  ([numero, bloc, capaciteMax, typeCellule], i) => ({
    id: i + 1,
    numero,
    bloc,
    typeCellule,
    capaciteMax,
    effectifTheorique: capaciteMax,
    effectifReel: 0, // recalculé plus bas depuis les affectations
  }),
);

// ---------------------------------------------------------------------------
// Détenus
// ---------------------------------------------------------------------------

function numeroEcrou(index: number): string {
  const lettres = "ABCDEFGHJKLMNPRSTVWXYZ";
  const suffixe =
    lettres[index % lettres.length] +
    lettres[(index * 7 + 3) % lettres.length] +
    lettres[(index * 13 + 5) % lettres.length];
  return `${String(1024 + index * 7).padStart(4, "0")}${suffixe}`;
}

export const detenus: Detenu[] = NOMS.map((nom, i) => {
  const feminin = /Marie|Christelle|Florence|Solange|Jacqueline/.test(nom);
  const age = entre(19, 62);
  const naissance = new Date(REFERENCE);
  naissance.setFullYear(naissance.getFullYear() - age);
  naissance.setMonth(entre(0, 11), entre(1, 28));

  // Quelques dossiers volontairement incomplets : c'est la réalité du terrain.
  const incomplet = parfois(0.18);

  return {
    id: i + 1,
    numeroEcrou: numeroEcrou(i),
    nom,
    sexe: feminin ? "Féminin" : "Masculin",
    dateNaissance: naissance.toISOString(),
    lieuNaissance: piocher(LIEUX),
    age: String(age),
    nationalite: piocher(NATIONALITES),
    langue: piocher(["Français", "Anglais", "Ewondo", "Fulfuldé", "Bamiléké"]),
    ethnie: incomplet ? null : piocher(["Béti", "Bamiléké", "Douala", "Peul", "Bassa"]),
    religion: incomplet ? null : piocher(["Catholique", "Protestante", "Musulmane", "Animiste"]),
    profession: piocher(PROFESSIONS),
    departement: piocher(DEPARTEMENTS),
    arrondissement: incomplet ? null : `${piocher(LIEUX)} ${entre(1, 6)}ᵉ`,
    residence: incomplet ? null : `Quartier ${piocher(["Nkolbisson", "Mvog-Ada", "Bonabéri", "Tsinga", "Mokolo", "Bépanda"])}`,
    statutMatrimonial: piocher(STATUTS_MATRIMONIAUX),
    nombreEnfants: String(entre(0, 6)),
    niveauEtudes: piocher(NIVEAUX_ETUDES),
    numeroCNI: parfois(0.85) ? `${entre(100000000, 999999999)}` : null,
    numeroPasseport: parfois(0.12) ? `CM${entre(100000, 999999)}` : null,
    contact: parfois(0.8) ? `6${entre(50000000, 99999999)}` : null,
    nomPere: incomplet ? "Non renseigné" : piocher(NOMS).split(" ")[0] + " " + piocher(NOMS).split(" ")[1],
    nomMere: incomplet ? "Non renseigné" : piocher(NOMS).split(" ")[0] + " " + piocher(NOMS).split(" ")[1],
    photoFaceUrl: null,
    photoProfilUrl: null,
    anthropometrie: parfois(0.5)
      ? `Taille ${entre(155, 192)} cm — ${piocher(["cicatrice au front", "tatouage avant-bras gauche", "aucun signe particulier", "cicatrice à la joue droite"])}`
      : null,
    statut: "Present",
    dateCreation: jour(-entre(20, 900)),
    dateModification: parfois(0.3) ? jour(-entre(1, 60)) : null,
  } satisfies Detenu;
});

// ---------------------------------------------------------------------------
// Mandats
// ---------------------------------------------------------------------------

let compteurMandat = 0;

export const mandats: Mandas[] = detenus.flatMap((d) => {
  // La plupart des détenus ont un seul mandat ; certains en cumulent, ce qui crée
  // les cas DPAC.
  const nombre = parfois(0.2) ? 2 : parfois(0.05) ? 3 : 1;

  return Array.from({ length: nombre }, (_, k) => {
    compteurMandat += 1;

    const statut = parfois(0.42)
      ? "Détention provisoire"
      : parfois(0.55)
        ? "Exécution de peine"
        : parfois(0.5)
          ? "Appellant"
          : "Cassationnaire";

    const incarceration = -entre(15, 850) - k * 30;
    // ~15 % des mandats sont expirés : c'est précisément ce que le tableau de bord
    // doit faire remonter.
    const expiration = parfois(0.15)
      ? incarceration + entre(10, 200)
      : incarceration + entre(200, 1600);

    const estExecution = statut === "Exécution de peine";
    const estAppel = statut === "Appellant";
    const estCassation = statut === "Cassationnaire";

    return {
      id: compteurMandat,
      detenuId: d.id,
      dateIncarceration: jour(incarceration),
      autoriteSignataire: piocher([
        "Procureur de la République",
        "Juge d'instruction",
        "Président du Tribunal",
        "Commissaire Central",
      ]),
      motifDetention: piocher(MOTIFS_DETENTION),
      typeMandat: piocher(TYPES_MANDAT),
      referenceMandat: `${entre(100, 999)}/MD/${new Date(jour(incarceration)).getFullYear()}/TPI`,
      dateSignatureMandat: jour(incarceration - entre(1, 12)),
      dateSortieMandat: jour(expiration),
      observationsStatut: parfois(0.25) ? "Dossier transmis au parquet." : null,
      objetsPersonnels: parfois(0.6)
        ? piocher([
            "1 téléphone portable, 2 500 FCFA",
            "1 montre, 1 ceinture",
            "Néant",
            "1 sac à main, 1 pièce d'identité, 12 000 FCFA",
          ])
        : null,
      autoritePenitentiaire: piocher(["Régisseur", "Régisseur adjoint", "CSAF"]),
      etatPhysiqueArrivee: piocher(ETATS_PHYSIQUES_ARRIVEE),
      typeStatutPenal: statut,

      dateJugement: estExecution || estAppel || estCassation ? jour(incarceration + entre(20, 180)) : null,
      referenceJugement: estExecution || estAppel || estCassation ? `JGT ${entre(100, 999)}/${entre(21, 26)}` : null,
      tribunalJugement: estExecution || estAppel || estCassation ? piocher(TRIBUNAUX) : null,
      motifJugement: estExecution || estAppel || estCassation ? piocher(MOTIFS_DETENTION) : null,
      peinePrononcee: estExecution
        ? `${entre(6, 120)} mois d'emprisonnement ferme${parfois(0.4) ? ` et ${entre(50, 500)} 000 FCFA d'amende` : ""}`
        : estAppel || estCassation
          ? `${entre(12, 240)} mois d'emprisonnement`
          : null,

      dateAppel: estAppel || estCassation ? jour(incarceration + entre(190, 320)) : null,
      tribunalAppel: estAppel || estCassation ? "Cour d'Appel du Centre" : null,
      decisionAppel: estAppel
        ? piocher(["Appel en cours d'examen", "Audience renvoyée", "Mise en délibéré"])
        : estCassation
          ? "Confirmation du jugement de première instance"
          : null,
      observationsAppel: null,

      dateCassation: estCassation ? jour(incarceration + entre(330, 480)) : null,
      tribunalCassation: estCassation ? "Cour Suprême" : null,
      decisionCassation: estCassation ? "Pourvoi enrôlé, en attente d'audience" : null,
      observationsCassation: null,
    } satisfies Mandas;
  });
});

// ---------------------------------------------------------------------------
// Catégorie pénale — la règle métier du desktop, rejouée à l'identique
// ---------------------------------------------------------------------------

/** Un mandat est actif tant qu'il n'a pas de date de sortie, ou qu'elle est future. */
export function estMandatActif(m: Mandas, maintenant = new Date()): boolean {
  if (!m.dateSortieMandat) return true;
  return new Date(m.dateSortieMandat) > maintenant;
}

const estExecutionPeine = (v: string | null) =>
  (v ?? "").trim().toLowerCase().startsWith("ex") &&
  (v ?? "").trim().toLowerCase().includes("cution de peine");

/**
 * Transcription fidèle de `SGPCore/Services/MandasService.cs`.
 *
 * ⚠️ Cette fonction n'existe ici que pour rendre les fixtures cohérentes. En
 * production, la catégorie est calculée par l'API : deux implémentations d'une
 * même règle finissent toujours par diverger.
 */
export function categoriePenale(
  mandatsDuDetenu: Mandas[],
  maintenant = new Date(),
): CategoriePenale | null {
  const actifs = mandatsDuDetenu.filter((m) => estMandatActif(m, maintenant));
  if (actifs.length === 0) return null;

  const aExecution = actifs.some((m) => estExecutionPeine(m.typeStatutPenal));

  if (actifs.length > 1 && aExecution) return "Dpac";
  if (actifs.every((m) => m.typeStatutPenal === "Détention provisoire"))
    return "Prevenu";
  if (actifs.length === 1 && aExecution) return "Condamne";
  if (!aExecution && actifs.some((m) => m.typeStatutPenal === "Appellant"))
    return "Appellant";
  if (!aExecution && actifs.some((m) => m.typeStatutPenal === "Cassationnaire"))
    return "Cassationnaire";

  return null;
}

// ---------------------------------------------------------------------------
// Affectations en cellule
// ---------------------------------------------------------------------------

export const affectations: Affectation[] = [];

detenus.forEach((d, i) => {
  // ~8 % des détenus ne sont pas encore logés : l'écran d'affectation doit les voir.
  if (parfois(0.08)) return;

  const eligibles =
    d.sexe === "Féminin"
      ? cellules.filter((c) => c.typeCellule === "Quartier femmes")
      : cellules.filter(
          (c) => c.typeCellule !== "Quartier femmes" && c.typeCellule !== "Infirmerie",
        );

  const cellule = eligibles[i % eligibles.length];

  affectations.push({
    id: affectations.length + 1,
    detenuId: d.id,
    detenuNom: d.nom,
    numeroEcrou: d.numeroEcrou,
    celluleId: cellule.id,
    celluleLibelle: `${cellule.bloc} · ${cellule.numero}`,
    dateAffectation: jour(-entre(1, 400)),
    motifAffectation: piocher([
      "Affectation initiale",
      "Réaffectation pour désengorgement",
      "Rapprochement quartier",
      "Mesure de sécurité",
      null,
    ]) as string | null,
  });
});

// Effectif réel = nombre d'affectations en cours sur la cellule
for (const c of cellules) {
  c.effectifReel = affectations.filter((a) => a.celluleId === c.id).length;
}

// ---------------------------------------------------------------------------
// Sanctions, visites, suivis médicaux, sorties
// ---------------------------------------------------------------------------

export const sanctions: Sanction[] = Array.from({ length: 17 }, (_, i) => {
  const d = detenus[entre(0, detenus.length - 1)];
  const aff = affectations.find((a) => a.detenuId === d.id);
  const debut = -entre(0, 120);
  const duree = entre(3, 30);
  const termine = debut + duree < 0;

  return {
    id: i + 1,
    detenuId: d.id,
    detenuNom: d.nom,
    numeroEcrou: d.numeroEcrou,
    celluleId: aff?.celluleId ?? null,
    celluleLibelle: aff?.celluleLibelle ?? null,
    dateFaute: jour(debut - entre(1, 5)),
    dateDebut: jour(debut),
    dateFin: jour(debut + duree),
    typeSanction: piocher(TYPES_SANCTION),
    motif: piocher([
      "Refus d'obtempérer lors de l'appel du matin",
      "Rixe avec un codétenu au réfectoire",
      "Détention d'objet prohibé (téléphone portable)",
      "Dégradation du mobilier de la cellule",
      "Injures envers un agent de surveillance",
      "Tentative d'introduction de substance illicite",
    ]),
    statut: termine ? "Terminée" : "En cours",
    dateCreation: jour(debut),
  } satisfies Sanction;
});

export const visites: Visite[] = Array.from({ length: 26 }, (_, i) => {
  const d = detenus[entre(0, detenus.length - 1)];
  const decalage = i < 6 ? 0 : -entre(1, 45);
  const heure = `${String(entre(8, 16)).padStart(2, "0")}:${piocher(["00", "15", "30", "45"])}`;

  return {
    id: i + 1,
    detenuId: d.id,
    detenuNom: d.nom,
    numeroEcrou: d.numeroEcrou,
    dateVisite: jour(decalage),
    heureArrivee: heure,
    dureePrevueMinutes: piocher([15, 30, 45, 60]),
    typeVisite: piocher(TYPES_VISITE),
    lieuVisite: piocher(["Parloir n°1", "Parloir n°2", "Salle des avocats", "Bureau du régisseur"]),
    autorisationPrealable: parfois(0.75),
    nomVisiteur: piocher(NOMS),
    sexeVisiteur: parfois(0.5) ? "Masculin" : "Féminin",
    typePieceIdentite: piocher(PIECES_IDENTITE),
    numeroPieceIdentite: `${entre(100000000, 999999999)}`,
    telephoneVisiteur: parfois(0.8) ? `6${entre(50000000, 99999999)}` : null,
    lienParente: piocher(LIENS_PARENTE),
    adresseVisiteur: parfois(0.6) ? `Quartier ${piocher(["Melen", "Nsam", "Akwa", "Bastos"])}` : null,
    agentControle: piocher(AGENTS),
    objetsDeposes: parfois(0.5)
      ? piocher(["Vivres (riz, huile)", "Vêtements", "Produits d'hygiène", "Néant"])
      : null,
    fouilleCorporelle: parfois(0.7),
    observationsSecurite: parfois(0.15) ? "Visiteur en retard, contrôle renforcé." : null,
    heureDebut: decalage < 0 ? heure : null,
    heureFin: decalage < 0 ? heure.replace(/^(\d+)/, (h) => String(Number(h) + 1).padStart(2, "0")) : null,
    observationsVisite: parfois(0.2) ? "Visite écourtée à la demande du détenu." : null,
  } satisfies Visite;
});

export const suivisMedicaux: SuiviMedical[] = Array.from({ length: 21 }, (_, i) => {
  const d = detenus[entre(0, detenus.length - 1)];
  const dateConsult = -entre(0, 180);

  return {
    id: i + 1,
    detenuId: d.id,
    detenuNom: d.nom,
    numeroEcrou: d.numeroEcrou,
    dateConsultation: jour(dateConsult),
    typeConsultation: piocher(TYPES_CONSULTATION),
    nomMedecin: piocher(MEDECINS),
    temperature: `${entre(36, 39)},${entre(0, 9)}`,
    tensionArterielle: `${entre(10, 15)}/${entre(6, 10)}`,
    poids: `${entre(48, 95)}`,
    symptomes: piocher([
      "Céphalées persistantes, fièvre depuis trois jours",
      "Douleurs abdominales",
      "Toux sèche et fatigue générale",
      "Plaie infectée au pied droit",
      "Insomnie et anxiété",
      "Douleurs dentaires",
    ]),
    diagnostic: piocher([
      "Paludisme simple",
      "Gastrite",
      "Infection respiratoire haute",
      "Plaie surinfectée",
      "Trouble anxieux",
      "Carie profonde",
    ]),
    medicamentsPrescrits: piocher([
      "Artéméther-luméfantrine, paracétamol",
      "Oméprazole 20 mg",
      "Amoxicilline 500 mg, sirop antitussif",
      "Antiseptique local, amoxicilline",
      "Anxiolytique léger",
    ]),
    dureeTraitement: `${entre(3, 14)} jours`,
    dateSuivi: parfois(0.5) ? jour(dateConsult + entre(7, 30)) : null,
    observations: parfois(0.35) ? "Évacuation sanitaire à envisager si aggravation." : null,
  } satisfies SuiviMedical;
});

export const sorties: SortieDetenu[] = Array.from({ length: 11 }, (_, i) => {
  const d = detenus[entre(0, detenus.length - 1)];
  const type = parfois(0.6)
    ? "LiberationNormale"
    : parfois(0.5)
      ? "Transfert"
      : parfois(0.5)
        ? "Evasion"
        : "Deces";
  const dateSortie = -entre(1, 90);

  return {
    id: i + 1,
    detenuId: d.id,
    detenuNom: d.nom,
    numeroEcrou: d.numeroEcrou,
    typeSortie: type,
    dateSortie: jour(dateSortie),
    situationPenale: piocher(["Condamné", "Prévenu", "Appellant"]),
    motif:
      type === "LiberationNormale"
        ? "Expiration du titre de détention"
        : type === "Transfert"
          ? "Désengorgement de l'établissement"
          : type === "Evasion"
            ? "Évasion constatée lors de l'appel du soir"
            : "Décès constaté à l'infirmerie",
    destination: type === "Transfert" ? `Prison Principale de ${piocher(LIEUX)}` : null,
    cause: type === "Deces" ? piocher(["Maladie", "Cause naturelle", "En cours d'établissement"]) : null,
    observation: parfois(0.4) ? "Procès-verbal transmis au Procureur de la République." : null,
    dateEnregistrement: jour(dateSortie),
  } satisfies SortieDetenu;
});

// ---------------------------------------------------------------------------
// Personnel et paramètres
// ---------------------------------------------------------------------------

export const utilisateurs: Utilisateur[] = [
  {
    id: 1,
    username: "admin",
    nom: "Système",
    prenom: "Administrateur",
    role: "Administrateur",
    email: "admin@sgp.local",
    estActif: true,
    dateCreation: jour(-720),
    derniereConnexion: jour(0),
  },
  {
    id: 2,
    username: "p.charles",
    nom: "Charles",
    prenom: "Patrick",
    role: "Administrateur",
    email: "p.charles@sgp.local",
    estActif: true,
    dateCreation: jour(-640),
    derniereConnexion: jour(-1),
  },
  {
    id: 3,
    username: "m.nkoa",
    nom: "Nkoa",
    prenom: "Théophile",
    role: "Gestionnaire",
    email: "t.nkoa@sgp.local",
    estActif: true,
    dateCreation: jour(-410),
    derniereConnexion: jour(-2),
  },
  {
    id: 4,
    username: "r.mbida",
    nom: "Mbida",
    prenom: "Rose",
    role: "Gestionnaire",
    email: "r.mbida@sgp.local",
    estActif: true,
    dateCreation: jour(-380),
    derniereConnexion: jour(-4),
  },
  {
    id: 5,
    username: "d.ella",
    nom: "Ella",
    prenom: "Désiré",
    role: "Consultation",
    email: null,
    estActif: true,
    dateCreation: jour(-220),
    derniereConnexion: jour(-17),
  },
  {
    id: 6,
    username: "e.tamo",
    nom: "Tamo",
    prenom: "Eric",
    role: "Gestionnaire",
    email: "e.tamo@sgp.local",
    estActif: false,
    dateCreation: jour(-190),
    derniereConnexion: jour(-95),
  },
  {
    id: 7,
    username: "a.mbassi",
    nom: "Mbassi",
    prenom: "Adèle",
    role: "Consultation",
    email: "a.mbassi@sgp.local",
    estActif: true,
    dateCreation: jour(-60),
    derniereConnexion: null,
  },
];

export const parametres: Parametres = {
  id: 1,
  nomPrison: "Prison Principale de Yaoundé",
  ville: "Yaoundé",
  telephone: "222 23 45 67",
  fax: "222 23 45 68",
  enteteGauche:
    "RÉPUBLIQUE DU CAMEROUN\nPaix — Travail — Patrie\n----------\nMINISTÈRE DE LA JUSTICE\n----------\nDÉLÉGATION RÉGIONALE DE L'ADMINISTRATION PÉNITENTIAIRE DU CENTRE",
  enteteDroite:
    "REPUBLIC OF CAMEROON\nPeace — Work — Fatherland\n----------\nMINISTRY OF JUSTICE\n----------\nREGIONAL DELEGATION OF PENITENTIARY ADMINISTRATION FOR THE CENTRE",
  logoUrl: null,
  ageMajorite: 18,
  autoritesAmpliataires:
    "- LE PROCUREUR DE LA RÉPUBLIQUE\n- LE COMMISSAIRE CENTRAL\n- LE COMMISSAIRE SPÉCIAL\n- LE COMMANDANT DE COMPAGNIE\n- LE DRAP/CENTRE\n- DOSSIER INTÉRESSÉ\n- CHRONO/ARCHIVES",
};

export const REFERENCE_TEMPORELLE = REFERENCE;
