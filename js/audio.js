// 语音：优先播放预生成 m4a，缺失时回退到浏览器语音合成。
// 支持整句、慢速、逐词连播。
export class AudioBank {
  constructor(manifest, getSettings) {
    this.items = manifest.items || {};
    this.getSettings = getSettings;
    this.current = null;
    this.voice = null;
    this.pickVoice();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener?.('voiceschanged', () => this.pickVoice());
    }
  }

  pickVoice() {
    if (typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    this.voice =
      voices.find((v) => /^sa([-_]|$)/i.test(v.lang)) ||
      voices.find((v) => /hi[-_]IN/i.test(v.lang) && /lekha/i.test(v.name)) ||
      voices.find((v) => /hi[-_]IN/i.test(v.lang)) ||
      null;
  }

  rate(slow) {
    const base = this.getSettings().rate ?? 0.8;
    return Math.max(0.4, Math.min(1.3, base * (slow ? 0.72 : 1)));
  }

  has(text) {
    return !!this.items[text]?.generated;
  }

  url(text) {
    const it = this.items[text];
    if (!it) return null;
    const u = new URL(it.file, document.baseURI);
    // 音轨重生成后文件名（内容哈希）不变，必须带版本参数，否则浏览器会一直用缓存里的旧音。
    // 末尾的 r2 是一次显式刷新：Safari 曾把旧响应连同 200 一起缓存，换参数才会重新请求。
    const v = `${it.bytes || it.hash || '1'}-r2`;
    u.searchParams.set('v', v);
    return u.href;
  }

  stop() {
    if (this.current) {
      try {
        this.current.pause();
      } catch {}
      this.current = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** 播放一段文本；返回 Promise，播放结束/失败时 resolve */
  play(text, { slow = false } = {}) {
    this.stop();
    const t = String(text || '').trim();
    if (!t) return Promise.resolve(false);
    if (/[\u4e00-\u9fff]/.test(t) && !this.has(t)) return Promise.resolve(false);
    const url = this.url(t);
    if (url && this.has(t)) {
      return new Promise((resolve) => {
        const a = new Audio(url);
        this.current = a;
        a.playbackRate = this.rate(slow);
        a.preservesPitch = true;
        a.onended = () => resolve(true);
        a.onerror = () => {
          this.speak(t, slow).then(resolve);
        };
        a.play().catch(() => {
          this.speak(t, slow).then(resolve);
        });
      });
    }
    return this.speak(t, slow);
  }

  speak(text, slow = false) {
    if (typeof speechSynthesis === 'undefined') return Promise.resolve(false);
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.voice?.lang || 'hi-IN';
      if (this.voice) u.voice = this.voice;
      u.rate = slow ? 0.55 : 0.7;
      u.pitch = 1;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
    });
  }

  /** 逐词朗读整句，每词之间停顿，适合跟读 */
  async sequence(text, { slow = true, gap = 420 } = {}) {
    const words = String(text)
      .replace(/[|]/g, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/[.,!?;:"'’“”()[\]]/g, ''))
      .filter(Boolean);
    for (const w of words) {
      await this.play(w, { slow });
      await sleep(gap);
    }
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
