// Source artwork for the app icon. `node scripts/make-icons.mjs` renders it.
export function iconSvg({ maskable = false } = {}) {
  // Maskable icons need their content inside the central 80% "safe zone".
  const s = maskable ? 0.72 : 1;
  const t = (256 * (1 - s)).toFixed(1);
  const bg = maskable
    ? '<rect width="512" height="512" fill="#1e1b17"/>'
    : '<rect width="512" height="512" rx="116" fill="#1e1b17"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg}
  <g transform="translate(${t} ${t}) scale(${s})">
    <g fill="none" stroke="#f4efe6" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
      <path d="M112 186v-50a24 24 0 0 1 24-24h50"/>
      <path d="M326 112h50a24 24 0 0 1 24 24v50"/>
      <path d="M400 326v50a24 24 0 0 1-24 24h-50"/>
      <path d="M186 400h-50a24 24 0 0 1-24-24v-50"/>
    </g>
    <g transform="translate(14 8)">
      <path d="M190 322c0-86 42-136 132-142-4 90-54 142-132 142Z" fill="#8fae6b"/>
      <path d="M190 322l76-76" stroke="#1e1b17" stroke-width="12" stroke-linecap="round"/>
    </g>
    <circle cx="186" cy="188" r="24" fill="#e3a94b"/>
  </g>
</svg>
`;
}
