// 轻量 DOM 工具、图标、示意图与弹层
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected') el[k] = !!v;
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ICONS = {
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>',
  slow: '<path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm-1 4v6l5 3 .8-1.4-4.3-2.6V7h-1.5z"/>',
  check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  x: '<path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/>',
  lock: '<path d="M12 2a5 5 0 0 0-5 5v3H5v12h14V10h-2V7a5 5 0 0 0-5-5zm3 8H9V7a3 3 0 0 1 6 0v3z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  flame: '<path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1 .5-2 1-3 2 2 3 4 3 7a7 7 0 1 1-14 0c0-5 4-7 7-13z"/>',
  arrow: '<path d="M12 4l-1.4 1.4L16.2 11H4v2h12.2l-5.6 5.6L12 20l8-8z"/>',
  back: '<path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/>',
  volume: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>',
  mic: '<path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"/>',
  book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a4 4 0 0 0-4-2H4zm16 0h-4a3 3 0 0 0-3 3v13a4 4 0 0 1 4-2h3z"/>',
  refresh: '<path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>',
  search: '<path d="M10 4a6 6 0 1 0 3.5 10.9l4.8 4.8 1.4-1.4-4.8-4.8A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>',
  chart: '<path d="M4 20h16v-2H6V4H4v16zm4-3h3V9H8v8zm5 0h3V6h-3v11zm5 0h3v-5h-3v5z"/>',
  gear: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4-2.1-.6a7 7 0 0 0-.7-1.7l1.1-1.9-2.1-2.1-1.9 1.1a7 7 0 0 0-1.7-.7L13 3h-2l-.6 2.1a7 7 0 0 0-1.7.7L6.8 4.7 4.7 6.8l1.1 1.9a7 7 0 0 0-.7 1.7L3 11v2l2.1.6a7 7 0 0 0 .7 1.7l-1.1 1.9 2.1 2.1 1.9-1.1a7 7 0 0 0 1.7.7L11 21h2l.6-2.1a7 7 0 0 0 1.7-.7l1.9 1.1 2.1-2.1-1.1-1.9a7 7 0 0 0 .7-1.7L21 13z"/>',
};

export function icon(name, cls = '') {
  const span = document.createElement('span');
  span.className = `ic ${cls}`.trim();
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">${ICONS[name] || ''}</svg>`;
  return span;
}

let toastTimer = null;
export function toast(msg, kind = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

export function modal(content, { title, onClose } = {}) {
  const root = document.getElementById('modal-root');
  const close = () => {
    root.innerHTML = '';
    document.body.classList.remove('modal-open');
    onClose?.();
  };
  const box = h(
    'div',
    { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '对话框' },
    title && h('div', { class: 'modal-head' }, h('h3', {}, title), h('button', { class: 'icon-btn', 'aria-label': '关闭', onclick: close }, icon('x'))),
    h('div', { class: 'modal-body' }, content),
  );
  root.innerHTML = '';
  root.appendChild(h('div', { class: 'modal-back', onclick: (e) => e.target === e.currentTarget && close() }, box));
  document.body.classList.add('modal-open');
  box.querySelector('button, input, a')?.focus?.();
  return close;
}

export function ring(percent, size = 44, stroke = 5, color = 'currentColor') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, percent));
  const wrap = document.createElement('span');
  wrap.className = 'ring';
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
  return wrap;
}

export function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// —— 发音示意图（纯 SVG，不出现天城体）——
const FIG = {
  'mouth-a': { jaw: 30, tip: 0.42, hump: 0.1, label: 'a：口张开，舌放平', lips: 'neutral' },
  'mouth-aa': { jaw: 44, tip: 0.45, hump: 0.06, label: 'ā：比 a 更开、更长', lips: 'open' },
  'mouth-i': { jaw: 8, tip: 0.72, hump: 0.62, label: 'i：舌面前抬，唇角展开', lips: 'spread' },
  'mouth-ii': { jaw: 6, tip: 0.75, hump: 0.72, label: 'ī：比 i 更高更紧', lips: 'spread' },
  'mouth-u': { jaw: 14, tip: 0.2, hump: 0.55, label: 'u：双唇收圆，舌后抬', lips: 'round' },
  'mouth-uu': { jaw: 10, tip: 0.16, hump: 0.65, label: 'ū：更圆更长', lips: 'round' },
  'mouth-r': { jaw: 16, tip: 0.9, hump: 0.3, label: 'ṛ：舌尖上卷，接近硬腭', lips: 'neutral' },
  'mouth-e': { jaw: 20, tip: 0.62, hump: 0.45, label: 'e：舌面中前部抬起', lips: 'spread' },
  'mouth-o': { jaw: 26, tip: 0.25, hump: 0.48, label: 'o：舌后抬，唇收圆', lips: 'round' },
  'mouth-ai': { jaw: 26, tip: 0.6, hump: 0.4, label: 'ai：从 a 滑向 i，前重后轻', lips: 'spread' },
  'mouth-au': { jaw: 22, tip: 0.3, hump: 0.5, label: 'au：从 a 滑向 u，唇渐圆', lips: 'round' },
  retroflex: { jaw: 18, tip: 0.88, hump: 0.2, label: '卷舌：舌尖向后卷', lips: 'neutral' },
  dental: { jaw: 14, tip: 0.98, hump: 0.25, label: '齿音：舌尖抵上齿背', lips: 'neutral' },
  aspirate: { jaw: 22, tip: 0.5, hump: 0.2, label: '送气：除阻时多一股气流', lips: 'neutral', puff: true },
  visarga: { jaw: 20, tip: 0.5, hump: 0.2, label: 'ḥ：元音后的一小股清气流', lips: 'neutral', puff: true },
  anusvara: { jaw: 18, tip: 0.5, hump: 0.25, label: 'ṃ：气流同时从鼻腔出', lips: 'neutral', nasal: true },
};

export function figure(name) {
  const f = FIG[name] || FIG['mouth-a'];
  const tongueY = 132 - f.hump * 55;
  const tipX = 62 + f.tip * 120;
  const jaw = f.jaw;
  const lipPath =
    f.lips === 'round'
      ? 'M52 78 q-14 18 0 34 q12 8 20-2'
      : f.lips === 'spread'
        ? 'M50 80 q-8 16 4 32 q8 2 12-6'
        : 'M52 80 q-10 16 2 32 q10 4 16-4';
  const nasal = f.nasal
    ? '<path class="air" d="M210 74 q10 -26 44 -22 q28 4 30 26" /><path class="arrow" d="M284 78 l-8 -3 m8 3 l-8 4"/>'
    : '';
  const puff = f.puff
    ? '<g class="puff"><path d="M40 96 q-16 -6 -26 2"/><path d="M40 108 q-18 0 -30 10"/><path d="M40 120 q-14 8 -24 20"/></g>'
    : '';
  return `<svg class="mouth" viewBox="0 0 340 200" role="img" aria-label="${f.label}">
  <defs>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6E7D3"/><stop offset="1" stop-color="#EAD3B8"/>
    </linearGradient>
  </defs>
  <path class="head" d="M30 40 C 90 18 190 24 250 52 C 300 74 316 120 300 160 C 286 188 240 196 200 190 C 150 184 120 166 96 150 C 70 132 34 120 30 96 Z" fill="url(#skin)" stroke="#D9BE9E" stroke-width="2"/>
  <path class="palate" d="M70 72 C 120 54 200 58 236 74 C 262 86 272 104 272 120" fill="none" stroke="#B98F6A" stroke-width="7" stroke-linecap="round"/>
  <path class="tongue" d="M${tipX} ${120 - jaw * 0.2} C ${tipX + 26} ${tongueY}, 180 ${tongueY + 6}, 236 118 C 250 126 252 140 240 146 C 200 158 140 ${150 - jaw * 0.3} 96 ${142 - jaw * 0.3} C ${tipX - 20} ${138 - jaw * 0.3} ${tipX - 14} ${126 - jaw * 0.2} ${tipX} ${120 - jaw * 0.2} Z" fill="#D98C7A" stroke="#B96A58" stroke-width="2"/>
  <path class="jaw" d="M60 ${150 + jaw * 0.1} C 120 ${172 + jaw * 0.2} 210 ${176 + jaw * 0.2} 258 150" fill="none" stroke="#C9A583" stroke-width="3" stroke-dasharray="3 6"/>
  <path class="lips" d="${lipPath}" fill="none" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>
  <circle class="focus" cx="${tipX + 8}" cy="${tongueY + 4}" r="9" fill="none" stroke="#C2410C" stroke-width="3"/>
  <path class="air" d="M300 108 C 260 108 220 96 160 92 C 120 90 80 96 54 100" fill="none" stroke="#1E3A5F" stroke-width="2" stroke-dasharray="5 5"/>
  <path class="arrow" d="M60 100 l-10 -6 m10 6 l-10 6" fill="none" stroke="#1E3A5F" stroke-width="2"/>
  ${nasal}${puff}
  <text x="30" y="188" class="fig-label">${f.label}</text>
</svg>`;
}
