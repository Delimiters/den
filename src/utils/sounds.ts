let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function playNote(
  ac: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainPeak = 0.22,
  type: OscillatorType = "sine"
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Two-note ascending chime — played when you or someone else joins the channel. */
export function playJoinSound() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  playNote(ac, 659.25, t, 0.14);       // E5
  playNote(ac, 880.0,  t + 0.1, 0.18); // A5
}

/** Three-note rising sparkle — played when you or someone else starts screen sharing. */
export function playScreenShareSound() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  playNote(ac, 523.25, t,        0.09, 0.18); // C5
  playNote(ac, 659.25, t + 0.08, 0.09, 0.18); // E5
  playNote(ac, 783.99, t + 0.16, 0.16, 0.22); // G5
}
