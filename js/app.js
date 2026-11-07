// 应用入口：数据加载、路由、全局状态
import { loadData, DB } from './data.js';
import { getState, subscribe, rollDaily } from './store.js';
import { AudioBank } from './audio.js';
import { toast, icon } from './ui.js';
import { renderHome } from './views/home.js';
import { renderLesson, renderCheckpoint } from './views/lesson.js';
import { renderReview } from './views/review.js';
import { renderLexicon } from './views/lexicon.js';
import { renderStats } from './views/stats.js';
import { renderSettings } from './views/settings.js';
import { renderSounds } from './views/sounds.js';

const view = document.getElementById('view');
const app = document.getElementById('app');

export let audio = null;

const ROUTES = [
  [/^\/?$/, () => renderHome(ctx)],
  [/^\/lesson\/([\w-]+)$/, (m) => renderLesson(ctx, m[1])],
  [/^\/cp\/(\d+)$/, (m) => renderCheckpoint(ctx, Number(m[1]))],
  [/^\/review$/, () => renderReview(ctx)],
  [/^\/lexicon$/, () => renderLexicon(ctx)],
  [/^\/stats$/, () => renderStats(ctx)],
  [/^\/settings$/, () => renderSettings(ctx)],
  [/^\/sounds$/, () => renderSounds(ctx)],
];

const ctx = {
  get state() {
    return getState();
  },
  audio,
  go(hash) {
    location.hash = hash;
  },
};

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw;
}

async function route() {
  const path = parse();
  ctx.audio = audio;
  app.classList.toggle('is-playing', /^\/(lesson|cp)\//.test(path));
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const key = a.dataset.nav;
    const active =
      (key === 'home' && (path === '/' || path.startsWith('/lesson') || path.startsWith('/cp'))) ||
      (key !== 'home' && path.startsWith(`/${key}`));
    a.classList.toggle('active', active);
  });
  for (const [re, fn] of ROUTES) {
    const m = path.match(re);
    if (m) {
      try {
        const el = await fn(m);
        view.replaceChildren(el);
        view.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      } catch (e) {
        console.error(e);
        view.replaceChildren(
          Object.assign(document.createElement('div'), {
            className: 'empty',
            textContent: '页面加载失败：' + e.message,
          })
        );
      }
      updateBadges();
      return;
    }
  }
  location.hash = '#/';
}

function updateBadges() {
  import('./store.js').then(({ dueCards }) => {
    const n = dueCards().length;
    const badge = document.getElementById('due-badge');
    const dot = document.getElementById('due-dot');
    if (badge) {
      badge.hidden = n === 0;
      badge.textContent = String(n);
    }
    if (dot) dot.hidden = n === 0;
  });
  const s = getState();
  const sn = document.getElementById('side-streak-n');
  const sx = document.getElementById('side-xp');
  if (sn) sn.textContent = String(s.streak.count || 0);
  if (sx) sx.textContent = `${s.xp || 0} XP`;
}

const NAV_ICON = { home: 'book', review: 'refresh', lexicon: 'search', stats: 'chart', settings: 'gear', sounds: 'volume' };

function paintNav() {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const slot = a.querySelector('.nav-ic') || a.querySelector('span');
    if (!slot || slot.classList.contains('ic')) return;
    slot.replaceWith(icon(NAV_ICON[a.dataset.nav]));
  });
}

async function boot() {
  paintNav();
  try {
    await loadData();
  } catch (e) {
    view.replaceChildren(
      Object.assign(document.createElement('div'), {
        className: 'empty',
        innerHTML: `<h2>数据没有加载成功</h2><p>${e.message}</p><p>请用 <code>node scripts/serve.mjs</code> 启动本地服务器后访问，而不是直接双击 HTML。</p>`,
      })
    );
    return;
  }
  audio = new AudioBank(DB.audio, () => getState().settings);
  ctx.audio = audio;
  if (typeof DB.audio.total === 'number' && DB.audio.total > 0) {
    // 音频清单存在即可；逐条缺失时 audio.js 会自动回退到浏览器语音
    console.info(`[梵音] 音频清单 ${DB.audio.total} 条，语音 ${DB.audio.voice}`);
  }
  rollDaily();
  subscribe(updateBadges);
  window.addEventListener('hashchange', route);
  await route();
  document.body.classList.add('ready');
}

boot();

// 全局快捷键：空格播放，Esc 关闭弹层
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const m = document.querySelector('.modal-backdrop');
    if (m) m.remove();
  }
});
