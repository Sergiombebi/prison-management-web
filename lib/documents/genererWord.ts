import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { DossierDetenu, MandatDetaille } from "@/lib/api/contract";
import type { Parametres } from "@/lib/domain/types";
import { etapesJudiciaires } from "@/lib/domain/situation-penale";
import { LIBELLE_CATEGORIE, LIBELLE_TYPE_SORTIE } from "@/lib/domain/referentiels";
import { formatDate, formatDateLongue, ouVide } from "@/lib/format";

const LARGEUR_PAGE = 9000; // twips, ~page A4 utile

function ligne(label: string, valeur: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: `${label} : `, bold: true }), new TextRun(valeur)],
  });
}

const SANS_BORDURE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

/** Une ligne de texte par retour à la ligne, en petites majuscules grasses comme un en-tête. */
function paragraphesEntete(texte: string): Paragraph[] {
  return texte
    .split("\n")
    .filter(Boolean)
    .map(
      (ligneTexte) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: ligneTexte.toUpperCase(), bold: true, size: 16 })],
        }),
    );
}

function celluleSansBordure(children: Paragraph[]): TableCell {
  return new TableCell({
    borders: { top: SANS_BORDURE, bottom: SANS_BORDURE, left: SANS_BORDURE, right: SANS_BORDURE },
    verticalAlign: VerticalAlign.CENTER,
    children: children.length > 0 ? children : [new Paragraph("")],
  });
}

/** Tente de récupérer le logo de l'établissement pour l'en-tête ; renvoie null si absent,
 * non chargeable, ou dans un format que `docx` ne sait pas embarquer (ex. webp, heic). */
async function construireLogo(logoUrl: string | null): Promise<ImageRun | null> {
  if (!logoUrl) return null;

  const TYPES_SUPPORTES: Record<string, "jpg" | "png" | "gif" | "bmp"> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
  };

  try {
    const reponse = await fetch(logoUrl);
    if (!reponse.ok) return null;
    const blob = await reponse.blob();
    const type = TYPES_SUPPORTES[blob.type];
    if (!type) return null;

    const donnees = await blob.arrayBuffer();
    return new ImageRun({ type, data: donnees, transformation: { width: 50, height: 50 } });
  } catch {
    return null;
  }
}

/** En-tête officiel bilingue (texte gauche / logo / texte droit), fidèle à l'aperçu HTML. */
async function construireEntete(parametres: Parametres): Promise<Table> {
  const logo = await construireLogo(parametres.logoUrl);

  return new Table({
    width: { size: LARGEUR_PAGE, type: WidthType.DXA },
    borders: { top: SANS_BORDURE, bottom: SANS_BORDURE, left: SANS_BORDURE, right: SANS_BORDURE, insideHorizontal: SANS_BORDURE, insideVertical: SANS_BORDURE },
    rows: [
      new TableRow({
        children: [
          celluleSansBordure(paragraphesEntete(parametres.enteteGauche)),
          celluleSansBordure([new Paragraph({ alignment: AlignmentType.CENTER, children: logo ? [logo] : [] })]),
          celluleSansBordure(paragraphesEntete(parametres.enteteDroite)),
        ],
      }),
    ],
  });
}

function celluleEntete(texte: string): TableCell {
  return new TableCell({
    shading: { fill: "EEEEEE" },
    children: [new Paragraph({ children: [new TextRun({ text: texte, bold: true })] })],
  });
}

function celluleTexte(texte: string): TableCell {
  return new TableCell({ children: [new Paragraph(texte)] });
}

/** Jugement → appel → cassation d'un mandat, une ligne de texte par étape renseignée. */
function texteSituationPenale(mandat: MandatDetaille): string {
  const etapes = etapesJudiciaires(mandat);
  if (etapes.length === 0) return "—";

  return etapes
    .map((e) => {
      const details = [e.date ? formatDate(e.date) : null, e.tribunal, e.decision].filter(Boolean).join(" — ");
      return details ? `${e.titre} : ${details}` : e.titre;
    })
    .join("\n");
}

function tableauMandats(mandats: MandatDetaille[]): Table {
  const entetes = ["Date d'incarcération", "Motif", "Situation pénale", "Statut"];

  return new Table({
    width: { size: LARGEUR_PAGE, type: WidthType.DXA },
    rows: [
      new TableRow({ children: entetes.map(celluleEntete) }),
      ...(mandats.length === 0
        ? [new TableRow({ children: [new TableCell({ columnSpan: 4, children: [new Paragraph("Aucun mandat enregistré.")] })] })]
        : mandats.map(
            (m) =>
              new TableRow({
                children: [
                  celluleTexte(formatDate(m.dateIncarceration)),
                  celluleTexte(ouVide(m.motifDetention)),
                  celluleTexte(texteSituationPenale(m)),
                  celluleTexte(ouVide(m.typeStatutPenal)),
                ],
              }),
          )),
    ],
  });
}

function tableauSanctions(dossier: DossierDetenu): Table {
  const entetes = ["Date de la faute", "Faute", "Sanction", "Du", "Au"];

  return new Table({
    width: { size: LARGEUR_PAGE, type: WidthType.DXA },
    rows: [
      new TableRow({ children: entetes.map(celluleEntete) }),
      ...(dossier.sanctions.length === 0
        ? [new TableRow({ children: [new TableCell({ columnSpan: 5, children: [new Paragraph("Néant — aucune sanction disciplinaire.")] })] })]
        : dossier.sanctions.map(
            (s) =>
              new TableRow({
                children: [
                  celluleTexte(formatDate(s.dateFaute)),
                  celluleTexte(ouVide(s.motif)),
                  celluleTexte(ouVide(s.typeSanction)),
                  celluleTexte(formatDate(s.dateDebut)),
                  celluleTexte(formatDate(s.dateFin)),
                ],
              }),
          )),
    ],
  });
}

/**
 * Génère le même document que l'aperçu HTML (components/etats/document.tsx), mais en
 * .docx réel - pour l'éditer ensuite dans Word, contrairement au PDF qui passe par
 * l'impression du navigateur.
 */
export async function genererDocumentWord(etat: string, dossier: DossierDetenu, parametres: Parametres): Promise<Blob> {
  const reference = `${dossier.detenu.numeroEcrou}/${new Date().getFullYear()}`;
  const entete = await construireEntete(parametres);
  const enfants: (Paragraph | Table)[] = [
    entete,
    new Paragraph({ text: parametres.nomPrison, spacing: { before: 200, after: 100 } }),
    new Paragraph({
      text: etat,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({ text: `N° ${reference}`, alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
  ];

  if (etat === "Attestation de détention") {
    const categorie = dossier.detenu.categoriePenale ? LIBELLE_CATEGORIE[dossier.detenu.categoriePenale].toLowerCase() : "détenu";
    enfants.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun(`Le Régisseur de la ${parametres.nomPrison}, soussigné, atteste que `),
          new TextRun({ text: dossier.detenu.nom, bold: true }),
          new TextRun(
            ` né(e) le ${formatDateLongue(dossier.detenu.dateNaissance)} à ${dossier.detenu.lieuNaissance}, ` +
              `fils/fille de ${dossier.detenu.nomPere} et de ${dossier.detenu.nomMere}, est détenu(e) dans cet ` +
              `établissement sous le numéro d'écrou ${dossier.detenu.numeroEcrou} depuis le ` +
              `${formatDateLongue(dossier.detenu.mandatCourant?.dateIncarceration)}, en qualité de ${categorie} ` +
              `pour ${ouVide(dossier.detenu.mandatCourant?.motifDetention).toLowerCase()}.`,
          ),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "En foi de quoi la présente attestation lui est délivrée pour servir et valoir ce que de droit.",
            italics: true,
          }),
        ],
      }),
    );
  } else if (etat === "Fiche signalétique") {
    enfants.push(
      ligne("Numéro d'écrou", dossier.detenu.numeroEcrou),
      ligne("Nom et prénoms", dossier.detenu.nom),
      ligne("Né(e) le", `${formatDate(dossier.detenu.dateNaissance)} à ${dossier.detenu.lieuNaissance}`),
      ligne("Fils/fille de", dossier.detenu.nomPere),
      ligne("Et de", dossier.detenu.nomMere),
      ligne("Nationalité", ouVide(dossier.detenu.nationalite)),
      ligne("Profession", dossier.detenu.profession),
      ligne("Situation matrimoniale", ouVide(dossier.detenu.statutMatrimonial)),
      ligne("Domicile", ouVide(dossier.detenu.residence)),
      ligne("Signes particuliers", ouVide(dossier.detenu.anthropometrie)),
      ligne("Motif de détention", ouVide(dossier.detenu.mandatCourant?.motifDetention)),
      ligne("Écroué le", formatDate(dossier.detenu.mandatCourant?.dateIncarceration)),
    );
  } else if (etat === "Extrait du registre d'écrou" || etat === "Fichier des situations pénales") {
    enfants.push(tableauMandats(dossier.mandats));
    if (dossier.sorties.length > 0 && etat === "Extrait du registre d'écrou") {
      enfants.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({ text: "Mention : ", bold: true }),
            new TextRun(dossier.sorties.map((s) => `${LIBELLE_TYPE_SORTIE[s.typeSortie]} le ${formatDate(s.dateSortie)}`).join(" ; ")),
          ],
        }),
      );
    }
  } else if (etat === "Extrait du registre des sanctions") {
    enfants.push(tableauSanctions(dossier));
  }

  enfants.push(
    new Paragraph({
      spacing: { before: 500 },
      alignment: AlignmentType.RIGHT,
      text: `Fait à ${parametres.ville}, le ${formatDateLongue(new Date())}`,
    }),
    new Paragraph({ alignment: AlignmentType.RIGHT, text: "Le Régisseur" }),
  );

  const document = new Document({ sections: [{ children: enfants }] });

  return Packer.toBlob(document);
}
