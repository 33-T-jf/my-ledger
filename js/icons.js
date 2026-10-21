/* 线性圆角 SVG 图标 */
const Icons = {
  svg(path, size) {
    const s = size || 20;
    return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  },
  calendar: s => Icons.svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><circle cx="8.5" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="14.5" r="1" fill="currentColor" stroke="none"/>', s),
  chart: s => Icons.svg('<path d="M5 20v-5M12 20V8M19 20v-9"/><path d="M3 20h18"/>', s),
  wallet: s => Icons.svg('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.8" r="1.3" fill="currentColor" stroke="none"/>', s),
  plus: s => Icons.svg('<path d="M12 5v14M5 12h14"/>', s),
  search: s => Icons.svg('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16.5 16.5"/>', s),
  eye: s => Icons.svg('<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', s),
  eyeOff: s => Icons.svg('<path d="M4 4l16 16"/><path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3.1 3.9M6.6 7.7A17.2 17.2 0 0 0 2.5 12S6 18 12 18c1.2 0 2.3-.2 3.3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>', s),
  back: s => Icons.svg('<path d="M15 5l-7 7 7 7"/>', s),
  trash: s => Icons.svg('<path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>', s),
  chevronDown: s => Icons.svg('<path d="M6 9.5l6 6 6-6"/>', s),
  chevronLeft: s => Icons.svg('<path d="M14.5 6L8.5 12l6 6"/>', s),
  chevronRight: s => Icons.svg('<path d="M9.5 6l6 6-6 6"/>', s),
  close: s => Icons.svg('<path d="M6 6l12 12M18 6L6 18"/>', s),
  help: s => Icons.svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9"/><path d="M12 17h.01"/>', s),
  deleteKey: s => Icons.svg('<path d="M9 5h6M8.5 5l-.7 14a1.6 1.6 0 0 0 1.6 1.7h5.2a1.6 1.6 0 0 0 1.6-1.7L15.5 5"/><path d="M5 5h14"/>', s),
  calendarSmall: s => Icons.svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>', s),
  drag: s => Icons.svg('<path d="M5 9h14M5 15h14"/><path d="M9 6.5h.01M9 12.5h.01M9 18.5h.01M15 6.5h.01M15 12.5h.01M15 18.5h.01" stroke-width="2.6"/>', s),
  pencil: s => Icons.svg('<path d="M4 20l.8-4.2L16.6 4a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.2 19.2 4 20z"/><path d="M14.5 6.5l3 3"/>', s),
  check: s => Icons.svg('<path d="M4.5 12.5l5 5 10-11"/>', s)
};

/* 空状态：简笔小猫插画 */
function catIllustration() {
  return `
  <svg class="cat-illu" width="150" height="118" viewBox="0 0 150 118" fill="none" stroke="#E0A5A5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M122 92c11-3 14-17 7-26"/>
    <path d="M48 96c0-17 10-27 27-27s27 10 27 27"/>
    <circle cx="75" cy="52" r="21"/>
    <path d="M58 38l-5-15 15 8"/>
    <path d="M92 38l5-15-15 8"/>
    <path d="M66 50v4M84 50v4" stroke-width="3"/>
    <circle cx="72" cy="59" r="1.3" fill="#E0A5A5" stroke="none"/>
    <circle cx="78" cy="59" r="1.3" fill="#E0A5A5" stroke="none"/>
    <path d="M71 63c1.8 2 5.2 2 7 0"/>
    <path d="M53 55l-11-2M53 61l-11 4M97 55l11-2M97 61l11 4"/>
    <path d="M64 94h8M82 94h8"/>
    <g transform="rotate(-8 106 90)">
      <rect x="93" y="76" width="27" height="24" rx="3.5"/>
      <path d="M98 84h17M98 89.5h12M98 95h9"/>
    </g>
  </svg>`;
}
