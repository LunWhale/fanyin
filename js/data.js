// 数据层：加载构建产物，提供查询与解锁逻辑
const base = new URL('../data/', import.meta.url);

export const DB = {
  course: null,
  lexicon: [],
  audio: { items: {} },
  checkpoints: [],
  lessons: new Map(),
  units: new Map(),
};

export async function loadData() {
  const [course, lexicon, audio, checkpoints] = await Promise.all([
    fetchJSON('course.json'),
    fetchJSON('lexicon.json'),
    fetchJSON('audio.json'),
    fetchJSON('checkpoints.json').catch(() => []),
  ]);
  DB.course = course;
  DB.lexicon = lexicon;
  DB.audio = audio;
  DB.checkpoints = checkpoints;
  for (const u of course.units) {
    DB.units.set(u.id, u);
    for (const l of u.lessons) DB.lessons.set(l.id, l);
  }
  return DB;
}

let bigDictionary = null;
let bigDictionaryPromise = null;

/** 按需加载离线大辞典，避免首屏下载 1 MB JSON */
export function loadBigDictionary() {
  if (bigDictionary) return Promise.resolve(bigDictionary);
  if (!bigDictionaryPromise) {
    bigDictionaryPromise = fetchJSON('mahadictionary.json')
      .then((rows) => {
        bigDictionary = rows;
        return rows;
      })
      .catch((err) => {
        bigDictionaryPromise = null;
        throw err;
      });
  }
  return bigDictionaryPromise;
}

async function fetchJSON(name) {
  const res = await fetch(new URL(name, base));
  if (!res.ok) throw new Error(`无法加载 ${name}（${res.status}）`);
  return res.json();
}

export function getLesson(id) {
  return DB.lessons.get(id);
}

export function getUnitOf(lesson) {
  return DB.units.get(lesson.unit);
}

export function getCheckpoint(unitId) {
  return DB.checkpoints.find((c) => c.unit === unitId);
}

/** 扁平课程序列：每单元 5 课 + 1 个 checkpoint */
export function getPath() {
  const rows = [];
  for (const u of DB.course.units) {
    for (const l of u.lessons) rows.push({ kind: 'lesson', unit: u, lesson: l, id: l.id });
    rows.push({ kind: 'checkpoint', unit: u, checkpoint: getCheckpoint(u.id), id: `c${String(u.id).padStart(2, '0')}` });
  }
  return rows;
}

export function unitProgress(u, state) {
  const done = u.lessons.filter((l) => state.lessons[l.id]?.done).length;
  const cp = state.checkpoints[`c${String(u.id).padStart(2, '0')}`]?.done ? 1 : 0;
  return { done: done + cp, total: u.lessons.length + 1, lessons: done };
}

export function isUnitUnlocked(u, state) {
  if (state.settings.free) return true;
  if (u.id === 1) return true;
  const prev = DB.units.get(u.id - 1);
  if (!prev) return true;
  return prev.lessons.every((l) => state.lessons[l.id]?.done);
}

export function isNodeUnlocked(node, state) {
  if (state.settings.free) return true;
  if (!isUnitUnlocked(node.unit, state)) return false;
  if (node.kind === 'checkpoint') {
    return node.unit.lessons.every((l) => state.lessons[l.id]?.done);
  }
  const idx = node.unit.lessons.findIndex((l) => l.id === node.lesson.id);
  if (idx === 0) return true;
  return !!state.lessons[node.unit.lessons[idx - 1].id]?.done;
}

export function nextNode(state) {
  const rows = getPath();
  for (const n of rows) {
    if (n.kind === 'lesson' && !state.lessons[n.id]?.done && isNodeUnlocked(n, state)) return n;
  }
  for (const n of rows) {
    if (n.kind === 'checkpoint' && !state.checkpoints[n.id]?.done && isNodeUnlocked(n, state)) return n;
  }
  return null;
}

export function lessonNeighbours(id) {
  const rows = getPath().filter((n) => n.kind === 'lesson');
  const i = rows.findIndex((n) => n.id === id);
  return { prev: i > 0 ? rows[i - 1] : null, next: i >= 0 && i < rows.length - 1 ? rows[i + 1] : null };
}
