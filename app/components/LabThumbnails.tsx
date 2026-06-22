// Small line-art SVG thumbnails for Lab project cards.
// Neutral strokes/text use the site's editorial design tokens (--ed-*).
// A handful of semantic/data colors (gauge segments, radar fill, amber
// "active step" tint, green "matched keyword" highlight) are kept as
// hardcoded hex values on purpose — they represent data/state, not theme
// chrome, so they shouldn't shift if the editorial palette changes.

export function PromptGradeIcon() {
  return (
    <svg width="100" height="80" viewBox="0 0 100 80" role="img" aria-label="Gauge showing a high prompt score">
      <path d="M15 65 A35 35 0 0 1 85 65" fill="none" stroke="var(--ed-border)" strokeWidth="2" />
      <path d="M15 65 A35 35 0 0 1 39 32" fill="none" stroke="#D85A30" strokeWidth="4" strokeLinecap="round" />
      <path d="M39 32 A35 35 0 0 1 61 32" fill="none" stroke="#EF9F27" strokeWidth="4" strokeLinecap="round" />
      <path d="M61 32 A35 35 0 0 1 85 65" fill="none" stroke="#639922" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="65" x2="70" y2="42" stroke="var(--ed-text-dark)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="65" r="4" fill="var(--ed-text-dark)" />
      <text x="50" y="78" textAnchor="middle" fontSize="9" fill="var(--ed-text-muted)">score: 92</text>
    </svg>
  )
}

export function SpeakingSpeedIcon() {
  return (
    <svg width="110" height="60" viewBox="0 0 110 60" role="img" aria-label="Audio waveform">
      <g stroke="var(--ed-text-dark)" strokeWidth="3" strokeLinecap="round">
        <line x1="10" y1="38" x2="10" y2="46" />
        <line x1="22" y1="26" x2="22" y2="46" />
        <line x1="34" y1="14" x2="34" y2="46" />
        <line x1="46" y1="30" x2="46" y2="46" />
        <line x1="58" y1="8" x2="58" y2="46" />
        <line x1="70" y1="22" x2="70" y2="46" />
        <line x1="82" y1="32" x2="82" y2="46" />
        <line x1="94" y1="40" x2="94" y2="46" />
      </g>
      <text x="55" y="58" textAnchor="middle" fontSize="9" fill="var(--ed-text-muted)">138 wpm</text>
    </svg>
  )
}

export function AiNewsPipelineIcon() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" role="img" aria-label="RSS feeds into Claude into Sanity pipeline">
      <defs>
        <marker id="lab-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="var(--ed-text-dark)" strokeWidth="1.5" />
        </marker>
      </defs>
      <circle cx="14" cy="30" r="11" fill="var(--ed-card-warm)" stroke="var(--ed-text-dark)" strokeWidth="1.5" />
      <text x="14" y="33" textAnchor="middle" fontSize="8" fill="var(--ed-text-dark)">RSS</text>
      <line x1="27" y1="30" x2="47" y2="30" stroke="var(--ed-text-dark)" strokeWidth="1.2" markerEnd="url(#lab-arrow)" />
      <circle cx="60" cy="30" r="13" fill="#FAF0E2" stroke="#BA7517" strokeWidth="1.5" />
      <text x="60" y="33" textAnchor="middle" fontSize="8" fill="#854F0B">Claude</text>
      <line x1="75" y1="30" x2="93" y2="30" stroke="var(--ed-text-dark)" strokeWidth="1.2" markerEnd="url(#lab-arrow)" />
      <circle cx="106" cy="30" r="11" fill="var(--ed-card-warm)" stroke="var(--ed-text-dark)" strokeWidth="1.5" />
      <text x="106" y="33" textAnchor="middle" fontSize="7" fill="var(--ed-text-dark)">Sanity</text>
    </svg>
  )
}

export function CompetitiveIntelIcon() {
  return (
    <svg width="90" height="80" viewBox="0 0 90 80" role="img" aria-label="Radar chart comparing a competitor data series">
      <g stroke="var(--ed-border)" strokeWidth="1" fill="none">
        <polygon points="45,12 75,30 75,55 45,70 15,55 15,30" />
        <polygon points="45,28 60,38 60,52 45,60 30,52 30,38" />
      </g>
      <polygon points="45,18 68,33 64,52 45,62 24,50 22,32" fill="#D4537E" fillOpacity="0.18" stroke="#993556" strokeWidth="1.5" />
    </svg>
  )
}

export function HrChatbotIcon() {
  return (
    <svg width="120" height="64" viewBox="0 0 120 64" role="img" aria-label="Document feeding into a chat bubble, representing retrieval-augmented generation">
      <rect x="10" y="10" width="34" height="44" rx="3" fill="var(--ed-card-warm)" stroke="var(--ed-text-dark)" strokeWidth="1.2" />
      <line x1="16" y1="20" x2="38" y2="20" stroke="var(--ed-text-light)" strokeWidth="2" />
      <line x1="16" y1="28" x2="38" y2="28" stroke="var(--ed-text-light)" strokeWidth="2" />
      <line x1="16" y1="36" x2="32" y2="36" stroke="var(--ed-text-light)" strokeWidth="2" />
      <path d="M48 32 Q58 18 70 24" fill="none" stroke="var(--ed-text-dark)" strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M76 14 q26 0 26 16 q0 12 -12 14 l3 8 l-11 -7 a14 14 0 1 1 -6 -31" fill="var(--ed-card-warm)" stroke="var(--ed-text-dark)" strokeWidth="1.2" />
      <circle cx="84" cy="30" r="2" fill="var(--ed-text-dark)" />
      <circle cx="92" cy="30" r="2" fill="var(--ed-text-dark)" />
      <circle cx="100" cy="30" r="2" fill="var(--ed-text-dark)" />
    </svg>
  )
}

export function CvTailoringIcon() {
  return (
    <svg width="80" height="86" viewBox="0 0 80 86" role="img" aria-label="Resume document with matched keyword lines highlighted">
      <rect x="8" y="6" width="64" height="74" rx="3" fill="var(--ed-card-warm)" stroke="var(--ed-text-dark)" strokeWidth="1.2" />
      <line x1="16" y1="18" x2="64" y2="18" stroke="var(--ed-text-light)" strokeWidth="2" />
      <rect x="14" y="27" width="52" height="7" fill="#C0DD97" opacity="0.6" />
      <line x1="16" y1="30.5" x2="64" y2="30.5" stroke="#3B6D11" strokeWidth="1.5" />
      <line x1="16" y1="40" x2="64" y2="40" stroke="var(--ed-text-light)" strokeWidth="2" />
      <rect x="14" y="49" width="40" height="7" fill="#C0DD97" opacity="0.6" />
      <line x1="16" y1="52.5" x2="48" y2="52.5" stroke="#3B6D11" strokeWidth="1.5" />
      <line x1="16" y1="62" x2="58" y2="62" stroke="var(--ed-text-light)" strokeWidth="2" />
      <line x1="16" y1="70" x2="50" y2="70" stroke="var(--ed-text-light)" strokeWidth="2" />
    </svg>
  )
}
