import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addScore, cleanName } from './leaderboard.js';

test('ranks by score, then faster time, keeps top 10', () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = addScore(list, { name: 'P' + i, score: i * 100, secs: 300 }).list;
  assert.equal(list.length, 10);
  assert.equal(list[0].name, 'P11');
  const r = addScore(list, { name: 'Fast', score: 1100, secs: 100 });
  assert.equal(r.place, 1);
  assert.equal(addScore(list, { name: 'Low', score: 0, secs: 1 }).place, 0);
});

test('names are cleaned', () => {
  assert.equal(cleanName('  <b>Riya</b>  '), 'bRiyab');
  assert.equal(cleanName(''), 'Explorer');
  assert.equal(cleanName('A'.repeat(50)).length, 20);
});
