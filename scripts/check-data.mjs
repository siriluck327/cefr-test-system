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
