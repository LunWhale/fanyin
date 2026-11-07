// 发音总表：14 个口腔位置 + 例词 + 慢速发音
import { h, figure, icon } from '../ui.js';

const GROUPS = [
  {
    fig: 'mouth-a', title: 'a · 开口元音', ipa: '[ɐ]',
    body: '口自然张开，舌放平，像汉语「啊」但更短、更靠后。所有元音都以它为基准。',
    ex: ['aham', 'namaḥ'],
  },
  {
    fig: 'mouth-aa', title: 'ā · 长开口元音', ipa: '[aː]',
    body: '与 a 同舌位，长度约两倍。长短是辨义单位：tava（你的）里的 a 很短，mātā（母亲）里的 ā 要拖住。',
    ex: ['mātā', 'dharmāt'],
  },
  {
    fig: 'mouth-i', title: 'i · 前高元音', ipa: '[ɪ]',
    body: '舌面前部抬高，嘴角略展，比汉语「衣」松。',
    ex: ['iti', 'giriḥ'],
  },
  {
    fig: 'mouth-ii', title: 'ī · 长前高元音', ipa: '[iː]',
    body: '与 i 同舌位，拉长一倍；词尾 ī 常是阴性名词标记。',
    ex: ['nadī', 'bhūmī'],
  },
  {
    fig: 'mouth-u', title: 'u · 圆唇后高元音', ipa: '[ʊ]',
    body: '双唇收圆但不紧，舌后部抬起，比汉语「乌」短。',
    ex: ['upari', 'guruḥ'],
  },
  {
    fig: 'mouth-uu', title: 'ū · 长圆唇元音', ipa: '[uː]',
    body: '与 u 同舌位，拖长；ū 也常出现在词根里，如 bhū「存在」。',
    ex: ['dūram', 'bhūḥ'],
  },
  {
    fig: 'mouth-r', title: 'ṛ · 卷舌元音', ipa: '[r̩]',
    body: '舌尖轻卷向硬腭，声带振动，自成音节——不是先读 r 再读 i。汉语没有对应音，可先发「日」的卷舌，再去掉摩擦。',
    ex: ['kṛpā', 'pṛthivī'],
  },
  {
    fig: 'mouth-e', title: 'e · 前中元音', ipa: '[eː]',
    body: '梵语的 e 永远是长音，接近汉语「诶」但更纯，不带滑动。',
    ex: ['eva', 'devaḥ'],
  },
  {
    fig: 'mouth-o', title: 'o · 后中元音', ipa: '[oː]',
    body: '圆唇、舌后缩，永远是长音；o 常由 a + u 连写而来。',
    ex: ['ojas', 'odanam'],
  },
  {
    fig: 'mouth-ai', title: 'ai · 双元音', ipa: '[ai̯]',
    body: '从 a 滑向 i，前重后轻；不要读成汉语「爱」那么开。',
    ex: ['vairam', 'kailāsaḥ'],
  },
  {
    fig: 'mouth-au', title: 'au · 双元音', ipa: '[au̯]',
    body: '从 a 滑向 u，嘴唇逐渐收圆；前重后轻。',
    ex: ['auṣadham', 'gauḥ'],
  },
  {
    fig: 'retroflex', title: 'ṭ ṭh ḍ ḍh ṇ · 卷舌音', ipa: '[ʈ ʈʰ ɖ ɖʰ ɳ]',
    body: '舌尖卷起抵硬腭前部，比汉语「zh/ch/sh」更靠后、更硬。点下划线（ṭ）就是提示你卷舌。',
    ex: ['tiṣṭhati', 'daṇḍaḥ'],
  },
  {
    fig: 'dental', title: 't th d dh n · 齿音', ipa: '[t̪ t̪ʰ d̪ d̪ʰ n̪]',
    body: '舌尖抵上齿背，不要像汉语 t/d 那样抵牙龈。Ṭ 组与 T 组的区别是辨义的。',
    ex: ['tārā', 'nadī'],
  },
  {
    fig: 'aspirate', title: 'kh gh ch jh th dh ph bh · 送气浊音', ipa: '[kʰ ɡʱ …]',
    body: '送气 = 发音时有一股明显气流；浊送气（gh/dh/bh）还要同时振动声带。汉语只有清送气，浊送气需要单独练。',
    ex: ['ghaṭaḥ', 'khādati'],
  },
];

const EXTRA = [
  { fig: 'anusvara', title: 'ṃ · 鼻化', body: '在元音后带鼻音共鸣，像汉语「安」的鼻尾但更短；在 p/b 前实际读 m。', ex: ['saṃskṛtam', 'ahaṃ'] },
  { fig: 'visarga', title: 'ḥ · 气声', body: '词尾的轻呼气，像耳语一个 h；不要读成完整的「喝」。', ex: ['namaḥ', 'rāmaḥ'] },
];

export function renderSounds(ctx) {
  const play = (sa) => ctx.audio.play(sa, { slow: true }).catch(() => {});
  const card = (g) =>
    h(
      'section',
      { class: 'sound-card' },
      h('div', { class: 'sound-fig', html: figure(g.fig) }),
      h('div', { class: 'sound-body' },
        h('div', { class: 'sound-head' },
          h('h2', {}, g.title),
          g.ipa ? h('span', { class: 'sound-ipa' }, g.ipa) : null
        ),
        h('p', {}, g.body),
        h('div', { class: 'sound-ex' },
          (g.ex || []).map((sa) =>
            h('button', { class: 'sound-chip', type: 'button', onclick: () => play(sa) },
              h('span', { class: 'sa' }, sa), icon('volume')
            )
          )
        )
      )
    );

  return h(
    'div',
    { class: 'page sounds' },
    h('header', { class: 'page-head' },
      h('h1', {}, '发音总表'),
      h('p', {}, '梵语只有 26 个拉丁字母，但每个符号都对应固定的口型。点例词听慢速发音；先求「听得出来」，再求「读得像」。')
    ),
    h('div', { class: 'sound-note' },
      h('b', {}, '三个最容易混的点'),
      h('ol', {},
        h('li', {}, '长短音：a/ā、i/ī、u/ū 是不同音位，长短要真的读出来。'),
        h('li', {}, '卷舌与齿音：ṭ/ḍ/ṇ 卷舌，t/d/n 抵齿；写起来只差一个点，听起来差很多。'),
        h('li', {}, '送气：kh/gh/th/dh/ph/bh 有气流；g/j/d/b 没有。浊送气要「带声带振动 + 气流」。')
      )
    ),
    h('div', { class: 'sound-grid' }, GROUPS.map(card)),
    h('h2', { class: 'sound-sub' }, '两个附加符号'),
    h('div', { class: 'sound-grid' }, EXTRA.map(card))
  );
}
