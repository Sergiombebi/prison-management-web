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

const SECTIONS = [
  { id: "identite", label: "Identité" },
  { id: "filiation", label: "Filiation" },
  { id: "origine", label: "Origine et papiers" },
  { id: "contact", label: "Contact d’urgence" },
  { id: "signalement", label: "Signalement" },
  { id: "incarceration", label: "Incarcération" },
  { id: "procedure", label: "Procédure" },
] as const;

/** Rubriques d'identité seules, pour la modification d'une fiche existante. */
const SECTIONS_IDENTITE = SECTIONS.slice(0, 5);

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
  const [etat, action, enCours] = useActionState<EtatEnregistrement, FormData>(
    edition?.action ?? enregistrerDetenu,
    {},
  );
  const sections = edition ? SECTIONS_IDENTITE : SECTIONS;

  const [sectionVisible, setSectionVisible] = useState<string>("identite");
  const [modifie, setModifie] = useState(false);
  // Noms des fichiers choisis, valables pour l'état courant seulement : après un
  // envoi, React vide les champs fichier, l'affichage doit suivre.
  const [choix, setChoix] = useState<{ pour: EtatEnregistrement; noms: Record<string, string> }>({ pour: {}, noms: {} });
  const fichiers = choix.pour === etat ? choix.noms : {};
  const [dateNaissance, setDateNaissance] = useState(edition?.initial.date_naissance ?? "");
  const [statutPenal, setStatutPenal] = useState("");
  const [dateIncarceration, setDateIncarceration] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [erreurExpiration, setErreurExpiration] = useState<string>();

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
  const avecAppel = statutPenal === "Appellant";
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

  function verifierExpiration(inc = dateIncarceration, exp = dateExpiration) {
    if (inc && exp && new Date(exp) <= new Date(inc)) {
      setErreurExpiration("La date d’expiration doit être postérieure à la date d’incarcération.");
    } else {
      setErreurExpiration(undefined);
    }
  }

  // --- Enregistrement réussi : on ne réaffiche pas les quarante champs
  if (etat.ok) {
    return (
      <div className="rounded-lg border border-success/30 bg-surface p-6 shadow-e2 animate-pop">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success-soft text-success">
            <Icon name="check" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-md font-semibold text-ink">Détenu enregistré</h2>
            <p className="mt-1 text-sm text-muted">
              La fiche et son mandat ont été créés dans le registre.
              {etat.photoIgnoree && " Les photographies n’ont pas pu être déposées : à ajouter depuis la fiche."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/detenus/${etat.detenuId}`}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-ink-inverse shadow-e2 transition-colors hover:bg-accent-hover"
              >
                <Icon name="eye" size={15} />
                Voir le dossier
              </Link>
              <Link
                href="/detenus/nouveau"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface px-4 text-sm text-ink shadow-e1 transition-colors hover:bg-raised"
              >
                <Icon name="plus" size={15} />
                Enregistrer un autre détenu
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
      <nav aria-label="Rubriques du formulaire" className="hidden lg:block" data-print-hide>
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
                <p className="text-sm font-medium text-ink">Cette personne a déjà un dossier</p>
                <p className="mt-1 text-sm text-muted">
                  {messageConflit} Dossier n° {conflit.numero_ecrou} — {conflit.nom}.
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
                    Restaurer ce dossier
                  </Button>
                  <Link
                    href={`/detenus/${conflit.detenu_id}`}
                    className="text-sm text-accent-ink underline underline-offset-2"
                  >
                    Consulter d’abord
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
                La fiche du détenu a bien été créée. Corrigez le mandat ci-dessous : la reprise
                n’enverra que celui-ci.
              </p>
            )}
          </div>
        )}

        {etat.photoIgnoree && (
          <p className="rounded-lg border border-hairline bg-raised px-4 py-3 text-sm text-muted">
            Les photographies n’ont pas pu être déposées (service de stockage indisponible).
            L’enregistrement peut se poursuivre sans elles.
          </p>
        )}

        <fieldset disabled={Boolean(etat.detenuId)} className="contents">
          <FormSection id="identite" numero="01" titre="Identité" description="Telle qu’elle figure sur le titre de détention.">
            <Field
              label="Numéro d’écrou (matricule)"
              requis
              aide="Unique dans l’établissement."
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
            <Field label="Nom complet" requis erreur={err("nom")}>
              {(p) => <Input {...p} name="nom" defaultValue={v("nom")} autoComplete="off" />}
            </Field>
            <Field label="Sexe" requis erreur={err("sexe")}>
              {(p) => (
                <Select {...p} name="sexe" defaultValue={v("sexe") ?? ""} placeholder="Sélectionner…">
                  {SEXES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Date de naissance"
              requis
              erreur={err("date_naissance")}
              aide={ageCalcule !== null ? `Âge calculé : ${ageCalcule} ans${ageCalcule < 18 ? " — mineur" : ""}` : undefined}
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
            <Field label="Lieu de naissance" requis erreur={err("lieu_naissance")}>
              {(p) => <Input {...p} name="lieu_naissance" defaultValue={v("lieu_naissance")} />}
            </Field>
            <Field label="Nationalité" erreur={err("nationalite")}>
              {(p) => <Input {...p} name="nationalite" defaultValue={v("nationalite") ?? (edition ? undefined : "Camerounaise")} />}
            </Field>
            <Field label="Profession" requis erreur={err("profession")}>
              {(p) => <Input {...p} name="profession" defaultValue={v("profession")} />}
            </Field>
            <Field label="Langue parlée" erreur={err("langue")}>
              {(p) => <Input {...p} name="langue" defaultValue={v("langue")} />}
            </Field>
          </FormSection>

          <FormSection id="filiation" numero="02" titre="Filiation et situation">
            <Field label="Nom du père" requis erreur={err("nom_pere")}>
              {(p) => <Input {...p} name="nom_pere" defaultValue={v("nom_pere")} />}
            </Field>
            <Field label="Nom de la mère" requis erreur={err("nom_mere")}>
              {(p) => <Input {...p} name="nom_mere" defaultValue={v("nom_mere")} />}
            </Field>
            <Field label="Situation matrimoniale" erreur={err("statut_matrimonial")}>
              {(p) => (
                <Select {...p} name="statut_matrimonial" defaultValue={v("statut_matrimonial") ?? ""}>
                  <option value="">Non renseignée</option>
                  {avecValeur(STATUTS_MATRIMONIAUX, v("statut_matrimonial")).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nombre d’enfants" erreur={err("nombre_enfants")}>
              {(p) => <Input {...p} name="nombre_enfants" type="number" min={0} max={99} inputMode="numeric" defaultValue={v("nombre_enfants")} />}
            </Field>
            <Field label="Niveau d’études" erreur={err("niveau_etudes")}>
              {(p) => (
                <Select {...p} name="niveau_etudes" defaultValue={v("niveau_etudes") ?? ""}>
                  <option value="">Non renseigné</option>
                  {avecValeur(NIVEAUX_ETUDES, v("niveau_etudes")).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Religion" erreur={err("religion")}>
              {(p) => <Input {...p} name="religion" defaultValue={v("religion")} />}
            </Field>
          </FormSection>

          <FormSection id="origine" numero="03" titre="Origine et papiers">
            <Field label="Département" erreur={err("departement")}>
              {(p) => <Input {...p} name="departement" defaultValue={v("departement")} />}
            </Field>
            <Field label="Arrondissement" erreur={err("arrondissement")}>
              {(p) => <Input {...p} name="arrondissement" defaultValue={v("arrondissement")} />}
            </Field>
            <Field label="Ethnie" erreur={err("ethnie")}>
              {(p) => <Input {...p} name="ethnie" defaultValue={v("ethnie")} />}
            </Field>
            <Pleine>
              <Field label="Résidence" erreur={err("residence")}>
                {(p) => <Input {...p} name="residence" defaultValue={v("residence")} />}
              </Field>
            </Pleine>
            <Field
              label="Numéro de CNI"
              aide="Sert à repérer une réincarcération."
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
            <Field label="Numéro de passeport" erreur={err("numero_passeport")}>
              {(p) => <Input {...p} name="numero_passeport" defaultValue={v("numero_passeport")} className="font-mono" spellCheck={false} />}
            </Field>
          </FormSection>

          <FormSection
            id="contact"
            numero="04"
            titre="Contact d’urgence"
            description="La personne à prévenir. C’est ce numéro qui apparaît dans le registre."
          >
            <Field label="Nom du proche" erreur={err("contact_urgence_nom")}>
              {(p) => <Input {...p} name="contact_urgence_nom" defaultValue={v("contact_urgence_nom")} />}
            </Field>
            <Field label="Lien de parenté" erreur={err("contact_urgence_lien_parente")}>
              {(p) => (
                <Select {...p} name="contact_urgence_lien_parente" defaultValue={v("contact_urgence_lien_parente") ?? ""}>
                  <option value="">Non renseigné</option>
                  {avecValeur(LIENS_PARENTE, v("contact_urgence_lien_parente")).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Téléphone" aide="Format : 6 99 99 99 99" erreur={err("contact_urgence_telephone")}>
              {(p) => <Input {...p} name="contact_urgence_telephone" type="tel" inputMode="tel" defaultValue={v("contact_urgence_telephone")} />}
            </Field>
            <Field label="Adresse" erreur={err("contact_urgence_adresse")}>
              {(p) => <Input {...p} name="contact_urgence_adresse" defaultValue={v("contact_urgence_adresse")} />}
            </Field>
          </FormSection>

          <FormSection
            id="signalement"
            numero="05"
            titre="Signalement"
            description="Les photographies sont déposées sur le service de stockage avant l’enregistrement."
          >
            {(
              [
                ["photo_face", "Photo de face"],
                ["photo_profil", "Photo de profil"],
              ] as const
            ).map(([nom, libelle]) => {
              const actuelle = edition?.photos[nom === "photo_face" ? "face" : "profil"];
              const choisi = fichiers[nom];
              return (
                <Field
                  key={nom}
                  label={libelle}
                  aide={actuelle && !choisi ? "Photo actuelle conservée si aucun fichier n’est choisi" : "JPG ou PNG, 8 Mo maximum"}
                  erreur={err(nom)}
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
                          {choisi ?? (actuelle ? "Remplacer la photo" : "Choisir un fichier")}
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
                          setChoix({ pour: etat, noms: { ...fichiers, [nom]: fichier?.name ?? "" } });
                        }}
                      />
                    </label>
                  )}
                </Field>
              );
            })}
            <Pleine>
              <Field label="Anthropométrie et signes particuliers" aide="Taille, cicatrices, tatouages…" erreur={err("anthropometrie")}>
                {(p) => <Textarea {...p} name="anthropometrie" rows={3} defaultValue={v("anthropometrie")} />}
              </Field>
            </Pleine>
          </FormSection>
        </fieldset>

        {!edition && (
        <>
        <FormSection id="incarceration" numero="06" titre="Incarcération" description="Titre de détention qui fonde l’écrou.">
          <Field label="Date d’incarcération" requis erreur={err("date_incarceration")}>
            {(p) => (
              <Input
                {...p}
                type="date"
                name="date_incarceration"
                value={dateIncarceration || v("date_incarceration") || ""}
                onChange={(e) => setDateIncarceration(e.target.value)}
                onBlur={() => verifierExpiration()}
              />
            )}
          </Field>
          <Field label="Type de mandat" requis erreur={err("type_mandat")}>
            {(p) => (
              <Select {...p} name="type_mandat" defaultValue={v("type_mandat") ?? ""} placeholder="Sélectionner…">
                {TYPES_MANDAT.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Référence du mandat" requis erreur={err("reference_mandat")}>
            {(p) => <Input {...p} name="reference_mandat" defaultValue={v("reference_mandat")} className="font-mono" spellCheck={false} />}
          </Field>
          <Field label="Autorité ayant signé" requis erreur={err("autorite_signataire")}>
            {(p) => <Input {...p} name="autorite_signataire" defaultValue={v("autorite_signataire") ?? "Procureur de la République"} />}
          </Field>
          <Field label="Date de signature" requis erreur={err("date_signature_mandat")}>
            {(p) => <Input {...p} type="date" name="date_signature_mandat" defaultValue={v("date_signature_mandat")} />}
          </Field>
          <Field label="Date d’expiration" requis erreur={erreurExpiration ?? err("date_expiration_mandat")}>
            {(p) => (
              <Input
                {...p}
                type="date"
                name="date_expiration_mandat"
                value={dateExpiration || v("date_expiration_mandat") || ""}
                min={dateIncarceration || undefined}
                onChange={(e) => setDateExpiration(e.target.value)}
                onBlur={() => verifierExpiration()}
              />
            )}
          </Field>
          <Pleine>
            <Field label="Motif de détention" requis erreur={err("motif_detention")}>
              {(p) => <Input {...p} name="motif_detention" defaultValue={v("motif_detention")} placeholder="Ex. Vol aggravé" />}
            </Field>
          </Pleine>
          <Field label="Autorité pénitentiaire" erreur={err("autorite_penitentiaire")}>
            {(p) => (
              <Select {...p} name="autorite_penitentiaire" defaultValue={v("autorite_penitentiaire") ?? ""}>
                <option value="">Non renseignée</option>
                {AUTORITES_PENITENTIAIRES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="État physique à l’arrivée" erreur={err("etat_physique_arrivee")}>
            {(p) => (
              <Select {...p} name="etat_physique_arrivee" defaultValue={v("etat_physique_arrivee") ?? ""}>
                <option value="">Non renseigné</option>
                {ETATS_PHYSIQUES_ARRIVEE.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Pleine>
            <Field label="Objets personnels" aide="Objets remis à l’entrée : montre, téléphone, argent…" erreur={err("objets_personnels")}>
              {(p) => <Textarea {...p} name="objets_personnels" rows={2} defaultValue={v("objets_personnels")} />}
            </Field>
          </Pleine>
        </FormSection>

        <FormSection
          id="procedure"
          numero="07"
          titre="Procédure judiciaire"
          description="Les rubriques suivantes s’ouvrent selon le statut pénal choisi, et deviennent alors obligatoires."
        >
          <Pleine>
            <Field label="Statut pénal" requis erreur={err("type_statut_penal")}>
              {(p) => (
                <Select
                  {...p}
                  name="type_statut_penal"
                  value={statutPenal || v("type_statut_penal") || ""}
                  onChange={(e) => setStatutPenal(e.target.value)}
                  placeholder="Sélectionner le statut…"
                >
                  {TYPES_STATUT_PENAL.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
          </Pleine>

          <Rubrique ouverte={avecJugement} titre="Jugement">
            <Field label="Date du jugement" requis={avecJugement} erreur={err("date_jugement")}>
              {(p) => <Input {...p} type="date" name="date_jugement" defaultValue={v("date_jugement")} disabled={!avecJugement} />}
            </Field>
            <Field label="Référence du jugement" requis={avecJugement} erreur={err("reference_jugement")}>
              {(p) => <Input {...p} name="reference_jugement" defaultValue={v("reference_jugement")} className="font-mono" disabled={!avecJugement} />}
            </Field>
            <Field label="Tribunal" requis={avecJugement} erreur={err("tribunal_jugement")}>
              {(p) => <Input {...p} name="tribunal_jugement" defaultValue={v("tribunal_jugement")} disabled={!avecJugement} />}
            </Field>
            <Field label="Motif du jugement" requis={avecJugement} erreur={err("motif_jugement")}>
              {(p) => <Input {...p} name="motif_jugement" defaultValue={v("motif_jugement")} disabled={!avecJugement} />}
            </Field>
            <Pleine>
              <Field label="Peine prononcée" requis={avecJugement} erreur={err("peine_prononcee")}>
                {(p) => <Textarea {...p} name="peine_prononcee" rows={2} defaultValue={v("peine_prononcee")} disabled={!avecJugement} />}
              </Field>
            </Pleine>
          </Rubrique>

          <Rubrique ouverte={avecAppel} titre="Appel">
            <Field label="Date de l’appel" requis={avecAppel} erreur={err("date_appel")}>
              {(p) => <Input {...p} type="date" name="date_appel" defaultValue={v("date_appel")} disabled={!avecAppel} />}
            </Field>
            <Field label="Juridiction d’appel" requis={avecAppel} erreur={err("tribunal_appel")}>
              {(p) => <Input {...p} name="tribunal_appel" defaultValue={v("tribunal_appel") ?? "Cour d’Appel du Centre"} disabled={!avecAppel} />}
            </Field>
            <Pleine>
              <Field label="Décision en appel" requis={avecAppel} erreur={err("decision_appel")}>
                {(p) => <Input {...p} name="decision_appel" defaultValue={v("decision_appel")} disabled={!avecAppel} />}
              </Field>
            </Pleine>
          </Rubrique>

          <Rubrique ouverte={avecCassation} titre="Cassation">
            <Field label="Date du pourvoi" requis={avecCassation} erreur={err("date_cassation")}>
              {(p) => <Input {...p} type="date" name="date_cassation" defaultValue={v("date_cassation")} disabled={!avecCassation} />}
            </Field>
            <Field label="Juridiction" requis={avecCassation} erreur={err("tribunal_cassation")}>
              {(p) => <Input {...p} name="tribunal_cassation" defaultValue={v("tribunal_cassation") ?? "Cour Suprême"} disabled={!avecCassation} />}
            </Field>
            <Pleine>
              <Field label="Décision de cassation" requis={avecCassation} erreur={err("decision_cassation")}>
                {(p) => <Input {...p} name="decision_cassation" defaultValue={v("decision_cassation")} disabled={!avecCassation} />}
              </Field>
            </Pleine>
          </Rubrique>

          <Pleine>
            <Field label="Observations" erreur={err("observations_statut")}>
              {(p) => <Textarea {...p} name="observations_statut" rows={2} defaultValue={v("observations_statut")} />}
            </Field>
          </Pleine>
        </FormSection>
        </>
        )}

        <div className="flex flex-col-reverse items-stretch justify-between gap-4 rounded-lg border border-hairline bg-surface p-5 shadow-e1 sm:flex-row sm:items-center sm:p-6">
          <p className="max-w-sm text-xs text-muted">
            <span className="text-danger">*</span> Champs obligatoires. L’unicité de l’écrou et de la
            CNI est vérifiée par le serveur.
            {edition && " Les mandats se modifient depuis l’onglet Mandats du dossier."}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {edition && (
              <Link
                href={`/detenus/${edition.detenuId}`}
                className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                Annuler
              </Link>
            )}
            <Button type="submit" variante="primaire" icone="check" chargement={enCours} taille="lg">
              {enCours
                ? "Enregistrement…"
                : edition
                  ? "Enregistrer les modifications"
                  : etat.detenuId
                    ? "Réessayer l’enregistrement du mandat"
                    : "Enregistrer le détenu"}
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
