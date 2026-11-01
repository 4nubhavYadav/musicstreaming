// Handcrafted Zen SVGs exactly matching the aesthetic in the reference images

export const ARTWORKS = {
  aWalk: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
      <rect width="400" height="400" fill="#EAE3D2"/>
      <circle cx="120" cy="110" r="42" fill="#C96846"/>
      <!-- Dunes / Hills -->
      <path d="M 0 280 C 80 250, 180 230, 260 270 C 330 300, 370 290, 400 280 L 400 400 L 0 400 Z" fill="#D38A63"/>
      <path d="M 0 240 C 90 220, 200 170, 290 230 C 340 260, 380 250, 400 240 L 400 400 L 0 400 Z" fill="#6A7A61"/>
      <path d="M 0 190 C 70 170, 160 180, 220 220 C 300 270, 360 240, 400 220 L 400 400 L 0 400 Z" fill="#88987F"/>
      <path d="M 0 270 C 60 240, 120 250, 180 300 C 240 350, 330 310, 400 320 L 400 400 L 0 400 Z" fill="#4B5843"/>
      <!-- Botanical branch & ceramic vase on right -->
      <path d="M 290 260 Q 320 180 340 90" stroke="#373D30" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- Leaves -->
      <path d="M 338 95 C 320 85, 310 95, 338 120 C 355 105, 350 95, 338 95 Z" fill="#43523B"/>
      <path d="M 328 135 C 305 130, 300 145, 330 160 C 345 150, 340 140, 328 135 Z" fill="#54664B"/>
      <path d="M 342 165 C 365 155, 375 165, 345 185 C 335 180, 335 170, 342 165 Z" fill="#3D4B36"/>
      <path d="M 315 195 C 290 190, 285 210, 318 220 C 330 210, 325 200, 315 195 Z" fill="#586A4F"/>
      <path d="M 335 220 C 360 215, 365 230, 338 245 C 328 240, 328 230, 335 220 Z" fill="#44543C"/>
      <!-- Vase -->
      <path d="M 295 260 C 295 248, 335 248, 335 260 C 350 280, 355 350, 345 400 L 285 400 C 275 350, 280 280, 295 260 Z" fill="#DCD4C4"/>
    </svg>
  `)}`,

  smallMoments: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
      <rect width="400" height="400" fill="#EBE5D6"/>
      <!-- Abstract soft blobs -->
      <circle cx="270" cy="160" r="90" fill="#E2DAC9" opacity="0.6"/>
      <path d="M 160 300 C 130 260, 200 240, 230 290 C 250 330, 180 350, 160 300 Z" fill="#CB7D5B"/>
      <!-- Botanical branch -->
      <path d="M 200 320 Q 200 200 200 90" stroke="#3B4234" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="160" cy="120" rx="35" ry="18" transform="rotate(-35 160 120)" fill="#4B5A44"/>
      <ellipse cx="240" cy="140" rx="35" ry="18" transform="rotate(35 240 140)" fill="#617359"/>
      <ellipse cx="155" cy="180" rx="40" ry="20" transform="rotate(-30 155 180)" fill="#53644B"/>
      <ellipse cx="245" cy="200" rx="40" ry="20" transform="rotate(30 245 200)" fill="#43523B"/>
      <ellipse cx="165" cy="245" rx="38" ry="19" transform="rotate(-25 165 245)" fill="#6A7D61"/>
      <ellipse cx="235" cy="265" rx="38" ry="19" transform="rotate(25 235 265)" fill="#54654C"/>
    </svg>
  `)}`,

  fadingWest: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
      <rect width="400" height="400" fill="#E8E2D7"/>
      <!-- Sky & soft horizon -->
      <rect y="0" width="400" height="230" fill="#E2DACD"/>
      <circle cx="200" cy="200" r="70" fill="#EFE8DD" opacity="0.8"/>
      <!-- Sea line -->
      <path d="M 0 230 L 400 230 L 400 280 C 280 275, 120 285, 0 280 Z" fill="#7C9993" opacity="0.65"/>
      <!-- Coast dune -->
      <path d="M 0 270 C 120 260, 260 250, 400 270 L 400 400 L 0 400 Z" fill="#9CAE98"/>
      <path d="M 0 310 C 140 290, 240 330, 400 300 L 400 400 L 0 400 Z" fill="#5F7156"/>
    </svg>
  `)}`,

  thingsWeDontSay: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
      <rect width="400" height="400" fill="#1C241B"/>
      <!-- Foliage texture layers -->
      <circle cx="80" cy="100" r="120" fill="#2B3629" opacity="0.8"/>
      <circle cx="320" cy="80" r="140" fill="#384735" opacity="0.7"/>
      <circle cx="200" cy="220" r="160" fill="#242E22" opacity="0.9"/>
      <circle cx="90" cy="340" r="130" fill="#3E4E3B" opacity="0.6"/>
      <circle cx="310" cy="320" r="120" fill="#2D3B2C" opacity="0.8"/>
      <!-- Soft dappled light -->
      <circle cx="210" cy="180" r="50" fill="#72846A" opacity="0.25"/>
      <circle cx="160" cy="230" r="30" fill="#8B9E83" opacity="0.2"/>
    </svg>
  `)}`,

  inTandem: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
      <rect width="400" height="400" fill="#E8E0D1"/>
      <!-- Architectural Archway -->
      <path d="M 60 400 L 60 220 C 60 120, 160 120, 160 220 L 160 400 Z" fill="#C57554"/>
      <path d="M 90 400 L 90 240 C 90 170, 130 170, 130 240 L 130 400 Z" fill="#EAE2D4"/>
      <!-- Minimalist stairs -->
      <path d="M 160 400 L 160 360 L 220 360 L 220 320 L 280 320 L 280 280 L 340 280 L 340 400 Z" fill="#D38A6A"/>
      <!-- Shadow and depth -->
      <rect x="220" y="320" width="60" height="80" fill="#B36545" opacity="0.3"/>
      <!-- Soft botanical accent -->
      <path d="M 330 260 Q 340 210 325 180" stroke="#485541" stroke-width="2" fill="none"/>
      <circle cx="323" cy="180" r="7" fill="#586A4F"/>
    </svg>
  `)}`,

  defaultAmbient: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
      <rect width="400" height="400" fill="#F0ECE3"/>
      <circle cx="200" cy="180" r="80" fill="#C67451" opacity="0.85"/>
      <path d="M 0 280 C 100 240, 260 230, 400 270 L 400 400 L 0 400 Z" fill="#6E8166"/>
      <path d="M 0 320 C 120 290, 240 330, 400 310 L 400 400 L 0 400 Z" fill="#4F5D48"/>
    </svg>
  `)}`
};

// Generates an elegant procedural zen artwork for any dynamically searched track
export function getZenArtwork(title = '', artist = '') {
  const hash = (title + artist).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    { bg: '#EAE3D2', sun: '#C96846', hill1: '#88987F', hill2: '#4B5843' },
    { bg: '#EBE5D6', sun: '#CB7D5B', hill1: '#7C9993', hill2: '#5F7156' },
    { bg: '#F2EDE2', sun: '#D68563', hill1: '#9CAE98', hill2: '#526049' },
    { bg: '#E7DFD0', sun: '#BF6643', hill1: '#74866C', hill2: '#3D4936' },
  ];
  const set = colors[hash % colors.length];
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
      <rect width="400" height="400" fill="${set.bg}"/>
      <circle cx="${140 + (hash % 120)}" cy="${120 + (hash % 60)}" r="${40 + (hash % 25)}" fill="${set.sun}"/>
      <path d="M 0 240 C 90 ${210 + (hash % 30)}, 220 190, 400 230 L 400 400 L 0 400 Z" fill="${set.hill1}"/>
      <path d="M 0 290 C 130 260, 250 ${300 - (hash % 20)}, 400 280 L 400 400 L 0 400 Z" fill="${set.hill2}"/>
    </svg>
  `)}`;
}
