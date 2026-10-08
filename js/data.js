/* ================================================================
 *  Winnie's Town — game data
 *  Rarities, the Bears & Pastries roster, stages, decor, gacha rates.
 *  Pure data: no Phaser here, so the battle engine can be tested in Node.
 * ================================================================ */
globalThis.WT = globalThis.WT || {};

(function (WT) {
  // ── Rarities ───────────────────────────────────────────────────
  // `mult` scales base stats, `weight` is the summon rate in percent.
  WT.RARITIES = {
    common:    { key: 'common',    name: 'Common',    tier: 1, mult: 1.00, weight: 52.0, color: 0xb59c80, hex: '#9c8063', glow: 0xe8d8c4 },
    rare:      { key: 'rare',      name: 'Rare',      tier: 2, mult: 1.18, weight: 30.0, color: 0x5fa8de, hex: '#3f87c2', glow: 0xbfe2ff },
    epic:      { key: 'epic',      name: 'Epic',      tier: 3, mult: 1.40, weight: 13.0, color: 0xa874d8, hex: '#8a55bf', glow: 0xe6ccff },
    legendary: { key: 'legendary', name: 'Legendary', tier: 4, mult: 1.70, weight:  4.2, color: 0xf0a92e, hex: '#c98208', glow: 0xffe9a8 },
    mythic:    { key: 'mythic',    name: 'Mythic',    tier: 5, mult: 2.05, weight:  0.8, color: 0xff6fa8, hex: '#e0457f', glow: 0xffd1e6 },
  };
  WT.RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

  // ── Roles ──────────────────────────────────────────────────────
  WT.ROLES = {
    tank:    { name: 'Tank',    hp: 560, atk: 40, def: 36, spd: 88,  blurb: 'Soaks hits and protects the team.' },
    striker: { name: 'Striker', hp: 380, atk: 68, def: 20, spd: 108, blurb: 'Hits one target very hard.' },
    mage:    { name: 'Mage',    hp: 340, atk: 62, def: 17, spd: 100, blurb: 'Damages the whole enemy team.' },
    support: { name: 'Support', hp: 410, atk: 42, def: 25, spd: 104, blurb: 'Heals and empowers allies.' },
  };

  WT.FACTIONS = {
    bear:   { name: 'Bears',    color: 0xc98a4b, hex: '#a8682c' },
    pastry: { name: 'Pastries', color: 0xf08bb0, hex: '#d0607f' },
  };

  /*
   * Skill effect steps (resolved in order by the battle engine):
   *   { t:'damage', target:'one'|'all'|'random', power, hits, ignoreDef, crit }
   *   { t:'heal',   target:'lowest'|'all'|'self', pct }         — % of target max HP
   *   { t:'shield', target:'all'|'self', pct }                 — % of CASTER max HP
   *   { t:'status', target:'self'|'one'|'all'|'allies', status, turns, chance, value }
   *       statuses: taunt, slow, stun, burn, atkUp
   *   { t:'cleanse', target:'lowest'|'all' }
   */
  WT.UNITS = {
    // ── Bears ──────────────────────────────────────────────────
    honey_cub: {
      name: 'Honey Cub', faction: 'bear', rarity: 'common', role: 'striker',
      mod: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 },
      bio: 'Practises sword fighting with a honey dipper every morning. Mostly gets sticky.',
      skill: { name: 'Sticky Swipe', cd: 3, desc: 'Deals 180% damage and slows the target for 2 turns.',
        fx: [{ t: 'damage', target: 'one', power: 1.8 }, { t: 'status', target: 'one', status: 'slow', turns: 2 }] },
    },
    cocoa_cub: {
      name: 'Cocoa Cub', faction: 'bear', rarity: 'common', role: 'tank',
      mod: { hp: 1.0, atk: 1.0, def: 1.05, spd: 0.98 },
      bio: 'Borrowed the kitchen\'s best pot without asking. Wears it with pride.',
      skill: { name: 'Pot-Lid Bash', cd: 3, desc: 'Deals 100% damage and taunts all enemies for 2 turns.',
        fx: [{ t: 'damage', target: 'one', power: 1.0 }, { t: 'status', target: 'self', status: 'taunt', turns: 2 }] },
    },
    maple_scout: {
      name: 'Maple Scout', faction: 'bear', rarity: 'rare', role: 'striker',
      mod: { hp: 0.95, atk: 1.0, def: 1.0, spd: 1.08 },
      bio: 'Knows every trail in Honey Park and never misses with an acorn.',
      skill: { name: 'Acorn Volley', cd: 3, desc: 'Fires 4 acorns at random enemies for 70% damage each.',
        fx: [{ t: 'damage', target: 'random', power: 0.7, hits: 4 }] },
    },
    berry_medic: {
      name: 'Berry Medic', faction: 'bear', rarity: 'rare', role: 'support',
      mod: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 },
      bio: 'Her berry jam fixes scraped knees, bruised egos and the occasional broken heart.',
      skill: { name: 'Jam Patch', cd: 3, desc: 'Heals the weakest ally for 35% max HP and removes debuffs.',
        fx: [{ t: 'heal', target: 'lowest', pct: 0.35 }, { t: 'cleanse', target: 'lowest' }] },
    },
    panda_ronin: {
      name: 'Panda Ronin', faction: 'bear', rarity: 'epic', role: 'striker',
      mod: { hp: 1.0, atk: 1.06, def: 1.0, spd: 1.04 },
      bio: 'Wandered in from the bamboo hills. Will duel anyone for a sesame bun.',
      skill: { name: 'Bamboo Iaido', cd: 4, desc: 'A lightning draw for 260% damage that ignores 40% of defence.',
        fx: [{ t: 'damage', target: 'one', power: 2.6, ignoreDef: 0.4 }] },
    },
    polar_barista: {
      name: 'Polar Barista', faction: 'bear', rarity: 'epic', role: 'mage',
      mod: { hp: 1.05, atk: 1.0, def: 1.0, spd: 1.0 },
      bio: 'Makes the town\'s coldest cold brew. The froth is technically a blizzard.',
      skill: { name: 'Frappé Flurry', cd: 4, desc: 'Deals 110% damage to all enemies with a 35% chance to freeze each for 1 turn.',
        fx: [{ t: 'damage', target: 'all', power: 1.1 }, { t: 'status', target: 'all', status: 'stun', turns: 1, chance: 0.35 }] },
    },
    sir_bumble: {
      name: 'Sir Bumble', faction: 'bear', rarity: 'legendary', role: 'tank',
      mod: { hp: 1.08, atk: 1.0, def: 1.1, spd: 1.0 },
      bio: 'Knight of the Honeycomb Order. Sworn protector of the café and its pastries (mostly).',
      skill: { name: 'Royal Honeycomb', cd: 4, desc: 'Shields every ally for 22% of his max HP and taunts for 2 turns.',
        fx: [{ t: 'shield', target: 'all', pct: 0.22 }, { t: 'status', target: 'self', status: 'taunt', turns: 2 }] },
    },
    aurora_bear: {
      name: 'Aurora', faction: 'bear', rarity: 'mythic', role: 'mage',
      mod: { hp: 1.05, atk: 1.08, def: 1.0, spd: 1.05 },
      bio: 'Fell from the night sky into a pile of pillows. Hums lullabies that move the stars.',
      skill: { name: 'Starfall Lullaby', cd: 4, desc: 'Deals 160% damage to all enemies and heals all allies for 12% max HP.',
        fx: [{ t: 'damage', target: 'all', power: 1.6 }, { t: 'heal', target: 'all', pct: 0.12 }] },
    },

    // ── Pastries ───────────────────────────────────────────────
    croissant: {
      name: 'Crumbly Croissant', faction: 'pastry', rarity: 'common', role: 'striker',
      mod: { hp: 1.0, atk: 1.0, def: 0.95, spd: 1.02 },
      bio: 'Seventy-two buttery layers, every one of them ready to throw hands.',
      skill: { name: 'Flaky Flurry', cd: 3, desc: 'Punches one enemy twice for 95% damage each.',
        fx: [{ t: 'damage', target: 'one', power: 0.95, hits: 2 }] },
    },
    mochi_puff: {
      name: 'Mochi Puff', faction: 'pastry', rarity: 'common', role: 'tank',
      mod: { hp: 1.06, atk: 0.95, def: 1.0, spd: 0.95 },
      bio: 'So squishy that attacks just bounce off. Usually asleep during them.',
      skill: { name: 'Squish Guard', cd: 3, desc: 'Gains a shield of 30% max HP and taunts for 2 turns.',
        fx: [{ t: 'shield', target: 'self', pct: 0.30 }, { t: 'status', target: 'self', status: 'taunt', turns: 2 }] },
    },
    macaron_twins: {
      name: 'Macaron Twins', faction: 'pastry', rarity: 'rare', role: 'mage',
      mod: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.02 },
      bio: 'Pip and Mint finish each other\'s spells. And each other\'s sprinkles.',
      skill: { name: 'Twin Sparkle', cd: 3, desc: 'Deals 105% damage to all enemies.',
        fx: [{ t: 'damage', target: 'all', power: 1.05 }] },
    },
    cinnamon_healer: {
      name: 'Cinnamon Healer', faction: 'pastry', rarity: 'rare', role: 'support',
      mod: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 },
      bio: 'Smells like a warm hug. Whisks away wounds with a single swirl.',
      skill: { name: 'Warm Swirl', cd: 3, desc: 'Heals all allies for 18% max HP.',
        fx: [{ t: 'heal', target: 'all', pct: 0.18 }] },
    },
    eclair_duelist: {
      name: 'Éclair Duelist', faction: 'pastry', rarity: 'epic', role: 'striker',
      mod: { hp: 0.95, atk: 1.08, def: 0.95, spd: 1.08 },
      bio: 'Fastest fork in town. Has never lost a duel, or a bake-off.',
      skill: { name: 'Glazed Riposte', cd: 4, desc: 'A guaranteed critical thrust for 220% damage.',
        fx: [{ t: 'damage', target: 'one', power: 2.2, crit: true }] },
    },
    duchess_shortcake: {
      name: 'Duchess Shortcake', faction: 'pastry', rarity: 'epic', role: 'support',
      mod: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.04 },
      bio: 'Hosts the finest tea parties in Winnie\'s Town. Attendance is mandatory.',
      skill: { name: 'Teatime Toast', cd: 4, desc: 'All allies gain +35% attack for 2 turns and heal 10% max HP.',
        fx: [{ t: 'status', target: 'allies', status: 'atkUp', turns: 2, value: 0.35 }, { t: 'heal', target: 'all', pct: 0.10 }] },
    },
    gateau_golem: {
      name: 'Gâteau Golem', faction: 'pastry', rarity: 'legendary', role: 'tank',
      mod: { hp: 1.12, atk: 0.95, def: 1.08, spd: 0.95 },
      bio: 'A wedding cake that came to life and decided to guard everyone, forever.',
      skill: { name: 'Tiered Fortress', cd: 4, desc: 'Shields every ally for 20% of its max HP, taunts for 2 turns and heals itself 10%.',
        fx: [{ t: 'shield', target: 'all', pct: 0.20 }, { t: 'status', target: 'self', status: 'taunt', turns: 2 }, { t: 'heal', target: 'self', pct: 0.10 }] },
    },
    creme_phoenix: {
      name: 'Crème Phoenix', faction: 'pastry', rarity: 'mythic', role: 'mage',
      mod: { hp: 1.0, atk: 1.1, def: 1.0, spd: 1.06 },
      bio: 'Torched to perfection and reborn from caramel. Rises once from defeat with 40% HP.',
      passive: { revive: 0.4 },
      skill: { name: 'Caramel Inferno', cd: 4, desc: 'Deals 150% damage to all enemies and burns them for 2 turns.',
        fx: [{ t: 'damage', target: 'all', power: 1.5 }, { t: 'status', target: 'all', status: 'burn', turns: 2 }] },
    },
  };
  WT.UNIT_IDS = Object.keys(WT.UNITS);

  WT.STATUS_INFO = {
    taunt: { name: 'Taunt',  color: '#c0392b' },
    slow:  { name: 'Slow',   color: '#5b7fa6' },
    stun:  { name: 'Frozen', color: '#55b9e0' },
    burn:  { name: 'Burn',   color: '#e0752d' },
    atkUp: { name: 'ATK Up', color: '#d4a017' },
  };

  // ── Progression ────────────────────────────────────────────────
  WT.MAX_LEVEL = 30;
  WT.MAX_STARS = 5;
  WT.xpToNext = lvl => 40 + lvl * 22;
  WT.treatCost = lvl => 50 + lvl * 35;            // honey to buy a level
  WT.dupeHoney = rarity => [0, 60, 150, 400, 1200, 3000][WT.RARITIES[rarity].tier];

  /** Final combat stats for a unit at a level & star count. */
  WT.statsFor = function (id, level, stars) {
    const u = WT.UNITS[id];
    const role = WT.ROLES[u.role];
    const r = WT.RARITIES[u.rarity];
    const lv = 1 + (level - 1) * 0.075;
    const st = 1 + (stars - 1) * 0.10;
    const g = r.mult * lv * st;
    return {
      hp:  Math.round(role.hp  * u.mod.hp  * g),
      atk: Math.round(role.atk * u.mod.atk * g),
      def: Math.round(role.def * u.mod.def * (r.mult * (1 + (level - 1) * 0.04) * st)),
      spd: Math.round(role.spd * u.mod.spd * (1 + (r.tier - 1) * 0.02)),
    };
  };

  WT.powerOf = function (id, level, stars) {
    const s = WT.statsFor(id, level, stars);
    return Math.round(s.hp * 0.25 + s.atk * 3 + s.def * 2.5 + s.spd);
  };

  /** Team synergy based on faction mix. */
  WT.synergyFor = function (ids) {
    const bears = ids.filter(id => WT.UNITS[id].faction === 'bear').length;
    const pastries = ids.length - bears;
    if (ids.length === 3 && bears === 3)    return { key: 'bears',   name: 'Hibernation Hug', desc: '3 Bears: +15% max HP',      hp: 0.15, atk: 0,    spd: 0 };
    if (ids.length === 3 && pastries === 3) return { key: 'pastry',  name: 'Sugar Rush',      desc: '3 Pastries: +15% attack',   hp: 0,    atk: 0.15, spd: 0 };
    if (bears >= 1 && pastries >= 1)        return { key: 'friends', name: 'Café Friends',    desc: 'Mixed team: +8% speed',     hp: 0,    atk: 0,    spd: 0.08 };
    return null;
  };

  // ── Summoning ("The Wishing Oven") ─────────────────────────────
  WT.GACHA = {
    single: 100,          // heartstones
    ten: 900,
    pity: 40,             // a Legendary or better is guaranteed by this pull
  };

  // ── Stages ─────────────────────────────────────────────────────
  // x/y are positions on assets/scene/map.png (1500×1000).
  // Each location has three battles; enemy levels climb across the map.
  WT.LOCATIONS = [
    { id: 'cafe',     name: 'Café Courtyard', x: 300,  y: 215, arena: 'arena_cafe',
      blurb: 'Rowdy pastries are crowding the café garden. Shoo them out politely.',
      waves: [['croissant', 'mochi_puff'], ['croissant', 'honey_cub', 'mochi_puff'], ['cocoa_cub', 'croissant', 'macaron_twins']] },
    { id: 'park',     name: 'Honey Park',     x: 730,  y: 225, arena: 'arena_park',
      blurb: 'The scouts of Honey Park don\'t let just anyone near the beehives.',
      waves: [['honey_cub', 'maple_scout', 'cocoa_cub'], ['cocoa_cub', 'maple_scout', 'berry_medic'], ['maple_scout', 'honey_cub', 'berry_medic']] },
    { id: 'mall',     name: 'Sugar Mall',     x: 600,  y: 480, arena: 'arena_mall',
      blurb: 'A sale on sprinkles has turned the mall into a sugary scrum.',
      waves: [['macaron_twins', 'croissant', 'mochi_puff'], ['cinnamon_healer', 'croissant', 'macaron_twins'], ['mochi_puff', 'eclair_duelist', 'cinnamon_healer']] },
    { id: 'pavilion', name: 'Beach Pavilion', x: 940,  y: 490, arena: 'arena_beach',
      blurb: 'The pavilion snack bar is under new (and very cold) management.',
      waves: [['polar_barista', 'cocoa_cub', 'honey_cub'], ['maple_scout', 'polar_barista', 'berry_medic'], ['cocoa_cub', 'polar_barista', 'panda_ronin']] },
    { id: 'capitol',  name: 'The Capitol',    x: 1170, y: 220, arena: 'arena_capitol',
      blurb: 'The Duchess is hosting a very exclusive tea party on the Capitol steps.',
      waves: [['duchess_shortcake', 'mochi_puff', 'eclair_duelist'], ['macaron_twins', 'duchess_shortcake', 'cinnamon_healer'], ['gateau_golem', 'eclair_duelist', 'duchess_shortcake']] },
    { id: 'tvcity',   name: 'TV City',        x: 1280, y: 560, arena: 'arena_tvcity',
      blurb: 'Lights, camera, combat! Win the game show to escape the studio.',
      waves: [['panda_ronin', 'maple_scout', 'berry_medic'], ['eclair_duelist', 'panda_ronin', 'macaron_twins'], ['sir_bumble', 'panda_ronin', 'polar_barista']] },
    { id: 'stadium',  name: 'Sprinkle Stadium', x: 950, y: 770, arena: 'arena_stadium',
      blurb: 'The championship match. Bears versus Pastries, winner takes the trophy.',
      waves: [['sir_bumble', 'eclair_duelist', 'cinnamon_healer'], ['gateau_golem', 'panda_ronin', 'duchess_shortcake'], ['sir_bumble', 'polar_barista', 'berry_medic']] },
    { id: 'seashell', name: 'Seashell Beach', x: 545,  y: 795, arena: 'arena_beach',
      blurb: 'A strange caramel glow hovers over the tide pools at dusk.',
      waves: [['gateau_golem', 'macaron_twins', 'eclair_duelist'], ['creme_phoenix', 'mochi_puff', 'cinnamon_healer'], ['gateau_golem', 'creme_phoenix', 'duchess_shortcake']] },
    { id: 'bank',     name: 'Honey Bank Vault', x: 245, y: 615, arena: 'arena_bank',
      blurb: 'Someone is after the town\'s heartstone reserve. Stop them in the vault!',
      waves: [['sir_bumble', 'aurora_bear', 'berry_medic'], ['gateau_golem', 'creme_phoenix', 'eclair_duelist'], ['sir_bumble', 'aurora_bear', 'creme_phoenix']] },
  ];

  WT.stageLevel = (locIdx, wave) => Math.max(1, Math.round(locIdx * 2.8 + wave * 0.9));
  WT.ENEMY_SCALE = 0.85;   // enemies are a touch weaker than an equal-level player team
  WT.stageStars = (locIdx, wave) => (locIdx >= 6 ? 2 : 1) + (wave === 2 ? 1 : 0);
  WT.stageRewards = function (locIdx, wave, firstClear) {
    const lvl = WT.stageLevel(locIdx, wave);
    return {
      honey: 40 + lvl * 14,
      heartstones: firstClear ? (wave === 2 ? 120 : 50) : 0,
      xp: 25 + lvl * 9,
    };
  };

  // ── Café decor ─────────────────────────────────────────────────
  // slot: 'counter' items sit on the counter, 'floor' items stand in front.
  WT.DECOR = {
    teapot:            { name: 'Rose Teapot',         slot: 'counter', cost: 120,  charm: 3 },
    tea:               { name: 'Cup of Tea',          slot: 'counter', cost: 60,   charm: 1 },
    lemontea:          { name: 'Lemon Tea',           slot: 'counter', cost: 80,   charm: 2 },
    gingertea:         { name: 'Ginger Tea',          slot: 'counter', cost: 80,   charm: 2 },
    coldbrew:          { name: 'Cold Brew',           slot: 'counter', cost: 90,   charm: 2 },
    coffeemaker:       { name: 'Coffee Maker',        slot: 'counter', cost: 260,  charm: 6 },
    honeyjar:          { name: 'Honey Jar',           slot: 'counter', cost: 100,  charm: 2 },
    jams:              { name: 'Jam Jar',             slot: 'counter', cost: 100,  charm: 2 },
    candyjar:          { name: 'Candy Jar',           slot: 'counter', cost: 140,  charm: 3 },
    macjar:            { name: 'Macaron Jar',         slot: 'counter', cost: 180,  charm: 4 },
    breadbitesglass:   { name: 'Bread Bites',         slot: 'counter', cost: 150,  charm: 3 },
    candiesrock:       { name: 'Rock Candy',          slot: 'counter', cost: 160,  charm: 3 },
    shortcake:         { name: 'Strawberry Shortcake',slot: 'counter', cost: 200,  charm: 4 },
    cremepie:          { name: 'Crème Pie',           slot: 'counter', cost: 200,  charm: 4 },
    fruittart:         { name: 'Fruit Tart',          slot: 'counter', cost: 220,  charm: 5 },
    crocakes:          { name: 'Croissant Plate',     slot: 'counter', cost: 220,  charm: 5 },
    breadglass:        { name: 'Bread Display',       slot: 'counter', cost: 320,  charm: 7 },
    pastryglass:       { name: 'Pastry Display',      slot: 'counter', cost: 380,  charm: 8 },
    stackedbreadglass: { name: 'Tall Cake Dome',      slot: 'counter', cost: 450,  charm: 9 },
    heartstone:        { name: 'Heartstone Trophy',   slot: 'counter', cost: 600,  charm: 12 },
    plantpot:          { name: 'Potted Fern',         slot: 'floor',   cost: 150,  charm: 3 },
    pinktableset:      { name: 'Pink Table Set',      slot: 'floor',   cost: 500,  charm: 10 },
    moodytableset:     { name: 'Cream Table Set',     slot: 'floor',   cost: 500,  charm: 10 },
    poohtableset:      { name: 'Honey Table Set',     slot: 'floor',   cost: 700,  charm: 14 },
    heartstonebundle:  { name: 'Heartstone Sack',     slot: 'floor',   cost: 900,  charm: 16 },
    heartstonepile:    { name: 'Heartstone Hoard',    slot: 'floor',   cost: 1400, charm: 24 },
  };

  // Decor spots in insidecafe.png coordinates (1500×1000).
  WT.DECOR_SPOTS = [
    { id: 'c1', slot: 'counter', x: 330,  y: 512 },
    { id: 'c2', slot: 'counter', x: 560,  y: 512 },
    { id: 'c3', slot: 'counter', x: 940,  y: 512 },
    { id: 'c4', slot: 'counter', x: 1170, y: 512 },
    { id: 'f1', slot: 'floor',   x: 200,  y: 900 },
    { id: 'f2', slot: 'floor',   x: 1300, y: 900 },
  ];

  // Idle café income: honey per minute, capped at 8 hours of earnings.
  WT.incomePerMin = charm => 2 + charm * 0.25;
  WT.INCOME_CAP_MIN = 8 * 60;

  WT.DAILY_GIFT = { heartstones: 100, honey: 150 };
})(globalThis.WT);
