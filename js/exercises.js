// 题型渲染与判分：每种 step 返回统一的 { el, check, reveal, kind }
import { h, icon, figure } from './ui.js';

const SA_FONT = 'sa';

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:'"“”‘’|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function audioBtn(text, audio, { slow = false, label = '' } = {}) {
  // 混排标签（如 "dvandva 并列"）没有也不该有梵语音频，别回退到中文朗读。
  if (/[\u4e00-\u9fff]/.test(String(text)) && !audio.has(text)) return null;
  return h(
    'button',
    {
      class: `audio-btn ${slow ? 'slow' : ''}`,
      type: 'button',
      title: slow ? '慢速播放' : '播放',
      onclick: (e) => {
        e.stopPropagation();
        audio.play(text, { slow });
      },
    },
    icon(slow ? 'slow' : 'volume'),
    label ? h('span', {}, label) : null
  );
}

function saLine(text, audio, { size = 'lg', slow = true, zh = '' } = {}) {
  const shown = String(text).replace(/ ([|]{1,2})$/, '\u00A0$1');
  return h(
    'div',
    { class: `sa-line ${size}` },
    h('div', { class: SA_FONT }, shown),
    h(
      'div',
      { class: 'sa-tools' },
      audioBtn(text, audio),
      slow ? audioBtn(text, audio, { slow: true, label: '慢速' }) : null
    ),
    zh ? h('div', { class: 'sa-zh' }, zh) : null
  );
}

function feedback(ok, correct, explain) {
  return h(
    'div',
    { class: `feedback ${ok ? 'ok' : 'bad'}` },
    h('div', { class: 'fb-head' }, icon(ok ? 'check' : 'x'), ok ? '正确' : '再看一眼'),
    !ok && correct ? h('div', { class: 'fb-correct' }, h('span', {}, '正确答案：'), h('b', { class: SA_FONT }, correct)) : null,
    explain ? h('div', { class: 'fb-explain' }, explain) : null
  );
}

/** 通用选项列表 */
function optionList(options, { answer, onPick, renderOption } = {}) {
  let picked = null;
  const buttons = options.map((opt, i) =>
    h(
      'button',
      {
        class: 'option',
        type: 'button',
        onclick: () => {
          picked = i;
          buttons.forEach((b, j) => b.classList.toggle('picked', j === i));
          onPick?.(i);
        },
      },
      renderOption ? renderOption(opt, i) : h('span', {}, opt)
    )
  );
  return {
    el: h('div', { class: 'options' }, buttons),
    get picked() {
      return picked;
    },
    setPicked(i) {
      picked = i;
      buttons.forEach((b, j) => b.classList.toggle('picked', j === i));
    },
    mark(correctIndex) {
      buttons.forEach((b, j) => {
        b.classList.add('locked');
        b.classList.toggle('right', j === correctIndex);
        if (j === picked && j !== correctIndex) b.classList.add('wrong');
      });
    },
  };
}

/** 主入口 */
export function renderStep(step, ctx) {
  const audio = ctx.audio;
  const auto = ctx.autoAudio !== false;
  const t = step.type;

  if (t === 'teach') return teachStep(step, audio, auto);
  if (t === 'info') return infoStep(step);
  if (t === 'words') return wordsStep(step, audio, auto);
  if (t === 'mcq') return mcqStep(step, audio);
  if (t === 'audio') return audioStep(step, audio, auto);
  if (t === 'fill') return fillStep(step, audio);
  if (t === 'order') return orderStep(step, audio);
  if (t === 'match') return matchStep(step, audio);
  if (t === 'type') return typeStep(step, audio, { listen: false });
  if (t === 'listen_type') return typeStep(step, audio, { listen: true, auto });
  return infoStep({ title: '未知题型', body: `暂不支持 ${t}` });
}

function teachStep(step, audio, auto) {
  const lines = (step.note || '').split('\n').filter(Boolean);
  const el = h(
    'div',
    { class: 'teach' },
    h('div', { class: 'teach-kicker' }, step.summary ? '本课小结' : '讲解'),
    h('h2', { class: 'teach-title' }, step.title || ''),
    step.sa ? saLine(step.sa, audio, { zh: step.zh || '' }) : null,
    step.figure ? h('div', { class: 'fig-wrap', html: figure(step.figure) }) : null,
    step.figure ? h('a', { class: 'fig-link', href: '#/sounds' }, '查看发音总表') : null,
    lines.length
      ? h('ul', { class: 'teach-notes' }, lines.map((n) => h('li', {}, n)))
      : null,
    step.zh && !step.sa ? h('p', { class: 'teach-zh' }, step.zh) : null,
    step.summary && step.sa ? null : null
  );
  if (auto && step.sa) setTimeout(() => audio.play(step.sa).catch(() => {}), 260);
  return { el, kind: 'teach', check: () => ({ ok: true }) };
}

function infoStep(step) {
  const body = String(step.body || '').split('\n').filter(Boolean);
  return {
    el: h(
      'div',
      { class: 'teach info' },
      h('div', { class: 'teach-kicker' }, '小知识'),
      h('h2', { class: 'teach-title' }, step.title || ''),
      h('div', { class: 'info-body' }, body.map((p) => h('p', {}, p)))
    ),
    kind: 'info',
    check: () => ({ ok: true }),
  };
}

const POS_LABEL = { n: '名词', v: '动词', adj: '形容词', pron: '代词', ind: '不变词', num: '数词', phrase: '短语' };

function wordsStep(step, audio, auto) {
  const items = Array.isArray(step.items) ? step.items : [];
  const hide = step.mode !== 'review';
  const cards = items.map((it) => {
    const zh = h('div', { class: 'word-zh', hidden: hide }, it.zh);
    const pos = it.pos ? h('div', { class: 'word-pos', hidden: hide }, POS_LABEL[it.pos] || it.pos) : null;
    const note = it.note ? h('div', { class: 'word-note', hidden: hide }, it.note) : null;
    const reveal = h(
      'button',
      {
        class: 'link-btn word-reveal',
        type: 'button',
        hidden: !hide,
        onclick: () => {
          zh.hidden = false;
          if (pos) pos.hidden = false;
          if (note) note.hidden = false;
          reveal.hidden = true;
        },
      },
      '显示意思'
    );
    return h(
      'div',
      { class: 'word-card' },
      h(
        'div',
        { class: 'word-main' },
        h('span', { class: 'word-sa' }, it.sa),
        h(
          'button',
          {
            class: 'icon-btn word-play',
            type: 'button',
            'aria-label': `播放 ${it.sa}`,
            onclick: () => audio.play(it.sa).catch(() => {}),
          },
          icon('volume')
        )
      ),
      reveal,
      zh,
      pos,
      note
    );
  });
  const el = h(
    'div',
    { class: 'teach words' },
    h('div', { class: 'teach-kicker' }, '先学词'),
    h('h2', { class: 'teach-title' }, step.title || '这一课的新词'),
    h('p', { class: 'teach-zh' }, step.note || '先听发音，再点「显示意思」记一遍。这些词课后会进入复习。'),
    h(
      'div',
      { class: 'word-tools' },
      h(
        'button',
        {
          class: 'link-btn',
          type: 'button',
          onclick: () => {
            el.querySelectorAll('.word-zh, .word-pos, .word-note').forEach((x) => (x.hidden = false));
            el.querySelectorAll('.word-reveal').forEach((x) => (x.hidden = true));
          },
        },
        '全部显示'
      )
    ),
    h('div', { class: 'word-grid' }, cards)
  );
  if (auto && items[0]) {
    setTimeout(() => audio.play(items[0].sa).catch(() => {}), 320);
  }
  return { el, kind: 'teach', check: () => ({ ok: true }) };
}

function mcqStep(step, audio) {
  const opts = optionList(step.options, { answer: step.answer });
  const el = h(
    'div',
    { class: 'exercise' },
    h('div', { class: 'prompt' }, step.prompt || '选择正确答案'),
    step.sa ? saLine(step.sa, audio) : null,
    opts.el
  );
  return {
    el,
    kind: 'mcq',
    check() {
      if (opts.picked == null) return { ok: false, incomplete: true };
      opts.mark(step.answer);
      return {
        ok: opts.picked === step.answer,
        correct: step.options[step.answer],
        explain: step.explain,
      };
    },
  };
}

function audioStep(step, audio, auto) {
  const opts = optionList(step.options);
  const el = h(
    'div',
    { class: 'exercise' },
    h('div', { class: 'prompt' }, step.prompt || '听，选出你听到的词'),
    h(
      'div',
      { class: 'listen-hero' },
      h('button', {
        class: 'big-play',
        type: 'button',
        onclick: () => audio.play(step.sa),
      }, icon('volume')),
      audioBtn(step.sa, audio, { slow: true, label: '慢速' })
    ),
    opts.el
  );
  if (auto) setTimeout(() => audio.play(step.sa).catch(() => {}), 320);
  return {
    el,
    kind: 'audio',
    check() {
      if (opts.picked == null) return { ok: false, incomplete: true };
      opts.mark(step.answer);
      return {
        ok: opts.picked === step.answer,
        correct: step.options[step.answer],
        explain: step.explain,
      };
    },
  };
}

function typeStep(step, audio, { listen = false, auto = false } = {}) {
  const input = h('input', {
    class: 'type-input sa',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    placeholder: '用罗马体拼写…',
    oninput: () => input.classList.remove('wrong'),
  });
  const accept = (step.accept || [step.answer]).map(norm);
  const SYMS = ['ā', 'ī', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ṃ', 'ḥ', 'ś', 'ṣ', 'ñ', 'ṅ', 'ṭ', 'ḍ', 'ṇ', '|'];
  const insert = (ch) => {
    const a = input.selectionStart ?? input.value.length;
    const b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + ch + input.value.slice(b);
    input.focus();
    input.setSelectionRange(a + ch.length, a + ch.length);
    input.classList.remove('wrong');
  };
  const keys = h(
    'div',
    { class: 'symbol-keys', role: 'group', 'aria-label': '梵语变音符号键盘' },
    SYMS.map((ch) => h('button', { type: 'button', class: 'symbol-key', onclick: () => insert(ch), title: `插入 ${ch}` }, ch))
  );
  const el = h(
    'div',
    { class: 'exercise' },
    h('div', { class: 'prompt' }, step.prompt || '写出梵语'),
    listen
      ? h(
          'div',
          { class: 'listen-hero' },
          h('button', { class: 'big-play', type: 'button', onclick: () => audio.play(step.sa) }, icon('volume')),
          audioBtn(step.sa, audio, { slow: true, label: '慢速' })
        )
      : step.sa
        ? saLine(step.sa, audio, { zh: step.zh || '' })
        : h('div', { class: 'zh-prompt' }, step.zh || ''),
    input,
    keys,
    step.hint ? h('div', { class: 'hint' }, '提示：' + step.hint) : null
  );
  if (listen && auto) setTimeout(() => audio.play(step.sa).catch(() => {}), 320);
  return {
    el,
    kind: 'type',
    focus() {
      input.focus();
    },
    check() {
      const v = norm(input.value);
      if (!v) return { ok: false, incomplete: true };
      const ok = accept.includes(v);
      if (!ok) input.classList.add('wrong');
      return { ok, correct: step.answer, explain: step.explain };
    },
  };
}

function fillStep(step, audio) {
  const [before, after] = String(step.sentence || '').split('___');
  const opts = optionList(step.options);
  const el = h(
    'div',
    { class: 'exercise' },
    h('div', { class: 'prompt' }, step.prompt || '填空'),
    h(
      'div',
      { class: 'fill-line' },
      h('span', { class: 'sa' }, before || ''),
      h('span', { class: 'blank' }, '____'),
      h('span', { class: 'sa' }, after || '')
    ),
    opts.el,
    h('div', { class: 'fill-play' }, audioBtn(String(step.sentence || '').replace('___', step.options[step.answer] || ''), audio, { label: '听整句' }))
  );
  return {
    el,
    kind: 'fill',
    check() {
      if (opts.picked == null) return { ok: false, incomplete: true };
      opts.mark(step.answer);
      return {
        ok: opts.picked === step.answer,
        correct: step.options[step.answer],
        explain: step.explain,
      };
    },
  };
}

function orderStep(step, audio) {
  const bank = h('div', { class: 'order-bank' });
  const row = h('div', { class: 'order-row' });
  const chosen = [];
  const chips = step.tokens.map((tok, i) => {
    const b = h('button', { class: 'chip', type: 'button' }, tok);
    b.onclick = () => {
      if (b.classList.contains('used')) return;
      b.classList.add('used');
      const c = h('button', { class: 'chip chosen', type: 'button' }, tok);
      c.dataset.i = i;
      c.onclick = () => {
        c.remove();
        b.classList.remove('used');
        const k = chosen.indexOf(tok);
        if (k >= 0) chosen.splice(k, 1);
      };
      chosen.push(tok);
      row.appendChild(c);
    };
    return b;
  });
  bank.append(...chips);
  const el = h(
    'div',
    { class: 'exercise' },
    h('div', { class: 'prompt' }, step.prompt || '排出正确的语序'),
    step.zh ? h('div', { class: 'zh-prompt' }, step.zh) : null,
    row,
    bank,
    step.answer ? h('div', { class: 'order-play' }, audioBtn(step.answer.join(' '), audio, { label: '听正确语序（作弊）' })) : null
  );
  return {
    el,
    kind: 'order',
    check() {
      if (!chosen.length) return { ok: false, incomplete: true };
      const orders = [step.answer, ...(step.acceptOrders || [])];
      const ok = orders.some((a) => chosen.length === a.length && chosen.every((x, i) => x === a[i]));
      return { ok, correct: step.answer.join(' '), explain: step.explain };
    },
  };
}

function matchStep(step, audio) {
  const pairs = step.pairs || [];
  const rights = pairs.map((p, i) => ({ text: p[1], i }));
  // 稳定打乱右列
  for (let i = rights.length - 1; i > 0; i--) {
    const j = Math.floor(((Math.sin(i * 7.3 + 1.7) + 1) / 2) * (i + 1));
    [rights[i], rights[j]] = [rights[j], rights[i]];
  }
  let selLeft = null;
  const matched = new Set();
  const lefts = pairs.map((p, i) => {
    const b = h('button', { class: 'match-item', type: 'button' }, h('span', { class: 'sa' }, p[0]));
    b.onclick = () => {
      if (matched.has(i)) return;
      document.querySelectorAll('.match-left .match-item').forEach((n) => n.classList.remove('sel'));
      b.classList.add('sel');
      selLeft = i;
    };
    return b;
  });
  const rEls = rights.map((r) => {
    const b = h('button', { class: 'match-item', type: 'button' }, r.text);
    b.onclick = () => {
      if (matched.has(r.i) || selLeft == null) return;
      if (r.i === selLeft) {
        matched.add(selLeft);
        b.classList.add('done');
        lefts[selLeft].classList.add('done');
        lefts[selLeft].classList.remove('sel');
        selLeft = null;
        ctxState.done = matched.size === pairs.length;
      } else {
        b.classList.add('shake');
        setTimeout(() => b.classList.remove('shake'), 420);
      }
    };
    return b;
  });
  const ctxState = { done: false };
  const el = h(
    'div',
    { class: 'exercise' },
    h('div', { class: 'prompt' }, step.prompt || '把词和意思配对'),
    h(
      'div',
      { class: 'match-grid' },
      h('div', { class: 'match-left' }, lefts),
      h('div', { class: 'match-right' }, rEls)
    )
  );
  return {
    el,
    kind: 'match',
    check() {
      return { ok: matched.size === pairs.length, incomplete: matched.size < pairs.length, correct: pairs.map((p) => `${p[0]} = ${p[1]}`).join('；') };
    },
  };
}

export { feedback };
