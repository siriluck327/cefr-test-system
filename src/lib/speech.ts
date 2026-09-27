let voice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'en-US' && /google|natural|samantha/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string) {
  if (!canSpeak) return;
  if (voice === undefined || voice === null) voice = pickVoice();
  const synth = window.speechSynthesis;
  synth.cancel();
  // "a, an" -> say both forms; drop bracketed notes.
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, '').replace(/,/g, ' ,'));
  u.lang = 'en-US';
  u.rate = 0.9;
  if (voice) u.voice = voice;
  synth.speak(u);
}
