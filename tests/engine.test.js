// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');

// Minimal localStorage so save.js can run under Node.
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } };
require('../js/data.js');
require('../js/battle-engine.js');
require('../js/save.js');
const WT = globalThis.WT;

function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

test('every unit has art-ready data and a valid skill', () => {
  for (const id of WT.UNIT_IDS) {
    const u = WT.UNITS[id];
    assert.ok(WT.RARITIES[u.rarity], `${id} rarity`);
    assert.ok(WT.ROLES[u.role], `${id} role`);
    assert.ok(u.skill.fx.length > 0, `${id} skill effects`);
  }
  for (const r of WT.RARITY_ORDER) assert.ok(WT.UNIT_IDS.some(id => WT.UNITS[id].rarity === r), `a ${r} unit exists`);
});

test('rarity weights add up to 100%', () => {
  const total = WT.RARITY_ORDER.reduce((s, k) => s + WT.RARITIES[k].weight, 0);
  assert.ok(Math.abs(total - 100) < 1e-9, `total ${total}`);
});

test('battles always finish with a winner', () => {
  const rng = seeded(7);
  for (let i = 0; i < 200; i++) {
    const pick = () => WT.UNIT_IDS[Math.floor(rng() * WT.UNIT_IDS.length)];
    const team = () => [pick(), pick(), pick()].map(id => ({ id, level: 1 + Math.floor(rng() * 30), stars: 1 }));
    const b = WT.Battle.simulate(team(), team(), rng);
    assert.ok(b.result === 'win' || b.result === 'lose', `battle ${i} ended: ${b.result} after ${b.turn} turns`);
  }
});

test('taunt forces single-target attacks onto the taunter', () => {
  const b = new WT.Battle([{ id: 'honey_cub', level: 1, stars: 1 }], [{ id: 'mochi_puff', level: 1, stars: 1 }, { id: 'croissant', level: 1, stars: 1 }], seeded(1));
  b.get('enemy0').statuses.taunt = { turns: 2 };
  assert.deepStrictEqual(b.validTargets(b.get('ally0')).map(u => u.uid), ['enemy0']);
});

test('the first stage is winnable with the starter team', () => {
  const starter = WT.save.team.map(id => ({ id, level: 1, stars: 1 }));
  let wins = 0;
  const rng = seeded(42);
  for (let i = 0; i < 100; i++) {
    const enemies = WT.LOCATIONS[0].waves[0].map(id => ({ id, level: WT.stageLevel(0, 0), stars: 1 }));
    if (WT.Battle.simulate(starter, enemies, rng).result === 'win') wins++;
  }
  assert.ok(wins >= 90, `starter won ${wins}/100`);
});

test('pity guarantees a Legendary or better', () => {
  WT.resetSave();
  WT.save.pity = WT.GACHA.pity - 1;
  const [res] = WT.summon(1, () => 0);   // rng 0 would normally roll the rarest… or the first pool entry
  assert.ok(WT.RARITIES[WT.UNITS[res.id].rarity].tier >= 4);
  assert.strictEqual(WT.save.pity, 0);
});

test('a 10-pull always contains an Epic or better', () => {
  const rng = seeded(99);
  for (let i = 0; i < 50; i++) {
    WT.resetSave();
    const res = WT.summon(10, rng);
    assert.ok(res.some(r => WT.RARITIES[WT.UNITS[r.id].rarity].tier >= 3));
  }
});

test('duplicates add stars, then convert to honey at max stars', () => {
  WT.resetSave();
  WT.save.roster.honey_cub.stars = WT.MAX_STARS - 1;
  const always = () => 0.01;   // lands on the first common: honey_cub
  let [r] = WT.summon(1, always);
  assert.strictEqual(r.id, 'honey_cub');
  assert.ok(r.starUp && r.stars === WT.MAX_STARS);
  const before = WT.save.honey;
  [r] = WT.summon(1, always);
  assert.ok(!r.starUp && r.honey > 0 && WT.save.honey === before + r.honey);
});
