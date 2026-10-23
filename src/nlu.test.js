import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, extractName, extractCount, findPlanet, resolveTarget } from './nlu.js';

const kelly = { name: 'Kelly', colorName: 'red', size: 1.6 };
const bob = { name: 'Rocky Road', colorName: 'blue', size: 0.9 };
const L = (level, planets = [], lastPlanet = null) => ({ level, planets, lastPlanet });

test('level 1 commands', () => {
  assert.equal(parse('blast off the rocket', L(1)).intent, 'rocket');
  assert.equal(parse('make it rain', L(1)).intent, 'rain');
  assert.equal(parse('stop the rain', L(1)).intent, 'rainOff');
  assert.equal(parse('make it night', L(1)).intent, 'night');
  assert.equal(parse('Make it day!', L(1)).intent, 'day');
  assert.equal(parse("let's celebrate", L(1)).intent, 'fireworks');
});

test('create planet with name, colour and size', () => {
  const p = parse('create a big red planet named Kelly', L(2));
  assert.deepEqual([p.intent, p.name, p.color, p.size], ['createPlanet', 'Kelly', 'red', 'big']);
  assert.equal(parse('make a huge pink planet called Bob', L(2)).name, 'Bob');
  assert.equal(parse('create a planet', L(2)).name, null);
});

test('name extraction edge cases', () => {
  assert.equal(extractName('named Rocky Road please'), 'Rocky Road');
  assert.equal(extractName('a planet called <script>'), 'Script');
  assert.equal(extractName('nothing here'), null);
  assert.equal(extractName(undefined), null);
});

test('modify existing planets (fuzzy + "it")', () => {
  const p = parse('make kelley bigger', L(2, [kelly]));
  assert.deepEqual([p.intent, p.target.name, p.grow], ['modify', 'Kelly', 'bigger']);
  const q = parse('turn it green', L(2, [kelly], kelly));
  assert.deepEqual([q.intent, q.color], ['modify', 'green']);
});

test('destroy and moon resolve targets', () => {
  const ctx = L(2, [kelly, bob]);
  assert.equal(parse('destroy a planet', ctx).target, null);
  assert.equal(parse('destroy Kelly', ctx).target, kelly);
  assert.equal(resolveTarget('the red one', ctx), kelly);
  assert.equal(resolveTarget('rocky', ctx), bob);
  assert.equal(resolveTarget('all of them', ctx), 'all');
  assert.equal(parse('add a moon', ctx).intent, 'moon');
  assert.equal(parse('give Kelly a moon', ctx).target, kelly);
  assert.equal(findPlanet('planet', [{ name: 'Planck' }]), null); // common words never fuzzy-match
});

test('spaceships and counts', () => {
  const s = parse('launch spaceships', L(3));
  assert.deepEqual([s.intent, s.count, s.plural], ['ships', null, true]);
  assert.equal(parse('launch 3 spaceships', L(3)).count, 3);
  assert.equal(parse('send five ships', L(3)).count, 5);
  assert.equal(parse('launch a spaceship', L(3)).count, 1);
  assert.equal(extractCount('five'), 5);
  assert.equal(extractCount('I want 12'), 12);
  assert.equal(parse('launch rockets', L(3)).intent, 'ships');
  assert.equal(extractCount('twenty'), 20);
  assert.equal(parse('launch a hundred spaceships', L(3)).count, 100);
  assert.equal(parse('destroy rocky', L(3, [])).intent, 'destroy'); // nothing alive -> NOVA explains
  assert.equal(parse('remove the rain', L(1)).intent, 'rainOff');
});

test('travel between worlds', () => {
  assert.deepEqual([parse('take me to underwater base', L(2)).intent, parse('take me to underwater base', L(2)).world], ['travel', 'ocean']);
  assert.equal(parse('go to cyberpunk bengaluru', L(1)).world, 'cyber');
  assert.equal(parse('switch to the smart city', L(3)).world, 'smart');
  assert.equal(parse('take us to another world', L(1)).world, null);
  assert.equal(parse('take us to another world', L(1)).intent, 'travel');
  assert.equal(parse('go through the portal', L(3)).intent, 'travel');
  assert.equal(parse('open the portal', L(3)).intent, 'portal');
  assert.equal(parse('create a new world', L(2)).intent, 'createPlanet');
});

test('new powers', () => {
  const t = s => parse(s, L(1)).intent;
  assert.equal(t('make it snow'), 'snow');
  assert.equal(t('strike lightning'), 'lightning');
  assert.equal(t('show me a rainbow'), 'rainbow');
  assert.equal(t('make it rain'), 'rain');
  assert.equal(t('meteor shower'), 'meteors');
  assert.equal(t('show the northern lights'), 'aurora');
  assert.equal(t('summon a ufo'), 'ufo');
  assert.equal(t('earthquake'), 'earthquake');
  assert.equal(t("let's dance"), 'disco');
  assert.deepEqual([t('zoom out'), parse('zoom out', L(1)).dir], ['zoom', 'out']);
  assert.equal(parse('come closer', L(1)).dir, 'in');
  assert.equal(t('spin around'), 'spin');
  assert.equal(t('take a photo'), 'photo');
  assert.equal(t('turn it green'), 'unknown');
  assert.equal(parse('Red planet!', L(1)).color, 'red'); // speed challenge short forms
  assert.equal(parse('3 spaceships!', L(3)).count, 3);
});

test('level 3 + misc', () => {
  assert.equal(parse('open the portal', L(3)).intent, 'portal');
  assert.equal(parse('close the portal', L(3)).intent, 'portalClose');
  assert.equal(parse('create a black hole', L(3)).intent, 'blackhole');
  assert.equal(parse('warp speed', L(3)).intent, 'warp');
  assert.equal(parse('what can I say', L(1)).intent, 'help');
  assert.equal(parse('banana', L(1)).intent, 'unknown');
  assert.equal(parse('', L(1)).intent, 'unknown');
  assert.equal(parse(null, L(1)).intent, 'unknown');
  assert.equal(parse('x'.repeat(5000), L(1)).intent, 'unknown');
});
