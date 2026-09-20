/**
 * Catalogue de messages — français.
 *
 * Portée : tout ce qui est *structurel* (navigation, titres d'écran, actions
 * communes, en-têtes de tableaux, états vides). La prose propre à un seul écran
 * peut rester dans cet écran ; ce qui se répète vit ici.
 *
 * Pour ajouter l'anglais plus tard : dupliquer ce fichier en `en.ts`, en garder
 * la forme exacte (`typeof fr`), et choisir le catalogue selon la locale.
 */

export const fr = {
  app: {
    nom: "SGP",
    nomComplet: "Système de Gestion Pénitentiaire",
    republique: "République du Cameroun",
    devise: "Paix — Travail — Patrie",
  },

  modules: {
    tableauDeBord: "Tableau de bord",
    detenus: "Détenus",
    discipline: "Discipline",
    suiviMedical: "Suivi médical",
    visites: "Visites",
    etats: "Édition d'états",
    administration: "Administration",
  },

  nav: {
    menuPrincipal: "Menu principal",
    administration: "Administration",
    ouvrirMenu: "Ouvrir le menu",
    fermerMenu: "Fermer le menu",
    filAriane: "Fil d'Ariane",
    retour: "Retour",
    theme: "Thème",
    themeClair: "Clair",
    themeSombre: "Sombre",
    themeSysteme: "Système",
  },

  actions: {
    ajouter: "Ajouter",
    enregistrer: "Enregistrer",
    modifier: "Modifier",
    supprimer: "Supprimer",
    annuler: "Annuler",
    confirmer: "Confirmer",
    rechercher: "Rechercher",
    filtrer: "Filtrer",
    reinitialiser: "Réinitialiser",
    exporter: "Exporter",
    imprimer: "Imprimer",
    apercu: "Aperçu",
    fermer: "Fermer",
    voirFiche: "Voir la fiche",
    reessayer: "Réessayer",
    effacerFiltres: "Effacer les filtres",
    precedent: "Précédent",
    suivant: "Suivant",
    seConnecter: "Se connecter",
    seDeconnecter: "Se déconnecter",
  },

  champs: {
    numeroEcrou: "N° d'écrou",
    nom: "Nom",
    sexe: "Sexe",
    dateNaissance: "Date de naissance",
    lieuNaissance: "Lieu de naissance",
    age: "Âge",
    nationalite: "Nationalité",
    profession: "Profession",
    contact: "Contact",
    statut: "Statut",
    categoriePenale: "Catégorie pénale",
    dateIncarceration: "Date d'incarcération",
    motifDetention: "Motif de détention",
    typeMandat: "Type de mandat",
    dateExpiration: "Date d'expiration",
    cellule: "Cellule",
    bloc: "Bloc",
    capacite: "Capacité",
    effectif: "Effectif",
    occupation: "Occupation",
    date: "Date",
    type: "Type",
    motif: "Motif",
    observations: "Observations",
    medecin: "Médecin",
    diagnostic: "Diagnostic",
    visiteur: "Visiteur",
    lienParente: "Lien de parenté",
    agent: "Agent",
    role: "Rôle",
    derniereConnexion: "Dernière connexion",
  },

  etats: {
    chargement: "Chargement…",
    chargementEnCours: "Chargement des données en cours",
    aucunResultatTitre: "Aucun résultat",
    aucunResultatTexte:
      "Aucun enregistrement ne correspond aux filtres appliqués.",
    videTitre: "Rien à afficher pour le moment",
    erreurTitre: "Le chargement a échoué",
    erreurTexte:
      "Les données n'ont pas pu être récupérées. Vos saisies en cours sont conservées.",
    horsPerimetre: "Vous n'avez pas accès à cette section",
    bientot: "Écran à brancher sur l'API",
    bientotTexte:
      "La structure de cet écran est posée. Les données arriveront dès que le point d'entrée correspondant sera disponible.",
  },

  tableau: {
    resultats: "résultats",
    surTotal: "sur",
    page: "Page",
    lignesParPage: "Lignes par page",
    trierPar: "Trier par",
    croissant: "croissant",
    decroissant: "décroissant",
  },

  connexion: {
    titre: "Connexion",
    sousTitre: "Accès réservé au personnel habilité",
    identifiant: "Identifiant ou adresse e-mail",
    motDePasse: "Mot de passe",
    motDePasseOublie: "Mot de passe oublié ?",
    erreurIdentifiants: "Identifiant ou mot de passe incorrect.",
    erreurChampsRequis: "Renseignez votre identifiant et votre mot de passe.",
    compteVerrouille:
      "Ce compte est temporairement verrouillé après plusieurs tentatives.",
    enCours: "Vérification…",
    sessionExpiree: "Votre session a expiré. Reconnectez-vous pour continuer.",
    sessionInvalide: "Votre session n’est plus valide. Reconnectez-vous.",
    droitsModifies:
      "Vos droits d’accès ont été modifiés. Reconnectez-vous pour en tenir compte.",
  },

  mockBanner: {
    titre: "Données de démonstration",
    texte:
      "L'API n'est pas branchée. Les écrans affichent des données fictives générées localement.",
    titreHybride: "Mode hybride",
    texteHybride:
      "Certains modules utilisent l'API réelle, les autres des données fictives générées localement.",
  },
} as const;

export type Messages = typeof fr;

/** Point d'entrée unique — à faire dépendre de la locale le jour venu. */
export const t = fr;
