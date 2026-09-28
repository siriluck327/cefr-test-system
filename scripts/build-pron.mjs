// Regenerate data/pron.tsv (IPA + Thai reading for every word used in the app).
//
//   curl -LO https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
//   node scripts/build-pron.mjs cmudict.dict
//
// Run it again after editing data/words.tsv or data/sentences.tsv.
import { readFileSync, writeFileSync } from 'node:fs';
import { spellingVariants, stressIndex, syllabify, toIPA, toThai } from './pron-core.mjs';

/** Words the dictionary lacks under any spelling variant, spelled out by hand in ARPAbet. */
const MANUAL = {
  maths: 'M AE1 TH S',
};

const dictPath = process.argv[2];
if (!dictPath) {
  console.error('usage: node scripts/build-pron.mjs path/to/cmudict.dict');
  process.exit(1);
}

const dict = new Map();
for (const line of readFileSync(dictPath, 'utf8').split('\n')) {
  const m = /^(\S+?)(?:\(\d+\))?\s+([A-Z0-9 ]+?)\s*(?:#.*)?$/.exec(line);
  // Keep the first (most common) pronunciation of each word.
  if (m && !dict.has(m[1])) dict.set(m[1], m[2]);
}

const read = (f) => readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8').split(/\r?\n/).slice(1).filter(Boolean);
const tokens = new Set();
const addTokens = (text) => {
  for (const raw of text.replace(/\(.*?\)/g, ' ').split(/[\s,/?!.;:"-]+/)) {
    const t = raw.toLowerCase().replace(/’/g, "'").replace(/^'+|'+$/g, '');
    if (/[a-z]/.test(t)) tokens.add(t);
  }
};
for (const line of read('words.tsv')) addTokens(line.split('\t')[1]);
for (const line of read('sentences.tsv')) addTokens(line.split('\t')[2]);

const rows = [];
const missing = [];
for (const t of [...tokens].sort()) {
  let arpa = MANUAL[t] ?? dict.get(t);
  if (!arpa) for (const v of spellingVariants(t)) if ((arpa = dict.get(v))) break;
  if (!arpa) {
    missing.push(t);
    continue;
  }
  const syls = syllabify(arpa);
  rows.push([t, toIPA(syls), toThai(syls).join('-'), stressIndex(syls), arpa.replace(/\d/g, '')].join('\t'));
}

if (missing.length) {
  console.error(`No pronunciation for ${missing.length} word(s): ${missing.join(', ')}\nAdd them to MANUAL in this script.`);
  process.exit(1);
}
writeFileSync(new URL('../data/pron.tsv', import.meta.url), ['word\tipa\tthai\tstress\tarpabet', ...rows].join('\n') + '\n');
console.log(`wrote ${rows.length} pronunciations`);
