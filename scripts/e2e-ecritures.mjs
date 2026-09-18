#!/usr/bin/env node
/**
 * Vérification de bout en bout des écritures, contre l'API réelle.
 *
 *   1. lancer l'API      : php artisan serve --host=127.0.0.1 --port=8000
 *   2. base de démo neuve : php artisan migrate:fresh --seed
 *   3. lancer le front   : npm run dev
 *   4. node scripts/e2e-ecritures.mjs
 *
 * Chaque scénario soumet un vrai formulaire de l'application, par le chemin
 * « sans JavaScript » des Server Actions (les champs $ACTION_* sont extraits du
 * HTML), puis vérifie le message rendu. Ce qui est testé, c'est donc la chaîne
 * complète : formulaire → action serveur → API → message affiché.
 *
 * Nécessite une base fraîchement peuplée : les scénarios s'appuient sur les
 * données de démonstration (détenu 1 logé en ISO2, DPAC à deux mandats, etc.).
 */
const BASE = process.env.SGP_WEB_URL ?? "http://localhost:3000";
const cookies = {};
let reussites = 0;
const echecs = [];

const entete = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
const deshtml = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const aujourdhui = new Date().toISOString().slice(0, 10);
const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

function memoriser(reponse) {
  for (const brut of reponse.headers.getSetCookie?.() ?? []) {
    const [paire] = brut.split(";");
    const i = paire.indexOf("=");
    const nom = paire.slice(0, i).trim();
    const valeur = paire.slice(i + 1).trim();
    if (!valeur || /expires=Thu, 01 Jan 1970/i.test(brut)) delete cookies[nom];
    else cookies[nom] = valeur;
  }
}

async function page(chemin) {
  const reponse = await fetch(BASE + chemin, { headers: { cookie: entete() }, redirect: "manual" });
  memoriser(reponse);
  if (reponse.status >= 300 && reponse.status < 400) {
    return { statut: reponse.status, redirection: reponse.headers.get("location"), html: "" };
  }
  return { statut: reponse.status, redirection: null, html: await reponse.text() };
}

/** Champs cachés $ACTION_* du formulaire qui contient `marqueur`. */
function champsAction(html, marqueur) {
  const position = html.indexOf(marqueur);
  if (position < 0) throw new Error(`champ « ${marqueur} » absent de la page`);
  const formulaire = html.slice(html.lastIndexOf("<form", position), position);
  const champs = {};
  for (const balise of formulaire.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const nom = /name="([^"]+)"/.exec(balise[0])?.[1];
    if (nom?.startsWith("$ACTION")) champs[nom] = deshtml(/value="([^"]*)"/.exec(balise[0])?.[1] ?? "");
  }
  return champs;
}

async function soumettre(chemin, marqueur, valeurs) {
  const { html } = await page(chemin);
  const corps = new FormData();
  for (const [cle, valeur] of Object.entries({ ...champsAction(html, marqueur), ...valeurs })) {
    corps.append(cle, String(valeur));
  }
  const reponse = await fetch(BASE + chemin, {
    method: "POST",
    headers: { cookie: entete() },
    body: corps,
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  memoriser(reponse);
  return { statut: reponse.status, location: reponse.headers.get("location"), html: await reponse.text() };
}

/** Messages annoncés à l'utilisateur (confirmations et erreurs). */
function messages(html) {
  return [...html.matchAll(/role="(?:alert|status)"[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => deshtml(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((m) => m && !m.startsWith("Chargement"));
}

function verifier(intitule, condition, detail = "") {
  if (condition) {
    reussites += 1;
    console.log(`  ok   ${intitule}`);
  } else {
    echecs.push(intitule);
    console.log(`  ÉCHEC ${intitule}${detail ? ` — ${detail}` : ""}`);
  }
}

const contient = (html, extrait) => messages(html).some((m) => m.includes(extrait));

// ---------------------------------------------------------------------------

async function connexion() {
  console.log("\nConnexion");
  const r = await soumettre("/connexion", 'name="motDePasse"', { identifiant: "admin", motDePasse: "password" });
  verifier("connexion de l'administrateur", Boolean(cookies.sgp_session), `statut ${r.statut}`);
  if (!cookies.sgp_session) {
    console.error("\nImpossible de continuer sans session : API démarrée ? base peuplée ?");
    process.exit(1);
  }
}

async function enregistrementDetenu() {
  console.log("\nRegistre d'écrou");
  const ecrou = `E2E-${Date.now().toString().slice(-6)}`;
  const fiche = {
    numero_ecrou: ecrou,
    nom: "Test Bout-en-bout",
    sexe: "Masculin",
    date_naissance: "1990-05-12",
    lieu_naissance: "Yaoundé",
    profession: "Menuisier",
    nom_pere: "Père",
    nom_mere: "Mère",
    date_incarceration: aujourdhui,
    type_mandat: "Mandat de détention provisoire",
    reference_mandat: "REF-E2E",
    autorite_signataire: "Procureur de la République",
    date_signature_mandat: hier,
    date_expiration_mandat: "2028-01-01",
    motif_detention: "Vol (test)",
    type_statut_penal: "Détention provisoire",
  };

  const creation = await soumettre("/detenus/nouveau", 'name="numero_ecrou"', fiche);
  // En cas de succès, un panneau de confirmation remplace le formulaire : ce n'est pas une alerte
  verifier("création d'une fiche et de son mandat", creation.html.includes("Détenu enregistré"));

  const doublon = await soumettre("/detenus/nouveau", 'name="numero_ecrou"', fiche);
  verifier("écrou déjà utilisé refusé", contient(doublon.html, "déjà utilisé"));
  verifier("saisies conservées après refus", doublon.html.includes(`value="${ecrou}"`));

  const dateFuture = await soumettre("/detenus/nouveau", 'name="numero_ecrou"', {
    ...fiche,
    numero_ecrou: `${ecrou}-B`,
    date_naissance: "2090-01-01",
  });
  verifier("date de naissance future refusée", contient(dateFuture.html, "antérieure"));
}

async function modificationFiche() {
  console.log("\nModification d'une fiche");
  const { html } = await page("/detenus/2/modifier");
  const champs = {};
  for (const balise of html.matchAll(/<input[^>]*name="([a-z_]+)"[^>]*>/g)) {
    if (/type="(file|hidden)"/.test(balise[0])) continue;
    champs[balise[1]] = deshtml(/value="([^"]*)"/.exec(balise[0])?.[1] ?? "");
  }
  for (const bloc of html.matchAll(/<select[^>]*name="([a-z_]+)"[\s\S]*?<\/select>/g)) {
    const choisie = /<option([^>]*)selected=""([^>]*)>([^<]*)<\/option>/.exec(bloc[0]);
    champs[bloc[1]] = choisie ? deshtml(/value="([^"]*)"/.exec(choisie[1] + choisie[2])?.[1] ?? choisie[3]) : "";
  }

  const r = await soumettre("/detenus/2/modifier", 'name="numero_ecrou"', {
    ...champs,
    profession: "Profession modifiée (test)",
  });
  verifier("modification enregistrée", r.location?.includes("maj=identite") ?? false, `statut ${r.statut}`);

  const fiche = await page("/detenus/2");
  verifier("nouvelle valeur visible sur la fiche", fiche.html.includes("Profession modifiée (test)"));

  const conflit = await soumettre("/detenus/2/modifier", 'name="numero_ecrou"', {
    ...champs,
    numero_ecrou: "DEMO-P-001",
  });
  verifier("écrou d'un autre détenu refusé", contient(conflit.html, "déjà utilisé"));
}

async function discipline() {
  console.log("\nDiscipline");
  const cellule = await soumettre("/discipline/cellules", 'name="capacite_max"', {
    numero: `E2E${Date.now().toString().slice(-4)}`,
    bloc: "E2E",
    type_cellule: "Normale",
    capacite_max: "4",
  });
  verifier("création d'une cellule", contient(cellule.html, "créée"));

  // ISO2 (cellule 7) est pleine dans les données de démonstration
  const pleine = await soumettre("/discipline/affectations", 'name="cellule_id"', {
    detenu_id: "3",
    cellule_id: "7",
    motif_affectation: "Test cellule pleine",
  });
  verifier("affectation en cellule pleine refusée", contient(pleine.html, "complète"));

  const affectation = await soumettre("/discipline/affectations", 'name="cellule_id"', {
    detenu_id: "3",
    cellule_id: "4",
    motif_affectation: "Réaffectation (test)",
  });
  verifier("réaffectation enregistrée", contient(affectation.html, "Affectation enregistrée"));

  const sansDetenu = await soumettre("/discipline/affectations", 'name="cellule_id"', { cellule_id: "4" });
  verifier("affectation sans détenu refusée", contient(sansDetenu.html, "Choisissez le détenu"));

  const { html } = await page("/discipline/sanctions");
  const typeIsolement = /<option value="(\d+)">Isolement<\/option>/.exec(html)?.[1];
  const sanction = await soumettre("/discipline/sanctions", 'name="type_sanction_id"', {
    detenu_id: "4",
    type_sanction_id: typeIsolement,
    motif: "Bagarre au réfectoire (test)",
    date_faute: hier,
    date_debut: aujourdhui,
    cellule_disciplinaire_id: "8",
  });
  verifier("sanction avec mise en cellule disciplinaire", contient(sanction.html, "déplacé en cellule disciplinaire"));

  const datesIncoherentes = await soumettre("/discipline/sanctions", 'name="type_sanction_id"', {
    detenu_id: "4",
    type_sanction_id: typeIsolement,
    motif: "Dates incohérentes (test)",
    date_faute: aujourdhui,
    date_debut: hier,
  });
  verifier("début de sanction avant la faute refusé", contient(datesIncoherentes.html, "ne peut pas précéder"));
}

async function santeEtVisites() {
  console.log("\nSanté et visites");
  const consultation = await soumettre("/sante/suivi-medical", 'name="nom_medecin"', {
    detenu_id: "2",
    date_consultation: aujourdhui,
    type_consultation: "Consultation générale",
    nom_medecin: "Dr Kamga",
    symptomes: "Céphalées (test)",
    diagnostic: "Paludisme simple (test)",
    temperature: "38,5",
  });
  verifier("consultation enregistrée", contient(consultation.html, "Consultation enregistrée"));

  const typeInvalide = await soumettre("/sante/suivi-medical", 'name="nom_medecin"', {
    detenu_id: "2",
    date_consultation: aujourdhui,
    type_consultation: "Radiologie",
    nom_medecin: "Dr Kamga",
    symptomes: "test",
    diagnostic: "test",
  });
  verifier("type de consultation hors référentiel refusé", contient(typeInvalide.html, "Type de consultation invalide"));

  const visite = await soumettre("/sante/visites", 'name="nom_visiteur"', {
    detenu_id: "2",
    date_visite: aujourdhui,
    heure_arrivee: "10:30",
    duree_prevue_minutes: "30",
    type_visite: "Parloir familial",
    nom_visiteur: "Visiteuse Test",
    sexe_visiteur: "Féminin",
    type_piece_identite: "Passeport",
    numero_piece_identite: "P-E2E",
    lien_parente: "Époux/Épouse",
    agent_controle: "Agent Test",
  });
  verifier("visite enregistrée", contient(visite.html, "Visite enregistrée"));

  const dureeInvalide = await soumettre("/sante/visites", 'name="nom_visiteur"', {
    detenu_id: "2",
    date_visite: aujourdhui,
    heure_arrivee: "10:30",
    duree_prevue_minutes: "22",
    type_visite: "Parloir familial",
    nom_visiteur: "Test",
    sexe_visiteur: "Masculin",
    type_piece_identite: "Passeport",
    numero_piece_identite: "P1",
    lien_parente: "Ami(e)",
    agent_controle: "Agent Test",
  });
  verifier("durée de visite hors référentiel refusée", contient(dureeInvalide.html, "Durée invalide"));

  const fiche = await page("/detenus/2?onglet=sante");
  verifier("consultation visible dans le dossier", fiche.html.includes("Paludisme simple (test)"));
}

async function sorties() {
  console.log("\nSorties");
  // Détenu 15 : DPAC à deux mandats ouverts dans les données de démonstration
  const { html } = await page("/detenus/liberation/normale?detenu=15");
  const mandat = /<select[^>]*name="mandas_id"[\s\S]*?<option value="(\d+)"/.exec(html)?.[1];
  verifier("mandats du détenu proposés à la libération", Boolean(mandat));

  // L'ordre compte : une fois le mandat levé, il n'est plus proposé à la libération
  const sansMotif = await soumettre("/detenus/liberation/normale?detenu=15", 'name="date_sortie"', {
    detenu_id: "15",
    mandas_id: mandat,
    date_sortie: aujourdhui,
    motif: "",
  });
  verifier("libération sans fondement refusée", contient(sansMotif.html, "obligatoire"));

  const partielle = await soumettre("/detenus/liberation/normale?detenu=15", 'name="date_sortie"', {
    detenu_id: "15",
    mandas_id: mandat,
    date_sortie: aujourdhui,
    motif: "Fin de peine (test)",
  });
  verifier("libération d'un seul mandat : le détenu reste écroué", contient(partielle.html, "reste écroué"));

  const transfert = await soumettre("/detenus/liberation/transfert", 'name="date_sortie"', {
    detenu_id: "5",
    date_sortie: aujourdhui,
    destination: "Prison Principale de Douala",
    motif: "Rapprochement familial (test)",
  });
  verifier("transfert : sortie définitive", contient(transfert.html, "ne fait plus partie de l’effectif"));

  const deces = await soumettre("/detenus/liberation/deces", 'name="date_sortie"', {
    detenu_id: "6",
    date_sortie: aujourdhui,
    cause: "",
  });
  verifier("décès sans cause refusé", contient(deces.html, "cause du décès est obligatoire"));

  const archive = await page("/detenus/liberation/transfert");
  verifier("transfert présent dans l'archive", archive.html.includes("Prison Principale de Douala"));
  verifier("détenu sorti retiré des listes", !/<option value="5">/.test(archive.html));
}

async function lecture() {
  console.log("\nÉcrans de consultation");
  const registre = await page("/detenus");
  verifier("registre : colonne catégorie pénale", registre.html.includes("Catégorie pénale"));
  verifier("registre : colonne cellule", registre.html.includes("Cellule"));

  const tableau = await page("/tableau-de-bord");
  verifier("tableau de bord servi par l'API", tableau.statut === 200 && !tableau.html.includes("En attente de l"));

  const cellules = await page("/discipline/cellules?modifier=3");
  verifier("occupants d'une cellule listés", cellules.html.includes("Occupants"));

  const sanctions = await page("/discipline/sanctions");
  verifier("liste des sanctions servie par l'API", !sanctions.html.includes("En attente de l"));
}

await connexion();
await enregistrementDetenu();
await modificationFiche();
await discipline();
await santeEtVisites();
await sorties();
await lecture();

console.log(`\n${reussites} vérification(s) réussie(s), ${echecs.length} en échec.`);
if (echecs.length > 0) {
  console.log(echecs.map((e) => `  - ${e}`).join("\n"));
  console.log("\nLes scénarios supposent une base fraîche : php artisan migrate:fresh --seed");
  process.exit(1);
}
console.log("Base modifiée par ce test : la remettre à zéro avec php artisan migrate:fresh --seed");
