// 本地进度存储：XP、连续天数、课程完成度、间隔复习（SM-2 简化版）
const KEY = 'fanyin.v1';

export const DEFAULT_SETTINGS = {
  rate: 0.8,
  dailyGoal: 30,
  free: false,
  autoAudio: true,
  showNotes: true,
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayDiff(a, b) {
  const ms = new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`);
  return Math.round(ms / 86400000);
}
export function isoIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function fresh() {
  return {
    version: 1,
    name: '学习者',
    xp: 0,
    streak: { count: 0, last: null, best: 0 },
    daily: { date: today(), xp: 0 },
    lessons: {},
    checkpoints: {},
    srs: {},
    history: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    return {
      ...fresh(),
      ...s,
      streak: { ...fresh().streak, ...(s.streak || {}) },
      daily: { ...fresh().daily, ...(s.daily || {}) },
      settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    };
  } catch {
    return fresh();
  }
}

export function getState() {
  return state;
}
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  emit();
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const listeners = new Set();
function emit() {
  for (const fn of listeners) fn(state);
}

export function todayStr() {
  return today();
}

export function rollDaily() {
  const t = today();
  if (state.daily.date !== t) {
    state.daily = { date: t, xp: 0 };
  }
}

export function addXP(n) {
  rollDaily();
  state.xp += n;
  state.daily.xp += n;
  touchStreak();
  save();
}

export function touchStreak() {
  const t = today();
  const last = state.streak.last;
  if (last === t) return;
  if (last && dayDiff(last, t) === 1) state.streak.count += 1;
  else if (!last) state.streak.count = 1;
  else if (dayDiff(last, t) > 1) state.streak.count = 1;
  state.streak.last = t;
  state.streak.best = Math.max(state.streak.best || 0, state.streak.count);
}

export function setSetting(k, v) {
  state.settings[k] = v;
  save();
}

export function completeLesson(lesson, { score, xp }) {
  const prev = state.lessons[lesson.id];
  state.lessons[lesson.id] = {
    done: true,
    score: Math.max(prev?.score ?? 0, score),
    attempts: (prev?.attempts || 0) + 1,
    ts: Date.now(),
  };
  // 本课新词进入复习队列：明天第一次到期
  for (const v of lesson.vocab || []) {
    if (!state.srs[v.sa]) {
      state.srs[v.sa] = {
        sa: v.sa,
        zh: v.zh,
        lesson: lesson.id,
        ease: 2.5,
        interval: 0,
        reps: 0,
        lapses: 0,
        due: isoIn(1),
      };
    }
  }
  state.xp += xp;
  rollDaily();
  state.daily.xp += xp;
  touchStreak();
  state.history.push({ t: Date.now(), kind: 'lesson', id: lesson.id, xp, score });
  state.history = state.history.slice(-400);
  save();
}

export function completeCheckpoint(cp, { score, xp, passed }) {
  state.checkpoints[cp.id] = {
    done: passed,
    best: Math.max(state.checkpoints[cp.id]?.best ?? 0, score),
    ts: Date.now(),
  };
  state.xp += xp;
  rollDaily();
  state.daily.xp += xp;
  touchStreak();
  state.history.push({ t: Date.now(), kind: 'checkpoint', id: cp.id, xp, score });
  state.history = state.history.slice(-400);
  save();
}

export function isLessonDone(id) {
  return !!state.lessons[id]?.done;
}
export function isCheckpointDone(unitId) {
  return !!state.checkpoints[`c${String(unitId).padStart(2, '0')}`]?.done;
}

export function dueCards(now = Date.now()) {
  return Object.values(state.srs)
    .filter((c) => new Date(c.due).getTime() <= now)
    .sort((a, b) => new Date(a.due) - new Date(b.due));
}

export function gradeCard(sa, quality) {
  const c = state.srs[sa];
  if (!c) return;
  const q = Math.max(0, Math.min(3, quality));
  c.reps += 1;
  if (q === 0) {
    c.lapses += 1;
    c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  } else {
    if (q === 1) {
      c.ease = Math.max(1.3, c.ease - 0.15);
      c.interval = Math.max(1, Math.round(c.interval * 1.2) || 1);
    } else if (q === 2) {
      c.interval = c.interval ? Math.round(c.interval * c.ease) : 1;
    } else {
      c.ease = Math.min(3.2, c.ease + 0.15);
      c.interval = c.interval ? Math.round(c.interval * c.ease * 1.3) : 2;
    }
    c.due = isoIn(Math.min(365, c.interval));
  }
  state.xp += q === 0 ? 2 : 5;
  rollDaily();
  state.daily.xp += q === 0 ? 2 : 5;
  touchStreak();
  save();
}

export function resetAll() {
  state = fresh();
  save();
}

export function exportState() {
  return JSON.stringify(state, null, 2);
}
export function importState(text) {
  const s = JSON.parse(text);
  if (!s || typeof s !== 'object' || !s.settings) throw new Error('不是有效的梵音备份文件');
  state = { ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } };
  save();
}

export function dailyGoalMet() {
  rollDaily();
  return state.daily.xp >= state.settings.dailyGoal;
}
