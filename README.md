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
| `auth` | ✅ Adapté | Connexion (identifiant ou email), déconnexion avec révocation du jeton, vérification de session via `/auth/me` |
| `detenus`, `mandats` | ⏳ À adapter | Routes livrées par l'API, traduction snake_case et pagination à faire |
| Autres | ⛔ Pas encore dans l'API | Restent en démonstration |

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
| Enregistrement | `/detenus/nouveau` | Sommaire qui suit le défilement ; rubriques selon le statut pénal |
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

- Écritures simulées : les formulaires valident et conservent les saisies, sans rien envoyer.
- Matrice des droits par rôle (`admin` / `agent` / `medecin`) à confirmer avec l'API : seul
  l'accès à l'administration dépend du rôle pour l'instant.
- Photos, logo et génération PDF non branchés (impression par le navigateur).
- **Remises de peine** : l'écran desktop est vide ; colonnes proposées à valider.
- Transitions entre pages via l'API View Transitions (Chrome, Edge, Safari récents).
