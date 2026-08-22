export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      className={`${className} transition-transform duration-500 hover:scale-105`} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoBaseBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="50%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        
        <linearGradient id="logoNeonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        <filter id="logoUltraGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.8"/>
        </filter>
      </defs>

      {/* فرم بدون لبه برای درشتی لوگو */}
      <rect width="100" height="100" rx="22" fill="url(#logoBaseBg)" stroke="#334155" strokeWidth="2" filter="url(#logoShadow)"/>

      <g filter="url(#logoShadow)">
        <circle cx="22" cy="78" r="5" fill="#EF4444" />
        <circle cx="41" cy="78" r="5" fill="#F59E0B" />
        <circle cx="60" cy="78" r="5" fill="#3B82F6" />
        <circle cx="78" cy="78" r="5" fill="#10B981" />
      </g>

      <g filter="url(#logoUltraGlow)">
        <path d="M 18 30 Q 50 15 82 30" fill="none" stroke="url(#logoNeonGradient)" strokeWidth="11" strokeLinecap="round" />
        <path d="M 50 22 V 88 L 84 45" fill="none" stroke="url(#logoNeonGradient)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      
      <path d="M 50 22 V 86" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}