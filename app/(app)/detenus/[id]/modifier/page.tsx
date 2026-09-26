import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { DetenuResume } from "@/lib/domain/types";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DetenuForm } from "../../nouveau/detenu-form";
import { modifierDetenu } from "../actions";

export async function generateMetadata(props: PageProps<"/detenus/[id]/modifier">): Promise<Metadata> {
  const [{ id }, t] = await Promise.all([props.params, getT()]);
  const dossier = await api.getDossierDetenu(Number(id));
  const fd = t.formulaireDetenu;
  return { title: dossier ? `${fd.modifierPrefixeTitre} ${dossier.detenu.nom}` : fd.dossierIntrouvable };
}

/** Valeurs actuelles sous les noms de champs de l'API, comme le formulaire les attend. */
function valeursInitiales(d: DetenuResume): Record<string, string> {
  const brut: Record<string, string | null | undefined> = {
    numero_ecrou: d.numeroEcrou,
    nom: d.nom,
    sexe: d.sexe,
    date_naissance: d.dateNaissance,
    lieu_naissance: d.lieuNaissance,
    nationalite: d.nationalite,
    profession: d.profession,
    langue: d.langue,
    nom_pere: d.nomPere,
    nom_mere: d.nomMere,
    statut_matrimonial: d.statutMatrimonial,
    nombre_enfants: d.nombreEnfants,
    niveau_etudes: d.niveauEtudes,
    religion: d.religion,
    departement: d.departement,
    arrondissement: d.arrondissement,
    ethnie: d.ethnie,
    residence: d.residence,
    numero_cni: d.numeroCNI,
    numero_passeport: d.numeroPasseport,
    // Le contact complet : un champ absent ici partirait à null à l'enregistrement
    contact_urgence_nom: d.contactUrgence?.nom,
    contact_urgence_lien_parente: d.contactUrgence?.lienParente,
    contact_urgence_telephone: d.contactUrgence?.telephone ?? d.contact,
    contact_urgence_adresse: d.contactUrgence?.adresse,
    anthropometrie: d.anthropometrie,
  };
  return Object.fromEntries(
    Object.entries(brut).filter((e): e is [string, string] => Boolean(e[1])),
  );
}

export default async function ModifierDetenuPage(props: PageProps<"/detenus/[id]/modifier">) {
  const t = await getT();
  const fd = t.formulaireDetenu;
  const { id } = await props.params;
  const numero = Number.parseInt(id, 10);
  if (!Number.isFinite(numero)) notFound();

  const dossier = await api.getDossierDetenu(numero);
  if (!dossier) notFound();
  const { detenu: d } = dossier;

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.detenus}
        titre={fd.modifierLaFiche}
        description={`${d.nom} — ${fd.ecrouNumero} ${d.numeroEcrou}. ${fd.seuleIdentiteModifiable}`}
        actions={
          <ButtonLink href={`/detenus/${d.id}`} variante="discret" icone="arrowLeft" transitionTypes={["nav-back"]}>
            {fd.retourDossier}
          </ButtonLink>
        }
      />

      {d.statut !== "Present" ? (
        // L'API refuserait la mise à jour (409) : autant le dire avant la saisie
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3.5">
          <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-sm text-ink">
            {fd.dossierDesactive}
          </p>
        </div>
      ) : (
        <DetenuForm
          edition={{
            detenuId: d.id,
            initial: valeursInitiales(d),
            photos: { face: d.photoFaceUrl, profil: d.photoProfilUrl },
            action: modifierDetenu.bind(null, d.id),
          }}
        />
      )}
    </Page>
  );
}
