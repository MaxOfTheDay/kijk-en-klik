// Small hand-drawn line icons on a 24×24 grid. Each entry is the inner SVG
// markup; `icon()` wraps it so every icon shares stroke weight and caps.

const PATHS = {
  // Challenge icons
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z"/><path d="M5 19 13 11"/>',
  sprout: '<path d="M12 20v-7"/><path d="M12 13c0-3.5-2.5-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5Z"/><path d="M12 11c0-3 2-5 5.5-5 0 3-2 5-5.5 5Z"/><path d="M8 20h8"/>',
  tree: '<path d="M12 21v-6"/><path d="M12 15c-4 0-6.5-2.3-6.5-5.3 0-2.4 1.6-4 3.4-4.4C9.6 3.9 10.7 3 12 3s2.4.9 3.1 2.3c1.8.4 3.4 2 3.4 4.4 0 3-2.5 5.3-6.5 5.3Z"/><path d="m12 18-2.5-2M12 17l2-1.5"/>',
  leaves: '<path d="M4 20c0-5 2.5-8 7-9-.5 5-3 8-7 9Z"/><path d="M20 20c0-5-2.5-8-7-9 .5 5 3 8 7 9Z"/><path d="M12 12c-1.8-2-2-5.2 0-8 2 2.8 1.8 6 0 8Z"/>',
  burrow: '<path d="M3 19h18"/><path d="M6 19c0-4.5 2.7-8 6-8s6 3.5 6 8"/><path d="M9.5 19c0-2 1.1-3.5 2.5-3.5s2.5 1.5 2.5 3.5"/><path d="M4 11.5c1-.8 2-1 3-.8M17 10.7c1-.2 2 0 3 .8"/>',
  feather: '<path d="M19 4C12 4 7 9 7 16v3"/><path d="M19 4c0 7-4 11-10 11"/><path d="M11 12.5h4.5M9.5 9h5.5"/>',
  people: '<circle cx="8" cy="7" r="2.3"/><circle cx="16.5" cy="8.5" r="1.9"/><path d="M3.5 19c0-3.3 2-5.5 4.5-5.5s4.5 2.2 4.5 5.5"/><path d="M13 14.2c.9-.8 2.1-1.2 3.5-1.2 2.3 0 4 2 4 5"/>',
  horizon: '<path d="M3 18h18"/><path d="m3 15 5-5 4 4 3-3 6 6"/><circle cx="16.5" cy="6.5" r="1.8"/>',
  face: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/><path d="M8.5 15c1.8 1.4 5.2 1.4 7 0"/>',
  wonky: '<path d="M8 21 6.5 4"/><path d="M5 5.5 16 3.5l1 5-11 2"/><path d="M13 20.5 14.5 9"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.3A3.4 3.4 0 0 1 17 18Z"/>',
  stick: '<path d="M5 20 18 5"/><path d="m11 13 5 1.5M14.5 9l-1.5-3.5"/>',
  question: '<path d="M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.8v.9"/><circle cx="12" cy="18" r=".6" fill="currentColor"/><path d="M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0"/>',
  hat: '<path d="M3 17.5c3 1.5 15 1.5 18 0"/><path d="M6 17c0-6 2.5-10 6-10s6 4 6 10"/><path d="M6.5 13.5c3.5 1 7.5 1 11 0"/>',
  shadow: '<circle cx="9" cy="5" r="2"/><path d="M9 7v6m0 0-2.5 5M9 13l2.5 5M6 10h6"/><path d="m11.5 18 8.5 2.5M6.5 18 16 21.5" stroke-dasharray="1.5 2"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  circle: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  stripes: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v16M12 4v16M16 4v16"/>',
  triangle: '<path d="M12 4.5 20.5 19h-17Z"/>',
  thumb: '<path d="M9 21V11.5c0-3.5 1-6.5 3-6.5s3 3 3 6.5V21"/><path d="M10.5 9.5c.9-.5 2.1-.5 3 0"/><circle cx="18.5" cy="19" r="1.2"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4 4 0 0 1 12 7.2a4 4 0 0 1 7.5 2.3c0 5.6-7.5 10-7.5 10Z"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 1.8-.9 1.4-1.9-.5-1.3.3-2.6 1.7-2.6h2c1.9 0 3.4-1.4 3.4-3.6 0-4.9-3.9-8.9-8.5-8.9Z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
  wand: '<path d="m4 20 11-11"/><path d="M17 3v3M15.5 4.5h3M20 8v2M19 9h2M13 4v1.5"/>',
  door: '<path d="M6 21V10a6 6 0 0 1 12 0v11"/><path d="M4 21h16"/><circle cx="14.5" cy="15" r=".6" fill="currentColor"/><path d="M12 4v17"/>',
  dragon: '<path d="M4 18c2-1 3.5-3 3.5-6 0-3 2-5 5-5 2 0 3.5 1 4.5 2.5l2.5.5-1.5 2c-.5 3-3 5-6.5 5H10"/><path d="M4 18c1.5.5 3.5.5 6-1"/><path d="M11 7 9.5 4.5 13 6"/><circle cx="15" cy="10" r=".6" fill="currentColor"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"/><path d="M18.5 16v4M16.5 18h4"/>',
  arch: '<path d="M5 21V11a7 7 0 0 1 14 0v10"/><path d="M9 21v-9a3 3 0 0 1 6 0v9"/><path d="M3 21h18"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"/><path d="M17 3.5v3M15.5 5h3"/>',

  // Hunt marks
  shapes: '<circle cx="8" cy="8" r="4"/><path d="m16.5 4 4.5 8h-9Z"/><rect x="11" y="14" width="7" height="7" rx="1"/>',

  // Interface
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z"/><circle cx="12" cy="12.5" r="3.5"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-4.5 3.5 3 3-2.5 4.5 3.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4Z"/><path d="M12 3.5v1.5M12 19v1.5M3.5 12H5M19 12h1.5"/>',
  switch: '<path d="M4.5 9.5A7.5 7.5 0 0 1 18 7.2L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 14.5A7.5 7.5 0 0 1 6 16.8L4.5 15"/><path d="M4.5 19.5V15H9"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4.5c3-1.5 5 1.5 8 0s3.5-.5 4.5 0v8c-1-.5-1.5-1.5-4.5 0s-5-1.5-8 0"/>',
  retake: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/>',
};

// Optical size: some glyphs cover much less of the 24px grid than others
// (a thumb vs. a sun), so at one size they read lighter. Measured from each
// icon's footprint and stroke ink; applied as a scale, so layout doesn't move.
const OPTICAL = {
  burrow: 1.2, sprout: 1.2, thumb: 1.2, feather: 1.18, stick: 1.18, leaf: 1.14, cloud: 1.14,
  hat: 1.1, wonky: 1.1, dragon: 1.08, heart: 1.08, circle: 1.06, people: 1.06, tree: 1.05,
  wand: 1.05, moon: 1.04, horizon: 1.03, triangle: 1.02,
  door: 0.97, star: 0.97, question: 0.95, palette: 0.95, sun: 0.94, arch: 0.93,
};

export function opticalScale(name) {
  return OPTICAL[name] ?? 1;
}

export function icon(name, { size = 24, label = "", className = "" } = {}) {
  const body = PATHS[name] ?? PATHS.star;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="icon ${className}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}

// Decorative dotted route, used as a quiet explorer's-notebook accent.
// Drawn in currentColor so it takes the hunt's accent.
export function trail({ className = "", end = "star" } = {}) {
  const marks = {
    star: '<path d="m292 10 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" fill="currentColor" stroke="none"/>',
    cross: '<path d="m286 12 11 11M297 12l-11 11" stroke-width="2.4"/>',
  };
  return `<svg class="trail ${className}" viewBox="0 0 304 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="24" r="3.2" fill="currentColor" stroke="none"/>
    <path d="M16 23c28-16 52 10 84 2s46-20 78-12 50 16 74 10 20-4 28-6" stroke-width="1.8" stroke-dasharray="0.5 7"/>
    ${marks[end]}
  </svg>`;
}
