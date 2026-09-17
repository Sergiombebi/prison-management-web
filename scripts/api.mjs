#!/usr/bin/env node
/**
 * Petit client en ligne de commande pour l'API SGP — de quoi vérifier un
 * endpoint sans ouvrir Postman ni le navigateur.
 *
 *   node scripts/api.mjs connexion [identifiant] [mot de passe]
 *   node scripts/api.mjs GET /detenus?search=Bello
 *   node scripts/api.mjs POST /detenus '{"nom":"Essomba","sexe":"Masculin"}'
 *   node scripts/api.mjs sonde         → passe en revue toutes les routes connues
 *
 * Le jeton est conservé dans .sgp-token (ignoré par git) : on se connecte une
 * fois, les appels suivants sont authentifiés tout seuls.
 *
 * Adresse de l'API : SGP_API_URL, sinon http://127.0.0.1:8000/api/v1
 */
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.SGP_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const FICHIER_JETON = path.join(process.cwd(), ".sgp-token");

const lireJeton = () => {
  try {
    return fs.readFileSync(FICHIER_JETON, "utf8").trim();
  } catch {
    return "";
  }
};

/**
 * Git Bash (MSYS) convertit tout argument commençant par « / » en chemin Windows :
 * « /detenus/9 » arrive ici sous la forme « C:/Program Files/Git/detenus/9 ».
 * On retrouve la route d'origine plutôt que d'envoyer une URL absurde.
 */
function routeDe(chemin) {
  const converti = /^[A-Za-z]:[\\/].*?[\\/]Git([\\/].*)$/.exec(chemin);
  const route = (converti ? converti[1] : chemin).replace(/\\/g, "/");
  return route.startsWith("/") ? route : `/${route}`;
}

async function appel(methode, chemin, corps, jeton = lireJeton()) {
  const url = BASE + routeDe(chemin);
  let reponse;
  try {
    reponse = await fetch(url, {
      method: methode,
      headers: {
        Accept: "application/json",
        ...(corps ? { "Content-Type": "application/json" } : {}),
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
    });
  } catch (e) {
    console.error(`\n  Injoignable : ${url}\n  ${e.message}`);
    console.error("  L'API tourne-t-elle ?  php artisan serve --host=127.0.0.1 --port=8000\n");
    process.exit(2);
  }
  let json = null;
  try {
    json = await reponse.json();
  } catch {
    /* réponse sans corps */
  }
  return { statut: reponse.status, json };
}

/** Une ligne par sonde, alignée : on lit l'état de l'API d'un coup d'œil. */
function ligne(methode, chemin, statut, resume) {
  const ok = statut < 400 ? "  ok " : statut < 500 ? " ⚠︎  " : " ✗  ";
  console.log(`${ok}${`${methode} ${chemin}`.padEnd(46)} ${String(statut).padEnd(4)} ${resume}`);
}

function resumeDe(json) {
  if (json?.meta?.total !== undefined) {
    return `${json.meta.total} résultat(s), ${json.data?.length ?? 0} sur la page`;
  }
  if (json?.message) return String(json.message).slice(0, 80);
  if (json?.data) return "objet";
  return "";
}

const [commande, ...args] = process.argv.slice(2);

if (!commande || commande === "aide" || commande === "--help") {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0].replace(/^[/*! ]*/gm, ""));
  process.exit(0);
}

if (commande === "connexion") {
  const [identifiant = "admin", motDePasse = "password"] = args;
  const { statut, json } = await appel("POST", "/auth/login", { identifiant, password: motDePasse }, "");
  if (statut !== 200 || !json?.token) {
    console.error(`Connexion refusée (${statut}) : ${json?.message ?? "réponse inattendue"}`);
    process.exit(1);
  }
  fs.writeFileSync(FICHIER_JETON, json.token);
  console.log(`Connecté : ${json.user?.nom ?? identifiant} (${json.user?.role ?? "?"}) — jeton écrit dans .sgp-token`);
  process.exit(0);
}

if (commande === "sonde") {
  const { statut, json } = await appel("POST", "/auth/login", { identifiant: "admin", password: "password" }, "");
  const jeton = json?.token ?? "";
  ligne("POST", "/auth/login", statut, jeton ? "jeton obtenu" : resumeDe(json));
  if (!jeton) process.exit(1);

  const sondes = [
    ["GET", "/auth/me"],
    ["GET", "/detenus"],
    ["GET", "/detenus?search=a"],
    ["GET", "/detenus?categorie_penale=prevenus"],
    ["GET", "/detenus?categorie_penale=condamnes"],
    ["GET", "/detenus?categorie_penale=appellants"],
    ["GET", "/detenus?categorie_penale=cassationnaires"],
    ["GET", "/detenus?categorie_penale=dpac"],
    ["GET", "/detenus/1"],
    ["GET", "/mandas/1"],
    ["GET", "/cellules"],
    ["GET", "/detenus/1/affectations"],
    ["GET", "/types-sanction"],
    ["GET", "/sorties"],
    ["GET", "/sorties?type_sortie=evasion"],
    ["GET", "/detenus/1/sorties"],
  ];
  for (const [m, c] of sondes) {
    const r = await appel(m, c, undefined, jeton);
    ligne(m, c, r.statut, resumeDe(r.json));
  }
  process.exit(0);
}

const methode = commande.toUpperCase();
if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(methode)) {
  console.error(`Commande inconnue : ${commande}. Essayez « node scripts/api.mjs aide ».`);
  process.exit(1);
}

const [chemin, corpsBrut] = args;
if (!chemin) {
  console.error("Chemin manquant. Exemple : node scripts/api.mjs GET /detenus");
  process.exit(1);
}

let corps;
if (corpsBrut) {
  try {
    corps = JSON.parse(corpsBrut);
  } catch {
    console.error("Le corps doit être du JSON valide, entre guillemets simples.");
    process.exit(1);
  }
}

const { statut, json } = await appel(methode, chemin, corps);
console.log(`${methode} ${routeDe(chemin)} → ${statut}`);
console.log(JSON.stringify(json, null, 2).slice(0, 4000));
