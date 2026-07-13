export function BrandLogo({
  className = "h-10 w-10",
  title = "CRM.Space",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} aria-label={`${title} logo`}>
      <span className="absolute inset-0 rounded-[30%] bg-fuchsia-500/20 blur-xl" />
      <svg
        viewBox="0 0 120 120"
        role="img"
        className="relative h-full w-full drop-shadow-[0_12px_28px_rgba(34,211,238,0.22)] transition duration-300 group-hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="crmLogoCore" cx="48%" cy="44%" r="62%">
            <stop offset="0%" stopColor="#35d7ff" />
            <stop offset="36%" stopColor="#7c3aed" />
            <stop offset="72%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#090021" />
          </radialGradient>
          <linearGradient id="crmLogoStrokeA" x1="20" x2="104" y1="22" y2="96">
            <stop stopColor="#22d3ee" />
            <stop offset="0.48" stopColor="#d946ef" />
            <stop offset="1" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="crmLogoStrokeB" x1="16" x2="90" y1="86" y2="18">
            <stop stopColor="#f0abfc" />
            <stop offset="0.42" stopColor="#2563eb" />
            <stop offset="1" stopColor="#fb7185" />
          </linearGradient>
          <filter id="crmLogoSoftShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#020617" floodOpacity="0.55" />
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#22d3ee" floodOpacity="0.28" />
          </filter>
        </defs>
        <path
          filter="url(#crmLogoSoftShadow)"
          fill="url(#crmLogoCore)"
          d="M57.8 8.3c12.4-5 27.3 2.8 28.5 17.1.9 10.6-5.4 19.2-14.3 27.2 12.9-2.6 28.7.6 35.4 12.4 8.2 14.4-.4 33.5-17.9 35.2-13.9 1.3-24.4-8.4-30.3-22-3.4 14.6-12.6 28.9-27.7 27.3-12.4-1.4-18.5-15.6-11.2-26.3 3.3-4.8 8.5-7.7 14.4-9-12.1.1-23.1-7.3-22.6-19.9.5-12.7 13.6-19 27.4-14.1-8.1-9.2-11.4-20.7-3.6-28.7 8.1-8.2 19.3-2.2 24.4 12.2-2.8-7.5-3.3-14.9 1.5-19.4Z"
        />
        <path
          d="M33 50c17-1 29-12 45-31"
          fill="none"
          stroke="url(#crmLogoStrokeA)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.68"
        />
        <path
          d="M23 78c21-5 42-4 75-3"
          fill="none"
          stroke="url(#crmLogoStrokeB)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.58"
        />
        <path
          d="M45 25c12 21 16 43 12 68"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.42"
        />
        <path
          d="M26 59c24 4 42 14 61 34"
          fill="none"
          stroke="#f472b6"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M61 13c2 25 16 39 39 54"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
    </span>
  );
}
