# Rapport d'intégration frontend → API — 20 septembre 2026

Relevé fait depuis le frontend (`prison-management-web`) contre la branche courante de
`prison-management-api`. **Aucun fichier de l'API n'a été modifié.**

**Suite de tests de l'API : 106 tests, 439 assertions, tous verts** (`php artisan test`, 35 s).
Les points ci-dessous ne sont donc pas des régressions : ce sont des cas qu'aucun test ne
couvre encore, trouvés en faisant tourner les trois profils (`admin`, `eric.agent`,
`sophie.medecin`) contre l'API réelle.

**Origine.** Tous les profils non-administrateurs atterrissaient sur `/tableau-de-bord`,
recevaient un **403** de l'API et tombaient sur l'écran d'erreur générique. Le frontend est
corrigé (voir §E) : chaque profil arrive désormais sur un accueil adapté à ses droits. Mais la
cause côté données reste entière (§B1).

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

mais `update()` n'a pas l'équivalent pour les permissions. Un administrateur qui décoche son
propre `administration.personnel.gerer` perd l'accès au module Personnel. S'il est le seul
compte à le détenir, **plus personne** ne peut rouvrir les droits : il n'existe aucune route
ni commande de secours.

**Correction suggérée** — même garde que `desactiver()` sur cette permission quand la cible
est soi-même, plus une commande `php artisan sgp:promouvoir {username}` de dernier recours.

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
l'état par défaut (agent) laisse `permissions => []`. Vérifié sur la base de dev :

| id | username | rôle | permissions |
|---|---|---|---|
| 1 | admin | admin | 24 |
| 2 | sophie.medecin | medecin | **0** |
| 3 | eric.agent | agent | **0** |

**C'est le déclencheur du bug remonté.** Ces deux comptes se connectent avec succès puis ne
peuvent rien ouvrir. Le frontend le gère proprement à présent (écran « Aucun module ne vous
est encore ouvert »), mais des comptes de démo inutilisables restent un manquement.

**Correction suggérée** — des états `agent()` et `medecin()` porteurs d'un jeu de droits
cohérent avec le poste. Proposition, alignée sur ce que les écrans attendent :

```php
public function agent(): static
{
    return $this->state(fn () => [
        'role' => RoleUtilisateur::Agent,
        'permissions' => [
            'detenus.consulter', 'detenus.creer', 'detenus.modifier',
            'detenus.mandats.gerer', 'detenus.sorties.enregistrer',
            'discipline.cellules.consulter', 'discipline.affectations.gerer',
            'discipline.sanctions.consulter', 'discipline.sanctions.creer',
            'visites.consulter', 'visites.creer',
            'etats.consulter',
        ],
    ]);
}

public function medecin(): static
{
    return $this->state(fn () => [
        'role' => RoleUtilisateur::Medecin,
        'permissions' => [
            'sante.consultations.consulter', 'sante.consultations.creer',
            'visites.consulter',
            'detenus.consulter',   // voir C3 : le sélecteur de détenus en dépend
        ],
    ]);
}
```

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

Le frontend redéclare `App\Enums\Permission` à la main dans `lib/domain/referentiels.ts`
(clé + libellé + regroupement par module) pour afficher les cases à cocher du formulaire
Personnel. Toute permission ajoutée côté API est invisible du formulaire tant que ce fichier
n'est pas mis à jour — et rien ne le signale.

**Attendu** — `GET /permissions` :

```json
{ "data": [ { "cle": "detenus.consulter", "module": "Détenus", "libelle": "Consulter" } ] }
```

---

### B4. 🟠 Le seeder de démo ne crée ni consultation médicale ni visite

Vérifié sur la base de dev : `GET /suivis-medicaux` → 0 élément, `GET /visites` → 0 élément,
alors que cellules (8), types de sanction (6), détenus (15), affectations (14), sanctions (4)
et sorties (5) sont bien peuplés.

Résultat : une fois ses droits accordés, le profil médecin a **littéralement un écran vide**
— impossible de montrer ou d'éprouver le module Santé.

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

### C3. 🟠 Permissions croisées non documentées

Plusieurs écrans lisent un domaine voisin pour se compléter. La permission de l'écran ne
suffit alors pas, et l'API répond 403 sur l'appel secondaire. Relevé complet :

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

**Côté frontend c'est absorbé** : chaque bloc concerné dégrade proprement (le panneau affiche
« Droit manquant » au lieu de faire tomber l'écran). Vérifié en conditions réelles sur
`sophie.medecin`.

**Côté API, deux options** — soit documenter ces dépendances dans le guide frontend (et les
refléter dans les jeux de permissions par défaut de B1), soit rattacher les routes de
référence au domaine qui les consomme : `GET /types-sanction` sous
`discipline.sanctions.consulter`, `GET /cellules/{id}/detenus` sous
`discipline.cellules.consulter`.

Cas le plus gênant : `GET /cellules/{cellule}/detenus` vit dans `CelluleController`, est
appelé depuis l'écran des cellules, mais est protégé par `detenus.consulter`.

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
- Le message du 403, qui nomme la permission — il ne lui manque qu'une clé machine (C5).

---

## E. Ce qui a changé côté frontend (pour information)

- **Redirection par profil.** Plus personne n'atterrit sur `/tableau-de-bord` par défaut :
  `pageDArrivee()` envoie vers le tableau de bord complet si `tableau_bord.consulter` est
  accordé, vers `/accueil` sinon.
- **Mini-tableaux de bord `/accueil`.** Indicateurs et cartes de modules construits
  uniquement à partir des permissions du compte ; chaque chiffre n'est demandé à l'API que si
  le droit correspondant existe. Un compte sans aucun droit voit un écran qui le lui dit.
- **Garde de route** (`lib/acces.ts` + `proxy.ts`) : une URL interdite mène à `/acces-refuse`,
  qui nomme le droit manquant et propose ce qui est ouvert — au lieu du 403 et de l'écran
  d'erreur.
- **Dégradation des appels croisés** (C3) : `optionnel()` / `tenter()` absorbent un 403 sur un
  appel secondaire et n'en perdent que le bloc concerné.
- **Détection d'un changement de droits** : si les permissions renvoyées par `GET /auth/me`
  diffèrent du cookie de session, l'utilisateur est invité à se reconnecter.
- **Palette de commandes et sidebar** filtrées par permission.

---

## F. Ce que j'ai touché sur ma base locale (aucun code API)

- Accordé des permissions de démonstration à `eric.agent` (12) et `sophie.medecin` (3) via
  `PUT /api/v1/utilisateurs/{id}`, faute de quoi rien n'était testable — c'est exactement ce
  que B1 propose d'inscrire dans le seeder.
- Désactivé puis restauré `sophie.medecin` le temps de reproduire A1 (état final : active).
