# SGP Web — Système de Gestion Pénitentiaire

Version web de l'application desktop **SGP-Version1** (WPF / .NET 9 / MySQL).
Ce dépôt contient le **front-end** (Next.js 16, React 19, Tailwind CSS 4). L'API REST
(Laravel) est développée dans un dépôt séparé.

> Spécification complète, règles métier et anomalies relevées dans le desktop :
> [`docs/SPEC-FRONTEND-V1.md`](docs/SPEC-FRONTEND-V1.md)

---

## Démarrer

```bash
npm install
```

```bash
npm run dev
```

Ouvrir <http://localhost:3000>. Sans session, on est redirigé vers la page de connexion.

### Comptes

Les identifiants de test s'affichent sous le formulaire de connexion (jamais en production).

**En données de démonstration** (par défaut) — le mot de passe est l'identifiant :

| Identifiant | Rôle | Ce qu'il permet de vérifier |
|---|---|---|
| `admin` | Administrateur | Accès complet, y compris Personnel et Paramètres |
| `m.nkoa` | Agent | Les écrans d'administration affichent « accès refusé » |
| `a.mbassi` | Médecin | Idem |
| `e.tamo` | Agent (désactivé) | La connexion est refusée avec un message explicite |

**Avec l'API locale** (`SGP_API_LIVE=auth`) — comptes créés par `php artisan db:seed`, mot de passe
commun `password` : `admin`, `eric.agent`, `sophie.medecin`. L'email fonctionne aussi comme
identifiant (ex. `medecin@sgp.local`).

### Vérifier le code

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npm run build
```

Arrêter `npm run dev` avant `npm run build` : les deux écrivent dans `.next/`, et un build
lancé pendant que le serveur de dev tourne peut corrompre son cache.

### Une page qui existe répond « 404 » en développement

Symptôme typique d'un cache `.next/` corrompu (après un build concurrent, ou un arrêt brutal
du serveur). Arrêter `npm run dev`, supprimer le cache, relancer :

```bash
rm -rf .next
```

```bash
npm run dev
```

---

## Données de démonstration, API réelle, ou les deux

Aucun écran n'appelle le réseau directement. Tout passe par `lib/api/`, qui choisit **domaine par
domaine** entre les données de démonstration (`lib/api/mock.ts`) et l'API Laravel (`lib/api/live.ts`).

Copier `.env.example` en `.env.local`, adapter, puis **redémarrer `npm run dev`** :

```env
SGP_API_URL=http://127.0.0.1:8000/api/v1
SGP_API_LIVE=auth,detenus,discipline,sorties,sante,tableauDeBord
```

| Réglage | Effet |
|---|---|
| rien | Tout en données de démonstration |
| `SGP_API_LIVE=auth` | Connexion réelle, écrans en démonstration |
| `SGP_API_LIVE=auth,detenus,discipline,sorties,sante,tableauDeBord` | Tout ce que l'API sait faire aujourd'hui, le reste en démonstration (**réglage recommandé**) |
| `SGP_API_MODE=live` | Tout sur l'API (prioritaire sur `SGP_API_LIVE`) — les écrans sans route affichent « En attente de l'API » |

Domaines : `auth`, `tableauDeBord`, `detenus`, `mandats`, `discipline`, `sante`, `sorties`,
`administration`. Un domaine inconnu est ignoré avec un avertissement dans la console du serveur.
Le bas de la sidebar indique « Données de démonstration » ou « Mode hybride ».

Utiliser **`127.0.0.1`** et non `localhost` : sous Windows, Node peut résoudre `localhost` en IPv6
alors que `php artisan serve` n'écoute qu'en IPv4.

Ces variables ne commencent pas par `NEXT_PUBLIC_` : elles restent côté serveur. C'est le serveur
Next qui appelle l'API, donc **l'API n'a pas besoin de configurer CORS**.

### Ce qui est branché

| Domaine | État | Détail |
|---|---|---|
| `auth` | ✅ Réel | Connexion (identifiant ou email), déconnexion avec révocation du jeton, session vérifiée via `/auth/me` |
| `detenus` | ✅ Réel | Registre paginé (10/page), recherche, filtre par catégorie pénale ; fiche avec mandats, cellule actuelle, historique des affectations et des sorties, photos ; enregistrement, **modification**, désactivation et restauration du dossier ; évolution et désactivation d'un mandat |
| `discipline` | ✅ Réel | Cellules (liste, occupation, création, modification, occupants), affectation et réaffectation, fil des mouvements, détenus non logés ; sanctions : liste, prononcé avec cellule disciplinaire, fin de sanction, annulation ; types de sanction administrables |
| `sorties` | ✅ Réel | Archive par type ; libération normale (par mandat), transfert, évasion, décès |
| `sante` | ✅ Réel | Consultations médicales et visites au parloir : listes, enregistrement, historique par détenu |
| `tableauDeBord` | ✅ Réel | Effectif, occupation, mandats expirés, sanctions en cours, mouvements sur 30 jours, répartition par catégorie, libérables du mois |
| `mandats` | ⏳ Démo | L'API n'expose ni liste globale des mandats, ni mandats expirés |
| `administration` | ⛔ Démo | Personnel et paramètres de l'établissement : routes absentes de l'API |

Quand un domaine est réel mais qu'une de ses listes n'existe pas encore, le panneau concerné
affiche **« En attente de l'API »** avec la route attendue, au lieu d'une liste vide trompeuse ;
le reste de l'écran (formulaires compris) fonctionne.

En mode réel, le registre affiche la catégorie pénale et la cellule, mais remplace la colonne
« Fin du mandat » par le statut pénal : l'échéance n'est pas dans la liste de l'API, seulement
sur la fiche. Le tri et le filtre par sexe restent désactivés, faute de paramètres côté API —
plutôt que d'afficher des contrôles qui ne feraient rien.

### Écritures branchées

Vérifiées de bout en bout contre l'API locale : chaque ligne ci-dessous a été jouée
sur une vraie base, cas d'échec compris, puis contrôlée directement en base.

| Flux | Écran | Route API | Comportement |
|---|---|---|---|
| Enregistrement d'un entrant | `/detenus/nouveau` | `POST /detenus` puis `POST /detenus/{id}/mandas` | Deux appels enchaînés. Si le mandat échoue, la reprise n'envoie que le mandat. |
| Modification de l'identité | `/detenus/{id}/modifier` | `PUT /detenus/{id}` | Champ vidé → effacé en base ; champs non touchés (contact d'urgence compris) conservés. |
| Photographies | enregistrement, modification | `POST /detenus/photos` | Non bloquantes : si le dépôt échoue, l'écran le signale. |
| Identité déjà connue | `/detenus/nouveau` | 409 + `conflict` | Propose de restaurer le dossier désactivé ou de le consulter. |
| Désactivation d'un dossier | fiche, onglet Identité | `DELETE /detenus/{id}` | Correction administrative seulement, avec confirmation ; aucune sortie archivée. |
| Évolution d'un mandat | `/detenus/{id}/mandats/{mandatId}` | `PUT /mandas/{id}` | Rubriques Jugement / Appel / Cassation selon le statut pénal. |
| Désactivation d'un mandat | fiche, onglet Mandats | `DELETE /mandas/{id}` | Avec confirmation. |
| Création d'une cellule | `/discipline/cellules` | `POST /cellules` | Doublon dans le même quartier → 422 sous le champ. |
| Modification d'une cellule | `/discipline/cellules` → crayon d'une carte | `PUT /cellules/{id}` | Capacité inférieure au nombre d'occupants → 422. |
| Types de sanction | `/discipline/sanctions/types` (administrateur) | `POST` / `PUT /types-sanction` | Ajouter, renommer, désactiver ou réactiver. Un type désactivé n'est plus proposé à la saisie. |
| Fin d'une sanction | liste des sanctions, fiche détenu | `POST /sanctions/{id}/terminer` | Libère la cellule disciplinaire ; l'écran propose alors de réaffecter le détenu. |
| Annulation d'une sanction | idem | `DELETE /sanctions/{id}` | Saisie erronée : la fiche reste dans l'historique, marquée annulée. |
| Consultation médicale | `/sante/suivi-medical` | `POST /detenus/{id}/suivis-medicaux` | Constantes, diagnostic, traitement et date de suivi. |
| Visite au parloir | `/sante/visites` | `POST /detenus/{id}/visites` | Visiteur, pièce d'identité, contrôle et horaires réels. |
| Affectation | `/discipline/affectations` | `POST /detenus/{id}/affectations` | Clôt l'affectation en cours ; cellule pleine → 422. |
| Sanction | `/discipline/sanctions` | `POST /detenus/{id}/sanctions` | Types lus depuis `GET /types-sanction` ; une cellule disciplinaire déplace réellement le détenu. |
| Libération normale | `/detenus/liberation/normale` | `POST /detenus/{id}/sorties/liberation-normale` | Porte sur **un mandat** : un DPAC reste écroué tant qu'un autre mandat est ouvert. |
| Transfert, évasion, décès | `/detenus/liberation/{type}` | `POST /detenus/{id}/sorties/{type}` | Sortie définitive : mandats clos, cellule libérée, détenu retiré des listes. |
| Erreurs de validation | tous | 422 | Message sous le champ fautif, saisies conservées. |

> ⚠️ Trois points à signaler côté API :
> `date_expiration_mandat` est **obligatoire** à la création comme à la mise à jour, alors
> qu'une exécution de peine n'a pas d'échéance (la colonne accepte pourtant `null`) ;
> le message de ce champ n'est pas traduit (« The date expiration mandat field is required. ») ;
> le dépôt des photos réclame de vrais identifiants Cloudinary — avec le `CLOUDINARY_URL`
> d'exemple, l'API répond « Unknown API key ».

### Lancer l'API en local

Dans le dépôt `prison-management-api` :

```bash
composer install
```

```bash
php artisan migrate:fresh --seed
```

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Comptes créés par le seeder (mot de passe `password`) : `admin`, `eric.agent`, `sophie.medecin`.
Le seeder de démonstration remplit aussi la base : 19 détenus (dont 4 sortis), 21 mandats,
8 cellules, affectations, sanctions et sorties.

Après chaque `git pull` de l'API, relancer `php artisan migrate` (nouvelles tables). La commande
`migrate:fresh --seed` remet la base de démonstration à zéro — elle **efface** tout ce qui a été saisi.

### Interroger l'API en ligne de commande

`scripts/api.mjs` évite d'ouvrir Postman pour une vérification rapide. Le jeton est
conservé dans `.sgp-token` (ignoré par git) : on se connecte une fois.

```bash
node scripts/api.mjs sonde
```

Passe en revue toutes les routes connues et affiche leur état — c'est le premier
réflexe quand un écran se met à répondre de travers.

```bash
node scripts/api.mjs connexion admin password
node scripts/api.mjs GET /detenus?search=Bello
node scripts/api.mjs POST /detenus '{"numero_ecrou":"2026-999","nom":"Essomba"}'
```

Comptes de test : `admin`, `sophie.medecin`, `eric.agent` — mot de passe `password`.
L'adresse par défaut est `http://127.0.0.1:8000/api/v1`, surchargeable avec `SGP_API_URL`.

Côté API, `php artisan route:list --path=api` donne la liste exacte des routes livrées,
et la collection Postman du dépôt couvre les mêmes appels avec leurs exemples de corps.

### Le contrat entre front et API

[`lib/api/contract.ts`](lib/api/contract.ts) liste chaque méthode dont les écrans ont besoin et la
route correspondante (« à livrer » quand elle n'existe pas encore). Si l'API diffère, on traduit dans
`live.ts` — jamais dans les écrans.

Deux points à ne pas perdre de vue :

1. **Les catégories pénales se calculent côté API.** Prévenu, Condamné, Appellant, Cassationnaire
   et DPAC ne sont pas stockés : ils se déduisent des mandats actifs (spec, §5).
2. **`sgpBD.sql` est périmé.** La source de vérité du modèle est `SGP-Version1/SGPCore/Entities/`.

---

## Sessions

- Le jeton Sanctum est stocké dans un **cookie httpOnly** : le JavaScript du navigateur ne peut pas le lire.
- **Déconnexion** : le jeton est d'abord révoqué côté API (`POST /auth/logout`), puis le cookie est effacé.
- **Session expirée** : au premier 401, l'utilisateur passe par `/deconnexion`, qui efface les cookies et
  le renvoie à la connexion avec le message « Votre session a expiré ».
- Le rôle sert uniquement à adapter l'interface ; **l'API reste seule juge des droits**.

---

## Parcours à tester

| Écran | URL | À observer |
|---|---|---|
| Connexion | `/connexion` | Message d'erreur de l'API, identifiant conservé après une erreur |
| Tableau de bord | `/tableau-de-bord` | Points d'attention cliquables, indicateurs, graphiques animés |
| Registre d'écrou | `/detenus` | Recherche, filtres, tri et pagination conservés dans l'URL |
| Dossier détenu | `/detenus/1` | Onglets ; l'onglet Mandats montre la progression de la procédure |
| Enregistrement | `/detenus/nouveau` | Sommaire qui suit le défilement ; rubriques selon le statut pénal ; en mode réel, l'écrou est créé avec son mandat |
| Évolution d'un mandat | `/detenus/1/mandats/1` | Effet du nouveau statut pénal expliqué avant l'enregistrement |
| Catégories pénales | `/detenus/mandats/dpac` | Règle de classement affichée, onglets entre catégories |
| Libération | `/detenus/liberation/evasion` | Avertissement et autorités ampliataires |
| Cellules | `/discipline/cellules` | Jauges d'occupation, filtres |
| États imprimables | `/etats/fiches-avis` | Choisir un document et un détenu, puis Imprimer |
| Paramètres | `/administration/parametres` | Aperçu de l'en-tête des états pendant la saisie |

À tester aussi : le **thème** clair / sombre / système en bas de la sidebar ; la touche **`/`** pour
la recherche ; la **largeur mobile**, où la sidebar devient un tiroir.

---

## Organisation du code

```
app/
  connexion/            page de connexion + Server Action
  deconnexion/route.ts  nettoie une session expirée ou illisible
  (app)/                pages protégées, dans le shell applicatif
    layout.tsx          vérifie la session (/auth/me) et affiche sidebar + barre supérieure
    loading.tsx         squelette de chargement commun
    error.tsx           écran d'erreur avec « Réessayer »
    tableau-de-bord/  detenus/  discipline/  sante/  etats/  administration/
components/
  layout/               shell, enveloppe de page (transitions), sélecteur de thème
  ui/                   boutons, champs, badges, onglets, panneaux, icônes SVG
  data/                 tableau, pagination, filtres, indicateurs, graphiques SVG
  etats/                mise en page des documents officiels imprimés
lib/
  api/                  contrat, sélection mock/live par domaine, adaptateurs, fixtures
  domain/               types et référentiels (listes déroulantes du desktop, rôles)
  i18n/fr.ts            libellés communs (prêt pour une future traduction)
  format/               dates, nombres, pluriels — jamais « null » à l'écran
  navigation.ts         arborescence unique : sidebar, fil d'Ariane, titres
  session.ts            cookies de session et droits dérivés du rôle
proxy.ts                redirige vers /connexion sans session (ex-middleware)
```

### Conventions

- **Les données se chargent dans les composants serveur** (`lib/api` est `server-only`).
- **Ne jamais envelopper un appel `api.*` dans un `try/catch` qui avale tout** : sur un 401,
  l'adaptateur appelle `redirect()`, qui fonctionne en levant une exception.
- **Filtres, tri, page et onglet vivent dans l'URL.**
- **Couleurs et tailles passent par les jetons** de `app/globals.css`. Pas de couleur en dur.
- **Rouge et orange signalent une action à mener**, jamais une décoration.
- **Les animations respectent `prefers-reduced-motion`.**

### Ajouter un écran

1. Déclarer la route dans `lib/navigation.ts` : elle apparaît dans la sidebar et le fil d'Ariane.
2. Ajouter la méthode dans `lib/api/contract.ts`, l'implémenter dans `mock.ts` et `live.ts`, et la
   rattacher à un domaine dans `lib/api/index.ts` (TypeScript signale l'oubli).
3. Créer `app/(app)/…/page.tsx` en l'enveloppant dans `<Page>` et `<PageHeader>`.

---

## Limites connues

- Écritures : branchées pour le registre des détenus (fiche, mandat, restauration, photos).
  Les autres modules valident et conservent les saisies sans rien envoyer, faute de routes côté API.
- Matrice des droits par rôle (`admin` / `agent` / `medecin`) à confirmer avec l'API : seul
  l'accès à l'administration dépend du rôle pour l'instant.
- Photos, logo et génération PDF non branchés (impression par le navigateur).
- **Remises de peine** : l'écran desktop est vide ; colonnes proposées à valider.
- Transitions entre pages via l'API View Transitions (Chrome, Edge, Safari récents).
