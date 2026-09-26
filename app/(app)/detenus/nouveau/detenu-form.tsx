"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  AUTORITES_PENITENTIAIRES,
  ETATS_PHYSIQUES_ARRIVEE,
  LIENS_PARENTE,
  NIVEAUX_ETUDES,
  SEXES,
  STATUTS_MATRIMONIAUX,
  TYPES_MANDAT,
  TYPES_STATUT_PENAL,
} from "@/lib/domain/referentiels";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormSection, Pleine } from "@/components/ui/form-section";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/components/layout/i18n-provider";
import type { Messages } from "@/lib/i18n/fr";
import type { VerificationIdentite } from "@/lib/api";
import { enregistrerDetenu, restaurerDossier, verifierIdentite, type EtatEnregistrement } from "./actions";

/** Mode modification : fiche existante, sans les rubriques du mandat. */
export interface EditionDetenu {
  detenuId: number;
  /** Valeurs actuelles, sous les noms de champs de l'API. */
  initial: Record<string, string>;
  photos: { face: string | null; profil: string | null };
  action: (precedent: EtatEnregistrement, formulaire: FormData) => Promise<EtatEnregistrement>;
}

function construireSections(fd: Messages["formulaireDetenu"]) {
  return [
    { id: "identite", label: fd.sectionIdentite },
    { id: "filiation", label: fd.sectionFiliation },
    { id: "origine", label: fd.sectionOrigine },
    { id: "contact", label: fd.sectionContact },
    { id: "signalement", label: fd.sectionSignalement },
    { id: "incarceration", label: fd.sectionIncarceration },
    { id: "procedure", label: fd.sectionProcedure },
  ] as const;
}

/**
 * Options d'une liste, complétées de la valeur enregistrée si elle n'y figure pas :
 * l'API accepte du texte libre, et un <select> sans l'option afficherait vide —
 * puis effacerait la donnée à l'enregistrement.
 */
function avecValeur(options: readonly string[], valeur: string | undefined): string[] {
  return valeur && !options.includes(valeur) ? [...options, valeur] : [...options];
}

function age(dateIso: string): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a -= 1;
  return a;
}

/**
 * Date d'expiration du mandat : toujours signature + 6 mois, jamais saisie à la
 * main (voir StoreMandasRequest::prepareForValidation() côté API, qui recalcule
 * de toute façon la valeur envoyée — l'affichage ici n'est qu'un aperçu immédiat).
 */
function ajouterMois(dateIso: string, mois: number): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + mois);
  return d.toISOString().slice(0, 10);
}

/**
 * Fiche d'enregistrement d'un détenu entrant.
 *
 * - Les noms des champs sont ceux de l'API : une erreur 422 se replace donc
 *   directement sous le bon champ, sans table de correspondance à maintenir.
 * - Après une erreur, les saisies reviennent du serveur : rien n'est perdu.
 * - L'API crée la fiche puis le mandat en deux appels ; si le second échoue,
 *   la reprise n'envoie que le mandat.
 * - En modification, seules les rubriques d'identité sont proposées : un mandat
 *   évolue depuis sa propre page.
 */
export function DetenuForm({ edition }: { edition?: EditionDetenu } = {}) {
  const router = useRouter();
  const { push } = useToast();
  const t = useT();
  const fd = t.formulaireDetenu;
  const [etat, action, enCours] = useActionState<EtatEnregistrement, FormData>(
    edition?.action ?? enregistrerDetenu,
    {},
  );
  const toutesSections = construireSections(fd);
  // Rubriques d'identité seules, pour la modification d'une fiche existante.
  const sections = edition ? toutesSections.slice(0, 5) : toutesSections;

  const [sectionVisible, setSectionVisible] = useState<string>("identite");
  const [modifie, setModifie] = useState(false);
  // Noms des fichiers choisis, valables pour l'état courant seulement : après un
  // envoi, React vide les champs fichier, l'affichage doit suivre.
  const [choix, setChoix] = useState<{ pour: EtatEnregistrement; noms: Record<string, string> }>({ pour: {}, noms: {} });
  const fichiers = choix.pour === etat ? choix.noms : {};
  // L'API rejette un fichier de plus de 8 Mo : autant prévenir avant l'envoi plutôt
  // que de laisser échouer la soumission sans que l'utilisateur comprenne pourquoi.
  const [erreursFichier, setErreursFichier] = useState<Record<string, string>>({});
  const [dateNaissance, setDateNaissance] = useState(edition?.initial.date_naissance ?? "");
  const [statutPenal, setStatutPenal] = useState("");
  const [dateIncarceration, setDateIncarceration] = useState("");
  const [dateSignature, setDateSignature] = useState("");

  // Vérification à la volée de l'écrou/CNI, au blur du champ — sans attendre que le
  // reste de la fiche soit rempli. Le contrôle à la soumission reste le filet réel.
  const [verifEcrou, setVerifEcrou] = useState<VerificationIdentite | null>(null);
  const [verifCni, setVerifCni] = useState<VerificationIdentite | null>(null);
  async function verifierChamp(
    champ: "numero_ecrou" | "numero_cni",
    valeur: string,
    definir: (v: VerificationIdentite | null) => void,
  ) {
    if (!valeur.trim()) {
      definir(null);
      return;
    }
    const resultat = await verifierIdentite(champ, valeur);
    definir(resultat.disponible ? null : resultat);
  }
  // Le conflit affiché en haut de page : celui renvoyé par une soumission a priorité
  // sur une vérification en direct devenue obsolète (le champ a pu changer depuis).
  const conflitEnDirect = verifEcrou?.conflit ?? verifCni?.conflit;
  const conflit = etat.conflit ?? conflitEnDirect;
  const messageConflit = etat.conflit
    ? etat.message
    : (verifEcrou?.conflit ? verifEcrou.message : verifCni?.message);

  const ageCalcule = age(dateNaissance);
  const avecJugement = ["Exécution de peine", "Appellant", "Cassationnaire"].includes(statutPenal);
  // Un cassationnaire est nécessairement passé par l'appel : le formulaire garde
  // donc la rubrique Appel ouverte en plus de la Cassation, pas à sa place.
  const avecAppel = statutPenal === "Appellant" || statutPenal === "Cassationnaire";
  const avecCassation = statutPenal === "Cassationnaire";

  /**
   * Après une erreur : les saisies renvoyées par le serveur, et elles seules — un
   * champ vidé volontairement ne doit pas se remplir de l'ancienne valeur.
   * Sinon, en modification, la valeur actuelle du dossier.
   */
  const v = (champ: string) => (etat.valeurs ?? edition?.initial)?.[champ] ?? undefined;
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  // Sommaire qui suit la section lue
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entrees) => {
        const visible = entrees
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setSectionVisible(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  // Garde-fou : ne jamais perdre une fiche à moitié remplie
  useEffect(() => {
    if (!modifie || etat.ok) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [modifie, etat.ok]);

  const dateExpirationCalculee = ajouterMois(dateSignature || v("date_signature_mandat") || "", 6);

  // --- Enregistrement réussi : on ne réaffiche pas les quarante champs
  if (etat.ok) {
    return (
      <div className="rounded-lg border border-success/30 bg-surface p-6 shadow-e2 animate-pop">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success-soft text-success">
            <Icon name="check" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-md font-semibold text-ink">{fd.detenuEnregistre}</h2>
            <p className="mt-1 text-sm text-muted">
              {fd.ficheCreeeMessage}
              {etat.photoIgnoree && fd.photosNonDeposeesSuffix}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/detenus/${etat.detenuId}`}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-ink-inverse shadow-e2 transition-colors hover:bg-accent-hover"
              >
                <Icon name="eye" size={15} />
                {fd.voirDossier}
              </Link>
              <Link
                href="/detenus/nouveau"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface px-4 text-sm text-ink shadow-e1 transition-colors hover:bg-raised"
              >
                <Icon name="plus" size={15} />
                {fd.enregistrerAutre}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
      {/* Sommaire */}
      <nav aria-label={fd.rubriquesFormulaire} className="hidden lg:block" data-print-hide>
        <ol className="sticky top-24 flex flex-col rounded-lg border border-hairline bg-surface p-2 shadow-e1">
          {sections.map((s, i) => {
            const courant = sectionVisible === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={courant ? "location" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-[var(--dur-base)]",
                    courant
                      ? "bg-accent-soft font-medium text-accent-ink"
                      : "text-muted hover:bg-sunken hover:text-ink",
                  )}
                >
                  <span className={cn("font-mono text-2xs", courant ? "text-accent" : "text-faint")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.label}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <form action={action} onChange={() => setModifie(true)} className="flex flex-col gap-4">
        {/* Conflit : la personne a déjà un dossier, désactivé — détecté à la soumission
            (etat.conflit) ou dès la saisie, au blur du champ (verifEcrou/verifCni). */}
        {conflit && (
          <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3.5 animate-rise">
            <div className="flex items-start gap-3">
              <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{fd.personneADejaDossier}</p>
                <p className="mt-1 text-sm text-muted">
                  {messageConflit} {fd.dossierNumero} {conflit.numero_ecrou} — {conflit.nom}.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    taille="sm"
                    variante="primaire"
                    icone="arrowUp"
                    onClick={async () => {
                      const id = conflit?.detenu_id;
                      if (!id) return;
                      const r = await restaurerDossier(id);
                      push({ type: "success", title: r.message });
                      router.push(`/detenus/${id}`);
                    }}
                  >
                    {fd.restaurerCeDossier}
                  </Button>
                  <Link
                    href={`/detenus/${conflit.detenu_id}`}
                    className="text-sm text-accent-ink underline underline-offset-2"
                  >
                    {fd.consulterDabord}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Erreur de validation, ou reprise après échec du mandat */}
        {etat.message && !etat.conflit && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm animate-rise"
          >
            <p className="flex items-start gap-2.5 font-medium text-danger">
              <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
              {etat.message}
            </p>
            {etat.detenuId && (
              <p className="mt-2 pl-[26px] text-muted">
                {fd.ficheCreeCorrigezMandat}
              </p>
            )}
          </div>
        )}

        {etat.photoIgnoree && (
          <p className="rounded-lg border border-hairline bg-raised px-4 py-3 text-sm text-muted">
            {fd.photosIndisponibles}
          </p>
        )}

        <fieldset disabled={Boolean(etat.detenuId)} className="contents">
          <FormSection id="identite" numero="01" titre={fd.sectionIdentite} description={fd.descriptionIdentite}>
            <Field
              label={fd.numeroEcrouLabel}
              requis
              aide={fd.numeroEcrouAide}
              erreur={err("numero_ecrou") ?? (verifEcrou?.present ? verifEcrou.message : undefined)}
            >
              {(p) => (
                <Input
                  {...p}
                  name="numero_ecrou"
                  defaultValue={v("numero_ecrou")}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono uppercase"
                  onBlur={(e) => verifierChamp("numero_ecrou", e.target.value, setVerifEcrou)}
                />
              )}
            </Field>
            <Field label={fd.nomComplet} requis erreur={err("nom")}>
              {(p) => <Input {...p} name="nom" defaultValue={v("nom")} autoComplete="off" />}
            </Field>
            <Field label={fd.sexeLabel} requis erreur={err("sexe")}>
              {(p) => (
                <Select {...p} name="sexe" defaultValue={v("sexe") ?? ""} placeholder={fd.selectionner}>
                  {SEXES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label={fd.dateNaissanceLabel}
              requis
              erreur={err("date_naissance")}
              aide={ageCalcule !== null ? `${fd.ageCalculeLabel} ${ageCalcule} ${fd.ans}${ageCalcule < 18 ? fd.mineurSuffix : ""}` : undefined}
            >
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  name="date_naissance"
                  value={dateNaissance || v("date_naissance") || ""}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDateNaissance(e.target.value)}
                />
              )}
            </Field>
            <Field label={fd.lieuNaissanceLabel} requis erreur={err("lieu_naissance")}>
              {(p) => <Input {...p} name="lieu_naissance" defaultValue={v("lieu_naissance")} />}
            </Field>
            <Field label={fd.nationaliteLabel} erreur={err("nationalite")}>
              {(p) => <Input {...p} name="nationalite" defaultValue={v("nationalite") ?? (edition ? undefined : "Camerounaise")} />}
            </Field>
            <Field label={fd.professionLabel} requis erreur={err("profession")}>
              {(p) => <Input {...p} name="profession" defaultValue={v("profession")} />}
            </Field>
            <Field label={fd.langueParleeLabel} erreur={err("langue")}>
              {(p) => <Input {...p} name="langue" defaultValue={v("langue")} />}
            </Field>
          </FormSection>

          <FormSection id="filiation" numero="02" titre={fd.filiationTitre}>
            <Field label={fd.nomPereLabel} requis erreur={err("nom_pere")}>
              {(p) => <Input {...p} name="nom_pere" defaultValue={v("nom_pere")} />}
            </Field>
            <Field label={fd.nomMereLabel} requis erreur={err("nom_mere")}>
              {(p) => <Input {...p} name="nom_mere" defaultValue={v("nom_mere")} />}
            </Field>
            <Field label={fd.situationMatrimoniale} erreur={err("statut_matrimonial")}>
              {(p) => (
                <Select {...p} name="statut_matrimonial" defaultValue={v("statut_matrimonial") ?? ""}>
                  <option value="">{fd.nonRenseignee}</option>
                  {avecValeur(STATUTS_MATRIMONIAUX, v("statut_matrimonial")).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={fd.nombreEnfants} erreur={err("nombre_enfants")}>
              {(p) => <Input {...p} name="nombre_enfants" type="number" min={0} max={99} inputMode="numeric" defaultValue={v("nombre_enfants")} />}
            </Field>
            <Field label={fd.niveauEtudes} erreur={err("niveau_etudes")}>
              {(p) => (
                <Select {...p} name="niveau_etudes" defaultValue={v("niveau_etudes") ?? ""}>
                  <option value="">{fd.nonRenseigne}</option>
                  {avecValeur(NIVEAUX_ETUDES, v("niveau_etudes")).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={fd.religionLabel} erreur={err("religion")}>
              {(p) => <Input {...p} name="religion" defaultValue={v("religion")} />}
            </Field>
          </FormSection>

          <FormSection id="origine" numero="03" titre={fd.origineTitre}>
            <Field label={fd.departementLabel} erreur={err("departement")}>
              {(p) => <Input {...p} name="departement" defaultValue={v("departement")} />}
            </Field>
            <Field label={fd.arrondissementLabel} erreur={err("arrondissement")}>
              {(p) => <Input {...p} name="arrondissement" defaultValue={v("arrondissement")} />}
            </Field>
            <Field label={fd.ethnieLabel} erreur={err("ethnie")}>
              {(p) => <Input {...p} name="ethnie" defaultValue={v("ethnie")} />}
            </Field>
            <Pleine>
              <Field label={fd.residenceLabel} erreur={err("residence")}>
                {(p) => <Input {...p} name="residence" defaultValue={v("residence")} />}
              </Field>
            </Pleine>
            <Field
              label={fd.numeroCni}
              aide={fd.numeroCniAide}
              erreur={err("numero_cni") ?? (verifCni?.present ? verifCni.message : undefined)}
            >
              {(p) => (
                <Input
                  {...p}
                  name="numero_cni"
                  defaultValue={v("numero_cni")}
                  className="font-mono"
                  spellCheck={false}
                  onBlur={(e) => verifierChamp("numero_cni", e.target.value, setVerifCni)}
                />
              )}
            </Field>
            <Field label={fd.numeroPasseport} erreur={err("numero_passeport")}>
              {(p) => <Input {...p} name="numero_passeport" defaultValue={v("numero_passeport")} className="font-mono" spellCheck={false} />}
            </Field>
          </FormSection>

          <FormSection
            id="contact"
            numero="04"
            titre={fd.contactTitre}
            description={fd.contactDescription}
          >
            <Field label={fd.nomProche} erreur={err("contact_urgence_nom")}>
              {(p) => <Input {...p} name="contact_urgence_nom" defaultValue={v("contact_urgence_nom")} />}
            </Field>
            <Field label={fd.lienParenteLabel} erreur={err("contact_urgence_lien_parente")}>
              {(p) => (
                <Select {...p} name="contact_urgence_lien_parente" defaultValue={v("contact_urgence_lien_parente") ?? ""}>
                  <option value="">{fd.nonRenseigne}</option>
                  {avecValeur(LIENS_PARENTE, v("contact_urgence_lien_parente")).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={fd.telephoneLabel} aide={fd.telephoneAide} erreur={err("contact_urgence_telephone")}>
              {(p) => <Input {...p} name="contact_urgence_telephone" type="tel" inputMode="tel" defaultValue={v("contact_urgence_telephone")} />}
            </Field>
            <Field label={fd.adresseLabel} erreur={err("contact_urgence_adresse")}>
              {(p) => <Input {...p} name="contact_urgence_adresse" defaultValue={v("contact_urgence_adresse")} />}
            </Field>
          </FormSection>

          <FormSection
            id="signalement"
            numero="05"
            titre={fd.signalementTitre}
            description={fd.signalementDescription}
          >
            {(
              [
                ["photo_face", fd.photoFace],
                ["photo_profil", fd.photoProfil],
              ] as const
            ).map(([nom, libelle]) => {
              const actuelle = edition?.photos[nom === "photo_face" ? "face" : "profil"];
              const choisi = fichiers[nom];
              return (
                <Field
                  key={nom}
                  label={libelle}
                  aide={actuelle && !choisi ? fd.photoActuelleConservee : fd.formatPhotoAide}
                  erreur={erreursFichier[nom] ?? err(nom)}
                >
                  {(p) => (
                    <label
                      htmlFor={p.id}
                      className={cn(
                        "group relative flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed bg-raised text-sm text-muted transition-colors hover:border-accent hover:text-ink",
                        choisi ? "border-accent" : "border-rule",
                      )}
                    >
                      {actuelle && !choisi && (
                        <Image src={actuelle} alt="" fill unoptimized sizes="240px" className="object-cover opacity-35" />
                      )}
                      <span className="relative flex flex-col items-center gap-1.5 px-3 text-center">
                        <Icon
                          name={choisi ? "check" : "user"}
                          size={20}
                          className={choisi ? "text-accent" : "text-faint transition-colors group-hover:text-accent"}
                        />
                        <span className="max-w-full truncate">
                          {choisi ?? (actuelle ? fd.remplacerPhoto : fd.choisirFichier)}
                        </span>
                      </span>
                      <input
                        {...p}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        name={nom}
                        className="sr-only"
                        onChange={(e) => {
                          const fichier = e.target.files?.[0];
                          if (fichier && fichier.size > 8 * 1024 * 1024) {
                            setErreursFichier((prec) => ({ ...prec, [nom]: fd.fichierTropVolumineux }));
                            e.target.value = "";
                            setChoix({ pour: etat, noms: { ...fichiers, [nom]: "" } });
                            return;
                          }
                          setErreursFichier((prec) => {
                            if (!(nom in prec)) return prec;
                            const reste = { ...prec };
                            delete reste[nom];
                            return reste;
                          });
                          setChoix({ pour: etat, noms: { ...fichiers, [nom]: fichier?.name ?? "" } });
                        }}
                      />
                    </label>
                  )}
                </Field>
              );
            })}
            <Pleine>
              <Field label={fd.anthropometrieLabel} aide={fd.anthropometrieAide} erreur={err("anthropometrie")}>
                {(p) => <Textarea {...p} name="anthropometrie" rows={3} defaultValue={v("anthropometrie")} />}
              </Field>
            </Pleine>
          </FormSection>
        </fieldset>

        {!edition && (
        <>
        <FormSection id="incarceration" numero="06" titre={fd.incarcerationTitre} description={fd.incarcerationDescription}>
          <Field label={fd.dateIncarcerationLabel} requis erreur={err("date_incarceration")}>
            {(p) => (
              <Input
                {...p}
                type="date"
                name="date_incarceration"
                value={dateIncarceration || v("date_incarceration") || ""}
                onChange={(e) => setDateIncarceration(e.target.value)}
              />
            )}
          </Field>
          <Field label={fd.typeMandatLabel} requis erreur={err("type_mandat")}>
            {(p) => (
              <Select {...p} name="type_mandat" defaultValue={v("type_mandat") ?? ""} placeholder={fd.selectionner}>
                {TYPES_MANDAT.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={fd.referenceMandatLabel} requis erreur={err("reference_mandat")}>
            {(p) => <Input {...p} name="reference_mandat" defaultValue={v("reference_mandat")} className="font-mono" spellCheck={false} />}
          </Field>
          <Field label={fd.autoriteSignataire} requis erreur={err("autorite_signataire")}>
            {(p) => <Input {...p} name="autorite_signataire" defaultValue={v("autorite_signataire") ?? "Procureur de la République"} />}
          </Field>
          <Field label={fd.dateSignatureLabel} requis erreur={err("date_signature_mandat")}>
            {(p) => (
              <Input
                {...p}
                type="date"
                name="date_signature_mandat"
                value={dateSignature || v("date_signature_mandat") || ""}
                onChange={(e) => setDateSignature(e.target.value)}
              />
            )}
          </Field>
          <Field
            label={fd.dateExpirationLabel}
            aide={fd.dateExpirationAide}
            erreur={err("date_expiration_mandat")}
          >
            {(p) => (
              <Input
                {...p}
                type="date"
                name="date_expiration_mandat"
                value={dateExpirationCalculee}
                readOnly
                className="cursor-not-allowed bg-sunken text-muted"
              />
            )}
          </Field>
          <Field
            label={fd.dateSortieLabel}
            aide={fd.dateSortieProvisoireAide}
            erreur={err("date_sortie_detention_provisoire")}
          >
            {(p) => <Input {...p} type="date" name="date_sortie_detention_provisoire" defaultValue={v("date_sortie_detention_provisoire")} />}
          </Field>
          <Pleine>
            <Field label={fd.motifDetentionLabel} requis erreur={err("motif_detention")}>
              {(p) => <Input {...p} name="motif_detention" defaultValue={v("motif_detention")} placeholder={fd.motifDetentionPlaceholder} />}
            </Field>
          </Pleine>
          <Field label={fd.autoritePenitentiaire} erreur={err("autorite_penitentiaire")}>
            {(p) => (
              <Select {...p} name="autorite_penitentiaire" defaultValue={v("autorite_penitentiaire") ?? ""}>
                <option value="">{fd.nonRenseignee}</option>
                {AUTORITES_PENITENTIAIRES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={fd.etatPhysiqueArrivee} erreur={err("etat_physique_arrivee")}>
            {(p) => (
              <Select {...p} name="etat_physique_arrivee" defaultValue={v("etat_physique_arrivee") ?? ""}>
                <option value="">{fd.nonRenseigne}</option>
                {ETATS_PHYSIQUES_ARRIVEE.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Pleine>
            <Field label={fd.objetsPersonnels} aide={fd.objetsPersonnelsAide} erreur={err("objets_personnels")}>
              {(p) => <Textarea {...p} name="objets_personnels" rows={2} defaultValue={v("objets_personnels")} />}
            </Field>
          </Pleine>
        </FormSection>

        <FormSection
          id="procedure"
          numero="07"
          titre={fd.procedureTitre}
          description={fd.procedureDescription}
        >
          <Pleine>
            <Field label={fd.statutPenalLabel} requis erreur={err("type_statut_penal")}>
              {(p) => (
                <Select
                  {...p}
                  name="type_statut_penal"
                  value={statutPenal || v("type_statut_penal") || ""}
                  onChange={(e) => setStatutPenal(e.target.value)}
                  placeholder={fd.selectionnerStatut}
                >
                  {TYPES_STATUT_PENAL.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
          </Pleine>

          <Rubrique ouverte={avecJugement} titre={fd.jugementTitre}>
            <Field label={fd.dateJugementLabel} requis={avecJugement} erreur={err("date_jugement")}>
              {(p) => <Input {...p} type="date" name="date_jugement" defaultValue={v("date_jugement")} disabled={!avecJugement} />}
            </Field>
            <Field label={fd.referenceJugementLabel} requis={avecJugement} erreur={err("reference_jugement")}>
              {(p) => <Input {...p} name="reference_jugement" defaultValue={v("reference_jugement")} className="font-mono" disabled={!avecJugement} />}
            </Field>
            <Field label={fd.tribunalLabel} requis={avecJugement} erreur={err("tribunal_jugement")}>
              {(p) => <Input {...p} name="tribunal_jugement" defaultValue={v("tribunal_jugement")} disabled={!avecJugement} />}
            </Field>
            <Field label={fd.motifJugementLabel} requis={avecJugement} erreur={err("motif_jugement")}>
              {(p) => <Input {...p} name="motif_jugement" defaultValue={v("motif_jugement")} disabled={!avecJugement} />}
            </Field>
            <Pleine>
              <Field label={fd.peinePrononceeLabel} requis={avecJugement} erreur={err("peine_prononcee")}>
                {(p) => <Textarea {...p} name="peine_prononcee" rows={2} defaultValue={v("peine_prononcee")} disabled={!avecJugement} />}
              </Field>
            </Pleine>
            <Field
              label={fd.dateSortieLabel}
              aide={fd.dateSortiePeineAide}
              erreur={err("date_sortie_execution_peine")}
            >
              {(p) => <Input {...p} type="date" name="date_sortie_execution_peine" defaultValue={v("date_sortie_execution_peine")} disabled={!avecJugement} />}
            </Field>
          </Rubrique>

          <Rubrique ouverte={avecAppel} titre={fd.appelTitre}>
            <Field label={fd.dateAppelLabel} requis={avecAppel} erreur={err("date_appel")}>
              {(p) => <Input {...p} type="date" name="date_appel" defaultValue={v("date_appel")} disabled={!avecAppel} />}
            </Field>
            <Field label={fd.juridictionAppel} requis={avecAppel} erreur={err("tribunal_appel")}>
              {(p) => <Input {...p} name="tribunal_appel" defaultValue={v("tribunal_appel") ?? "Cour d’Appel du Centre"} disabled={!avecAppel} />}
            </Field>
            <Field
              label={fd.decisionAppelLabel}
              requis={avecCassation}
              aide={avecAppel && !avecCassation ? fd.decisionAppelAide : undefined}
              erreur={err("decision_appel")}
            >
              {(p) => <Input {...p} name="decision_appel" defaultValue={v("decision_appel")} disabled={!avecAppel} />}
            </Field>
            <Field
              label={fd.dateSortieLabel}
              requis={avecCassation}
              aide={fd.dateSortieAppelAide}
              erreur={err("date_sortie_appel")}
            >
              {(p) => <Input {...p} type="date" name="date_sortie_appel" defaultValue={v("date_sortie_appel")} disabled={!avecAppel} />}
            </Field>
          </Rubrique>

          <Rubrique ouverte={avecCassation} titre={fd.cassationTitre}>
            <Field label={fd.datePourvoiLabel} requis={avecCassation} erreur={err("date_cassation")}>
              {(p) => <Input {...p} type="date" name="date_cassation" defaultValue={v("date_cassation")} disabled={!avecCassation} />}
            </Field>
            <Field label={fd.juridictionLabel} requis={avecCassation} erreur={err("tribunal_cassation")}>
              {(p) => <Input {...p} name="tribunal_cassation" defaultValue={v("tribunal_cassation") ?? "Cour Suprême"} disabled={!avecCassation} />}
            </Field>
            <Field
              label={fd.decisionCassationLabel}
              aide={fd.decisionCassationAide}
              erreur={err("decision_cassation")}
            >
              {(p) => <Input {...p} name="decision_cassation" defaultValue={v("decision_cassation")} disabled={!avecCassation} />}
            </Field>
            <Field
              label={fd.dateSortieLabel}
              aide={fd.dateSortieCassationAide}
              erreur={err("date_sortie_cassation")}
            >
              {(p) => <Input {...p} type="date" name="date_sortie_cassation" defaultValue={v("date_sortie_cassation")} disabled={!avecCassation} />}
            </Field>
          </Rubrique>

          <Pleine>
            <Field label={fd.observationsLabel} erreur={err("observations_statut")}>
              {(p) => <Textarea {...p} name="observations_statut" rows={2} defaultValue={v("observations_statut")} />}
            </Field>
          </Pleine>
        </FormSection>
        </>
        )}

        <div className="flex flex-col-reverse items-stretch justify-between gap-4 rounded-lg border border-hairline bg-surface p-5 shadow-e1 sm:flex-row sm:items-center sm:p-6">
          <p className="max-w-sm text-xs text-muted">
            <span className="text-danger">*</span> {fd.champsObligatoires}
            {edition && fd.mandatsModifiablesDepuis}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {edition && (
              <Link
                href={`/detenus/${edition.detenuId}`}
                className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                {fd.annuler}
              </Link>
            )}
            <Button type="submit" variante="primaire" icone="check" chargement={enCours} taille="lg">
              {enCours
                ? fd.enregistrementEnCours
                : edition
                  ? fd.enregistrerModifications
                  : etat.detenuId
                    ? fd.reessayerMandat
                    : fd.enregistrerDetenu}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Rubrique conditionnelle, dépliée en douceur (grid-rows 0fr → 1fr). */
function Rubrique({
  ouverte,
  titre,
  children,
}: {
  ouverte: boolean;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!ouverte}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)] sm:col-span-2",
        ouverte ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <fieldset disabled={!ouverte} className="rounded-lg border border-hairline bg-raised p-4">
          <legend className="px-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-accent">
            {titre}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </fieldset>
      </div>
    </div>
  );
}
