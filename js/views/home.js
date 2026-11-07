// 首页：今日目标、继续学习、课程路径
import { DB, getPath, nextNode, unitProgress, isNodeUnlocked, isUnitUnlocked } from '../data.js';
import { getState, dailyGoalMet, dueCards, setSetting } from '../store.js';
import { h, icon, ring, modal, toast } from '../ui.js';

export function renderHome(ctx) {
  const s = getState();
  const rows = getPath();
  const next = nextNode(s);
  const doneCount = rows.filter((r) => r.kind === 'lesson' && s.lessons[r.id]?.done).length;
  const pct = Math.round((doneCount / 60) * 100);
  const goal = s.settings.dailyGoal || 30;
  const dailyPct = Math.min(100, Math.round((s.daily.xp / goal) * 100));
  const due = dueCards().length;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return '夜深了，读一句就睡';
    if (hour < 11) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  })();

  const root = h(
    'div',
    { class: 'page home' },
    h(
      'section',
      { class: 'hero' },
      h(
        'div',
        { class: 'hero-copy' },
        h('p', { class: 'eyebrow' }, `${greeting}，${s.name || '学习者'}`),
        h('h1', {}, dailyGoalMet() ? '今天的目标完成了' : '今天读一点梵语'),
        h(
          'p',
          { class: 'hero-sub' },
          due > 0 ? `有 ${due} 张卡片到期，先花 3 分钟复习，再学新课。` : '每天 10 分钟，六个月读完《薄伽梵歌》选段。'
        ),
        h(
          'div',
          { class: 'hero-actions' },
          next
            ? h(
                'a',
                { class: 'btn primary big', href: `#${next.kind === 'lesson' ? '/lesson/' + next.id : '/cp/' + next.unit.id}` },
                next.kind === 'lesson' ? '继续学习' : '单元测验',
                icon('arrow')
              )
            : h('button', { class: 'btn primary big', onclick: () => showCertificate(s) }, '领取毕业证书'),
          due > 0 ? h('a', { class: 'btn ghost', href: '#/review' }, `复习 ${due}`) : null,
          h('a', { class: 'btn ghost', href: '#/sounds' }, '发音总表')
        )
      ),
      h(
        'div',
        { class: 'hero-side' },
        h(
          'div',
          { class: 'goal-ring' },
          ring(dailyPct, 108, 9),
          h('div', { class: 'goal-ring-text' }, h('strong', {}, `${s.daily.xp || 0}`), h('small', {}, `/ ${goal} XP`))
        ),
        h(
          'div',
          { class: 'streak-pill' },
          icon('flame'),
          h('b', {}, String(s.streak.count || 0)),
          h('span', {}, '天连续')
        )
      )
    ),
    doneCount === 0 && !s.settings.guideDismissed
      ? h(
          'section',
          { class: 'guide' },
          h('p', { class: 'eyebrow' }, '第一次学'),
          h('h2', {}, '这样开始，不会一上来就被考住'),
          h(
            'ol',
            { class: 'guide-steps' },
            h('li', {}, h('b', {}, '先学音'), '：每课开头几张元音/辅音卡，点喇叭跟读。'),
            h('li', {}, h('b', {}, '再学词'), '：词卡默认藏中文，先听、再点「显示意思」，记 6–8 个词。'),
            h('li', {}, h('b', {}, '后练习'), '：听辨、配对、拼写都只用刚学过的词；答错自动进复习。')
          ),
          h(
            'div',
            { class: 'guide-actions' },
            h('a', { class: 'btn primary', href: '#/lesson/u01l01' }, '从第一课开始'),
            h(
              'button',
              {
                class: 'btn ghost',
                onclick: (e) => {
                  setSetting('guideDismissed', true);
                  e.target.closest('.guide').remove();
                },
              },
              '知道了'
            )
          )
        )
      : null,
    h(
      'section',
      { class: 'mini-stats' },
      miniStat('课程', `${doneCount}/60`, `${pct}%`),
      miniStat('词汇', `${DB.lexicon.length}`, '含音频'),
      miniStat('总 XP', String(s.xp || 0), `最佳连续 ${s.streak.best || 0} 天`)
    ),
    h('h2', { class: 'section-title' }, '学习路径'),
    h('p', { class: 'section-sub' }, '按顺序解锁；想跳着学，可以在设置里打开「自由模式」。'),
    h('div', { class: 'path' }, DB.course.units.map((u) => unitBlock(ctx, u, s)))
  );

  if (doneCount === 60) {
    root.insertBefore(certificateBanner(s), root.querySelector('.section-title'));
  }
  return root;
}

function miniStat(label, value, sub) {
  return h(
    'div',
    { class: 'mini-stat' },
    h('span', { class: 'ms-label' }, label),
    h('strong', {}, value),
    h('small', {}, sub)
  );
}

function unitBlock(ctx, u, s) {
  const prog = unitProgress(u, s);
  const unlocked = isUnitUnlocked(u, s);
  const nodes = u.lessons.map((l) => ({ kind: 'lesson', lesson: l, unit: u, id: l.id }));
  nodes.push({ kind: 'checkpoint', checkpoint: u.checkpoint, unit: u, id: u.checkpoint?.id });

  return h(
    'section',
    { class: `unit ${unlocked ? '' : 'locked'}`, style: `--uc:${u.color}` },
    h(
      'header',
      { class: 'unit-head' },
      h('div', { class: 'unit-no' }, String(u.id).padStart(2, '0')),
      h(
        'div',
        { class: 'unit-name' },
        h('h3', {}, u.title),
        h('p', {}, u.subtitle)
      ),
      h(
        'div',
        { class: 'unit-prog' },
        h('div', { class: 'bar' }, h('i', { style: `width:${(prog.done / prog.total) * 100}%` })),
        h('small', {}, `${prog.done}/${prog.total}`)
      )
    ),
    h(
      'div',
      { class: 'nodes' },
      nodes.map((n, i) => {
        const open = isNodeUnlocked(n, s);
        const done = n.kind === 'lesson' ? !!s.lessons[n.id]?.done : !!s.checkpoints[n.id]?.done;
        const current = nextNode(s)?.id === n.id;
        const label = n.kind === 'lesson' ? n.lesson.title : n.checkpoint?.title || '单元测验';
        const href = n.kind === 'lesson' ? `#/lesson/${n.id}` : `#/cp/${u.id}`;
        return h(
          'div',
          { class: `node ${done ? 'done' : ''} ${open ? '' : 'locked'} ${current ? 'current' : ''} ${n.kind}`, style: `--i:${i}` },
          open
            ? h('a', { class: 'node-dot', href, 'aria-label': label }, done ? icon('check') : n.kind === 'checkpoint' ? icon('star') : icon('book'))
            : h('div', { class: 'node-dot', 'aria-label': `${label} 未解锁` }, icon('lock')),
          h(
            'div',
            { class: 'node-text' },
            h('span', { class: 'node-label' }, label),
            n.kind === 'lesson' ? h('span', { class: 'node-meta' }, `${n.lesson.minutes} 分钟`) : h('span', { class: 'node-meta' }, '10 题 · 85% 通过')
          )
        );
      })
    )
  );
}

function certificateBanner(s) {
  return h(
    'section',
    { class: 'cert-banner' },
    h('div', { class: 'cert-seal' }, icon('star')),
    h('div', {}, h('h3', {}, '60 课全部完成'), h('p', {}, '你已学完罗马体梵语的全部主线。领取证书，或者从头再读一遍。')),
    h('button', { class: 'btn primary', onclick: () => showCertificate(s) }, '查看证书')
  );
}

export function showCertificate(s = getState()) {
  const cps = Object.values(s.checkpoints || {}).filter((x) => x && x.done).length;
  const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const body = h(
    'div',
    { class: 'certificate' },
    h('div', { class: 'cert-inner' },
      h('p', { class: 'cert-eyebrow' }, '梵音 · 梵语自学课程'),
      h('h2', {}, '结业证书'),
      h('p', { class: 'cert-line' }, '兹证明'),
      h('p', { class: 'cert-name' }, s.name || '学习者'),
      h('p', { class: 'cert-line' }, `已完成《梵音》全部 12 单元、60 课${cps >= 12 ? '与 12 次单元测验' : ''}，`),
      h('p', { class: 'cert-line' }, '能够以罗马体转写朗读并理解基础梵语原文。'),
      h('p', { class: 'cert-sa' }, 'satyam eva jayate'),
      h('div', { class: 'cert-foot' }, h('span', {}, date), h('span', {}, `${s.xp || 0} XP · 连续 ${s.streak.best || 0} 天`))
    )
  );
  modal(body, { title: '毕业证书' });
  setTimeout(() => {
    const btn = document.querySelector('.modal .cert-print');
    btn?.addEventListener('click', () => window.print());
  }, 0);
}
