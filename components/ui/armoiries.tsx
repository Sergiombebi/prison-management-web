/**
 * Armoiries de la République du Cameroun — rendu stylisé.
 *
 * Dessin vectoriel simplifié pour un affichage à petite taille (32–56 px) :
 * faisceaux croisés, écu tricolore, étoile, carte du pays et balance de la
 * justice. Ce n'est pas la reproduction officielle ; si l'administration
 * fournit le fichier officiel, il remplace ce composant sans rien changer
 * d'autre (mêmes dimensions, même point d'ancrage).
 */
export function Armoiries({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Armoiries de la République du Cameroun"
      className={className}
    >
      {/* Faisceaux croisés — l'autorité de l'État */}
      <g stroke="#c9a227" strokeWidth="2.6" strokeLinecap="round">
        <path d="M17 52 L47 12" />
        <path d="M47 52 L17 12" />
      </g>
      <g fill="#e0bc4a">
        <path d="M44 9 L50 13 L46.5 17 L41.5 13.5 Z" />
        <path d="M20 9 L14 13 L17.5 17 L22.5 13.5 Z" />
      </g>

      {/* Écu */}
      <path
        d="M15 14 H49 V36 C49 46.5 41.6 53.6 32 57 C22.4 53.6 15 46.5 15 36 Z"
        fill="#0d4f3c"
      />
      <clipPath id="sgp-ecu">
        <path d="M15 14 H49 V36 C49 46.5 41.6 53.6 32 57 C22.4 53.6 15 46.5 15 36 Z" />
      </clipPath>
      <g clipPath="url(#sgp-ecu)">
        <rect x="15" y="14" width="11.34" height="43" fill="#007a5e" />
        <rect x="26.34" y="14" width="11.32" height="43" fill="#ce1126" />
        <rect x="37.66" y="14" width="11.34" height="43" fill="#fcd116" />

        {/* Carte du Cameroun — silhouette d'appui, volontairement discrète */}
        <path
          d="M36.6 17.5 L40.5 23.4 L43.2 28.1 L42.4 33.6 L38.6 37.4 L32.4 38.6 L26.8 36.4 L23.4 31.6 L24.6 26.4 L28.2 23.2 L31.4 19.6 Z"
          fill="#17152b"
          opacity="0.24"
        />
      </g>
      <path
        d="M15 14 H49 V36 C49 46.5 41.6 53.6 32 57 C22.4 53.6 15 46.5 15 36 Z"
        fill="none"
        stroke="#c9a227"
        strokeWidth="1.8"
      />

      {/* Étoile de l'unité */}
      <path
        d="M32 17.6 L33.5 21.6 L37.8 21.8 L34.4 24.5 L35.6 28.6 L32 26.2 L28.4 28.6 L29.6 24.5 L26.2 21.8 L30.5 21.6 Z"
        fill="#fcd116"
        stroke="#8a6a12"
        strokeWidth="0.5"
      />

      {/* Balance de la justice */}
      <g stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round">
        <path d="M32 31 V45" />
        <path d="M23.5 34 H40.5" />
        <path d="M27.5 45 H36.5" />
      </g>
      <g fill="#ffffff">
        <path d="M20.5 34.6 L26.5 34.6 L23.5 39.6 Z" />
        <path d="M37.5 34.6 L43.5 34.6 L40.5 39.6 Z" />
      </g>
    </svg>
  );
}
