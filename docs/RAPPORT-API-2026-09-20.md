# Rapport d'intégration frontend → API — 20 septembre 2026

Relevé fait depuis le frontend (`prison-management-web`) contre la branche courante de
`prison-management-api`. **Aucun fichier de l'API n'a été modifié.**

**Suite de tests de l'API : 106 tests, 439 assertions, tous verts** (`php artisan test`, 35 s).
Les points ci-dessous ne sont donc pas des régressions : ce sont des cas qu'aucun test ne
couvre encore, trouvés en faisant tourner trois comptes réels contre l'API.

> **Changement de modèle d'habilitation côté frontend.** L'interface n'attribue plus de
> *rôle* à un membre du personnel : l'administrateur lui ouvre un ou plusieurs **modules
> métier** (Gestion des détenus, Discipline, Suivi médical, Visites). Les trois rubriques
> transverses — tableau de bord général, édition d'états, administration — ne s'attribuent
> pas : elles n'appartiennent qu'à l'administrateur. Le détail est en §E, et ce que cela
> demande à l'API en §C9 et §B1.

**Origine du chantier.** Tous les profils non-administrateurs atterrissaient sur
`/tableau-de-bord`, recevaient un **403** et tombaient sur l'écran d'erreur générique. Le
frontend est corrigé ; la cause côté données reste entière (§B1).

Légende : 🔴 bloquant · 🟠 important · 🟢 confort / documentation

---

## A. Bugs

### A1. 🔴 Un compte désactivé garde un accès complet à l'API

**Reproduit :**

```bash
# jeton obtenu AVANT la désactivation
curl -X POST /api/v1/utilisateurs/2/desactiver -H "Authorization: Bearer <ADMIN>"   # 200
curl /api/v1/auth/me            -H "Authorization: Bearer <JETON_DESACTIVE>"        # 200  ❌
curl /api/v1/suivis-medicaux    -H "Authorization: Bearer <JETON_DESACTIVE>"        # 200  ❌
curl -X POST /api/v1/detenus/1/suivis-medicaux -d '{}' \
                                -H "Authorization: Bearer <JETON_DESACTIVE>"        # 422  ❌
                                # 422 = validation : l'authentification ET la permission
                                # ont donc été franchies
curl -X POST /api/v1/auth/login -d '{"identifiant":"sophie.medecin",...}'           # 422  ✅
```

**Cause.** `est_actif` n'est vérifié que dans `AuthController::login`. Aucun middleware ne le
revérifie sur les requêtes portant un jeton, et `UtilisateurController::desactiver` ne révoque
pas les jetons — alors que `reinitialiserMotDePasse`, lui, fait bien
`$utilisateur->tokens()->delete()`.

Concrètement : désactiver un agent ne le met dehors qu'à sa prochaine tentative de connexion.
Tant que son onglet reste ouvert, il continue de lire et d'écrire.

**Correction suggérée**

```php
// UtilisateurController::desactiver()
$utilisateur->update(['est_actif' => false]);
$utilisateur->tokens()->delete();   // couper la session en cours
```

et, en défense de fond, un middleware sur le groupe `auth:sanctum` :

```php
// app/Http/Middleware/EnsureUserIsActive.php
if (! $request->user()?->est_actif) {
    abort(response()->json(['message' => 'Ce compte est désactivé.'], 403));
}
```

---

### A2. 🔴 `POST /detenus/{id}/restore` réactive **tous** les mandats, même ceux légitimement clos

`DetenuController::restore()` :

```php
$detenu->mandas()->update(['est_actif' => true]);   // aucun filtre
```

Un détenu qui avait trois mandats dont deux déjà clos par libération normale ressort avec
**trois mandats actifs**. Conséquences en cascade : catégorie pénale recalculée à tort (il
devient DPAC), compteur « mandats expirés » faussé, répartition du tableau de bord fausse.

`destroy()` est symétrique (il désactive tout) mais ne mémorise pas quels mandats étaient
actifs avant, donc `restore()` n'a aucun moyen de revenir à l'état d'origine.

**Correction suggérée** — ne réactiver que les mandats qui n'ont pas de `SortieDetenu`
rattachée, ou marquer ceux fermés par `destroy()` (colonne dédiée / journal) pour ne rouvrir
que ceux-là.

---

### A3. 🔴 `restore()` peut « ressusciter » un détenu réellement sorti

Aucun garde-fou : un détenu transféré, décédé ou évadé (`est_present = false` posé par
`SortieDetenuService::cloturerDossierComplet`) peut être remis à `est_present = true` par
`POST /detenus/{id}/restore`, avec tous ses mandats réactivés — alors que sa fiche
`SortieDetenu` reste en base. Le registre affirme alors deux choses contradictoires.

**Correction suggérée** — refuser en 409 si le détenu porte une `SortieDetenu` avec
`sortie_definitive = true`, et prévoir une annulation explicite de sortie si le besoin
existe (erreur de saisie d'évasion, par exemple).

---

### A4. 🟠 `restore()` ne rend pas la cellule que `destroy()` a libérée

`destroy()` clôt l'affectation active ; `restore()` ne la rouvre pas. Le détenu revient
« présent » mais non logé, sans rien qui le signale à l'agent. Si c'est voulu (réaffectation
manuelle obligatoire), il faut l'écrire dans le guide — le frontend pourra alors l'annoncer.

---

### A5. 🟠 Un administrateur peut se verrouiller dehors tout seul

`desactiver()` interdit l'auto-désactivation :

```php
if ($utilisateur->id === $request->user()->id) { /* refus */ }
```

mais `update()` n'a pas l'équivalent pour les permissions. Un administrateur qui décoche sa
propre habilitation d'administration perd l'accès au module Personnel. S'il est le seul compte
à la détenir, **plus personne** ne peut rouvrir les accès : il n'existe aucune route ni
commande de secours.

Le nouveau formulaire rend le geste plus facile qu'avant : une seule case « Administrateur »
au lieu de deux permissions à décocher séparément.

**Correction suggérée** — même garde que `desactiver()` sur
`administration.personnel.gerer` quand la cible est soi-même, plus une commande
`php artisan sgp:promouvoir {username}` de dernier recours.

---

### A6. 🟠 Le compteur « incarcérations » du tableau de bord ne mesure pas les incarcérations

`DashboardController::mouvements()` :

```php
'incarcerations' => Detenu::where('created_at', '>=', $depuis)->count(),
```

`created_at` est la date de **création du dossier**, pas la date d'incarcération. Après un
import ou un re-seed, l'établissement entier apparaît comme incarcéré dans les 30 derniers
jours. Le repère juste est `mandas.date_incarceration` du premier mandat du détenu.

---

## B. Manquements

### B1. 🔴 Le seeder crée des comptes sans aucune permission

```php
// DatabaseSeeder
User::factory()->medecin()->create([...]);   // permissions => []
User::factory()->create([...]);              // agent, permissions => []
```

`UserFactory::admin()` donne `Permission::values()` ; `medecin()` ne change que le rôle, et
l'état par défaut (agent) laisse `permissions => []`. Vérifié sur la base de dev : le compte
admin avait 24 permissions, les deux autres **zéro**.

**C'est le déclencheur du bug remonté.** Ces comptes se connectent avec succès puis ne peuvent
rien ouvrir. Le frontend le gère proprement à présent (écran « Aucun module ne vous est encore
ouvert »), mais des comptes de démo inutilisables restent un manquement.

**Correction suggérée** — des états de factory alignés sur les quatre modules du frontend.
Chaque module s'accorde **en bloc**, et tous entraînent `detenus.consulter`, le socle commun
sans lequel les sélecteurs de détenus des formulaires restent vides (voir §C3) :

```php
// database/factories/UserFactory.php

/** Socle : tout module suppose de pouvoir désigner un détenu. */
private const SOCLE = ['detenus.consulter'];

private const MODULE_DETENUS = [
    'detenus.creer', 'detenus.modifier', 'detenus.desactiver', 'detenus.restaurer',
    'detenus.mandats.gerer', 'detenus.sorties.enregistrer',
];

private const MODULE_DISCIPLINE = [
    'discipline.cellules.consulter', 'discipline.cellules.gerer',
    'discipline.affectations.gerer', 'discipline.sanctions.consulter',
    'discipline.sanctions.creer', 'discipline.sanctions.modifier',
    'discipline.sanctions.terminer', 'discipline.sanctions.annuler',
    'discipline.types_sanction.gerer',
];

private const MODULE_SANTE = ['sante.consultations.consulter', 'sante.consultations.creer'];

private const MODULE_VISITES = ['visites.consulter', 'visites.creer'];

/** Ouvre un ou plusieurs modules métier à ce compte. */
public function modules(array ...$modules): static
{
    return $this->state(fn () => [
        'permissions' => array_values(array_unique(array_merge(self::SOCLE, ...$modules))),
    ]);
}
```

et, dans `DatabaseSeeder`, des comptes de démo qui servent à quelque chose :

```php
// Greffier : registre d'écrou et parloirs
User::factory()->modules(self::MODULE_DETENUS, self::MODULE_VISITES)->create([...]);

// Surveillant-chef : logement et discipline
User::factory()->modules(self::MODULE_DISCIPLINE)->create([...]);

// Médecin : infirmerie seule
User::factory()->modules(self::MODULE_SANTE)->create([...]);
```

Les rubriques transverses (`tableau_bord.consulter`, `etats.consulter`,
`administration.*`) restent réservées au compte administrateur.

---

### B2. 🔴 `GET /mandats` et `GET /mandats/expires` n'existent pas

Le module « Gestion des mandats » (`/detenus/mandats`, les six sous-listes par catégorie) et
l'état « Mandats expirés » restent donc en données de démonstration : `lib/api/live.ts` lève
un 501 explicite pour ces deux méthodes.

**Attendu** — une liste paginée des mandats avec le détenu embarqué (nom, n° d'écrou), et un
filtre `?expires=1` (ou une route dédiée) pour les titres de détention dont la validité est
dépassée.

---

### B3. 🟠 Aucune route ne publie le catalogue des permissions

Le frontend redéclare `App\Enums\Permission` à la main dans `lib/domain/referentiels.ts`, et
c'est désormais à partir de ce catalogue qu'il compose ses quatre modules
(`lib/domain/modules.ts`). Toute permission ajoutée côté API est invisible du frontend tant
que ce fichier n'est pas mis à jour — et rien ne le signale.

**Attendu** — `GET /permissions` :

```json
{ "data": [ { "cle": "detenus.consulter", "module": "Détenus", "libelle": "Consulter" } ] }
```

---

### B4. 🟠 Le seeder de démo ne crée ni consultation médicale ni visite

Vérifié sur la base de dev : `GET /suivis-medicaux` → 0 élément, `GET /visites` → 0 élément,
alors que cellules (8), types de sanction (6), détenus (15), affectations (14), sanctions (4)
et sorties (5) sont bien peuplés.

Résultat : les sous-tableaux de bord **Suivi médical** et **Visites** n'affichent que des
zéros — courbe d'activité plate, semaine vide, aucune ligne à traiter. Les deux autres
(Détenus, Discipline) sont pleinement exploitables. C'est aujourd'hui le seul obstacle à une
démonstration complète des quatre modules.

---

### B5. 🟠 Pas de table d'historique de population

`DashboardController::populationAuPlusTard()` reconstitue l'effectif passé en partant de
l'effectif actuel et en annulant les mouvements depuis. Le calcul est juste, mais comme tous
les dossiers datent du seed, la courbe « 6 derniers mois » ne contient que des zéros. Le
frontend détecte ce cas et ne trace rien plutôt que de tracer une courbe fausse.

**Attendu à terme** — un relevé (quotidien ou mensuel) de l'effectif présent, alimenté par une
commande planifiée.

---

### B6. 🟢 Les en-têtes d'établissement sont vides

`GET /parametres` renvoie `ville: ""`, `telephone: null`, `fax: null`, `entete_gauche: ""`,
`entete_droite: ""`, `autorites_ampliataires: null`. Tous les documents imprimables (fiche
signalétique, extrait de registre, attestation, bulletin de transfèrement, avis d'évasion)
sortent donc avec un cartouche vide, et l'avis d'évasion sans destinataires. À renseigner
dans le seeder de démo.

---

## C. Incohérences de contrat

### C9. 🔴 `role` est toujours obligatoire alors que l'interface ne le demande plus

C'est la demande la plus directe de ce nouveau modèle.

`StoreUtilisateurRequest` et `UpdateUtilisateurRequest` exigent tous deux :

```php
'role' => ['required', Rule::in(['admin', 'agent', 'medecin'])],
```

Or l'écran Personnel ne propose plus de rôle : l'administrateur coche des modules. Pour
satisfaire la validation, le frontend **fabrique** un rôle à partir des accès cochés :

```ts
// lib/domain/modules.ts
export function roleImplicite(modules, administrateur) {
  if (administrateur) return "admin";
  if (modules.length === 1 && modules[0] === "sante") return "medecin";
  return "agent";
}
```

Ce n'est pas tenable longtemps : la valeur envoyée ne décrit plus rien de réel — un compte
« Suivi médical + Visites » part en `agent`, un compte « Suivi médical » seul en `medecin`,
pour la même personne au même poste. Vérifié en conditions réelles : après avoir ajouté le
module Visites à `sophie.medecin` depuis l'écran Personnel, son `role` est passé de `medecin`
à `agent` sans que rien de métier n'ait changé.

**Demandé, par ordre de préférence :**

1. Rendre `role` facultatif (`['sometimes', Rule::in(...)]`) et le laisser inchangé quand il
   est absent — le frontend cesse alors d'inventer une valeur.
2. Ou le retirer complètement de l'API, puisque `User::hasPermission()` ne le consulte jamais
   (« Les droits ne dépendent jamais du rôle », dit déjà le commentaire du modèle) et que
   `UserResource` est le seul à l'exposer vraiment.

Le champ `role` reste utile comme étiquette de poste affichable ; il ne doit simplement plus
être **obligatoire** sur une route qui ne le connaît plus.

---

### C1. 🔴 `per_page` est plafonné à 10, en dur

```php
// app/Http/Controllers/Controller.php
return max(1, min(10, $perPage));
```

Vérifié : `GET /detenus?per_page=100` → `meta.per_page = 10`.

Plusieurs écrans ont besoin de la liste **complète** des détenus pour leur sélecteur :
nouvelle consultation, nouvelle visite, nouvelle sanction, affectation à une cellule,
enregistrement d'une sortie, fiches & avis. Le frontend parcourt donc les pages une à une et
s'arrête à 50 pages — soit **500 détenus au maximum**, au-delà desquels les sélecteurs sont
silencieusement tronqués. À 10 par page, cela fait aussi jusqu'à 50 requêtes HTTP pour
afficher un seul formulaire.

Depuis que le module Administration est branché sur l'API réelle, `GET /utilisateurs` subit le
même traitement : l'écran Personnel parcourt les pages dix par dix.

**Demandé** — relever le plafond (100 à 200), ou exposer une route de référence légère :
`GET /detenus/reference` → `[{ id, nom, numero_ecrou }]`, non paginée.

---

### C2. 🟠 Deux listes sur neuf ne sont pas paginées

Vérifié endpoint par endpoint :

| Route | Forme |
|---|---|
| `/detenus`, `/sanctions`, `/cellules`, `/types-sanction`, `/affectations`, `/sorties`, `/utilisateurs` | paginée (`meta`) |
| `/suivis-medicaux`, `/visites` | **non paginée** |

Le frontend doit traiter deux formes de réponse pour la même famille d'appels. À uniformiser
— de préférence après C1, sans quoi la pagination de ces deux listes coûterait 50 requêtes.

---

### C3. 🟠 Permissions croisées : réglé côté frontend, à connaître côté API

Plusieurs écrans lisent un domaine voisin pour se compléter, ce qui produisait un 403 sur
l'appel secondaire et faisait tomber tout l'écran. Relevé complet :

| Écran | Permission de l'écran | Appel croisé | Permission exigée en plus |
|---|---|---|---|
| Suivi médical | `sante.consultations.consulter` | `GET /detenus` | `detenus.consulter` |
| Visites | `visites.consulter` | `GET /detenus` | `detenus.consulter` |
| Sanctions | `discipline.sanctions.consulter` | `GET /types-sanction` | `discipline.types_sanction.gerer` |
| Sanctions | idem | `GET /cellules`, `GET /detenus` | `discipline.cellules.consulter`, `detenus.consulter` |
| Affectations | `discipline.affectations.gerer` | `GET /cellules`, `GET /detenus` | `discipline.cellules.consulter`, `detenus.consulter` |
| Détail d'une cellule | `discipline.cellules.consulter` | `GET /cellules/{id}/detenus` | `detenus.consulter` |
| Fiches & avis | `etats.consulter` | `GET /detenus`, `GET /detenus/{id}` | `detenus.consulter` |
| Libération / transfert / évasion / décès | `detenus.sorties.enregistrer` | `GET /detenus`, `GET /detenus/{id}` | `detenus.consulter` |
| Listings de mandats, état par catégorie | `detenus.consulter` / `etats.consulter` | `GET /tableau-de-bord` | `tableau_bord.consulter` |

**Le modèle par modules règle la plus grosse part du problème** : ouvrir un module entier
accorde d'un coup toutes ses permissions internes (plus de « sanctions sans types de
sanction »), et **tout module entraîne `detenus.consulter`** comme socle. Chaque bloc
concerné dégrade malgré tout proprement si un droit manque (« Droit manquant » au lieu d'un
écran en erreur), pour les comptes créés avant ce modèle.

**Ce qui reste demandé à l'API** — surtout du rangement, maintenant :

- `GET /cellules/{cellule}/detenus` vit dans `CelluleController`, est appelé depuis l'écran
  des cellules, mais est protégé par `detenus.consulter`. Le rattacher à
  `discipline.cellules.consulter` serait plus juste.
- Documenter dans le guide frontend que `detenus.consulter` est un socle de lecture, pas
  l'équivalent du module « Gestion des détenus » : le frontend, lui, distingue les deux.

---

### C4. 🟢 `GET /parametres` est ouvert à tout compte authentifié

Aucun middleware `permission:` sur cette route, alors que `PUT /parametres` exige
`administration.parametres.gerer`. Vérifié : un médecin sans aucun droit d'administration
obtient bien 200. C'est ce dont le frontend a besoin (en-têtes de tous les documents), mais
l'asymétrie n'est écrite nulle part — à confirmer comme volontaire et à noter dans le guide.

---

### C5. 🟢 Le 403 n'est pas exploitable par machine

```json
{ "message": "Cette action nécessite la permission « detenus.consulter »." }
```

Le frontend doit lire une phrase française pour savoir quel droit manque. **Demandé** —
ajouter deux clés :

```json
{ "message": "…", "code": "PERMISSION_REQUISE", "permission": "detenus.consulter" }
```

---

### C6. 🟢 Deux noms pour la même donnée

`ProfilResource` expose `derniere_connexion`, `UtilisateurResource` expose `last_login_at`,
pour le même champ `users.last_login_at`. Le frontend maintient deux mappings.

---

### C7. 🟢 `derniere_connexion` renvoyée par `POST /auth/login` vaut toujours « maintenant »

```php
$user->update(['last_login_at' => now()]);   // AVANT la sérialisation
$token = $user->createToken('api')->plainTextToken;
return response()->json(['user' => new ProfilResource($user), ...]);
```

La valeur retournée est l'instant courant, jamais la connexion précédente. Si l'intention est
d'afficher « dernière connexion » à l'utilisateur, il faut capturer l'ancienne valeur avant la
mise à jour.

---

### C8. 🟢 `PUT /utilisateurs/{id}` : `permissions` n'est pas `present`

La règle est `['array']` : omettre la clé conserve silencieusement les permissions existantes.
Le frontend envoie toujours le tableau, même vide, donc aucun impact aujourd'hui — mais passer
la règle à `['present', 'array']` rend le contrat explicite et évite qu'un autre client croie
avoir tout révoqué.

---

## D. Ce qui marche bien (à ne pas toucher)

- La suite de tests : 106 tests, 439 assertions, verts, et qui couvrent les vrais cas métier
  (DPAC, mandats multiples, cellule pleine, conflit d'identité).
- L'ordre des routes : `/detenus/verifier-identite` déclaré avant `/detenus/{detenu}`.
- Le 409 avec charge `conflict` sur la création d'un détenu dont la CNI existe en dossier
  désactivé — le frontend s'en sert pour proposer la restauration.
- `SortieDetenuService` : transaction, cascade complète (mandats, cellule, sanctions), et la
  distinction sortie définitive / libération d'un seul mandat.
- La révocation des jetons sur réinitialisation de mot de passe (exactement ce qui manque
  à `desactiver`, cf. A1).
- `Rule::in($this->user()?->permissions ?? [])` : on ne peut accorder que ce qu'on détient.
  C'est ce qui permet au nouveau formulaire de griser proprement la case « Administrateur »
  pour qui ne détient pas déjà tous les droits.
- **La granularité du catalogue `Permission` est la bonne.** Les quatre modules du frontend se
  composent exactement à partir de ces 24 clés, sans en manquer aucune ni devoir en inventer.
  Le modèle par modules est une couche de présentation posée dessus, pas un remplacement.

---

## E. Ce qui a changé côté frontend

### Habilitation par module (nouveau)

- **Plus de rôle à la création d'un compte.** L'écran Personnel propose quatre cases — Gestion
  des détenus, Discipline, Suivi médical, Visites — plus un interrupteur « Administrateur ».
  Chaque case indique ce qu'elle ouvre concrètement.
- **Un module s'ouvre en entier** : consultation et saisie, toutes ses permissions d'un bloc.
  Pas de demi-accès à administrer.
- **Tout module entraîne `detenus.consulter`**, le socle qui alimente les sélecteurs de détenus
  des formulaires (§C3).
- **Les trois rubriques transverses** (tableau de bord général, édition d'états,
  administration) ne sont plus attribuables : l'interrupteur « Administrateur » les ouvre
  ensemble, sinon elles n'apparaissent pas.
- **Relecture symétrique** : à la réouverture d'une fiche, les cases cochées sont déduites des
  permissions enregistrées. Un compte créé avant ce modèle, qui ne détient qu'une partie d'un
  module, est rattaché à ce module plutôt qu'exclu.
- La colonne « Rôle » de l'écran Personnel est remplacée par des **puces de modules**
  colorées, et un indicateur « Sans aucun accès » signale les comptes qui ne pourront rien
  ouvrir — exactement le cas qui a déclenché ce chantier.

### Redirection et garde d'accès

- `pageDArrivee()` : l'administrateur va au tableau de bord général ; un compte à **module
  unique** va droit au sous-tableau de bord de ce module ; les autres passent par le hall
  `/accueil`.
- Garde de route (`lib/acces.ts` + `proxy.ts`) : une URL interdite mène à `/acces-refuse`, qui
  nomme ce qui manque **dans les mots de l'utilisateur** (« il faut l'accès au module
  “Gestion des détenus” ») et propose ce qui est ouvert.
- Détection d'un changement d'accès : si les permissions renvoyées par `GET /auth/me` diffèrent
  du cookie de session, l'utilisateur est invité à se reconnecter.
- Sidebar, fil d'Ariane et palette de commandes filtrés par module.

### Sous-tableaux de bord (nouveau)

Chaque module a désormais sa page d'accueil, avec sa couleur, son visuel propre et ses
raccourcis :

| Module | Route | Visuel qui lui est propre |
|---|---|---|
| Gestion des détenus | `/detenus/apercu` | Bande de composition par catégorie pénale, titres de détention à régulariser |
| Discipline | `/discipline` | **Plan des cellules** : une tuile par cellule, remplie à hauteur de son taux d'occupation |
| Suivi médical | `/sante/suivi-medical/apercu` | Courbe d'activité de l'infirmerie sur 14 jours |
| Visites | `/sante/visites/apercu` | Rythme de la semaine sur sept colonnes, jour courant marqué |

### Configuration locale

Le domaine `administration` est passé sur l'API réelle (`SGP_API_LIVE`) : l'écran Personnel
consomme désormais `GET/POST/PUT /utilisateurs` au lieu des données de démonstration.

---

## F. Ce que j'ai touché sur ma base locale (aucun code API)

- Comptes de démonstration passés au modèle par modules, via `PUT /api/v1/utilisateurs/{id}`
  et via l'écran Personnel :
  - `eric.agent` → modules **Gestion des détenus + Visites** (9 permissions) ;
  - `sophie.medecin` → modules **Suivi médical + Visites** (5 permissions).

  C'est exactement ce que §B1 propose d'inscrire dans le seeder.
- Désactivé puis restauré `sophie.medecin` le temps de reproduire A1 (état final : active).
