// 进度：XP 曲线、连续天数、单元完成度、最近记录
import { DB } from '../data.js';
import { getState } from '../store.js';
import { h, ring } from '../ui.js';

export function renderStats(ctx) {
  const s = getState();
  const lessonsDone = Object.values(s.lessons).filter((l) => l.done).length;
  const cpDone = Object.values(s.checkpoints).filter((c) => c.done).length;
  const words = Object.keys(s.srs || {}).length;
  const days = lastDays(14);
  const max = Math.max(10, ...days.map((d) => d.xp));
  const totalXp = s.xp || 0;
  const pct = Math.round((lessonsDone / 60) * 100);

  return h(
    'div',
    { class: 'page stats' },
    h('header', { class: 'page-head' }, h('h1', {}, '进度'), h('p', {}, '所有数据只存在这台设备的浏览器里，不会上传。')),
    h(
      'section',
      { class: 'stat-hero' },
      h('div', { class: 'stat-big' }, ring(pct, 130, 11), h('div', { class: 'stat-big-text' }, h('b', {}, `${pct}%`), h('small', {}, '课程完成'))),
      h(
        'div',
        { class: 'stat-grid' },
        stat('总 XP', String(totalXp)),
        stat('连续天数', `${s.streak.count || 0} 天`),
        stat('最长连续', `${s.streak.best || 0} 天`),
        stat('学过的词', String(words)),
        stat('单元测验', `${cpDone}/12`),
        stat('今日 XP', `${s.daily.xp || 0}`)
      )
    ),
    h('h2', { class: 'section-title' }, '最近 14 天'),
    h(
      'section',
      { class: 'chart card' },
      h(
        'div',
        { class: 'bars' },
        days.map((d) =>
          h(
            'div',
            { class: 'bar-col', title: `${d.label}：${d.xp} XP` },
            h('div', { class: 'bar-track' }, h('i', { style: `height:${Math.round((d.xp / max) * 100)}%` })),
            h('small', {}, d.short)
          )
        )
      ),
      h('p', { class: 'chart-note' }, `日均 ${Math.round(days.reduce((a, b) => a + b.xp, 0) / 14)} XP · 目标 ${s.settings.dailyGoal} XP/天`)
    ),
    h('h2', { class: 'section-title' }, '单元完成度'),
    h(
      'section',
      { class: 'unit-grid' },
      DB.course.units.map((u) => {
        const done = u.lessons.filter((l) => s.lessons[l.id]?.done).length;
        const cp = s.checkpoints[u.checkpoint?.id];
        return h(
          'div',
          { class: 'ug-card', style: `--uc:${u.color}` },
          h('div', { class: 'ug-head' }, h('b', {}, `U${u.id}`), h('span', {}, u.title)),
          h('div', { class: 'dots' }, u.lessons.map((l) => h('i', { class: s.lessons[l.id]?.done ? 'on' : '' }))),
          h('small', {}, `${done}/5 课${cp?.done ? ` · 测验 ${Math.round((cp.best || 0) * 100)}%` : ''}`)
        );
      })
    ),
    h('h2', { class: 'section-title' }, '最近记录'),
    recent(s)
  );
}

function stat(label, value) {
  return h('div', { class: 'stat-cell' }, h('small', {}, label), h('b', {}, value));
}

function recent(s) {
  const rows = (s.history || []).slice(-12).reverse();
  if (!rows.length) return h('div', { class: 'empty small' }, h('p', {}, '还没有学习记录。完成第一课就会出现在这里。'));
  return h(
    'section',
    { class: 'history card' },
    rows.map((r) => {
      const d = new Date(r.t);
      const date = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return h(
        'div',
        { class: 'hist-row' },
        h('span', { class: `hist-kind ${r.kind}` }, r.kind === 'lesson' ? '课程' : '测验'),
        h('b', {}, r.id),
        h('span', { class: 'hist-score' }, `${Math.round((r.score || 0) * 100)}%`),
        h('span', { class: 'hist-xp' }, `+${r.xp} XP`),
        h('small', {}, date)
      );
    })
  );
}

function lastDays(n) {
  const out = [];
  const hist = getState().history || [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = d.getTime() + 86400000;
    const xp = hist.filter((r) => r.t >= d.getTime() && r.t < end).reduce((a, r) => a + (r.xp || 0), 0);
    out.push({
      xp,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      short: `${d.getDate()}`,
    });
  }
  return out;
}
