/* ================================================================
 *  Winnie's Town — 3v3 battle engine
 *  Speed-gauge turn order, skills with cooldowns, statuses, shields.
 *  Emits event lists that BattleScene animates. No Phaser dependency.
 * ================================================================ */
globalThis.WT = globalThis.WT || {};

(function (WT) {
  const GAUGE = 1000;
  const DMG_SCALE = 1.3;
  const CRIT_CHANCE = 0.12;
  const CRIT_MULT = 1.6;
  const OVERTIME_TURN = 60;     // after this, damage ramps up so stalemates always end
  const OVERTIME_RAMP = 0.03;   // +3% damage per turn of overtime

  class Battle {
    /**
     * @param {Array<{id,level,stars}>} allySpecs
     * @param {Array<{id,level,stars}>} enemySpecs
     * @param {() => number} [rng]
     * @param {{enemyScale?: number}} [opts]  enemyScale shrinks enemy HP/ATK
     */
    constructor(allySpecs, enemySpecs, rng, opts = {}) {
      this.rng = rng || Math.random;
      this.enemyScale = opts.enemyScale || 1;
      this.units = [];
      this.turn = 0;
      this.result = null;
      this._build('ally', allySpecs);
      this._build('enemy', enemySpecs);
      // Stagger the opening so equal-speed units don't tie.
      this.units.forEach(u => { u.gauge = this.rng() * 120; });
    }

    _build(side, specs) {
      const syn = WT.synergyFor(specs.map(s => s.id));
      const scale = side === 'enemy' ? this.enemyScale : 1;
      specs.forEach((s, slot) => {
        const base = WT.statsFor(s.id, s.level, s.stars);
        const def = WT.UNITS[s.id];
        const maxHp = Math.round(base.hp * scale * (1 + (syn ? syn.hp : 0)));
        this.units.push({
          uid: side + slot, side, slot, id: s.id, level: s.level, stars: s.stars,
          name: def.name, role: def.role, faction: def.faction, rarity: def.rarity,
          maxHp, hp: maxHp,
          atk: Math.round(base.atk * scale * (1 + (syn ? syn.atk : 0))),
          def: base.def,
          spd: Math.round(base.spd * (1 + (syn ? syn.spd : 0))),
          shield: 0,
          statuses: {},       // name -> { turns, value }
          cd: Math.max(1, def.skill.cd - 2),   // skill is ready after a turn or two
          gauge: 0,
          alive: true,
          revived: false,
        });
      });
      if (side === 'ally') this.allySynergy = syn; else this.enemySynergy = syn;
    }

    // ── queries ──────────────────────────────────────────────────
    get(uid) { return this.units.find(u => u.uid === uid); }
    side(side) { return this.units.filter(u => u.side === side); }
    living(side) { return this.units.filter(u => u.side === side && u.alive); }
    foeSide(u) { return u.side === 'ally' ? 'enemy' : 'ally'; }

    /** Targets `actor` may pick for a single-target action (taunt applies). */
    validTargets(actor) {
      const foes = this.living(this.foeSide(actor));
      const taunters = foes.filter(f => f.statuses.taunt);
      return taunters.length ? taunters : foes;
    }

    skillReady(u) { return u.cd <= 0; }

    get inOvertime() { return this.turn > OVERTIME_TURN; }
    overtimeMult() { return this.inOvertime ? 1 + (this.turn - OVERTIME_TURN) * OVERTIME_RAMP : 1; }

    _effSpd(u) { return u.spd * (u.statuses.slow ? 0.7 : 1); }

    /** Predict the next `n` actors without mutating state. */
    previewOrder(n) {
      const sim = this.units.filter(u => u.alive).map(u => ({ uid: u.uid, g: u.gauge, s: this._effSpd(u) }));
      const out = [];
      if (!sim.length) return out;
      for (let i = 0; i < n; i++) {
        let best = null, bestT = Infinity;
        sim.forEach(x => { const t = (GAUGE - x.g) / x.s; if (t < bestT) { bestT = t; best = x; } });
        sim.forEach(x => { x.g += x.s * bestT; });
        best.g -= GAUGE;
        out.push(best.uid);
      }
      return out;
    }

    // ── turn flow ────────────────────────────────────────────────
    /**
     * Advance time to the next actor and resolve start-of-turn effects.
     * Returns { actor, events, skip } — if `skip` the actor lost its turn.
     */
    nextTurn() {
      const alive = this.units.filter(u => u.alive);
      let best = null, bestT = Infinity;
      alive.forEach(u => { const t = (GAUGE - u.gauge) / this._effSpd(u); if (t < bestT) { bestT = t; best = u; } });
      alive.forEach(u => { u.gauge += this._effSpd(u) * bestT; });
      best.gauge -= GAUGE;
      this.turn++;

      const events = [];
      const actor = best;
      if (actor.statuses.burn) {
        const amt = Math.max(1, Math.round(actor.maxHp * 0.07));
        this._applyDamage(null, actor, amt, false, events, 'burn');
      }
      let skip = false;
      if (actor.alive && actor.statuses.stun) {
        events.push({ type: 'stunned', tgt: actor.uid });
        skip = true;
      }
      if (!actor.alive || skip) this._endTurn(actor, events);
      this._checkResult();
      return { actor, events, skip: skip || !actor.alive };
    }

    /** Resolve an action. `action` is 'attack' or 'skill'. */
    act(actor, action, targetUid) {
      const events = [];
      const valid = this.validTargets(actor);
      let target = this.get(targetUid);
      if (!target || !valid.includes(target)) target = valid[0];

      if (action === 'skill' && this.skillReady(actor)) {
        const skill = WT.UNITS[actor.id].skill;
        events.push({ type: 'skill', src: actor.uid, name: skill.name });
        skill.fx.forEach(step => this._resolveStep(actor, step, target, events));
        actor.cd = skill.cd;
      } else {
        events.push({ type: 'attack', src: actor.uid, tgt: target && target.uid });
        if (target) this._hit(actor, target, 1.0, {}, events);
      }
      this._endTurn(actor, events);
      this._checkResult();
      return events;
    }

    _endTurn(actor, events) {
      if (actor.cd > 0) actor.cd--;
      Object.keys(actor.statuses).forEach(k => {
        actor.statuses[k].turns--;
        if (actor.statuses[k].turns <= 0) {
          delete actor.statuses[k];
          events.push({ type: 'statusEnd', tgt: actor.uid, status: k });
        }
      });
    }

    _checkResult() {
      if (this.result) return;
      if (!this.living('enemy').length) this.result = 'win';
      else if (!this.living('ally').length) this.result = 'lose';
    }

    // ── effects ──────────────────────────────────────────────────
    _resolveStep(actor, step, primary, events) {
      const allies = this.living(actor.side);
      const foes = () => this.living(this.foeSide(actor));
      const pick = (sel) => {
        switch (sel) {
          case 'self':   return [actor];
          case 'one':    return primary && primary.alive ? [primary] : this.validTargets(actor).slice(0, 1);
          case 'all':    return step.t === 'damage' || step.t === 'status' && step.status !== 'atkUp' ? foes() : allies;
          case 'allies': return allies;
          case 'lowest': return [allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
          default:       return [];
        }
      };

      switch (step.t) {
        case 'damage': {
          const hits = step.hits || 1;
          for (let i = 0; i < hits; i++) {
            let targets;
            if (step.target === 'random') {
              const pool = foes();
              if (!pool.length) break;
              targets = [pool[Math.floor(this.rng() * pool.length)]];
            } else {
              targets = pick(step.target);
            }
            targets.forEach(t => this._hit(actor, t, step.power, step, events));
          }
          break;
        }
        case 'heal': {
          const targets = step.target === 'all' ? allies : pick(step.target);
          targets.forEach(t => {
            if (!t || !t.alive) return;
            const amt = Math.round(t.maxHp * step.pct);
            const real = Math.min(amt, t.maxHp - t.hp);
            t.hp += real;
            events.push({ type: 'heal', src: actor.uid, tgt: t.uid, amount: amt });
          });
          break;
        }
        case 'shield': {
          const targets = step.target === 'all' ? allies : [actor];
          const amt = Math.round(actor.maxHp * step.pct);
          targets.forEach(t => {
            t.shield = Math.max(t.shield, amt);
            events.push({ type: 'shield', src: actor.uid, tgt: t.uid, amount: amt });
          });
          break;
        }
        case 'status': {
          const targets = pick(step.target).filter(t => t && t.alive);
          targets.forEach(t => {
            if (step.chance && this.rng() > step.chance) return;
            // A unit's own turn ends right after applying self-buffs, so add one.
            const extra = t === actor ? 1 : 0;
            t.statuses[step.status] = { turns: step.turns + extra, value: step.value || 0 };
            events.push({ type: 'status', src: actor.uid, tgt: t.uid, status: step.status, turns: step.turns });
          });
          break;
        }
        case 'cleanse': {
          const targets = step.target === 'all' ? allies : pick('lowest');
          targets.forEach(t => {
            ['slow', 'stun', 'burn'].forEach(k => delete t.statuses[k]);
            events.push({ type: 'cleanse', tgt: t.uid });
          });
          break;
        }
      }
    }

    _hit(src, tgt, power, opts, events) {
      if (!tgt || !tgt.alive) return;
      const atkUp = src.statuses.atkUp ? 1 + src.statuses.atkUp.value : 1;
      const defEff = tgt.def * (1 - (opts.ignoreDef || 0));
      const variance = 0.92 + this.rng() * 0.16;
      const crit = opts.crit || this.rng() < CRIT_CHANCE;
      let dmg = src.atk * atkUp * power * DMG_SCALE * (120 / (120 + defEff)) * variance * this.overtimeMult();
      if (crit) dmg *= CRIT_MULT;
      this._applyDamage(src, tgt, Math.max(1, Math.round(dmg)), crit, events, 'hit');
    }

    _applyDamage(src, tgt, amount, crit, events, kind) {
      let absorbed = 0;
      if (tgt.shield > 0) {
        absorbed = Math.min(tgt.shield, amount);
        tgt.shield -= absorbed;
      }
      const dealt = amount - absorbed;
      tgt.hp = Math.max(0, tgt.hp - dealt);
      const ev = { type: kind === 'burn' ? 'burn' : 'damage', src: src && src.uid, tgt: tgt.uid, amount, dealt, absorbed, crit, killed: false };
      events.push(ev);
      if (tgt.hp <= 0) {
        const passive = WT.UNITS[tgt.id].passive;
        if (passive && passive.revive && !tgt.revived) {
          tgt.revived = true;
          tgt.hp = Math.round(tgt.maxHp * passive.revive);
          tgt.statuses = {};
          events.push({ type: 'revive', tgt: tgt.uid, hp: tgt.hp });
        } else {
          tgt.alive = false;
          tgt.statuses = {};
          tgt.shield = 0;
          ev.killed = true;
        }
      }
    }

    // ── AI ───────────────────────────────────────────────────────
    /** Pick an action for `actor`. Used by enemies and by Auto mode. */
    aiChoose(actor) {
      const targets = this.validTargets(actor);
      const weakest = targets.slice().sort((a, b) => a.hp - b.hp)[0];
      const allies = this.living(actor.side);
      const ready = this.skillReady(actor);
      const skill = WT.UNITS[actor.id].skill;
      const isHeal = skill.fx.some(s => s.t === 'heal');
      const isShield = skill.fx.some(s => s.t === 'shield');
      const isBuff = skill.fx.some(s => s.status === 'atkUp');

      if (ready) {
        if (actor.role === 'support' && isHeal && !isBuff) {
          const hurt = allies.some(a => a.hp / a.maxHp < 0.7);
          if (hurt) return { action: 'skill', target: weakest && weakest.uid };
        } else if (isShield) {
          const hurt = allies.some(a => a.hp / a.maxHp < 0.85);
          if (hurt || !actor.statuses.taunt) return { action: 'skill', target: weakest && weakest.uid };
        } else {
          return { action: 'skill', target: weakest && weakest.uid };
        }
      }
      return { action: 'attack', target: weakest && weakest.uid };
    }

    /** Count of living allies (used for star rating). */
    starsEarned() {
      if (this.result !== 'win') return 0;
      const fallen = this.side('ally').filter(u => !u.alive).length;
      return fallen === 0 ? 3 : fallen === 1 ? 2 : 1;
    }
  }

  /** Run a whole battle with AI on both sides. Handy for balancing/tests. */
  Battle.simulate = function (allySpecs, enemySpecs, rng, maxTurns = 400, opts) {
    const b = new Battle(allySpecs, enemySpecs, rng, opts || { enemyScale: WT.ENEMY_SCALE });
    while (!b.result && b.turn < maxTurns) {
      const { actor, skip } = b.nextTurn();
      if (b.result || skip) continue;
      const c = b.aiChoose(actor);
      b.act(actor, c.action, c.target);
    }
    return b;
  };

  WT.Battle = Battle;
})(globalThis.WT);
