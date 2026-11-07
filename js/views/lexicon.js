// 词典：课程词 + 离线《梵语字典》全库检索，发音与出处
import { DB, loadBigDictionary } from '../data.js';
import { h, icon, modal } from '../ui.js';

const POS = {
  n: '名词',
  v: '动词',
  adj: '形容词',
  ind: '不变词',
  pron: '代词',
  num: '数词',
  pref: '前缀',
};

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ṃṁ]/g, 'm')
    .replace(/[ḥ]/g, 'h')
    .replace(/[ś]/g, 's')
    .replace(/[ṣ]/g, 's')
    .replace(/[ñ]/g, 'n')
    .replace(/[ṭ]/g, 't')
    .replace(/[ḍ]/g, 'd')
    .replace(/[ṇ]/g, 'n')
    .replace(/[ṛ]/g, 'r')
    .replace(/[ḷ]/g, 'l');
}

export function renderLexicon(ctx) {
  const state = {
    q: '',
    unit: 0,
    pos: '',
    tag: '',
    mode: 'course',
    big: null,
    loading: false,
  };
  const list = h('div', { class: 'lex-list' });
  const count = h('p', { class: 'lex-count' });
  const search = h('input', {
    class: 'search sa',
    type: 'search',
    placeholder: '搜索梵语词、中文意思或词根…',
    oninput: (e) => {
      state.q = e.target.value.trim().toLowerCase();
      draw();
    },
  });

  const courseTabs = h('div', { class: 'lex-tabs' });
  const filters = h('div', { class: 'lex-filters' });

  const unitChips = h(
    'div',
    { class: 'chips filter-chips' },
    [{ id: 0, label: '全部单元' }, ...DB.course.units.map((u) => ({ id: u.id, label: `U${u.id}` }))].map((u) =>
      h('button', {
        class: `chip ${u.id === 0 ? 'on' : ''}`,
        type: 'button',
        onclick: (e) => {
          state.unit = u.id;
          unitChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
          e.currentTarget.classList.add('on');
          draw();
        },
      }, u.label)
    )
  );

  const posChips = h(
    'div',
    { class: 'chips filter-chips' },
    [{ id: '', label: '全部词性' }, ...Object.entries(POS).map(([id, label]) => ({ id, label }))].map((p) =>
      h('button', {
        class: `chip small ${p.id === '' ? 'on' : ''}`,
        type: 'button',
        onclick: (e) => {
          state.pos = p.id;
          posChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
          e.currentTarget.classList.add('on');
          draw();
        },
      }, p.label)
    )
  );

  const tagChips = h(
    'div',
    { class: 'chips filter-chips' },
    [{ id: '', label: '全部主题' }, { id: '扩展', label: '扩展' }, { id: '佛典', label: '佛典' }].map((t) =>
      h('button', {
        class: `chip small ${t.id === '' ? 'on' : ''}`,
        type: 'button',
        onclick: (e) => {
          state.tag = t.id;
          tagChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
          e.currentTarget.classList.add('on');
          draw();
        },
      }, t.label)
    )
  );

  const tabCourse = h('button', { class: 'lex-tab on', type: 'button' }, '课程词典');
  const tabBig = h('button', { class: 'lex-tab', type: 'button' }, '大辞典');
  tabCourse.onclick = () => setMode('course');
  tabBig.onclick = () => setMode('big');
  courseTabs.append(tabCourse, tabBig);
  filters.append(unitChips, posChips, tagChips);

  function setMode(mode) {
    state.mode = mode;
    tabCourse.classList.toggle('on', mode === 'course');
    tabBig.classList.toggle('on', mode === 'big');
    filters.hidden = mode === 'big';
    search.placeholder = mode === 'big' ? '在《梵语字典》中搜索梵语或中文…' : '搜索梵语词、中文意思或词根…';
    draw();
  }

  function drawCourse() {
    let rows = DB.lexicon;
    if (state.unit) rows = rows.filter((r) => r.units.includes(state.unit));
    if (state.pos) rows = rows.filter((r) => r.pos === state.pos);
    if (state.tag) rows = rows.filter((r) => (r.tags || []).includes(state.tag));
    if (state.q) {
      const q = state.q;
      const fq = fold(q);
      rows = rows.filter(
        (r) =>
          r.sa.toLowerCase().includes(q) ||
          fold(r.sa).includes(fq) ||
          String(r.lemma || '').toLowerCase().includes(q) ||
          r.zh.includes(q) ||
          (r.notes || []).some((n) => n.includes(q))
      );
    }
    count.textContent = `${rows.length} 个词`;
    if (!rows.length) {
      list.replaceChildren(h('div', { class: 'empty small' }, h('p', {}, '没有找到。试试更短的词根，比如「gam」。')));
      return;
    }
    const groups = new Map();
    for (const r of rows) {
      const k = r.sa[0].toUpperCase();
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
    list.replaceChildren(
      ...[...groups.entries()].map(([k, items]) =>
        h(
          'section',
          { class: 'lex-group' },
          h('h3', { class: 'lex-letter' }, k),
          items.map((it) =>
            h(
              'div',
              { class: 'lex-row', onclick: () => openWord(ctx, it) },
              h('b', { class: 'sa' }, it.sa),
              h('span', { class: 'lex-zh' }, it.zh),
              h('span', { class: 'lex-meta' },
                it.tags?.includes('佛典') ? h('span', { class: 'tag-buddhist' }, '佛典') : null,
                it.tags?.includes('扩展') ? h('span', { class: 'tag-extra' }, '扩展') : null,
                h('span', { class: `pos p-${it.pos}` }, POS[it.pos] || it.pos)
              ),
              h('button', {
                class: 'icon-btn',
                type: 'button',
                'aria-label': '播放',
                onclick: (e) => {
                  e.stopPropagation();
                  ctx.audio.play(it.sa, { slow: true });
                },
              }, icon('volume'))
            )
          )
        )
      )
    );
  }

  async function drawBig() {
    if (!state.big) {
      if (state.loading) return;
      state.loading = true;
      count.textContent = '正在载入大辞典…';
      list.replaceChildren(h('div', { class: 'empty small' }, h('p', {}, '第一次打开需要读取约 1 MB，之后会缓存。')));
      try {
        state.big = await loadBigDictionary();
      } catch {
        count.textContent = '';
        list.replaceChildren(h('div', { class: 'empty small' }, h('p', {}, '大辞典加载失败。请确认 site/data/mahadictionary.json 存在。')));
        state.loading = false;
        return;
      }
      state.loading = false;
    }
    const q = state.q;
    const fq = fold(q);
    let rows = state.big;
    if (q) rows = rows.filter((r) => fold(r.sa).includes(fq) || r.zh.includes(q));
    if (q) {
      const rank = (r) => {
        const sa = fold(r.sa);
        if (sa === fq || r.zh === q) return 0;
        if (sa.startsWith(fq) || r.zh.startsWith(q)) return 1;
        return 2;
      };
      rows = [...rows].sort((a, b) => rank(a) - rank(b));
    }
    const shown = rows.slice(0, 80);
    count.textContent = q ? `${rows.length} 条结果 · 显示前 ${shown.length} 条` : `共 ${rows.length} 条 · 显示前 ${shown.length} 条`;
    if (!rows.length) {
      list.replaceChildren(h('div', { class: 'empty small' }, h('p', {}, '没有找到。可以试「空」「śūnya」或更短的词根。')));
      return;
    }
    list.replaceChildren(
      ...[
        h('div', { class: 'big-list' },
          shown.map((it) =>
            h('div', { class: 'lex-row big-row', onclick: () => openBigWord(it) },
              h('b', { class: 'sa' }, it.sa),
              h('span', { class: 'lex-zh' }, it.zh)
            )
          )
        ),
        rows.length > shown.length
          ? h('p', { class: 'lex-count' }, `还有 ${rows.length - shown.length} 条，输入更具体的关键词继续缩小。`)
          : null,
      ].filter(Boolean)
    );
  }

  function draw() {
    if (state.mode === 'big') drawBig();
    else drawCourse();
  }

  draw();
  return h(
    'div',
    { class: 'page lexicon' },
    h('header', { class: 'page-head' },
      h('h1', {}, '词典'),
      h('p', {}, `课程词 ${DB.lexicon.length} 个，每个都有慢速发音；大辞典另收《梵语字典》两万余条，按需载入。`)
    ),
    courseTabs,
    h('div', { class: 'lex-tools' }, search),
    filters,
    count,
    list
  );
}

function openWord(ctx, it) {
  const body = h(
    'div',
    { class: 'word-detail' },
    h('div', { class: 'wd-head' }, h('div', { class: 'wd-sa sa' }, it.sa), h('button', { class: 'big-play', type: 'button', onclick: () => ctx.audio.play(it.sa, { slow: true }) }, icon('volume'))),
    h('p', { class: 'wd-zh' }, it.zh),
    h('dl', { class: 'wd-dl' },
      h('dt', {}, '词根形'), h('dd', { class: 'sa' }, it.lemma || it.sa),
      h('dt', {}, '词性'), h('dd', {}, POS[it.pos] || it.pos || '—'),
      h('dt', {}, '单元'), h('dd', {}, it.units.map((u) => `第 ${u} 单元`).join('、')),
      it.notes && it.notes.length ? h('dt', {}, '说明') : null,
      it.notes && it.notes.length ? h('dd', {}, it.notes.join('；')) : null
    ),
    h('div', { class: 'wd-links' },
      it.lessons.length
        ? it.lessons.map((id) => h('a', { class: 'btn ghost small', href: `#/lesson/${id}`, onclick: () => document.querySelector('.modal-backdrop')?.remove() }, `回到 ${id}`))
        : null,
      it.tags?.includes('佛典')
        ? h('span', { class: 'tag-buddhist inline' }, '佛典词汇')
        : null
    )
  );
  modal(body, { title: '词条' });
}

function openBigWord(it) {
  modal(
    h('div', { class: 'word-detail' },
      h('div', { class: 'wd-head' }, h('div', { class: 'wd-sa sa' }, it.sa)),
      h('p', { class: 'wd-zh' }, it.zh),
      h('p', { class: 'big-source' }, '释义取自离线《梵语字典》，仅保留梵语词头与中文；藏文对照已剔除。')
    ),
    { title: '大辞典' }
  );
}
