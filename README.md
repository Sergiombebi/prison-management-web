# SGP Web — Système de Gestion Pénitentiaire

Version web de l'application desktop **SGP-Version1** (WPF / .NET 9 / MySQL).
Ce dépôt contient le **front-end** (Next.js 16, React 19, Tailwind CSS 4). L'API REST est
développée séparément.

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

**Compte de démonstration** — identifiant `admin`, mot de passe `admin`.

En mode démo, le mot de passe de chaque compte est son identifiant. Les autres comptes
permettent de tester les rôles :

| Identifiant | Rôle | Ce qu'il permet de vérifier |
|---|---|---|
| `admin` | Administrateur | Accès complet, y compris Personnel et Paramètres |
| `m.nkoa` | Gestionnaire | Les écrans d'administration affichent « accès refusé » |
| `d.ella` | Consultation | Idem, lecture seule |
| `e.tamo` | Gestionnaire (désactivé) | La connexion est refusée avec un message explicite |

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

## Mock ou API réelle

Aucun composant n'appelle le réseau directement. Tout passe par `lib/api/`, qui choisit
son adaptateur selon une variable d'environnement :

| `SGP_API_MODE` | Source des données |
|---|---|
| `mock` *(défaut)* | Fixtures locales générées dans `lib/api/fixtures.ts`, avec une latence simulée |
| `live` | Requêtes `fetch` vers `SGP_API_URL` |

Pour brancher l'API, copier `.env.example` en `.env.local`, puis :

```env
SGP_API_MODE=live
SGP_API_URL=http://localhost:5000/api
```

Redémarrer `npm run dev`. **Aucun écran n'est à modifier** : si l'API renvoie des routes ou
des noms de champs différents, on les traduit dans `lib/api/live.ts` uniquement.

Ces variables ne commencent pas par `NEXT_PUBLIC_` : elles restent côté serveur et ne sont
jamais envoyées au navigateur.

### Le contrat à valider avec le développeur de l'API

[`lib/api/contract.ts`](lib/api/contract.ts) liste chaque méthode attendue et le point
d'entrée REST suggéré (`GET /detenus`, `GET /detenus/{id}`, `GET /mandats/expires`…).
C'est le document de travail commun entre le front et le back.

Deux points à ne pas perdre de vue :

1. **Les catégories pénales se calculent côté API.** Prévenu, Condamné, Appellant,
   Cassationnaire et DPAC ne sont pas stockés : ils se déduisent des mandats actifs
   (règles détaillées dans la spec, §5). La transcription de `lib/api/fixtures.ts` ne sert
   qu'à rendre les données de démo cohérentes.
2. **`sgpBD.sql` est périmé.** La source de vérité du modèle est
   `SGP-Version1/SGPCore/Entities/`. La table `suivismedicaux` manque dans le dump, et la
   table `visites` n'a plus les mêmes colonnes que l'entité.

### Écritures

Les formulaires sont complets (validation, champs requis, sections conditionnelles), mais
**l'enregistrement est simulé** : le bouton confirme l'action, indique le point d'entrée qui
prendra le relais, et conserve les saisies. Il faudra le brancher sur des Server Actions quand
les routes `POST`/`PUT` existeront.

---

## Parcours à tester

| Écran | URL | À observer |
|---|---|---|
| Tableau de bord | `/tableau-de-bord` | Points d'attention cliquables, indicateurs, graphiques animés |
| Registre d'écrou | `/detenus` | Recherche, filtres, tri par colonne et pagination conservés dans l'URL |
| Dossier détenu | `/detenus/1` | Onglets ; l'onglet Mandats montre la progression de la procédure |
| Enregistrement | `/detenus/nouveau` | Sommaire qui suit le défilement ; rubriques Jugement / Appel / Cassation selon le statut pénal |
| Catégories pénales | `/detenus/mandats/dpac` | Règle de classement affichée, onglets entre catégories |
| Libération | `/detenus/liberation/evasion` | Avertissement et liste des autorités ampliataires |
| Cellules | `/discipline/cellules` | Jauges d'occupation, filtres |
| États imprimables | `/etats/fiches-avis` | Choisir un document et un détenu, puis Imprimer (Ctrl+P) |
| Paramètres | `/administration/parametres` | Aperçu de l'en-tête des états mis à jour pendant la saisie |

À tester aussi : le **thème** clair / sombre / système en bas de la sidebar ; la touche
**`/`** pour placer le curseur dans la recherche ; la **largeur mobile**, où la sidebar
devient un tiroir.

---

## Organisation du code

```
app/
  connexion/            page de connexion + Server Action
  (app)/                toutes les pages protégées, dans le shell applicatif
    layout.tsx          vérifie la session et affiche sidebar + barre supérieure
    loading.tsx         squelette de chargement commun
    error.tsx           écran d'erreur avec « Réessayer »
    tableau-de-bord/  detenus/  discipline/  sante/  etats/  administration/
components/
  layout/               shell, enveloppe de page (transitions), sélecteur de thème
  ui/                   boutons, champs, badges, onglets, panneaux, icônes SVG
  data/                 tableau, pagination, filtres, indicateurs, graphiques SVG
  etats/                mise en page des documents officiels imprimés
lib/
  api/                  contrat, adaptateurs mock / live, fixtures
  domain/               types et référentiels (listes déroulantes du desktop)
  i18n/fr.ts            libellés communs (prêt pour une future traduction)
  format/               dates, nombres, pluriels — jamais « null » à l'écran
  navigation.ts         arborescence unique : sidebar, fil d'Ariane, titres
  session.ts            session provisoire (cookies), en attendant l'API
proxy.ts                redirige vers /connexion sans session (ex-middleware)
```

### Conventions

- **Les données se chargent dans les composants serveur** (`lib/api` est marqué
  `server-only`). Un composant client reçoit ses données en props.
- **Filtres, tri, page et onglet vivent dans l'URL** : une vue se partage et survit au
  rafraîchissement.
- **Couleurs et tailles passent par les jetons** définis dans `app/globals.css`
  (`bg-surface`, `text-muted`, `border-hairline`, `text-danger`…). Pas de couleur en dur.
- **Rouge et orange signalent une action à mener**, jamais une décoration.
- **Les animations respectent `prefers-reduced-motion`.**

### Ajouter un écran

1. Déclarer la route dans `lib/navigation.ts` : elle apparaît dans la sidebar et le fil d'Ariane.
2. Si besoin, ajouter la méthode dans `lib/api/contract.ts`, puis l'implémenter dans `mock.ts` et `live.ts`.
3. Créer `app/(app)/…/page.tsx` en l'enveloppant dans `<Page>` et `<PageHeader>`.

---

## Limites connues de cette v1

- Authentification provisoire : cookies posés sans jeton réel, et aucune permission fine
  au-delà du rôle Administrateur.
- Photos, logo et génération PDF non branchés (l'impression passe par le navigateur).
- **Remises de peine** : l'écran desktop est vide ; les colonnes proposées sont à valider
  avec l'administration.
- Les transitions entre pages utilisent l'API View Transitions (Chrome, Edge, Safari
  récents). Les autres navigateurs changent de page sans animation.
