// 设置：语速、每日目标、自由模式、数据导入导出
import { DB } from '../data.js';
import { getState, setSetting, save, resetAll, exportState, importState } from '../store.js';
import { h, icon, toast, modal } from '../ui.js';

export function renderSettings(ctx) {
  const s = getState();
  const total = DB.audio.total || Object.keys(DB.audio.items || {}).length;
  const gen = Object.values(DB.audio.items || {}).filter((i) => i.generated).length;

  const rateVal = h('output', { class: 'range-val' }, `${Math.round(s.settings.rate * 100)}%`);
  const rate = h('input', {
    class: 'range',
    type: 'range',
    min: '0.5',
    max: '1.2',
    step: '0.05',
    value: String(s.settings.rate),
    oninput: (e) => {
      rateVal.textContent = `${Math.round(Number(e.target.value) * 100)}%`;
      setSetting('rate', Number(e.target.value));
    },
  });
  const goal = h('input', {
    class: 'num',
    type: 'number',
    min: '10',
    max: '200',
    step: '10',
    value: String(s.settings.dailyGoal),
    onchange: (e) => setSetting('dailyGoal', Math.max(10, Math.min(200, Number(e.target.value) || 30))),
  });
  const name = h('input', {
    class: 'text',
    type: 'text',
    value: s.name || '',
    placeholder: '怎么称呼你',
    onchange: (e) => {
      const st = getState();
      st.name = e.target.value.trim().slice(0, 24) || '学习者';
      save();
    },
  });

  return h(
    'div',
    { class: 'page settings' },
    h('header', { class: 'page-head' }, h('h1', {}, '设置'), h('p', {}, '偏好会立即保存。')),
    h(
      'section',
      { class: 'set-card card' },
      h('h2', {}, '声音'),
      h(
        'div',
        { class: 'set-row' },
        h('div', {}, h('b', {}, '默认语速'), h('small', {}, '所有预生成音频都会按这个倍率放慢；练习里的「慢速」再乘 0.72。')),
        h('div', { class: 'range-box' }, rate, rateVal)
      ),
      h(
        'div',
        { class: 'set-row' },
        h('div', {}, h('b', {}, '进入练习自动播放'), h('small', {}, '讲解卡与听力题出现时自动读一遍。')),
        toggle('autoAudio', s.settings.autoAudio)
      ),
      h(
        'div',
        { class: 'set-row' },
        h('div', {}, h('b', {}, '试听'), h('small', {}, `预生成 ${gen}/${total} 条。缺失时自动用浏览器语音。`)),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => ctx.audio.play('satyam eva jayate', { slow: true }) }, icon('volume'), '慢速'),
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => ctx.audio.play('satyam eva jayate') }, icon('play'), '正常')
        )
      )
    ),
    h(
      'section',
      { class: 'set-card card' },
      h('h2', {}, '学习'),
      h('div', { class: 'set-row' }, h('div', {}, h('b', {}, '每日目标'), h('small', {}, 'XP 目标，达到后会提示。')), goal),
      h('div', { class: 'set-row' }, h('div', {}, h('b', {}, '自由模式'), h('small', {}, '解锁全部课程，不按顺序也能进。')), toggle('free', s.settings.free)),
      h('div', { class: 'set-row' }, h('div', {}, h('b', {}, '显示讲解细节'), h('small', {}, '关掉后讲解卡只留例句与发音。')), toggle('showNotes', s.settings.showNotes))
    ),
    h(
      'section',
      { class: 'set-card card' },
      h('h2', {}, '资料'),
      h('div', { class: 'set-row' }, h('div', {}, h('b', {}, '你的名字'), h('small', {}, '显示在首页与结业证书上。')), name),
      h(
        'div',
        { class: 'row wrap' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => download() }, '导出备份'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => importUI() }, '导入备份'),
        h('button', { class: 'btn danger', type: 'button', onclick: () => confirmReset() }, '清空全部进度')
      )
    ),
    h(
      'section',
      { class: 'about card' },
      h('h2', {}, '关于《梵音》'),
      h('p', {}, '给中文母语者的罗马体梵语课程。全站只用 26 个拉丁字母与 IAST 变音符号，不出现天城体。语音由 Indic Parler-TTS（梵语微调）在本机离线生成，按慢速朗读，不依赖网络。'),
      h('p', { class: 'tiny' }, '课程结构：12 单元 × 5 课 + 12 次单元测验。语法术语用梵语原名标注，中文解释优先。')
    )
  );

  function download() {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `fanyin-backup-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('备份已下载');
  }

  function importUI() {
    const ta = h('textarea', { class: 'text area', rows: '8', placeholder: '把备份 JSON 粘贴到这里' });
    modal(
      h(
        'div',
        {},
        ta,
        h(
          'div',
          { class: 'row' },
          h('button', {
            class: 'btn primary',
            type: 'button',
            onclick: () => {
              try {
                importState(ta.value);
                document.querySelector('.modal-backdrop')?.remove();
                toast('已导入');
                location.hash = '#/';
                location.reload();
              } catch (e) {
                toast(e.message);
              }
            },
          }, '导入'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => document.querySelector('.modal-backdrop')?.remove() }, '取消')
        )
      ),
      { title: '导入备份' }
    );
  }

  function confirmReset() {
    modal(
      h(
        'div',
        { class: 'confirm' },
        h('p', {}, '会删除 XP、连续天数、课程进度与复习卡片。这个操作不能撤销。'),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => document.querySelector('.modal-backdrop')?.remove() }, '取消'),
          h('button', {
            class: 'btn danger',
            type: 'button',
            onclick: () => {
              resetAll();
              document.querySelector('.modal-backdrop')?.remove();
              toast('已清空');
              location.hash = '#/';
              location.reload();
            },
          }, '确认清空')
        )
      ),
      { title: '清空全部进度？' }
    );
  }
}

function toggle(key, value) {
  const b = h('button', { class: `switch ${value ? 'on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(!!value) }, h('i', {}));
  b.onclick = () => {
    const next = !b.classList.contains('on');
    b.classList.toggle('on', next);
    b.setAttribute('aria-checked', String(next));
    setSetting(key, next);
  };
  return b;
}
