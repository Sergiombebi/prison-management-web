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

---

## Données de démonstration, API réelle, ou les deux

Aucun écran n'appelle le réseau directement. Tout passe par `lib/api/`, qui choisit **domaine par
domaine** entre les données de démonstration (`lib/api/mock.ts`) et l'API Laravel (`lib/api/live.ts`).

Copier `.env.example` en `.env.local`, adapter, puis **redémarrer `npm run dev`** :

```env
SGP_API_URL=http://127.0.0.1:8000/api/v1
SGP_API_LIVE=auth
```

| Réglage | Effet |
|---|---|
| rien | Tout en données de démonstration |
| `SGP_API_LIVE=auth` | Connexion réelle, écrans en démonstration (**état actuel**) |
| `SGP_API_LIVE=auth,detenus,mandats` | Ces domaines sur l'API, le reste en démonstration |
| `SGP_API_MODE=live` | Tout sur l'API (prioritaire sur `SGP_API_LIVE`) |

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
| `detenus` | ✅ Réel | Registre paginé (10/page), recherche (nom, écrou, CNI, passeport), filtre par catégorie pénale, fiche détenu avec ses mandats, **écritures** (enregistrement, restauration, mandats, photos) |
| `mandats` | ⏳ Démo | L'API n'expose ni liste globale des mandats, ni mandats expirés |
| Autres | ⛔ Démo | Tableau de bord, discipline, santé, états, administration : routes absentes de l'API |

En mode réel, le registre **masque** les colonnes que l'API ne fournit pas encore
(catégorie pénale, cellule, échéance du mandat) et désactive le tri et le filtre par sexe,
plutôt que d'afficher des contrôles qui ne feraient rien.

> ⚠️ Deux catégories renvoient une erreur 500 côté API : `condamnes` et `dpac`
> (`HAVING clause on a non-aggregate query`). L'écran l'explique au lieu d'afficher
> une liste vide. Les trois autres catégories fonctionnent.

### Écritures branchées (registre des détenus)

Vérifiées de bout en bout contre l'API locale : chaque ligne ci-dessous a été jouée
sur une vraie base, cas d'échec compris.

| Flux | Route API | Comportement |
|---|---|---|
| Enregistrement d'un entrant | `POST /detenus` puis `POST /detenus/{id}/mandas` | Deux appels enchaînés. Si le mandat échoue, la fiche existe déjà : la reprise n'envoie que le mandat. |
| Photographies | `POST /detenus/photos` (multipart) | Optionnelles et non bloquantes : si le dépôt échoue, l'écrou est créé quand même et l'écran le signale. |
| Identité déjà connue | 409 + `conflict` | Panneau proposant de restaurer le dossier désactivé (`POST /detenus/{id}/restore`) ou de le consulter d'abord. |
| Évolution d'un mandat | `PUT /detenus/{id}/mandas/{mandatId}` | Écran `/detenus/{id}/mandats/{mandatId}` : changement de statut pénal, rubriques Jugement / Appel / Cassation ouvertes selon le cas. |
| Erreurs de validation | 422 | Message posé sur le champ fautif, saisies conservées. |

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
La base est vide de détenus : créez-en via l'API ou via Postman pour voir le registre se remplir.

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
