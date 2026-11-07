// 复习：间隔重复卡片 + 听写模式
import { getState, dueCards, gradeCard } from '../store.js';
import { DB } from '../data.js';
import { h, icon, ring, toast } from '../ui.js';

export function renderReview(ctx) {
  const s = getState();
  const due = dueCards();
  const learned = Object.keys(s.srs || {});
  const mode = { value: 'cards' };
  const wrap = h('div', { class: 'page review' });

  wrap.append(
    h('header', { class: 'page-head' }, h('h1', {}, '复习'), h('p', {}, '按记忆曲线安排：忘了的十分钟后再来，记住的隔得更久。')),
    h(
      'div',
      { class: 'seg' },
      h('button', { class: 'active', type: 'button', onclick: () => switchMode('cards') }, '卡片'),
      h('button', { type: 'button', onclick: () => switchMode('dictation') }, '听写')
    )
  );
  const body = h('div', { class: 'review-body' });
  wrap.append(body);

  function switchMode(m) {
    mode.value = m;
    wrap.querySelectorAll('.seg button').forEach((b, i) => b.classList.toggle('active', (i === 0) === (m === 'cards')));
    body.replaceChildren(m === 'cards' ? cardSession() : dictationSession());
  }

  function cardSession() {
    if (!learned.length) return emptyState('还没有复习卡片', '完成第一课以后，学过的词会自动进入复习队列。');
    const queue = due.length ? due.slice(0, 20) : Object.values(s.srs).slice(0, 12);
    const ahead = due.length === 0;
    let idx = 0;
    let revealed = false;
    let counts = [0, 0, 0, 0];
    const cardBox = h('div', { class: 'flashcard' });
    const progress = h('div', { class: 'bar slim' }, h('i', {}));
    const label = h('small', { class: 'review-count' });

    const gradeRow = h('div', { class: 'grade-row', hidden: true });
    const showBtn = h('button', { class: 'btn primary wide', type: 'button', onclick: reveal }, '显示意思');
    const cardWrap = h('div', { class: 'card-session' }, progress, label, cardBox, showBtn, gradeRow);

    function render() {
      revealed = false;
      const c = queue[idx];
      progress.querySelector('i').style.width = `${(idx / queue.length) * 100}%`;
      label.textContent = `${idx + 1} / ${queue.length}${ahead ? ' · 提前复习' : ''}`;
      cardBox.replaceChildren(
        h('div', { class: 'fc-top' }, h('span', {}, c.lesson), h('button', { class: 'icon-btn', type: 'button', onclick: () => ctx.audio.play(c.sa, { slow: true }) }, icon('volume'))),
        h('div', { class: 'fc-sa sa' }, c.sa),
        h('div', { class: 'fc-back', hidden: true }, h('b', {}, c.zh), h('button', { class: 'link-btn', type: 'button', onclick: () => ctx.audio.play(c.sa, { slow: true }) }, '慢速再听一遍')),
        h('p', { class: 'fc-hint' }, '先在心里读一遍，再翻面')
      );
      showBtn.hidden = false;
      gradeRow.hidden = true;
      gradeRow.replaceChildren(
        ...[
          ['忘了', 0, 'again'],
          ['有点难', 1, 'hard'],
          ['记得', 2, 'good'],
          ['太简单', 3, 'easy'],
        ].map(([txt, q, cls]) =>
          h('button', { class: `grade ${cls}`, type: 'button', onclick: () => grade(q) }, h('b', {}, txt), h('small', {}, ['10 分钟', '1 天', `${Math.max(1, Math.round((c.interval || 1) * (c.ease || 2.5)))} 天`, '更久'][q]))
        )
      );
    }

    function reveal() {
      revealed = true;
      cardBox.querySelector('.fc-back').hidden = false;
      cardBox.querySelector('.fc-hint').hidden = true;
      showBtn.hidden = true;
      gradeRow.hidden = false;
      ctx.audio.play(queue[idx].sa, { slow: true });
    }

    function grade(q) {
      if (!revealed) return;
      gradeCard(queue[idx].sa, q);
      counts[q]++;
      idx++;
      if (idx >= queue.length) return done();
      render();
    }

    function done() {
      const total = counts.reduce((a, b) => a + b, 0);
      cardWrap.replaceChildren(
        h(
          'div',
          { class: 'session-done' },
          ring(100, 120, 10),
          h('h2', {}, '这一轮复习完了'),
          h('p', {}, `共 ${total} 张：记得 ${counts[2] + counts[3]}，有点难 ${counts[1]}，忘了 ${counts[0]}。`),
          h('div', { class: 'row' }, h('a', { class: 'btn ghost', href: '#/' }, '回到路径'), h('button', { class: 'btn primary', type: 'button', onclick: () => body.replaceChildren(cardSession()) }, '再来一轮'))
        )
      );
    }

    render();
    return cardWrap;
  }

  function dictationSession() {
    const pool = Object.values(s.srs);
    if (!pool.length) return emptyState('还没有可听写的词', '完成第一课以后再来。');
    const queue = shuffle(pool).slice(0, 10);
    let idx = 0;
    let ok = 0;
    const input = h('input', { class: 'type-input sa', type: 'text', placeholder: '听到什么就写什么…', autocomplete: 'off', spellcheck: 'false' });
    const box = h('div', { class: 'dictation' });
    const go = h('button', { class: 'btn primary wide', type: 'button' }, '检查');
    const skip = h('button', { class: 'link-btn', type: 'button' }, '不会，跳过');

    function render() {
      const c = queue[idx];
      box.replaceChildren(
        h('small', { class: 'review-count' }, `${idx + 1} / ${queue.length} · 答对 ${ok}`),
        h('div', { class: 'dictation-play' }, h('button', { class: 'big-play', type: 'button', onclick: () => ctx.audio.play(c.sa) }, icon('volume')), h('button', { class: 'audio-btn', type: 'button', onclick: () => ctx.audio.play(c.sa, { slow: true }) }, icon('slow'), h('span', {}, '慢速'))),
        input,
        h('div', { class: 'row' }, skip, go)
      );
      input.value = '';
      input.classList.remove('wrong');
      input.focus();
      ctx.audio.play(c.sa, { slow: true });
    }

    function check() {
      const c = queue[idx];
      if (norm(input.value) === norm(c.sa)) {
        ok++;
        gradeCard(c.sa, 2);
        toast('对');
        next();
      } else {
        input.classList.add('wrong');
        input.value = c.sa;
        if (!input.dataset.retry) {
          input.dataset.retry = '1';
          toast(`正确的是 ${c.sa}，记住它`);
        } else {
          delete input.dataset.retry;
          next();
        }
      }
    }
    function next() {
      idx++;
      if (idx >= queue.length) {
        box.replaceChildren(
          h('div', { class: 'session-done' }, h('h2', {}, '听写完成'), h('p', {}, `${queue.length} 个词，一次写对 ${ok} 个。`), h('button', { class: 'btn primary', type: 'button', onclick: () => body.replaceChildren(dictationSession()) }, '再来一组'))
        );
      } else render();
    }
    go.onclick = check;
    skip.onclick = () => {
      gradeCard(queue[idx].sa, 0);
      next();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') check();
    });
    render();
    return box;
  }

  const first = due.length ? cardSession() : cardSession();
  body.append(first);
  return wrap;
}

function emptyState(title, text) {
  return h('div', { class: 'empty' }, h('div', { class: 'empty-ic' }, icon('book')), h('h2', {}, title), h('p', {}, text));
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[.,!?;:'"“”‘’|]/g, ' ').replace(/\s+/g, ' ').trim();
}

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
