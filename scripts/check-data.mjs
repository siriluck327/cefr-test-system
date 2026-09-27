// Validate data/words.tsv after editing: node scripts/check-data.mjs
import { readFileSync } from 'node:fs';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const lines = readFileSync(new URL('../data/words.tsv', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean);
const errors = [];
const seen = new Set();
const perLevel = Object.fromEntries(LEVELS.map((l) => [l, 0]));

lines.slice(1).forEach((line, i) => {
  const n = i + 2;
  const cols = line.split('\t');
  if (cols.length !== 4) return errors.push(`line ${n}: expected 4 tab-separated columns, got ${cols.length}`);
  const [level, word, , thai] = cols;
  if (!LEVELS.includes(level)) errors.push(`line ${n}: unknown level "${level}"`);
  if (!word.trim()) errors.push(`line ${n}: empty word`);
  if (!/[฀-๿]/.test(thai)) errors.push(`line ${n}: Thai meaning missing for "${word}"`);
  const id = `${level}:${word}`;
  if (seen.has(id)) errors.push(`line ${n}: duplicate "${word}" in ${level}`);
  seen.add(id);
  perLevel[level] = (perLevel[level] ?? 0) + 1;
});

console.log(`${lines.length - 1} words`, perLevel);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// Sentences: level, tense, English, Thai.
const TENSES = [
  'present-simple', 'present-continuous', 'present-perfect', 'present-perfect-continuous',
  'past-simple', 'past-continuous', 'past-perfect', 'past-perfect-continuous',
  'future-simple', 'future-continuous', 'future-perfect', 'future-perfect-continuous',
];
const sentences = readFileSync(new URL('../data/sentences.tsv', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).slice(1);
const sErrors = [];
sentences.forEach((line, i) => {
  const cols = line.split('\t');
  if (cols.length !== 4) return sErrors.push(`sentences line ${i + 2}: expected 4 columns, got ${cols.length}`);
  const [level, tense, en, thai] = cols;
  if (!LEVELS.includes(level)) sErrors.push(`sentences line ${i + 2}: unknown level "${level}"`);
  if (!TENSES.includes(tense)) sErrors.push(`sentences line ${i + 2}: unknown tense "${tense}"`);
  if (/\d/.test(en)) sErrors.push(`sentences line ${i + 2}: write numbers as words so reading can be graded`);
  if (!/[฀-๿]/.test(thai)) sErrors.push(`sentences line ${i + 2}: Thai translation missing`);
});
console.log(`${sentences.length} sentences`);

// Every word used for practice needs a pronunciation (run build-pron.mjs after editing).
const pron = new Set(readFileSync(new URL('../data/pron.tsv', import.meta.url), 'utf8').split(/\r?\n/).slice(1).map((l) => l.split('\t')[0]));
const missing = new Set();
const need = (text) => {
  for (const raw of text.replace(/\(.*?\)/g, ' ').split(/[\s,/?!.;:"-]+/)) {
    const t = raw.toLowerCase().replace(/’/g, "'").replace(/^'+|'+$/g, '');
    if (/[a-z]/.test(t) && !pron.has(t)) missing.add(t);
  }
};
lines.slice(1).forEach((l) => need(l.split('\t')[1] ?? ''));
sentences.forEach((l) => need(l.split('\t')[2] ?? ''));
if (missing.size) sErrors.push(`no pronunciation for: ${[...missing].join(', ')} (run scripts/build-pron.mjs)`);

if (sErrors.length) {
  console.error(sErrors.join('\n'));
  process.exit(1);
}
