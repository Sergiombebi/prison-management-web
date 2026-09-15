"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  AUTORITES_PENITENTIAIRES,
  ETATS_PHYSIQUES_ARRIVEE,
  NIVEAUX_ETUDES,
  SEXES,
  STATUTS_MATRIMONIAUX,
  TYPES_MANDAT,
  TYPES_STATUT_PENAL,
} from "@/lib/domain/referentiels";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormSection, Pleine } from "@/components/ui/form-section";
import { DemoSubmit } from "@/components/ui/client-actions";
import { Icon } from "@/components/ui/icon";

const SECTIONS = [
  { id: "identite", label: "Identité" },
  { id: "filiation", label: "Filiation et situation" },
  { id: "origine", label: "Origine et documents" },
  { id: "signalement", label: "Signalement" },
  { id: "incarceration", label: "Incarcération" },
  { id: "procedure", label: "Procédure judiciaire" },
] as const;

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
 * Formulaire d'enregistrement — reprend les rubriques de `DetenuFormView.xaml`.
 *
 * - Sommaire latéral qui suit la lecture (IntersectionObserver).
 * - Les rubriques Jugement / Appel / Cassation apparaissent selon le statut pénal choisi,
 *   exactement comme dans le desktop.
 * - Aucune saisie n'est perdue : validation au blur, alerte avant de quitter la page.
 */
export function DetenuForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [sectionVisible, setSectionVisible] = useState<string>("identite");
  const [modifie, setModifie] = useState(false);

  const [dateNaissance, setDateNaissance] = useState("");
  const [statutPenal, setStatutPenal] = useState("");
  const [dateIncarceration, setDateIncarceration] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [erreurExpiration, setErreurExpiration] = useState<string>();

  const ageCalcule = age(dateNaissance);
  const avecJugement = ["Exécution de peine", "Appellant", "Cassationnaire"].includes(statutPenal);
  const avecAppel = ["Appellant", "Cassationnaire"].includes(statutPenal);
  const avecCassation = statutPenal === "Cassationnaire";

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
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Garde-fou : ne jamais perdre une fiche à moitié remplie
  useEffect(() => {
    if (!modifie) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [modifie]);

  function verifierExpiration(inc = dateIncarceration, exp = dateExpiration) {
    if (inc && exp && new Date(exp) <= new Date(inc)) {
      setErreurExpiration("La date d’expiration doit être postérieure à la date d’incarcération.");
    } else {
      setErreurExpiration(undefined);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      {/* Sommaire */}
      <nav aria-label="Rubriques du formulaire" className="hidden lg:block" data-print-hide>
        <ol className="sticky top-20 flex flex-col border-l border-hairline">
          {SECTIONS.map((s, i) => {
            const courant = sectionVisible === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={courant ? "location" : undefined}
                  className={cn(
                    "relative -ml-px flex items-center gap-2.5 border-l py-1.5 pl-4 text-sm transition-colors duration-[var(--dur-base)]",
                    courant ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  <span className="font-mono text-2xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                  {s.label}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <form
        ref={formRef}
        onChange={() => setModifie(true)}
        className="rounded-lg border border-hairline bg-surface px-5 py-7 sm:px-8"
      >
        <FormSection id="identite" numero="01" titre="Identité" description="Telle qu’elle figure sur le titre de détention.">
          <Field label="Numéro d’écrou (matricule)" requis aide="Unique dans l’établissement.">
            {(p) => <Input {...p} name="numeroEcrou" autoComplete="off" spellCheck={false} className="font-mono uppercase" />}
          </Field>
          <Field label="Nom complet" requis>
            {(p) => <Input {...p} name="nom" autoComplete="off" />}
          </Field>
          <Field label="Sexe" requis>
            {(p) => (
              <Select {...p} name="sexe" defaultValue="" placeholder="Sélectionner…">
                {SEXES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Date de naissance"
            requis
            aide={ageCalcule !== null ? `Âge calculé : ${ageCalcule} ans${ageCalcule < 18 ? " — mineur" : ""}` : undefined}
          >
            {(p) => (
              <Input
                {...p}
                type="date"
                name="dateNaissance"
                value={dateNaissance}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateNaissance(e.target.value)}
              />
            )}
          </Field>
          <Field label="Lieu de naissance" requis>
            {(p) => <Input {...p} name="lieuNaissance" />}
          </Field>
          <Field label="Nationalité" requis>
            {(p) => <Input {...p} name="nationalite" defaultValue="Camerounaise" />}
          </Field>
          <Field label="Profession" requis>
            {(p) => <Input {...p} name="profession" />}
          </Field>
          <Field label="Langue parlée">
            {(p) => <Input {...p} name="langue" />}
          </Field>
        </FormSection>

        <FormSection id="filiation" numero="02" titre="Filiation et situation">
          <Field label="Nom du père" requis>
            {(p) => <Input {...p} name="nomPere" />}
          </Field>
          <Field label="Nom de la mère" requis>
            {(p) => <Input {...p} name="nomMere" />}
          </Field>
          <Field label="Situation matrimoniale">
            {(p) => (
              <Select {...p} name="statutMatrimonial" defaultValue="">
                <option value="">Non renseignée</option>
                {STATUTS_MATRIMONIAUX.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Nombre d’enfants">
            {(p) => <Input {...p} name="nombreEnfants" type="number" min={0} max={99} inputMode="numeric" />}
          </Field>
          <Field label="Niveau d’études">
            {(p) => (
              <Select {...p} name="niveauEtudes" defaultValue="">
                <option value="">Non renseigné</option>
                {NIVEAUX_ETUDES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Religion">
            {(p) => <Input {...p} name="religion" />}
          </Field>
        </FormSection>

        <FormSection id="origine" numero="03" titre="Origine et documents">
          <Field label="Département">
            {(p) => <Input {...p} name="departement" />}
          </Field>
          <Field label="Arrondissement">
            {(p) => <Input {...p} name="arrondissement" />}
          </Field>
          <Field label="Ethnie">
            {(p) => <Input {...p} name="ethnie" />}
          </Field>
          <Field label="Contact utile" aide="Format : 6 99 99 99 99">
            {(p) => <Input {...p} name="contact" type="tel" inputMode="tel" autoComplete="off" />}
          </Field>
          <Pleine>
            <Field label="Résidence">
              {(p) => <Input {...p} name="residence" />}
            </Field>
          </Pleine>
          <Field label="Numéro de CNI">
            {(p) => <Input {...p} name="numeroCNI" className="font-mono" spellCheck={false} />}
          </Field>
          <Field label="Numéro de passeport">
            {(p) => <Input {...p} name="numeroPasseport" className="font-mono" spellCheck={false} />}
          </Field>
        </FormSection>

        <FormSection
          id="signalement"
          numero="04"
          titre="Signalement"
          description="Les photographies seront stockées par l’API ; elles ne sont pas encore transmises."
        >
          {(["face", "profil"] as const).map((vue) => (
            <Field key={vue} label={`Photo de ${vue}`} aide="JPG ou PNG, optionnelle">
              {(p) => (
                <label
                  htmlFor={p.id}
                  className="group flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-rule bg-raised text-sm text-muted transition-colors hover:border-accent hover:text-ink"
                >
                  <Icon name="user" size={20} className="text-faint transition-colors group-hover:text-accent" />
                  Choisir un fichier
                  <input {...p} type="file" accept="image/png,image/jpeg" name={`photo-${vue}`} className="sr-only" />
                </label>
              )}
            </Field>
          ))}
          <Pleine>
            <Field label="Anthropométrie et signes particuliers" aide="Taille, cicatrices, tatouages…">
              {(p) => <Textarea {...p} name="anthropometrie" rows={3} />}
            </Field>
          </Pleine>
        </FormSection>

        <FormSection id="incarceration" numero="05" titre="Incarcération" description="Titre de détention qui fonde l’écrou.">
          <Field label="Date d’incarcération" requis>
            {(p) => (
              <Input
                {...p}
                type="date"
                name="dateIncarceration"
                value={dateIncarceration}
                onChange={(e) => setDateIncarceration(e.target.value)}
                onBlur={() => verifierExpiration()}
              />
            )}
          </Field>
          <Field label="Type de mandat" requis>
            {(p) => (
              <Select {...p} name="typeMandat" defaultValue="" placeholder="Sélectionner…">
                {TYPES_MANDAT.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Référence du mandat" requis>
            {(p) => <Input {...p} name="referenceMandat" className="font-mono" spellCheck={false} />}
          </Field>
          <Field label="Autorité ayant signé" requis>
            {(p) => <Input {...p} name="autoriteSignataire" placeholder="Ex. Procureur de la République" />}
          </Field>
          <Field label="Date de signature" requis>
            {(p) => <Input {...p} type="date" name="dateSignatureMandat" />}
          </Field>
          <Field label="Date d’expiration" requis erreur={erreurExpiration}>
            {(p) => (
              <Input
                {...p}
                type="date"
                name="dateSortieMandat"
                value={dateExpiration}
                min={dateIncarceration || undefined}
                onChange={(e) => setDateExpiration(e.target.value)}
                onBlur={() => verifierExpiration()}
              />
            )}
          </Field>
          <Pleine>
            <Field label="Motif de détention" requis>
              {(p) => <Input {...p} name="motifDetention" placeholder="Ex. Vol aggravé" />}
            </Field>
          </Pleine>
          <Field label="Autorité pénitentiaire ayant incarcéré" requis>
            {(p) => (
              <Select {...p} name="autoritePenitentiaire" defaultValue="" placeholder="Sélectionner…">
                {AUTORITES_PENITENTIAIRES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="État physique à l’arrivée">
            {(p) => (
              <Select {...p} name="etatPhysiqueArrivee" defaultValue="">
                <option value="">Non renseigné</option>
                {ETATS_PHYSIQUES_ARRIVEE.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Pleine>
            <Field label="Objets personnels" aide="Objets remis à l’entrée : montre, téléphone, argent…">
              {(p) => <Textarea {...p} name="objetsPersonnels" rows={2} />}
            </Field>
          </Pleine>
        </FormSection>

        <FormSection
          id="procedure"
          numero="06"
          titre="Procédure judiciaire"
          description="Les rubriques suivantes s’ouvrent selon le statut pénal choisi."
        >
          <Pleine>
            <Field label="Statut pénal" requis>
              {(p) => (
                <Select
                  {...p}
                  name="typeStatutPenal"
                  value={statutPenal}
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
            <Field label="Date du jugement" requis={avecJugement}>
              {(p) => <Input {...p} type="date" name="dateJugement" disabled={!avecJugement} />}
            </Field>
            <Field label="Référence du jugement" requis={avecJugement}>
              {(p) => <Input {...p} name="referenceJugement" className="font-mono" disabled={!avecJugement} />}
            </Field>
            <Field label="Tribunal" requis={avecJugement}>
              {(p) => <Input {...p} name="tribunalJugement" disabled={!avecJugement} />}
            </Field>
            <Field label="Motif du jugement" requis={avecJugement}>
              {(p) => <Input {...p} name="motifJugement" disabled={!avecJugement} />}
            </Field>
            <Pleine>
              <Field label="Peine prononcée" requis={avecJugement}>
                {(p) => <Textarea {...p} name="peinePrononcee" rows={2} disabled={!avecJugement} />}
              </Field>
            </Pleine>
          </Rubrique>

          <Rubrique ouverte={avecAppel} titre="Appel">
            <Field label="Date de l’appel" requis={avecAppel}>
              {(p) => <Input {...p} type="date" name="dateAppel" disabled={!avecAppel} />}
            </Field>
            <Field label="Juridiction d’appel">
              {(p) => <Input {...p} name="tribunalAppel" defaultValue="Cour d’Appel du Centre" disabled={!avecAppel} />}
            </Field>
            <Pleine>
              <Field label="Décision en appel" requis={avecAppel}>
                {(p) => <Input {...p} name="decisionAppel" disabled={!avecAppel} />}
              </Field>
            </Pleine>
          </Rubrique>

          <Rubrique ouverte={avecCassation} titre="Cassation">
            <Field label="Date du pourvoi" requis={avecCassation}>
              {(p) => <Input {...p} type="date" name="dateCassation" disabled={!avecCassation} />}
            </Field>
            <Field label="Juridiction">
              {(p) => <Input {...p} name="tribunalCassation" defaultValue="Cour Suprême" disabled={!avecCassation} />}
            </Field>
            <Pleine>
              <Field label="Décision de cassation" requis={avecCassation}>
                {(p) => <Input {...p} name="decisionCassation" disabled={!avecCassation} />}
              </Field>
            </Pleine>
          </Rubrique>

          <Pleine>
            <Field label="Observations">
              {(p) => <Textarea {...p} name="observationsStatut" rows={2} />}
            </Field>
          </Pleine>
        </FormSection>

        <div className="mt-2 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-rule pt-6 sm:flex-row sm:items-start">
          <p className="max-w-sm text-xs text-muted">
            <span className="text-danger">*</span> Champs obligatoires. Le numéro d’écrou est vérifié par le
            serveur au moment de l’enregistrement.
          </p>
          <DemoSubmit endpoint="POST /detenus">Enregistrer le détenu</DemoSubmit>
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
        <fieldset disabled={!ouverte} className="rounded-md border border-hairline bg-raised p-4">
          <legend className="px-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-accent">{titre}</legend>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </fieldset>
      </div>
    </div>
  );
}
