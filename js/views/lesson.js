// 课程播放器：讲解卡 / 练习 / 判分 / 结算；单元测验复用同一引擎
import { DB, getLesson, getUnitOf, getCheckpoint, lessonNeighbours } from '../data.js';
import { getState, completeLesson, completeCheckpoint, addXP } from '../store.js';
import { h, icon, ring, toast, modal, fmtTime } from '../ui.js';
import { renderStep, feedback } from '../exercises.js';

const XP_PER_LESSON = 12;

export function renderLesson(ctx, id) {
  const lesson = getLesson(id);
  if (!lesson) return notFound('没有这一课');
  const unit = getUnitOf(lesson);
  return buildPlayer(ctx, {
    kind: 'lesson',
    id: lesson.id,
    title: lesson.title,
    subtitle: `${unit.title} · ${lesson.minutes} 分钟`,
    goal: lesson.goal,
    steps: lesson.steps,
    lesson,
    back: '#/',
  });
}

export function renderCheckpoint(ctx, unitId) {
  const unit = DB.units.get(unitId);
  const cp = getCheckpoint(unitId);
  if (!unit || !cp) return notFound('没有这个测验');
  return buildPlayer(ctx, {
    kind: 'checkpoint',
    id: cp.id,
    title: cp.title,
    subtitle: `${unit.title} · 10 题 · ${Math.round(cp.pass * 100)}% 通过`,
    steps: cp.questions,
    cp,
    pass: cp.pass,
    back: '#/',
  });
}

function notFound(msg) {
  return h('div', { class: 'empty' }, h('h2', {}, msg), h('a', { class: 'btn primary', href: '#/' }, '回到首页'));
}

function buildPlayer(ctx, cfg) {
  const s = getState();
  let i = 0;
  let graded = 0;
  let correct = 0;
  let combo = 0;
  let bestCombo = 0;
  let finished = false;
  let current = null;
  let answered = false;

  const fill = h('i', { class: 'fill' });
  const counter = h('span', { class: 'counter' });
  const comboEl = h('div', { class: 'combo', hidden: true }, icon('flame'), h('b', {}, '0'));
  const content = h('div', { class: 'player-content' });
  const footer = h('div', { class: 'player-foot' });
  const checkBtn = h('button', { class: 'btn primary wide', type: 'button' }, '检查');
  const skipBtn = h('button', { class: 'link-btn', type: 'button' }, '跳过');

  const root = h(
    'div',
    { class: `player ${cfg.kind}` },
    h(
      'header',
      { class: 'player-head' },
      h('a', { class: 'icon-btn', href: cfg.back, 'aria-label': '退出', onclick: (e) => confirmExit(e, i > 0 && !finished) }, icon('x')),
      h('div', { class: 'progress' }, fill),
      counter,
      comboEl
    ),
    content,
    footer
  );

  function confirmExit(e, dirty) {
    if (!dirty) return;
    e.preventDefault();
    modal(
      h(
        'div',
        { class: 'confirm' },
        h('p', {}, '现在退出，这一轮的进度不会保存。'),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn ghost', onclick: () => document.querySelector('.modal-backdrop')?.remove() }, '继续学'),
          h('a', { class: 'btn primary', href: cfg.back }, '退出')
        )
      ),
      { title: '确定退出？' }
    );
  }

  function updateHead() {
    const total = cfg.steps.length;
    fill.style.width = `${(i / total) * 100}%`;
    counter.textContent = `${Math.min(i + 1, total)} / ${total}`;
    comboEl.hidden = combo < 2;
    comboEl.querySelector('b').textContent = String(combo);
  }

  function mount() {
    if (i >= cfg.steps.length) return finish();
    answered = false;
    const step = cfg.steps[i];
    current = renderStep(step, {
      audio: ctx.audio,
      autoAudio: s.settings.autoAudio,
    });
    content.replaceChildren(current.el);
    content.scrollTop = 0;
    updateHead();
    footer.replaceChildren();
    const curType = current.type || current.kind;
    if (curType === 'teach' || curType === 'info') {
      footer.append(h('button', { class: 'btn primary wide', type: 'button', onclick: next }, i === cfg.steps.length - 1 ? '完成' : '继续'));
      current.focus?.();
    } else {
      footer.append(h('div', { class: 'foot-row' }, skipBtn, checkBtn));
      checkBtn.textContent = '检查';
      checkBtn.disabled = false;
      current.focus?.();
    }
  }

  function next() {
    if (i < cfg.steps.length - 1) {
      i++;
      mount();
    } else {
      finish();
    }
  }

  function check() {
    if (!current) return;
    if (answered) {
      next();
      return;
    }
    const res = current.check();
    if (res.incomplete) {
      toast('先选一个答案，或把句子排好');
      return;
    }
    answered = true;
    const curType = current.type || current.kind;
    if (curType !== 'teach' && curType !== 'info') {
      graded++;
      if (res.ok) {
        correct++;
        combo++;
        bestCombo = Math.max(bestCombo, combo);
      } else {
        combo = 0;
      }
      current.el.classList.add('locked');
    }
    footer.replaceChildren(
      feedback(res.ok, res.correct, res.explain),
      h('button', { class: 'btn primary wide', type: 'button', onclick: next }, i === cfg.steps.length - 1 ? '完成' : '继续')
    );
    footer.querySelector('.btn')?.focus();
    updateHead();
  }

  checkBtn.addEventListener('click', check);
  skipBtn.addEventListener('click', () => {
    if (answered) return next();
    i++;
    mount();
  });

  function finish() {
    if (finished) return;
    finished = true;
    fill.style.width = '100%';
    counter.textContent = '完成';
    const total = Math.max(1, graded);
    const score = graded ? correct / total : 1;
    if (cfg.kind === 'lesson') {
      completeLesson(cfg.lesson, { score, xp: XP_PER_LESSON + correct * 2 });
    } else {
      const passed = score >= (cfg.pass || 0.85);
      completeCheckpoint(cfg.cp, { score, xp: passed ? 30 : 8, passed });
    }
    showSummary({ score, graded, correct, cfg, bestCombo });
  }

  function showSummary({ score, graded, correct, cfg, bestCombo }) {
    const passed = cfg.kind === 'lesson' ? true : score >= (cfg.pass || 0.85);
    const pct = Math.round(score * 100);
    const nb = cfg.kind === 'lesson' ? lessonNeighbours(cfg.id) : { next: null };
    const learned = cfg.lesson?.vocab ?? [];
    content.replaceChildren(
      h(
        'div',
        { class: 'summary' },
        h('div', { class: 'summary-ring' }, ring(pct, 140, 12), h('b', {}, `${pct}%`)),
        h('h1', {}, passed ? (cfg.kind === 'checkpoint' ? '测验通过' : '这一课完成了') : '差一点，再来一次'),
        h(
          'p',
          { class: 'summary-sub' },
          cfg.kind === 'checkpoint'
            ? passed
              ? `答对 ${correct}/${graded}，达到 ${Math.round((cfg.pass || 0.85) * 100)}% 的通过线。`
              : `答对 ${correct}/${graded}，需要 ${Math.round((cfg.pass || 0.85) * 100)}%。错题不可怕，回去读一遍再考。`
            : `答对 ${correct}/${graded || 0}，最高连击 ${bestCombo}。`
        ),
        h(
          'div',
          { class: 'reward-row' },
          h('div', { class: 'reward' }, icon('star'), h('b', {}, `+${cfg.kind === 'lesson' ? XP_PER_LESSON + correct * 2 : passed ? 30 : 8} XP`)),
          h('div', { class: 'reward' }, icon('flame'), h('b', {}, `${getState().streak.count} 天连续`)),
          h('div', { class: 'reward' }, icon('book'), h('b', {}, `${learned.length} 个新词`))
        ),
        learned.length
          ? h(
              'p',
              { class: 'review-hint' },
              `这 ${learned.length} 个词已加入复习：明天会先考你，答错后还会再来。`
            )
          : null,
        learned.length
          ? h(
              'div',
              { class: 'learned' },
              h('h3', {}, '本课词表'),
              h(
                'div',
                { class: 'chips' },
                learned.map((v) =>
                  h(
                    'button',
                    { class: 'word-chip', type: 'button', onclick: () => ctx.audio.play(v.sa, { slow: true }) },
                    h('b', { class: 'sa' }, v.sa),
                    h('span', {}, v.zh)
                  )
                )
              )
            )
          : null,
        h(
          'div',
          { class: 'summary-actions' },
          h('a', { class: 'btn ghost', href: '#/' }, '回到路径'),
          passed && nb.next
            ? h('a', { class: 'btn primary', href: `#/lesson/${nb.next.id}` }, '下一课')
            : passed
              ? h('a', { class: 'btn primary', href: '#/' }, '继续')
              : h('button', { class: 'btn primary', onclick: () => location.reload() }, '再试一次')
        )
      )
    );
    footer.replaceChildren();
    const st = getState();
    if (st.settings.dailyGoal && st.daily.xp >= st.settings.dailyGoal) {
      toast('今日目标达成');
    }
  }

  window.addEventListener('keydown', onKey);
  function onKey(e) {
    if (finished) {
      window.removeEventListener('keydown', onKey);
      return;
    }
    if (e.key === 'Enter' && !e.isComposing && document.activeElement?.tagName !== 'BUTTON') {
      e.preventDefault();
      if (!footer.querySelector('.feedback')) {
        if (current && ((current.type || current.kind) === 'teach' || (current.type || current.kind) === 'info')) next();
        else check();
      } else {
        next();
      }
    }
  }

  mount();
  return root;
}
