/* ================================================================
 *  Winnie's Town — save data
 *  Persisted to localStorage (wrapped so private mode never crashes).
 * ================================================================ */
globalThis.WT = globalThis.WT || {};

(function (WT) {
  const KEY = 'winnies-town-save';
  const VERSION = 1;

  function freshSave() {
    const now = Date.now();
    return {
      v: VERSION,
      honey: 500,
      heartstones: 600,
      roster: {
        honey_cub:  { level: 1, stars: 1, xp: 0 },
        croissant:  { level: 1, stars: 1, xp: 0 },
        mochi_puff: { level: 1, stars: 1, xp: 0 },
      },
      team: ['honey_cub', 'croissant', 'mochi_puff'],
      progress: {},            // 'locId:wave' -> best stars (1..3)
      pity: 0,                 // pulls since last Legendary+
      totalPulls: 0,
      decorOwned: { tea: 1, plantpot: 1 },
      // free placement: positions are in café-art pixels (1500×1000); f = flipped
      decorPlaced: [{ k: 'tea', x: 560, y: 512, f: 0 }, { k: 'plantpot', x: 1300, y: 830, f: 0 }],
      theme: 'classic',
      themesOwned: { classic: 1 },
      cafeLevelClaimed: 1,
      lastCollect: now,
      lastDaily: 0,
      settings: { sound: true, music: true },
      flags: {},               // tutorial / first-time hints already shown
      stats: { battles: 0, wins: 0 },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return freshSave();
      const data = JSON.parse(raw);
      // Older saves stored decor per fixed spot; convert to free placement.
      if (data.decorPlaced && !Array.isArray(data.decorPlaced)) {
        data.decorPlaced = Object.entries(data.decorPlaced)
          .map(([spot, k]) => { const sp = WT.DECOR_SPOTS.find(d => d.id === spot); return sp && WT.DECOR[k] ? { k, x: sp.x, y: sp.slot === 'floor' ? 830 : sp.y, f: 0 } : null; })
          .filter(Boolean);
      }
      // Fill any fields added after this save was written.
      return Object.assign(freshSave(), data, { v: VERSION });
    } catch (e) {
      return freshSave();
    }
  }

  WT.save = load();

  WT.persist = function () {
    try { localStorage.setItem(KEY, JSON.stringify(WT.save)); } catch (e) { /* storage unavailable */ }
  };

  WT.resetSave = function () {
    WT.save = freshSave();
    WT.persist();
  };

  // ── helpers used across scenes ─────────────────────────────────
  WT.owned = id => !!WT.save.roster[id];

  WT.unitPower = function (id) {
    const r = WT.save.roster[id];
    return r ? WT.powerOf(id, r.level, r.stars) : 0;
  };

  WT.teamPower = function () {
    return WT.save.team.filter(Boolean).reduce((s, id) => s + WT.unitPower(id), 0);
  };

  WT.totalStars = function () {
    return Object.values(WT.save.progress).reduce((s, n) => s + n, 0);
  };

  WT.stageStarsEarned = (locId, wave) => WT.save.progress[locId + ':' + wave] || 0;

  /** A location is open when the previous location's final battle is cleared. */
  WT.locationUnlocked = function (idx) {
    if (idx === 0) return true;
    const prev = WT.LOCATIONS[idx - 1];
    return WT.stageStarsEarned(prev.id, 2) > 0;
  };

  WT.waveUnlocked = function (idx, wave) {
    if (!WT.locationUnlocked(idx)) return false;
    return wave === 0 || WT.stageStarsEarned(WT.LOCATIONS[idx].id, wave - 1) > 0;
  };

  WT.cafeCharm = function () {
    const decor = WT.save.decorPlaced.reduce((s, d) => s + (WT.DECOR[d.k] ? WT.DECOR[d.k].charm : 0), 0);
    const theme = WT.THEMES[WT.save.theme] ? WT.THEMES[WT.save.theme].charm : 0;
    return decor + theme;
  };

  WT.cafeLevel = () => WT.cafeLevelFor(WT.cafeCharm());

  /** Copies of a decor piece still in storage (owned minus placed). */
  WT.decorInStorage = k => (WT.save.decorOwned[k] || 0) - WT.save.decorPlaced.filter(d => d.k === k).length;

  /** Pay out any café levels reached since last time. Returns [{ level, heartstones }]. */
  WT.claimCafeLevels = function () {
    const out = [];
    const lvl = WT.cafeLevel();
    while (WT.save.cafeLevelClaimed < lvl) {
      WT.save.cafeLevelClaimed++;
      const gems = WT.cafeLevelReward(WT.save.cafeLevelClaimed);
      WT.save.heartstones += gems;
      out.push({ level: WT.save.cafeLevelClaimed, heartstones: gems });
    }
    if (out.length) WT.persist();
    return out;
  };

  /** Honey waiting in the tip jar. */
  WT.pendingIncome = function () {
    const mins = Math.min(WT.INCOME_CAP_MIN, (Date.now() - WT.save.lastCollect) / 60000);
    return Math.floor(mins * WT.incomePerMin(WT.cafeCharm()));
  };

  WT.collectIncome = function () {
    const amt = WT.pendingIncome();
    WT.save.honey += amt;
    WT.save.lastCollect = Date.now();
    WT.persist();
    return amt;
  };

  WT.dailyAvailable = function () {
    const last = new Date(WT.save.lastDaily);
    const now = new Date();
    return last.toDateString() !== now.toDateString();
  };

  WT.claimDaily = function () {
    if (!WT.dailyAvailable()) return null;
    WT.save.lastDaily = Date.now();
    WT.save.heartstones += WT.DAILY_GIFT.heartstones;
    WT.save.honey += WT.DAILY_GIFT.honey;
    WT.persist();
    return WT.DAILY_GIFT;
  };

  /** Add XP to a roster unit; returns number of levels gained. */
  WT.giveXp = function (id, xp) {
    const r = WT.save.roster[id];
    if (!r) return 0;
    let gained = 0;
    r.xp += xp;
    while (r.level < WT.MAX_LEVEL && r.xp >= WT.xpToNext(r.level)) {
      r.xp -= WT.xpToNext(r.level);
      r.level++;
      gained++;
    }
    if (r.level >= WT.MAX_LEVEL) r.xp = 0;
    return gained;
  };

  /** Spend honey to raise a unit one level. */
  WT.buyLevel = function (id) {
    const r = WT.save.roster[id];
    if (!r || r.level >= WT.MAX_LEVEL) return false;
    const cost = WT.treatCost(r.level);
    if (WT.save.honey < cost) return false;
    WT.save.honey -= cost;
    r.level++;
    r.xp = 0;
    WT.persist();
    return true;
  };

  /** Pick the strongest three owned units, keeping at least one tank if possible. */
  WT.autoTeam = function () {
    const ids = Object.keys(WT.save.roster).sort((a, b) => WT.unitPower(b) - WT.unitPower(a));
    const team = [];
    const tank = ids.find(id => WT.UNITS[id].role === 'tank');
    if (tank) team.push(tank);
    ids.forEach(id => { if (team.length < 3 && !team.includes(id)) team.push(id); });
    WT.save.team = team;
    WT.persist();
    return team;
  };

  // ── summoning ──────────────────────────────────────────────────
  WT.rollRarity = function (rng, minTier) {
    rng = rng || Math.random;
    if (WT.save.pity >= WT.GACHA.pity - 1) minTier = Math.max(minTier || 1, 4);
    const pool = WT.RARITY_ORDER.filter(k => WT.RARITIES[k].tier >= (minTier || 1));
    const total = pool.reduce((s, k) => s + WT.RARITIES[k].weight, 0);
    let roll = rng() * total;
    for (const k of pool) {
      roll -= WT.RARITIES[k].weight;
      if (roll <= 0) return k;
    }
    return pool[pool.length - 1];
  };

  /**
   * Perform `count` summons. Returns [{ id, isNew, starUp, honey }].
   * The 10-pull guarantees at least one Epic or better.
   */
  WT.summon = function (count, rng) {
    rng = rng || Math.random;
    const results = [];
    for (let i = 0; i < count; i++) {
      const needEpic = count === 10 && i === count - 1 && !results.some(r => WT.RARITIES[WT.UNITS[r.id].rarity].tier >= 3);
      const rarity = WT.rollRarity(rng, needEpic ? 3 : 1);
      const pool = WT.UNIT_IDS.filter(id => WT.UNITS[id].rarity === rarity);
      const id = pool[Math.floor(rng() * pool.length)];
      WT.save.totalPulls++;
      WT.save.pity = WT.RARITIES[rarity].tier >= 4 ? 0 : WT.save.pity + 1;

      const r = WT.save.roster[id];
      if (!r) {
        WT.save.roster[id] = { level: 1, stars: 1, xp: 0 };
        results.push({ id, isNew: true, starUp: false, honey: 0, stars: 1 });
      } else if (r.stars < WT.MAX_STARS) {
        r.stars++;
        results.push({ id, isNew: false, starUp: true, honey: 0, stars: r.stars });
      } else {
        const honey = WT.dupeHoney(rarity);
        WT.save.honey += honey;
        results.push({ id, isNew: false, starUp: false, honey, stars: r.stars });
      }
    }
    // Fill empty team slots with brand-new friends.
    results.forEach(res => {
      if (WT.save.team.length < 3 && !WT.save.team.includes(res.id)) WT.save.team.push(res.id);
    });
    WT.persist();
    return results;
  };
})(globalThis.WT);
