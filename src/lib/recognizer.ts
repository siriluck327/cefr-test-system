// Thin wrapper over the Web Speech API's SpeechRecognition (Chrome, Edge,
// Safari 14.5+; not Firefox). Types are declared here because lib.dom omits them.

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionEvent {
  results: ArrayLike<ArrayLike<RecognitionAlternative>>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canRecognize = !!ctor();

export interface ListenHandlers {
  onResult: (alternatives: string[]) => void;
  /** `denied` when the microphone is blocked, `nothing` when no speech was heard. */
  onError: (reason: 'denied' | 'nothing' | 'failed') => void;
  onEnd: () => void;
}

/** Listen for one utterance. Returns a function that stops listening. */
export function listen(lang: string, h: ListenHandlers): () => void {
  const Ctor = ctor();
  if (!Ctor) {
    h.onError('failed');
    h.onEnd();
    return () => {};
  }
  const r = new Ctor();
  r.lang = lang;
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 5;
  let got = false;
  r.onresult = (e) => {
    got = true;
    const first = e.results[0];
    const alts: string[] = [];
    for (let i = 0; i < first.length; i++) alts.push(first[i].transcript);
    h.onResult(alts);
  };
  r.onerror = (e) => {
    got = true;
    h.onError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'nothing' : 'failed');
  };
  r.onend = () => {
    if (!got) h.onError('nothing');
    h.onEnd();
  };
  try {
    r.start();
  } catch {
    h.onError('failed');
    h.onEnd();
  }
  return () => {
    try {
      r.stop();
    } catch {
      // already stopped
    }
  };
}
