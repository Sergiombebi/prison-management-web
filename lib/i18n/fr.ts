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
    monAccueil: "Mon accueil",
    langue: "Langue",
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
    accesJournalise: "Accès journalisé : tout usage est tracé.",
    piedDePage: "Ministère de la Justice · Administration pénitentiaire",
    afficherMotDePasse: "Afficher le mot de passe",
    masquerMotDePasse: "Masquer le mot de passe",
  },

  mockBanner: {
    titre: "Données de démonstration",
    texte:
      "L'API n'est pas branchée. Les écrans affichent des données fictives générées localement.",
    titreHybride: "Mode hybride",
    texteHybride:
      "Certains modules utilisent l'API réelle, les autres des données fictives générées localement.",
  },

  /** Arborescence de navigation : `lib/navigation.ts` construit MODULES à partir de ceci. */
  navigation: {
    tableauDeBord: {
      description: "Situation de l'établissement au jour d'aujourd'hui",
    },
    detenus: {
      description: "Écrou, mandats et procédures de sortie",
      groupeFichiers: "Fichiers des détenus",
      apercu: { label: "Vue d’ensemble", description: "Situation du registre d'écrou aujourd'hui" },
      liste: { label: "Liste des détenus", description: "Registre d'écrou de l'établissement" },
      nouveau: { label: "Nouvel enregistrement", description: "Fiche d'enregistrement d'un détenu entrant" },
      groupeMandats: "Gestion des mandats",
      tousLesMandats: { label: "Tous les mandats", description: "Mandats de dépôt, gardes à vue et arrêtés" },
      prevenus: { label: "Prévenus", description: "Détenus dont tous les mandats actifs sont provisoires" },
      condamnes: { label: "Condamnés", description: "Détenus avec un unique mandat d'exécution de peine" },
      appellants: { label: "Appellants", description: "Détenus dont une décision est frappée d'appel" },
      cassationnaires: { label: "Cassationnaires", description: "Détenus ayant formé un pourvoi en cassation" },
      dpac: {
        label: "DPAC",
        description: "Détenus cumulant plusieurs mandats actifs dont une exécution de peine",
      },
      groupeLiberation: "Libération",
      liberationNormale: {
        label: "Libération normale",
        description: "Levée d'écrou à l'expiration du titre de détention",
      },
      transfert: { label: "Transfert", description: "Transfèrement vers un autre établissement" },
      evasion: { label: "Évasion", description: "Constat d'évasion et avis aux autorités ampliataires" },
      deces: { label: "Décès", description: "Constat de décès en détention" },
    },
    discipline: {
      description: "Logement, affectations et sanctions disciplinaires",
      groupe: "Discipline",
      apercu: { label: "Vue d’ensemble", description: "Occupation des cellules et mesures en cours" },
      cellules: { label: "Logement & cellules", description: "Capacités, effectifs et taux d'occupation par cellule" },
      affectations: { label: "Affectations", description: "Attribution des détenus aux cellules" },
      sanctions: { label: "Sanctions", description: "Fautes constatées et sanctions prononcées" },
    },
    suiviMedical: {
      description: "Consultations, diagnostics et traitements prescrits",
      groupe: "Suivi médical",
      apercu: { label: "Vue d’ensemble", description: "Activité de l'infirmerie aujourd'hui" },
      consultations: { label: "Consultations", description: "Historique des consultations" },
      traitements: { label: "Traitements", description: "Prescriptions en cours, terminées et arrêtées" },
      evacuations: {
        label: "Évacuations sanitaires",
        description: "Détenus évacués vers une structure hospitalière extérieure",
      },
    },
    visites: {
      description: "Parloirs, visiteurs et contrôles de sécurité",
      groupe: "Visites",
      apercu: { label: "Vue d’ensemble", description: "Parloirs du jour et affluence de la semaine" },
      registre: { label: "Registre des visites", description: "Toutes les visites enregistrées" },
    },
    etats: {
      description: "Fiches, extraits de registre et états statistiques",
      groupe: "Édition d'états",
      fichesAvis: { label: "Fiches & avis divers", description: "Fiche signalétique, extrait de registre, attestations" },
      categories: { label: "Dossier par catégorie", description: "État nominatif par catégorie pénale" },
      mandatsExpires: { label: "Mandats expirés", description: "Titres de détention dont la validité est dépassée" },
      remisesDePeine: { label: "Remises de peine", description: "Réductions de peine accordées" },
    },
    administration: {
      description: "Comptes du personnel et paramètres de l'établissement",
      groupe: "Administration",
      personnel: { label: "Personnel", description: "Comptes utilisateurs et accès aux modules" },
      parametres: {
        label: "Paramètres",
        description: "En-têtes des états, logo, âge de majorité, autorités ampliataires",
      },
    },
    accueil: { label: "Accueil", description: "Vos modules et vos indicateurs du jour" },
    accesRefuse: { label: "Accès refusé", description: "Accès manquant pour l'écran demandé" },
  },
};

export type Messages = typeof fr;
