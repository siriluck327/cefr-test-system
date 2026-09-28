// Turns CMU Pronouncing Dictionary entries (ARPAbet) into IPA and an
// approximate Thai reading, split into syllables with the stressed one marked.
// Used by build-pron.mjs; kept separate so tests can exercise it directly.

const VOWELS = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);
/** Short (lax) vowels cannot end a stressed syllable, so they keep one consonant: hap.py, not ha.ppy. */
const LAX = new Set(['AE', 'EH', 'IH', 'AH', 'UH']);

const ONSETS = new Set(
  [
    'B', 'CH', 'D', 'DH', 'F', 'G', 'HH', 'JH', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'SH', 'T', 'TH', 'V', 'W', 'Y', 'Z', 'ZH',
    'P R', 'P L', 'B R', 'B L', 'T R', 'D R', 'K R', 'K L', 'G R', 'G L', 'F R', 'F L', 'TH R', 'SH R',
    'S P', 'S T', 'S K', 'S M', 'S N', 'S L', 'S W', 'S F',
    'T W', 'D W', 'K W', 'G W', 'TH W',
    'P Y', 'B Y', 'F Y', 'V Y', 'M Y', 'K Y', 'G Y', 'HH Y', 'N Y',
    'S P R', 'S P L', 'S T R', 'S K R', 'S K W', 'S K Y', 'S P Y',
  ],
);

/** "AE1 P AH0 L" -> [{ onset: [], vowel: 'AE', stress: 1, coda: ['P'] }, { onset: [], vowel: 'AH', stress: 0, coda: ['L'] }] */
export function syllabify(arpabet) {
  const phones = arpabet.trim().split(/\s+/).map((p) => {
    const m = /^([A-Z]+)([012])?$/.exec(p);
    if (!m) throw new Error(`bad phone "${p}"`);
    return { p: m[1], stress: m[2] === undefined ? -1 : Number(m[2]) };
  });
  const vIdx = phones.map((ph, i) => (VOWELS.has(ph.p) ? i : -1)).filter((i) => i >= 0);
  if (vIdx.length === 0) return [{ onset: phones.map((x) => x.p), vowel: null, stress: 0, coda: [] }];

  const syls = vIdx.map((i) => ({ onset: [], vowel: phones[i].p, stress: phones[i].stress, coda: [] }));
  syls[0].onset = phones.slice(0, vIdx[0]).map((x) => x.p);
  syls[syls.length - 1].coda = phones.slice(vIdx[vIdx.length - 1] + 1).map((x) => x.p);

  for (let k = 0; k < vIdx.length - 1; k++) {
    const cons = phones.slice(vIdx[k] + 1, vIdx[k + 1]).map((x) => x.p);
    let split = cons.length; // index where the next onset starts
    for (let s = 0; s <= cons.length; s++) {
      const onset = cons.slice(s);
      if (onset.length === 0 || ONSETS.has(onset.join(' '))) {
        split = s;
        break;
      }
    }
    const prev = syls[k];
    if (split === 0 && cons.length > 0 && LAX.has(prev.vowel) && prev.stress > 0) {
      split = 1;
      // Thai spelling doubles this consonant: แอป-เพิล, not แอป-เอิล.
      syls[k + 1].shared = cons[0];
    }
    prev.coda = cons.slice(0, split);
    syls[k + 1].onset = cons.slice(split);
  }
  // CMU often gives a final unstressed -y secondary stress (library ...R IY2); read it as weak.
  const last = syls[syls.length - 1];
  if (syls.length > 1 && last.vowel === 'IY' && last.stress === 2 && last.coda.length === 0) last.stress = 0;
  return syls;
}

const IPA_C = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ',
  P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

function ipaVowel(v, stress) {
  switch (v) {
    case 'AA': return 'ɑː';
    case 'AE': return 'æ';
    case 'AH': return stress > 0 ? 'ʌ' : 'ə';
    case 'AO': return 'ɔː';
    case 'AW': return 'aʊ';
    case 'AY': return 'aɪ';
    case 'EH': return 'e';
    case 'ER': return stress > 0 ? 'ɝː' : 'ɚ';
    case 'EY': return 'eɪ';
    case 'IH': return 'ɪ';
    case 'IY': return stress > 0 ? 'iː' : 'i';
    case 'OW': return 'oʊ';
    case 'OY': return 'ɔɪ';
    case 'UH': return 'ʊ';
    case 'UW': return stress > 0 ? 'uː' : 'u';
    default: return '';
  }
}

/** IPA with syllable dots and stress marks, Cambridge-dictionary style: ˌɑː.pɚˈtuː.nə.t̬i -> ˌɑː.pɚˈtuː.nə.ti */
export function toIPA(syls) {
  return syls
    .map((s, i) => {
      const body = [...s.onset.map((c) => IPA_C[c]), s.vowel ? ipaVowel(s.vowel, s.stress) : '', ...s.coda.map((c) => IPA_C[c])].join('');
      const mark = syls.length > 1 && s.stress === 1 ? 'ˈ' : syls.length > 1 && s.stress === 2 ? 'ˌ' : i === 0 ? '' : '.';
      return mark + body;
    })
    .join('');
}

const TH_INITIAL = {
  B: 'บ', CH: 'ช', D: 'ด', DH: 'ธ', F: 'ฟ', G: 'ก', HH: 'ฮ', JH: 'จ', K: 'ค', L: 'ล', M: 'ม', N: 'น', NG: 'ง',
  P: 'พ', R: 'ร', S: 'ซ', SH: 'ช', T: 'ท', TH: 'ธ', V: 'ว', W: 'ว', Y: 'ย', Z: 'ซ', ZH: 'ช',
};
/** After "s" English p/t/k are unaspirated, which Thai spells ป/ต/ก (สปา, สตาร์, สกูล). */
const TH_AFTER_S = { P: 'ป', T: 'ต', K: 'ก' };
const TH_FINAL = {
  B: 'บ', CH: 'ช', D: 'ด', DH: 'ธ', F: 'ฟ', G: 'ก', JH: 'จ', K: 'ค', L: 'ล', M: 'ม', N: 'น', NG: 'ง',
  P: 'ป', R: 'ร', S: 'ส', SH: 'ช', T: 'ท', TH: 'ธ', V: 'ฟ', Z: 'ซ', ZH: 'ช', HH: '',
};
const KARAN = '์'; // ์ marks a written consonant as a foreign final sound

function thaiOnset(onset) {
  let yGlide = false;
  let lead = '';
  const parts = [];
  onset.forEach((c, i) => {
    if (c === 'Y' && i > 0) {
      yGlide = true;
      return;
    }
    // An s-cluster reads as a half syllable ส + the rest, and Thai puts the
    // vowel sign after the ส: สเปน, สโนว์ (not เสปน).
    if (i === 0 && c === 'S' && onset.length > 1) lead = 'ส';
    else if (i > 0 && onset[0] === 'S' && TH_AFTER_S[c]) parts.push(TH_AFTER_S[c]);
    else parts.push(TH_INITIAL[c]);
  });
  return { lead, c: parts.join('') || 'อ', empty: parts.length === 0 && !lead, yGlide };
}

function thaiSyllable(s, dropR) {
  if (!s.vowel) return s.onset.map((c) => TH_INITIAL[c]).join('') + KARAN;
  const { lead, c, empty, yGlide } = thaiOnset(s.onset.length === 0 && s.shared ? [s.shared] : s.onset);
  return lead + thaiBody(s, c, empty, yGlide, dropR);
}

function thaiBody(s, c, empty, yGlide, dropR) {
  // An r shared with the next syllable is written once, at the start of that syllable: เว-รี (very).
  const coda = dropR && s.coda.length === 1 && s.coda[0] === 'R' ? [] : s.coda.slice();
  const glideVowel = ['AW', 'AY', 'OY'].includes(s.vowel);
  const finals = (list, allKaran) =>
    list
      .map((x, i) => {
        const t = TH_FINAL[x];
        if (!t) return '';
        return t + (allKaran || i > 0 || x === 'R' ? KARAN : '');
      })
      .join('');
  const closed = coda.length > 0;
  const rFirst = coda[0] === 'R';

  switch (s.vowel) {
    case 'AA':
      return c + 'า' + finals(coda);
    case 'AE':
      return 'แ' + c + finals(coda);
    case 'AH':
      if (s.stress > 0) return closed ? c + 'ั' + finals(coda) : c + 'ะ';
      if (!closed) return empty ? 'อะ' : 'เ' + c + 'อะ';
      return 'เ' + c + 'ิ' + finals(coda);
    case 'AO':
      return c + 'อ' + finals(coda);
    case 'AW':
      return 'เ' + c + 'า' + finals(coda, true);
    case 'AY':
      return 'ไ' + c + finals(coda, true);
    case 'EH':
      if (rFirst) return 'แ' + c + finals(coda);
      return closed ? 'เ' + c + '็' + finals(coda) : 'เ' + c;
    case 'ER':
      return closed ? 'เ' + c + 'ิร' + KARAN + finals(coda) : 'เ' + c + 'อร' + KARAN;
    case 'EY':
      return 'เ' + c + finals(coda);
    case 'IH':
      if (rFirst) return 'เ' + c + 'ีย' + finals(coda);
      return c + 'ิ' + finals(coda);
    case 'IY':
      if (rFirst) return 'เ' + c + 'ีย' + finals(coda);
      return c + 'ี' + finals(coda);
    case 'OW':
      return 'โ' + c + finals(coda);
    case 'OY':
      return c + 'อย' + finals(coda, true);
    case 'UH':
      if (rFirst) return c + 'ัว' + finals(coda);
      if (yGlide) return c + 'ิว' + finals(coda, true);
      return c + 'ุ' + finals(coda);
    case 'UW':
      if (rFirst) return c + 'ัว' + finals(coda);
      if (yGlide) return c + 'ิว' + finals(coda, true);
      return c + 'ู' + finals(coda);
    default:
      return c;
  }
}

/** Approximate Thai reading, one entry per syllable. */
export function toThai(syls) {
  return syls.map((s, i) => thaiSyllable(s, syls[i + 1]?.shared === 'R'));
}

/** Index of the primary-stressed syllable (0 when the word has one syllable or no stress mark). */
export function stressIndex(syls) {
  const i = syls.findIndex((s) => s.stress === 1);
  return i < 0 ? 0 : i;
}

/** Spelling variants to try when a (mostly British) spelling is missing from the US-based dictionary. */
export function spellingVariants(word) {
  const out = new Set();
  const rules = [
    [/our(s?)$/, 'or$1'],
    [/our(\w)/, 'or$1'],
    [/is(e|ed|es|ing|ation|ations)$/, 'iz$1'],
    [/ys(e|ed|es|ing)$/, 'yz$1'],
    [/tre(s?)$/, 'ter$1'],
    [/ence$/, 'ense'],
    [/ll(ed|ing|er|ers|or|ors)$/, 'l$1'],
    [/l$/, 'll'],
    [/ae/, 'e'],
    [/ogue$/, 'og'],
    [/^sc/, 'sk'],
    [/ellery$/, 'elry'],
  ];
  for (const [re, rep] of rules) {
    if (re.test(word)) out.add(word.replace(re, rep));
  }
  return [...out];
}
