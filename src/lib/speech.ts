export type Accent = 'en-US' | 'en-GB';

const cache: Partial<Record<Accent, SpeechSynthesisVoice | null>> = {};

function pickVoice(lang: Accent): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.replace('_', '-') === lang && /google|natural|samantha|daniel|serena/i.test(v.name)) ??
    voices.find((v) => v.lang.replace('_', '-') === lang) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

let accent: Accent = 'en-US';
/** Voice used by every speak() call; follows the learner's setting. */
export function setAccent(a: Accent) {
  accent = a;
}

export function speak(text: string, rate = 0.9, onEnd?: () => void) {
  if (!canSpeak) return;
  if (!cache[accent]) cache[accent] = pickVoice(accent);
  const synth = window.speechSynthesis;
  synth.cancel();
  // "a, an" -> say both forms; drop bracketed notes.
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, '').replace(/,/g, ' ,'));
  u.lang = accent;
  u.rate = rate;
  const v = cache[accent];
  if (v) u.voice = v;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}
