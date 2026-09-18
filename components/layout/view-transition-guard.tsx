/**
 * L'API View Transitions (utilisée par React pour `<ViewTransition>` dans
 * page.tsx) rejette silencieusement quand une transition est annulée — onglet
 * en arrière-plan, ou une nouvelle mise à jour qui arrive avant la fin de la
 * précédente (ex. `revalidatePath` juste après un envoi de formulaire).
 * L'affichage reste correct, seule l'animation est sautée : sans ce filet,
 * ça remonte comme une erreur non gérée dans la console.
 *
 * Posé en script inline dans `<head>` (comme `SCRIPT_THEME`) plutôt qu'en
 * composant React : le script du dev-overlay de Next s'exécute très tôt, avant
 * qu'un effet React n'ait pu s'abonner — seul un script chargé encore plus tôt
 * gagne la course et intercepte l'événement en premier.
 */
export const SCRIPT_VIEW_TRANSITION_GUARD = `(function(){window.addEventListener('unhandledrejection',function(e){var r=e.reason;if(r&&typeof r==='object'&&r.name==='InvalidStateError'&&typeof r.message==='string'&&/transition/i.test(r.message)){e.preventDefault();}});})();`;
