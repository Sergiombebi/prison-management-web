# SGP Web — Spécification du front-end v1

> Portage web de l'application desktop WPF `SGP-Version1`.
> Front : ce dépôt. API REST : développée en parallèle par un autre développeur.

## 1. Problème

L'administration pénitentiaire utilise aujourd'hui une application WPF installée poste par
poste (`installer/KZsgp-Setup.exe`), avec une base MySQL locale. Conséquences : pas d'accès
multi-site, mise à jour manuelle sur chaque poste, aucune consultation hors du bureau.

L'objectif de la v1 web n'est **pas** d'égaler le desktop fonctionnellement, mais de poser un
front complet en surface (toutes les routes, toute la navigation) pour :
1. figer le contrat d'API dont le back a besoin, le plus tôt possible ;
2. valider la direction UX/UI avec les utilisateurs métier ;
3. permettre le branchement API dès qu'elle répond.

## 2. Approche retenue

**Squelette large.** Les 6 modules du desktop sont routés et navigables. Le Tableau de bord et
le module Détenus sont traités en profondeur ; les autres présentent leur structure réelle
(filtres, colonnes, actions) avec des états vides soignés.

Alternatives écartées :
- *Vertical slice Détenus seul* — un module fini, mais on ne découvre les besoins d'API des
  autres modules que trop tard pour que le back les intègre.
- *Design system d'abord* — abstraire avant d'avoir 15 écrans réels produit les mauvaises
  abstractions. Les composants sont extraits au fil des écrans.

### Règle d'or : aucun composant ne connaît le réseau

Toute donnée transite par `lib/api/`, qui expose des fonctions typées (`listDetenus`,
`getDashboard`…). Deux implémentations derrière la même signature :

- `SGP_API_MODE=mock` (défaut) → fixtures locales, latence simulée
- `SGP_API_MODE=live`         → `fetch` vers `SGP_API_URL`

Ces variables ne portent volontairement pas le préfixe `NEXT_PUBLIC_` : elles ne sont lues
que côté serveur (composants serveur, Server Actions), donc l'adresse de l'API et le jeton
de session ne sont jamais exposés au navigateur.

Le jour où l'API répond, on change une variable d'environnement. Zéro composant modifié.

## 3. Périmètre

### Dans la v1
- Connexion (formulaire, états d'erreur, rôles) — sans vraie session tant que l'API n'existe pas
- Shell applicatif : sidebar 6 modules, fil d'Ariane, barre supérieure, recherche
- Tableau de bord : 6 KPIs, mouvements, effectifs par statut pénal, 2 graphiques, libérables
  du mois, mandats expirés
- Détenus : liste filtrable/triable/paginée, fiche détenu à onglets, formulaire d'enregistrement
  multi-sections, 5 catégories pénales (Prévenus, Condamnés, Appellants, Cassationnaires, DPAC),
  4 procédures de libération
- Discipline : cellules (+ taux d'occupation), sanctions, affectations
- Santé & Visites : suivi médical, gestion des visites
- Édition d'états : fiche & avis, dossiers par catégorie, mandats expirés, remises de peine
- Administration : personnel, paramètres (en-têtes, logo, âge de majorité, ampliataires)

### Hors v1
- Génération PDF réelle des états (le desktop utilise `DocumentGenerator` + templates `.txt`)
- Upload et stockage des photos (face / profil)
- Session persistée, refresh token, gestion fine des permissions par rôle
- Mode hors-ligne, temps réel, notifications
- Anglais (les chaînes sont centralisées, la bascule reste possible)

## 4. Design

Registre **institutionnel sobre** : c'est un registre d'écrou, pas un produit SaaS.
Hiérarchie portée par la typographie et l'espacement, pas par la couleur.

- Palette neutre (ardoise) + **une** couleur d'accent institutionnelle. Le rouge est réservé
  au danger réel (évasion, décès, mandat expiré) — jamais décoratif.
- Densité élevée assumée : ces écrans servent à lire des tableaux, pas à contempler.
- Chiffres en variantes tabulaires pour que les colonnes s'alignent.
- Mouvement discret mais soigné : transitions de vue directionnelles (React `<ViewTransition>`),
  révélations en cascade, squelettes de chargement. Le mouvement sert l'orientation, jamais l'effet.
- Accessibilité : contrastes AA, focus visibles, navigation clavier, `prefers-reduced-motion`.

**Zéro dépendance ajoutée.** Graphiques en SVG écrits à la main, icônes en SVG inline,
animations en CSS. Rien à auditer, rien à mettre à jour, tout lisible.

## 5. Modèle de données (source de vérité : `SGPCore/Entities/`)

`Detenu` 1─N `Mandas` · `Detenu` 1─N `AffectationCellule` N─1 `Cellule` ·
`Detenu` 1─N `Sanction` · `Detenu` 1─N `Visite` · `Detenu` 1─N `SuiviMedical` ·
`Detenu` 1─N `HistoriqueSortieDetenu` · `User` · `Parametre`

### Règles de statut pénal — à implémenter CÔTÉ API

Elles ne sont pas stockées : elles se calculent (`SGPCore/Services/MandasService.cs`).
Un mandat est *actif* s'il n'a pas de `DateSortieMandat`, ou qu'elle est future.

| Catégorie | Règle sur les mandats actifs d'un détenu |
|---|---|
| Prévenu | tous sont `Détention provisoire` |
| Condamné | exactement **1** mandat actif, et il est `Exécution de peine` |
| DPAC | **≥ 2** mandats actifs **et** au moins un `Exécution de peine` |
| Appellant | ≥ 1 mandat `Appellant` **et** aucun `Exécution de peine` |
| Cassationnaire | ≥ 1 mandat `Cassationnaire` **et** aucun `Exécution de peine` |

Ces catégories s'excluent mutuellement et doivent être comptées **par détenu unique**, pas
par mandat.

### Anomalies constatées dans le dépôt desktop

À corriger avant que l'API ne se modélise dessus :
1. `sgpBD.sql` est périmé : la table `suivismedicaux` est absente alors que
   `DbSet<SuiviMedical> SuivisMedicaux` existe.
2. La table `visites` du dump ne correspond plus à l'entité `Visite` (~12 colonnes manquantes :
   `HeureArrivee`, `TypeVisite`, `LieuVisite`, `AgentControle`, `FouilleCorporelle`…).

## 6. Arborescence des routes

```
/connexion
/tableau-de-bord
/detenus                      liste
/detenus/nouveau              formulaire d'enregistrement
/detenus/[id]                 fiche à onglets
/detenus/mandats              vue d'ensemble + nouveau mandat
/detenus/mandats/[categorie]  prevenus | condamnes | appellants | cassationnaires | dpac
/detenus/liberation/[type]    normale | transfert | evasion | deces
/discipline/cellules
/discipline/sanctions
/discipline/affectations
/sante/suivi-medical
/sante/visites
/etats/fiches-avis
/etats/categories
/etats/mandats-expires
/etats/remises-de-peine
/administration/personnel
/administration/parametres
```

## 7. Organisation du code

```
app/            routes (App Router, Next 16)
components/
  layout/       shell, sidebar, en-tête de page
  ui/           primitives (Button, Badge, Field, Card, Modal…)
  data/         DataTable, StatCard, EmptyState, graphiques SVG
lib/
  api/          client typé + adaptateurs mock / live
  domain/       types et énumérations du domaine
  i18n/         messages FR centralisés
  format/       dates, nombres, N° d'écrou
```

## 8. Risques acceptés

- **Le contrat d'API est une hypothèse.** Les types de `lib/api/` sont ce que le front *souhaite*
  recevoir. À confronter avec le développeur back cette semaine ; l'adaptateur `live` absorbera
  les écarts.
- **Pas d'authentification réelle** en v1 : le shell suppose un utilisateur connecté.
- **Les données de démonstration ne sont pas réalistes** (le dump ne contient que 4 détenus
  nommés « D1 » à « D4 »). Les fixtures sont générées de façon plausible.

## 9. Étapes

1. Tokens de design + primitives UI + shell applicatif
2. Couche `lib/api` (types, fixtures, adaptateurs mock/live)
3. Tableau de bord
4. Module Détenus en profondeur
5. Discipline, Santé & Visites, États, Administration
6. Vérification : build, lint, parcours des routes en navigateur
