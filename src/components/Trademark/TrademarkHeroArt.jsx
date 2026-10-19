// Hero illustration for the Trademark Search page: a registration certificate,
// a gold ® medallion, a magnifying glass and a shield badge. Pure SVG so it
// scales crisply and needs no image asset.
export default function TrademarkHeroArt({ className = "" }) {
  return (
    <svg viewBox="0 0 420 340" className={className} role="img" aria-label="Trademark registration">
      <defs>
        <linearGradient id="tm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="0.45" stopColor="#F7B500" />
          <stop offset="1" stopColor="#C97A00" />
        </linearGradient>
        <linearGradient id="tm-gold-inner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3C4" />
          <stop offset="1" stopColor="#F5B300" />
        </linearGradient>
        <linearGradient id="tm-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#ECEDF1" />
        </linearGradient>
        <linearGradient id="tm-book" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD54A" />
          <stop offset="1" stopColor="#E8A400" />
        </linearGradient>
        <radialGradient id="tm-lens" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#DDE6F0" stopOpacity="0.35" />
        </radialGradient>
        <filter id="tm-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#B07A00" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Books */}
      <g filter="url(#tm-shadow)">
        <rect x="270" y="250" width="140" height="26" rx="5" fill="url(#tm-book)" />
        <rect x="270" y="270" width="140" height="6" fill="#FFF6D6" />
        <rect x="282" y="226" width="118" height="26" rx="5" fill="#FFF2C2" />
        <rect x="282" y="226" width="118" height="8" rx="4" fill="#FFE38A" />
      </g>

      {/* Certificate */}
      <g transform="rotate(-10 230 140)" filter="url(#tm-shadow)">
        <rect x="150" y="30" width="170" height="220" rx="16" fill="url(#tm-paper)" />
        <rect x="150" y="30" width="170" height="220" rx="16" fill="none" stroke="#E2E4EA" />
        {/* emblem */}
        <circle cx="235" cy="72" r="13" fill="none" stroke="#6B7280" strokeWidth="2" />
        <path d="M229 78 L235 62 L241 78 Z" fill="#6B7280" />
        <rect x="227" y="88" width="16" height="3" rx="1.5" fill="#9CA3AF" />
        <text x="235" y="118" textAnchor="middle" fontSize="13" fontWeight="800" fill="#374151" fontFamily="Inter, Arial, sans-serif">
          TRADEMARK
        </text>
        <text x="235" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4B5563" fontFamily="Inter, Arial, sans-serif">
          REGISTRATION
        </text>
        <rect x="185" y="152" width="100" height="5" rx="2.5" fill="#E5E7EB" />
        <rect x="195" y="164" width="80" height="5" rx="2.5" fill="#E5E7EB" />
        <rect x="190" y="176" width="90" height="5" rx="2.5" fill="#E5E7EB" />
      </g>

      {/* Shield badge */}
      <g transform="translate(372 46) rotate(12)" filter="url(#tm-shadow)">
        <path d="M0 -26 L22 -18 L22 2 C22 16 11 26 0 31 C-11 26 -22 16 -22 2 L-22 -18 Z" fill="url(#tm-gold)" />
        <path d="M-9 1 L-2 8 L10 -6" stroke="#FFF7D6" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* ® medallion */}
      <g filter="url(#tm-shadow)">
        <circle cx="130" cy="200" r="78" fill="url(#tm-gold)" />
        <circle cx="130" cy="200" r="62" fill="url(#tm-gold-inner)" />
        <circle cx="130" cy="200" r="62" fill="none" stroke="#D18A00" strokeWidth="3" />
        <text
          x="130"
          y="232"
          textAnchor="middle"
          fontSize="92"
          fontWeight="900"
          fill="#E39A00"
          stroke="#B86E00"
          strokeWidth="2"
          fontFamily="Georgia, 'Times New Roman', serif"
        >
          R
        </text>
        <ellipse cx="102" cy="160" rx="26" ry="12" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 102 160)" />
      </g>

      {/* Magnifying glass */}
      <g filter="url(#tm-shadow)">
        <line x1="352" y1="210" x2="392" y2="282" stroke="#111827" strokeWidth="18" strokeLinecap="round" />
        <line x1="344" y1="196" x2="354" y2="214" stroke="#374151" strokeWidth="14" strokeLinecap="round" />
        <circle cx="318" cy="148" r="52" fill="url(#tm-lens)" />
        <circle cx="318" cy="148" r="52" fill="none" stroke="#111827" strokeWidth="12" />
        <path d="M290 128 A34 34 0 0 1 320 112" stroke="#FFFFFF" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.8" />
      </g>

      {/* Sparkles */}
      <g stroke="#F5B300" strokeWidth="4" strokeLinecap="round">
        <line x1="60" y1="96" x2="44" y2="84" />
        <line x1="54" y1="118" x2="34" y2="118" />
        <line x1="76" y1="80" x2="70" y2="62" />
      </g>
    </svg>
  );
}
