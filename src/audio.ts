// PC-speaker style sounds: square-wave beeps through Web Audio. iOS needs the context (re)started from a
// user gesture and the 'playback' audio session so the silent switch doesn't mute it.

let ctx: AudioContext | null = null;
export let soundOn = true;

export function setSound(on: boolean): void {
  soundOn = on;
}

export function unlockAudio(): void {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
    ctx ??= new AudioContext();
    if (ctx.state !== 'running') void ctx.resume();
  } catch {
    ctx = null;
  }
}

for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlockAudio, { passive: true });

/** Plays tones back to back: [frequency Hz (0 = rest), duration ms]. */
export function beep(notes: ReadonlyArray<readonly [number, number]>): void {
  if (!soundOn || !ctx || ctx.state !== 'running') return;
  let t = ctx.currentTime + 0.005;
  for (const [f, ms] of notes) {
    const d = ms / 1000;
    if (f > 0) {
      const o = ctx.createOscillator();
      const v = ctx.createGain();
      o.type = 'square';
      o.frequency.value = f;
      v.gain.setValueAtTime(0.06, t);
      v.gain.setValueAtTime(0, t + d);
      o.connect(v).connect(ctx.destination);
      o.start(t);
      o.stop(t + d + 0.01);
    }
    t += d;
  }
}

export const sfx = {
  bounce: () => beep([[220, 12]]),
  step: () => beep([[880, 8]]),
  cantMove: () => beep([[220, 200]]), // the original: Sound(220) for 200 ms
  appear: () => beep([[660, 15], [990, 15]]),
  vanish: () => beep([[1320, 25], [1760, 25], [2093, 25], [2637, 40]]),
  gameOver: () => beep([[392, 160], [330, 160], [262, 320]]),
  record: () => beep([[523, 120], [659, 120], [784, 120], [1047, 300]]),
};
