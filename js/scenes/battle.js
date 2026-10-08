/* ================================================================
 *  BattleScene — animates WT.Battle. Allies on the left, enemies on
 *  the right. Tap an enemy to target it, then Attack or use a Skill.
 * ================================================================ */
class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }

  create(data) {
    const { W, H, ui } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(350, 42, 22, 10);
    WT.audio.setMood('battle');

    this.locIdx = data.locIdx;
    this.wave = data.wave;
    this.loc = WT.LOCATIONS[this.locIdx];
    this.speed = WT.save.settings.speed || 1;
    this.auto = !!WT.save.settings.auto;
    this.ended = false;
    this.tweens.timeScale = this.speed;
    this.time.timeScale = this.speed;

    const lvl = WT.stageLevel(this.locIdx, this.wave);
    const allies = WT.save.team.filter(Boolean).map(id => ({ id, level: WT.save.roster[id].level, stars: WT.save.roster[id].stars }));
    const enemies = this.loc.waves[this.wave].map(id => ({ id, level: lvl, stars: 1 + (this.wave === 2 && this.locIdx >= 4 ? 1 : 0) }));
    this.battle = new WT.Battle(allies, enemies, Math.random, { enemyScale: WT.ENEMY_SCALE });

    ui.background(this, this.loc.arena);
    // soft vignette at the bottom for readability of controls
    const vg = this.add.graphics().setDepth(1);
    for (let i = 0; i < 12; i++) { vg.fillStyle(0x2a160a, 0.035); vg.fillRect(0, H - 150 + i * 6, W, 150 - i * 6); }

    this.views = {};
    this.battle.units.forEach(u => this._makeView(u));

    this._topUI();
    this._controls();
    this._updateTurnOrder();

    // intro banner then begin
    this.input.enabled = true;
    this._banner(`${this.loc.name} · Battle ${this.wave + 1}`, 'Fight!').then(() => this._loop());
  }

  // ── helpers ────────────────────────────────────────────────────
  wait(ms) { return new Promise(res => this.time.delayedCall(ms, res)); }
  tw(cfg) { return new Promise(res => this.tweens.add(Object.assign({}, cfg, { onComplete: () => { cfg.onComplete && cfg.onComplete(); res(); } }))); }

  _slotPos(side, slot) {
    const P = [{ x: 410, y: 500 }, { x: 235, y: 432 }, { x: 255, y: 580 }];
    const p = P[slot];
    return side === 'ally' ? { x: p.x, y: p.y } : { x: WT.W - p.x, y: p.y };
  }

  // ── unit views ─────────────────────────────────────────────────
  _makeView(u) {
    const { ui, COLORS: C } = WT;
    const pos = this._slotPos(u.side, u.slot);
    const v = { u, home: pos, hp: u.hp, shield: 0 };
    const c = this.add.container(pos.x, pos.y).setDepth(10 + pos.y / 10);

    const ring = this.add.image(0, 0, 'fx_ring').setScale(1.8, 0.6).setTint(u.side === 'ally' ? C.mint : C.pink).setAlpha(0);
    const shadow = this.add.ellipse(0, 0, 120, 30, 0x2a160a, 0.25);
    const spr = this.add.image(0, 0, 'unit_' + u.id).setOrigin(0.5, 1);
    const s = Math.min(190 / spr.width, 175 / spr.height);
    spr.setScale(s);
    if (u.side === 'enemy') spr.setFlipX(true);
    c.add([ring, shadow, spr]);
    v.baseScale = s;
    this.tweens.add({ targets: spr, scaleY: s * 1.03, scaleX: s * 0.985, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // HP bar above the head
    const top = -spr.displayHeight - 16;
    const bar = this.add.container(0, top);
    const bw = 124;
    const bg = this.add.graphics();
    bg.fillStyle(0x4e2a12, 0.75); bg.fillRoundedRect(-bw / 2 - 3, -9, bw + 6, 18, 9);
    bg.fillStyle(0xffffff, 0.9); bg.fillRoundedRect(-bw / 2, -6, bw, 12, 6);
    const fill = this.add.graphics();
    const lvl = ui.text(this, -bw / 2 - 2, -20, `Lv${u.level} ${u.name}`, 14, WT.TXT.cream, { stroke: '#4e2a12', strokeW: 4, ox: 0, weight: '700' });
    if (lvl.width > bw + 30) lvl.setScale((bw + 30) / lvl.width);
    const rDot = this.add.graphics();
    rDot.fillStyle(WT.RARITIES[u.rarity].color, 1); rDot.fillCircle(bw / 2 + 12, 0, 7); rDot.lineStyle(2, 0xffffff, 1); rDot.strokeCircle(bw / 2 + 12, 0, 7);
    const statusRow = this.add.container(-bw / 2, 20);
    bar.add([bg, fill, lvl, rDot, statusRow]);
    c.add(bar);

    v.c = c; v.spr = spr; v.ring = ring; v.bar = bar; v.fill = fill; v.bw = bw; v.statusRow = statusRow; v.shadow = shadow;
    this.views[u.uid] = v;
    this._drawHp(v);

    // tap to target enemies
    spr.setInteractive({ useHandCursor: u.side === 'enemy' });
    spr.on('pointerup', () => this._onUnitTap(u));

    // entrance
    c.x += u.side === 'ally' ? -260 : 260; c.alpha = 0;
    this.tweens.add({ targets: c, x: pos.x, alpha: 1, duration: 500, delay: 120 * u.slot, ease: 'Back.easeOut' });
    return v;
  }

  _drawHp(v) {
    const { COLORS: C } = WT;
    const u = v.u;
    const f = v.fill;
    const pct = Phaser.Math.Clamp(v.hp / u.maxHp, 0, 1);
    f.clear();
    const col = u.side === 'ally' ? (pct > 0.35 ? C.hp : 0xf2b84b) : C.hpEnemy;
    if (pct > 0) { f.fillStyle(col, 1); f.fillRoundedRect(-v.bw / 2, -6, Math.max(8, v.bw * pct), 12, 6); }
    f.fillStyle(0xffffff, 0.35); f.fillRoundedRect(-v.bw / 2 + 3, -5, Math.max(2, (v.bw - 6) * pct), 4, 2);
    if (v.shield > 0) {
      const sp = Math.min(1, v.shield / u.maxHp);
      f.fillStyle(C.shield, 0.95); f.fillRoundedRect(-v.bw / 2, -10, Math.max(6, v.bw * sp), 6, 3);
      f.lineStyle(1.5, 0x6fb6e6, 1); f.strokeRoundedRect(-v.bw / 2, -10, Math.max(6, v.bw * sp), 6, 3);
    }
  }

  _drawStatuses(v) {
    const row = v.statusRow;
    row.removeAll(true);
    let x = 0;
    Object.entries(v.u.statuses).forEach(([k, st]) => {
      const info = WT.STATUS_INFO[k];
      const t = WT.ui.text(this, 0, 0, `${info.name} ${st.turns}`, 11, '#ffffff', { weight: '700' });
      const w = t.width + 12;
      const g = this.add.graphics();
      g.fillStyle(Phaser.Display.Color.HexStringToColor(info.color).color, 1); g.fillRoundedRect(x, -9, w, 18, 9);
      t.setPosition(x + w / 2, 0);
      row.add([g, t]);
      x += w + 4;
    });
  }

  _syncView(v) {
    v.hp = v.u.hp; v.shield = v.u.shield;
    this._drawHp(v);
    this._drawStatuses(v);
  }

  // ── top UI ─────────────────────────────────────────────────────
  _topUI() {
    const { W, ui, COLORS: C, TXT } = WT;
    // flee
    const flee = ui.backButton(this, () => this._pauseMenu());
    flee.setDepth(500);

    // location chip
    ui.text(this, 96, 50, `${this.loc.name} · ${this.wave + 1}/3`, 20, TXT.cream, { stroke: '#4e2a12', strokeW: 5, ox: 0, weight: '700' }).setDepth(500);
    const syn = (s, x, ox) => s && ui.text(this, x, 82, `${s.name} · ${s.desc.split(': ')[1]}`, 15, TXT.cream, { stroke: '#4e2a12', strokeW: 4, ox, weight: '600' }).setDepth(500);
    syn(this.battle.allySynergy, 96, 0);
    syn(this.battle.enemySynergy, W - 24, 1);

    // auto toggle
    this.autoBtn = ui.imageButton(this, W - 260, 48, 'btn_auto', 150, 60, () => this._toggleAuto()).setDepth(500);
    this.autoGlow = this.add.graphics().setDepth(499);
    this._refreshAuto();

    // speed toggle
    this.speedBtn = ui.button(this, W - 105, 48, 110, 50, `${this.speed}×`, { color: 'cream', size: 24, onClick: () => this._toggleSpeed() }).setDepth(500);

    // turn order strip
    this.orderC = this.add.container(W / 2, 48).setDepth(500);
  }

  _refreshAuto() {
    const b = this.autoBtn;
    this.autoGlow.clear();
    if (this.auto) {
      this.autoGlow.fillStyle(WT.COLORS.mint, 0.9);
      this.autoGlow.fillRoundedRect(b.x - b.displayWidth / 2 - 6, b.y - b.displayHeight / 2 - 5, b.displayWidth + 12, b.displayHeight + 10, 22);
    }
    b.setAlpha(this.auto ? 1 : 0.75);
  }

  _toggleAuto() {
    this.auto = !this.auto;
    WT.save.settings.auto = this.auto; WT.persist();
    this._refreshAuto();
    WT.ui.toast(this, this.auto ? 'Auto battle on' : 'Auto battle off');
    if (this.auto && this.awaitingInput) {
      const c = this.battle.aiChoose(this.awaitingInput);
      this._choose(c.action, c.target);
    }
  }

  _toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
    WT.save.settings.speed = this.speed; WT.persist();
    this.tweens.timeScale = this.speed;
    this.time.timeScale = this.speed;
    this.speedBtn.setLabel(`${this.speed}×`);
  }

  _updateTurnOrder(currentUid) {
    const { ui, COLORS: C } = WT;
    const c = this.orderC;
    c.removeAll(true);
    const order = (currentUid ? [currentUid] : []).concat(this.battle.previewOrder(currentUid ? 5 : 6));
    const n = order.length, gap = 58;
    const panel = this.add.graphics();
    panel.fillStyle(0x2a160a, 0.45); panel.fillRoundedRect(-n * gap / 2 - 16, -28, n * gap + 32, 56, 28);
    c.add(panel);
    order.forEach((uid, i) => {
      const u = this.battle.get(uid);
      const x = -((n - 1) * gap) / 2 + i * gap;
      const r = i === 0 && currentUid ? 25 : 21;
      const g = this.add.graphics();
      g.fillStyle(u.side === 'ally' ? C.mintDark : C.pinkDark, 1); g.fillCircle(x, 0, r + 3);
      g.fillStyle(WT.RARITIES[u.rarity].glow, 1); g.fillCircle(x, 0, r);
      c.add(g);
      const img = this.add.image(x, 2, 'unit_' + u.id);
      img.setScale((r * 1.8) / Math.max(img.width, img.height));
      if (u.side === 'enemy') img.setFlipX(true);
      c.add(img);
      if (i === 0 && currentUid) {
        const arrow = this.add.graphics();
        arrow.fillStyle(0xffffff, 1); arrow.fillTriangle(x - 7, 32, x + 7, 32, x, 24);
        c.add(arrow);
      }
    });
  }

  // ── controls ───────────────────────────────────────────────────
  _controls() {
    const { W, H, ui, COLORS: C, TXT } = WT;
    const panel = this.add.container(0, 0).setDepth(600);
    const g = ui.panel(this, 230, H - 112, W - 460, 100, { radius: 26, fill: 0xfff6e8 });
    panel.add(g);
    this.ctlName = ui.text(this, 262, H - 82, '', 22, TXT.dark, { ox: 0, weight: '700' });
    this.ctlHint = ui.text(this, 262, H - 48, '', 16, TXT.brown, { ox: 0, wrap: 330, align: 'left', weight: '500' });
    this.atkBtn = ui.button(this, W - 520, H - 62, 170, 72, 'Attack', { color: 'caramel', sub: 'Basic hit', size: 26, onClick: () => this._choose('attack', this.target) });
    this.skillBtn = ui.button(this, W - 335, H - 62, 190, 72, 'Skill', { color: 'pink', sub: '', size: 22, onClick: () => this._choose('skill', this.target) });
    panel.add([this.ctlName, this.ctlHint, this.atkBtn, this.skillBtn]);
    this.ctlPanel = panel;
    panel.y = 140;
  }

  _showControls(actor) {
    const skill = WT.UNITS[actor.id].skill;
    const ready = this.battle.skillReady(actor);
    this.ctlName.setText(`${actor.name}'s turn`);
    this.ctlHint.setText(ready ? `${skill.name}: ${skill.desc}` : 'Tap an enemy to choose a target, then attack!');
    this.skillBtn.setLabel(skill.name.length > 14 ? skill.name.slice(0, 13) + '…' : skill.name);
    this.skillBtn.setSub(ready ? 'Ready!' : `Ready in ${actor.cd} turn${actor.cd > 1 ? 's' : ''}`);
    this.skillBtn.setEnabled(ready);
    this.tweens.add({ targets: this.ctlPanel, y: 0, duration: 220, ease: 'Back.easeOut' });
    if (ready) this.tweens.add({ targets: this.skillBtn, scale: 1.06, duration: 400, yoyo: true, repeat: 1 });
  }

  _hideControls() {
    this.tweens.add({ targets: this.ctlPanel, y: 140, duration: 180, ease: 'Quad.easeIn' });
  }

  _onUnitTap(u) {
    if (!this.awaitingInput || u.side !== 'enemy' || !u.alive) return;
    const valid = this.battle.validTargets(this.awaitingInput);
    if (!valid.includes(u)) {
      const t = valid[0];
      WT.audio.play('error');
      WT.ui.toast(this, `${t.name} is taunting — you must hit them first!`, WT.COLORS.red);
      return;
    }
    WT.audio.play('tap');
    this._setTarget(u.uid);
  }

  _setTarget(uid) {
    this.target = uid;
    if (!this.reticle) {
      this.reticle = this.add.container(0, 0).setDepth(300);
      // the container squashes the ring into an ellipse; the ring itself spins
      const r = this.add.image(0, 0, 'fx_ring').setTint(WT.COLORS.pinkDark);
      this.reticle.setScale(1.9, 0.7);
      const arrow = this.add.graphics();
      arrow.fillStyle(WT.COLORS.pinkDark, 1); arrow.fillTriangle(-14, -10, 14, -10, 0, 10);
      arrow.lineStyle(3, 0xffffff, 1); arrow.strokeTriangle(-14, -10, 14, -10, 0, 10);
      this.reticleArrow = arrow;
      this.reticle.add([r]);
      this.reticleArrowC = this.add.container(0, 0, [arrow]).setDepth(650);
      this.tweens.add({ targets: r, angle: 360, duration: 4000, repeat: -1 });
      this.tweens.add({ targets: arrow, y: -10, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const v = this.views[uid];
    this.reticle.setPosition(v.home.x, v.home.y).setVisible(true);
    this.reticleArrowC.setPosition(v.home.x, v.home.y - v.spr.displayHeight - 62).setVisible(true);
  }

  _hideReticle() {
    if (this.reticle) { this.reticle.setVisible(false); this.reticleArrowC.setVisible(false); }
  }

  // ── turn loop ──────────────────────────────────────────────────
  async _loop() {
    while (!this.battle.result && !this.ended) {
      const { actor, events, skip } = this.battle.nextTurn();
      this._updateTurnOrder(actor.uid);
      this._activeRing(actor);
      if (this.battle.inOvertime && !this._overtimeShown) {
        this._overtimeShown = true;
        WT.ui.toast(this, 'Overtime! Everyone\'s getting sleepy — damage is rising!', WT.COLORS.pinkDark);
      }
      if (events.length) await this._playEvents(actor, events);
      if (this.battle.result) break;
      if (skip) { await this.wait(350); continue; }

      let choice;
      if (actor.side === 'ally' && !this.auto) {
        choice = await this._awaitInput(actor);
      } else {
        await this.wait(actor.side === 'enemy' ? 320 : 200);
        choice = this.battle.aiChoose(actor);
      }
      if (this.ended) return;
      const evs = this.battle.act(actor, choice.action, choice.target);
      await this._playAction(actor, evs);
      Object.values(this.views).forEach(v => this._syncView(v));
      await this.wait(110);
    }
    if (!this.ended) this._finish();
  }

  _activeRing(actor) {
    Object.values(this.views).forEach(v => { this.tweens.killTweensOf(v.ring); v.ring.setAlpha(0); });
    const v = this.views[actor.uid];
    v.ring.setAlpha(0.9);
    this.tweens.add({ targets: v.ring, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: v.spr, y: -14, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
  }

  _awaitInput(actor) {
    return new Promise(res => {
      this.awaitingInput = actor;
      this._resolveInput = res;
      const valid = this.battle.validTargets(actor);
      if (!this.target || !valid.find(t => t.uid === this.target)) {
        const pick = this.battle.aiChoose(actor).target;
        this._setTarget(valid.find(t => t.uid === pick) ? pick : valid[0].uid);
      } else {
        this._setTarget(this.target);
      }
      this._showControls(actor);
      if (!WT.save.flags.battleTut) {
        WT.save.flags.battleTut = true; WT.persist();
        WT.ui.toast(this, 'Tap an enemy to target it, then press Attack!');
      }
    });
  }

  _choose(action, target) {
    if (!this.awaitingInput) return;
    const res = this._resolveInput;
    this.awaitingInput = null;
    this._resolveInput = null;
    this._hideControls();
    this._hideReticle();
    res({ action, target });
  }

  // ── action animation ───────────────────────────────────────────
  async _playAction(actor, events) {
    const head = events[0];
    const v = this.views[actor.uid];
    const rest = events.slice(1);
    if (head.type === 'attack') {
      const tv = this.views[head.tgt];
      await this._lunge(v, tv);
      await this._playEvents(actor, rest, true);
      await this._return(v);
    } else {
      const skill = WT.UNITS[actor.id].skill;
      WT.audio.play('skill');
      await this._skillBanner(v, head.name);
      const dmgStep = skill.fx.find(s => s.t === 'damage');
      if (dmgStep && dmgStep.target === 'one') {
        const firstHit = rest.find(e => e.type === 'damage');
        const tv = firstHit ? this.views[firstHit.tgt] : null;
        if (tv) await this._lunge(v, tv, true);
        await this._playEvents(actor, rest, true);
        if (tv) await this._return(v);
      } else {
        await this.tw({ targets: v.spr, y: -40, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
        await this._skillVfx(actor, skill, rest);
        await this._playEvents(actor, rest, true);
      }
    }
  }

  async _lunge(v, tv, big) {
    WT.audio.play('whoosh');
    const dx = (tv.home.x - v.home.x) * 0.62;
    const dy = (tv.home.y - v.home.y) * 0.62;
    v.c.setDepth(200);
    await this.tw({ targets: v.c, x: v.home.x + dx, y: v.home.y + dy, duration: big ? 200 : 170, ease: 'Quad.easeIn' });
  }

  async _return(v) {
    await this.tw({ targets: v.c, x: v.home.x, y: v.home.y, duration: 220, ease: 'Quad.easeOut' });
    v.c.setDepth(10 + v.home.y / 10);
  }

  async _skillBanner(v, name) {
    const { ui } = WT;
    const r = ui.ribbon(this, v.home.x, v.home.y - v.spr.displayHeight - 70, name, { size: 22, h: 42, minW: 160, color: WT.COLORS.pink, dark: WT.COLORS.pinkDark }).setDepth(700);
    r.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: r, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: r, alpha: 0, y: r.y - 20, delay: 900, duration: 300, onComplete: () => r.destroy() });
    const glow = this.add.image(v.home.x, v.home.y - v.spr.displayHeight / 2, 'fx_dot').setTint(WT.RARITIES[v.u.rarity].glow).setScale(2).setAlpha(0.9).setDepth(v.c.depth - 1);
    this.tweens.add({ targets: glow, scale: 9, alpha: 0, duration: 600, onComplete: () => glow.destroy() });
    await this.wait(380);
  }

  /** Projectile / area effects that play before the skill's numbers resolve. */
  async _skillVfx(actor, skill, events) {
    const v = this.views[actor.uid];
    const from = { x: v.home.x, y: v.home.y - v.spr.displayHeight * 0.6 };
    const kinds = new Set(events.map(e => e.type));
    const dmgTargets = [...new Set(events.filter(e => e.type === 'damage').map(e => e.tgt))];
    const tint = { mage: 0xc9a5ff, striker: 0xffd27a, tank: 0xffe08a, support: 0xffb3cf }[actor.role];
    const tex = actor.id === 'polar_barista' ? 'fx_snow' : actor.faction === 'pastry' ? 'fx_spark' : 'fx_spark';

    if (dmgTargets.length) {
      WT.audio.play(actor.id === 'polar_barista' ? 'freeze' : 'magic');
      const shots = dmgTargets.map((uid, i) => {
        const tv = this.views[uid];
        const p = this.add.image(from.x, from.y, tex).setTint(actor.id === 'creme_phoenix' ? 0xffa64d : tint).setScale(0.6).setDepth(650);
        return this.tw({ targets: p, x: tv.home.x, y: tv.home.y - tv.spr.displayHeight * 0.5, angle: 360, scale: 0.9, duration: 320, delay: i * 70, ease: 'Quad.easeIn', onComplete: () => p.destroy() });
      });
      await Promise.all(shots);
    }
    if (kinds.has('heal')) WT.audio.play('heal');
    if (kinds.has('shield')) WT.audio.play('shield');
  }

  /** Resolve a list of engine events visually. */
  async _playEvents(actor, events, isAction) {
    for (const ev of events) {
      const v = this.views[ev.tgt];
      switch (ev.type) {
        case 'damage':
        case 'burn': {
          v.shield = Math.max(0, v.shield - ev.absorbed);
          v.hp = Math.max(0, v.hp - ev.dealt);
          this._drawHp(v);
          if (ev.type === 'burn') { WT.audio.play('burn'); this._burst(v, 'fx_dot', 0xff9a4d, 8); }
          else { WT.audio.play(ev.crit ? 'crit' : 'hit'); this._burst(v, v.u.faction === 'pastry' ? 'fx_crumb' : 'fx_spark', v.u.faction === 'pastry' ? 0xf3c98b : 0xffffff, ev.crit ? 10 : 6); }
          this._hitFlash(v, ev.crit);
          if (ev.absorbed) this._float(v, `-${ev.absorbed}`, '#5aa7dc', 22, -30);
          if (ev.dealt) this._float(v, `${ev.dealt}`, ev.type === 'burn' ? '#e0752d' : ev.crit ? '#f4b400' : '#ffffff', ev.crit ? 40 : 30, 0, ev.crit ? 'CRIT!' : null);
          if (ev.killed) await this._ko(v);
          await this.wait(ev.crit ? 260 : 170);
          break;
        }
        case 'heal': {
          v.hp = Math.min(v.u.maxHp, v.hp + ev.amount);
          this._drawHp(v);
          this._float(v, `+${ev.amount}`, '#5fbf5a', 28);
          this._rise(v, 'fx_heart', 0xff8fb5, 6);
          await this.wait(140);
          break;
        }
        case 'shield': {
          v.shield = Math.max(v.shield, ev.amount);
          this._drawHp(v);
          const hx = this.add.image(v.home.x, v.home.y - v.spr.displayHeight * 0.5, 'fx_hex').setTint(0xffd36b).setAlpha(0).setScale(1).setDepth(v.c.depth + 1);
          this.tweens.add({ targets: hx, alpha: { from: 0.9, to: 0 }, scale: 2.6, duration: 700, onComplete: () => hx.destroy() });
          this._float(v, 'Shield', '#3f87c2', 22, -20);
          await this.wait(120);
          break;
        }
        case 'status': {
          const info = WT.STATUS_INFO[ev.status];
          if (ev.status === 'stun') { WT.audio.play('freeze'); this._burst(v, 'fx_snow', 0xbfe9ff, 8); }
          if (ev.status === 'atkUp') this._rise(v, 'fx_spark', 0xffd36b, 5);
          if (ev.status === 'taunt') {
            const t = this.add.image(v.home.x, v.home.y - v.spr.displayHeight * 0.5, 'fx_ring').setTint(0xe0605a).setDepth(v.c.depth + 1);
            this.tweens.add({ targets: t, scale: 3, alpha: 0, duration: 600, onComplete: () => t.destroy() });
          }
          this._float(v, info.name + '!', info.color, 22, -24);
          this._drawStatuses(v);
          await this.wait(110);
          break;
        }
        case 'statusEnd': this._drawStatuses(v); break;
        case 'cleanse': this._float(v, 'Cleansed', '#5fbf5a', 20, -24); this._drawStatuses(v); break;
        case 'stunned':
          this._float(v, 'Frozen!', '#55b9e0', 26, -10);
          WT.audio.play('freeze');
          await this.tw({ targets: v.c, x: v.home.x + 6, duration: 50, yoyo: true, repeat: 3 });
          break;
        case 'revive': {
          WT.audio.play('magic');
          v.hp = ev.hp; this._drawHp(v);
          this._rise(v, 'fx_spark', 0xffa64d, 14);
          this._float(v, 'Reborn!', '#e0752d', 30, -30);
          await this.tw({ targets: v.spr, scaleX: v.baseScale * 1.25, scaleY: v.baseScale * 1.25, duration: 220, yoyo: true });
          break;
        }
      }
    }
  }

  _hitFlash(v, crit) {
    v.spr.setTintFill(0xffffff);
    this.time.delayedCall(70, () => v.spr.clearTint());
    const dir = v.u.side === 'ally' ? -1 : 1;
    this.tweens.add({ targets: v.spr, x: dir * (crit ? 18 : 10), duration: 60, yoyo: true, ease: 'Quad.easeOut' });
    if (crit) this.cameras.main.shake(140, 0.006);
  }

  _float(v, str, color, size, dy = 0, label) {
    const x = v.home.x + Phaser.Math.Between(-18, 18);
    const y = v.home.y - v.spr.displayHeight * 0.65 + dy;
    const t = WT.ui.text(this, x, y, str, size, color, { stroke: '#4e2a12', strokeW: Math.max(4, size / 6), weight: '700' }).setDepth(900);
    t.setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 56, alpha: 0, delay: 420, duration: 520, onComplete: () => t.destroy() });
    if (label) {
      const l = WT.ui.text(this, x, y - size, label, 18, '#ffe27a', { stroke: '#a54866', strokeW: 4, weight: '700' }).setDepth(900);
      this.tweens.add({ targets: l, y: l.y - 50, alpha: 0, delay: 420, duration: 520, onComplete: () => l.destroy() });
    }
  }

  _burst(v, key, tint, n) {
    const cx = v.home.x, cy = v.home.y - v.spr.displayHeight * 0.5;
    for (let i = 0; i < n; i++) {
      const p = this.add.image(cx, cy, key).setTint(tint).setScale(Phaser.Math.FloatBetween(0.25, 0.5)).setDepth(800);
      const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(40, 90);
      this.tweens.add({ targets: p, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, alpha: 0, angle: 180, duration: 420, ease: 'Quad.easeOut', onComplete: () => p.destroy() });
    }
  }

  _rise(v, key, tint, n) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(v.home.x + Phaser.Math.Between(-40, 40), v.home.y - Phaser.Math.Between(10, 60), key).setTint(tint).setScale(0.35).setAlpha(0).setDepth(800);
      this.tweens.add({ targets: p, y: p.y - 90, alpha: { from: 1, to: 0 }, duration: 800, delay: i * 60, onComplete: () => p.destroy() });
    }
  }

  async _ko(v) {
    WT.audio.play('ko');
    v.statusRow.removeAll(true);
    this.tweens.killTweensOf(v.spr);
    this.tweens.add({ targets: v.bar, alpha: 0, duration: 300 });
    this.tweens.add({ targets: v.ring, alpha: 0, duration: 200 });
    await this.tw({ targets: v.spr, angle: v.u.side === 'ally' ? -80 : 80, alpha: 0.35, y: 10, duration: 420, ease: 'Quad.easeIn' });
    v.spr.setTint(0x9a8a80);
    if (this.target === v.u.uid) this.target = null;
  }

  // ── banners & menus ────────────────────────────────────────────
  _banner(title, sub) {
    const { W, H, ui } = WT;
    const c = this.add.container(W / 2, H / 2 - 40).setDepth(950);
    const r = ui.ribbon(this, 0, 0, title, { size: 30, h: 60 });
    const s = ui.text(this, 0, 64, sub, 54, WT.TXT.cream, { stroke: '#a54866', strokeW: 9, weight: '700' });
    c.add([r, s]);
    c.setScale(0.5).setAlpha(0);
    return new Promise(res => {
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
      this.tweens.add({ targets: c, alpha: 0, scale: 1.1, delay: 1100, duration: 260, onComplete: () => { c.destroy(); res(); } });
    });
  }

  _pauseMenu() {
    if (this.ended) return;
    const { ui } = WT;
    const prevT = this.time.timeScale;
    this.time.paused = true; this.tweens.pauseAll();
    const m = ui.modal(this, 480, 300, 'Paused', { onClose: () => { this.time.paused = false; this.tweens.resumeAll(); } });
    m.box.add(ui.text(this, 0, -40, 'Retreat to the map?\nThis battle won\'t count.', 22, WT.TXT.dark, { lineSpacing: 6 }));
    m.box.add(ui.button(this, -110, 70, 180, 58, 'Keep going', { color: 'mint', size: 21, onClick: () => m.close() }));
    m.box.add(ui.button(this, 110, 70, 180, 58, 'Retreat', { color: 'pink', size: 21, onClick: () => {
      this.ended = true; this.time.paused = false; this.tweens.resumeAll(); this.time.timeScale = prevT;
      WT.go(this, 'MapScene', { openLoc: this.locIdx });
    } }));
  }

  // ── results ────────────────────────────────────────────────────
  _finish() {
    this.ended = true;
    this._hideControls(); this._hideReticle();
    Object.values(this.views).forEach(v => { this.tweens.killTweensOf(v.ring); v.ring.setAlpha(0); });
    this.tweens.timeScale = 1; this.time.timeScale = 1;
    const win = this.battle.result === 'win';
    WT.save.stats.battles++;
    if (win) {
      WT.save.stats.wins++;
      // victory hop
      Object.values(this.views).filter(v => v.u.side === 'ally' && v.u.alive)
        .forEach((v, i) => this.tweens.add({ targets: v.spr, y: -30, duration: 220, yoyo: true, repeat: 3, delay: i * 90, ease: 'Quad.easeOut' }));
      WT.audio.play('victory');
    } else {
      WT.audio.play('defeat');
    }
    this.time.delayedCall(900, () => win ? this._victory() : this._defeat());
  }

  _victory() {
    const { ui, COLORS: C, TXT } = WT;
    const stars = this.battle.starsEarned();
    const key = this.loc.id + ':' + this.wave;
    const prev = WT.save.progress[key] || 0;
    const firstClear = prev === 0;
    const rw = WT.stageRewards(this.locIdx, this.wave, firstClear);
    WT.save.progress[key] = Math.max(prev, stars);
    WT.save.honey += rw.honey;
    WT.save.heartstones += rw.heartstones;
    const levelUps = {};
    WT.save.team.filter(Boolean).forEach(id => { levelUps[id] = WT.giveXp(id, rw.xp); });
    const unlockedNext = this.wave === 2 && firstClear && this.locIdx + 1 < WT.LOCATIONS.length;
    WT.persist();

    const m = ui.modal(this, 760, 560, 'Victory!', { closeButton: false, tapOutside: false });
    // stars
    for (let i = 0; i < 3; i++) {
      const sx = (i - 1) * 110, sy = -170 + (i === 1 ? -14 : 0);
      m.box.add(ui.star(this, sx, sy, 42, 0x000000, 0.15));
      if (i < stars) {
        const st = ui.star(this, sx, sy, 42, C.gold, 1);
        st.setScale(0);
        m.box.add(st);
        this.tweens.add({ targets: st, scale: 1, duration: 360, delay: 300 + i * 260, ease: 'Back.easeOut', onStart: () => WT.audio.play('coin') });
      }
    }
    // rewards
    const rwY = -80;
    const hi = this.add.image(-150, rwY, 'icon_honey'); hi.setScale(44 / hi.height); m.box.add(hi);
    m.box.add(ui.text(this, -120, rwY, `+${rw.honey}`, 28, TXT.brown, { ox: 0, weight: '700' }));
    if (rw.heartstones) {
      const gi = this.add.image(60, rwY, 'icon_heartstone'); gi.setScale(44 / gi.height); m.box.add(gi);
      m.box.add(ui.text(this, 90, rwY, `+${rw.heartstones}`, 28, TXT.pink, { ox: 0, weight: '700' }));
    }
    // team xp
    WT.save.team.filter(Boolean).forEach((id, i) => {
      const x = (i - 1) * 200, y = 40;
      const card = ui.unitCard(this, x, y, 110, 140, id, { level: WT.save.roster[id].level, stars: WT.save.roster[id].stars, compact: true });
      m.box.add(card);
      const r = WT.save.roster[id];
      const need = WT.xpToNext(r.level);
      const pct = r.level >= WT.MAX_LEVEL ? 1 : r.xp / need;
      const bar = this.add.graphics();
      bar.fillStyle(0x4e2a12, 0.6); bar.fillRoundedRect(x - 55, y + 80, 110, 12, 6);
      bar.fillStyle(C.sky, 1); bar.fillRoundedRect(x - 55, y + 80, Math.max(10, 110 * pct), 12, 6);
      m.box.add(bar);
      m.box.add(ui.text(this, x, y + 104, `+${rw.xp} XP`, 16, TXT.brown, { weight: '600' }));
      if (levelUps[id]) {
        const lu = ui.text(this, x, y - 84, 'Level up!', 20, '#ffe27a', { stroke: '#a54866', strokeW: 5, weight: '700' });
        m.box.add(lu);
        this.tweens.add({ targets: lu, y: lu.y - 8, duration: 500, yoyo: true, repeat: -1 });
        this.time.delayedCall(900, () => WT.audio.play('levelUp'));
      }
    });

    // buttons
    const next = this._nextStage();
    m.box.add(ui.button(this, -240, 220, 170, 60, 'Map', { color: 'cream', onClick: () => WT.go(this, 'MapScene', { openLoc: next ? next.locIdx : this.locIdx }) }));
    m.box.add(ui.button(this, 0, 220, 170, 60, 'Retry', { color: 'caramel', onClick: () => WT.go(this, 'BattleScene', { locIdx: this.locIdx, wave: this.wave }) }));
    const nb = ui.button(this, 240, 220, 190, 60, next ? 'Next battle' : 'Café', { color: 'mint', onClick: () => next ? WT.go(this, 'BattleScene', next) : WT.go(this, 'CafeScene') });
    m.box.add(nb);
    if (unlockedNext) {
      const nl = WT.LOCATIONS[this.locIdx + 1];
      const t = ui.text(this, 0, 168, `New area unlocked: ${nl.name}!`, 20, TXT.pink, { weight: '700' });
      m.box.add(t);
    }
    if (this.locIdx === WT.LOCATIONS.length - 1 && this.wave === 2 && firstClear) {
      this.time.delayedCall(1200, () => WT.dialog(this, [
        'You saved the heartstone reserve! Winnie\'s Town is cosy and calm again — thanks to you.',
        'Keep collecting friends and chasing three stars everywhere. The café will always have a seat for you!',
      ]));
    }
  }

  _nextStage() {
    if (this.wave < 2) return { locIdx: this.locIdx, wave: this.wave + 1 };
    if (this.locIdx + 1 < WT.LOCATIONS.length && WT.locationUnlocked(this.locIdx + 1)) return { locIdx: this.locIdx + 1, wave: 0 };
    return null;
  }

  _defeat() {
    const { ui, TXT } = WT;
    const m = ui.modal(this, 700, 470, 'Defeated…', { closeButton: false, tapOutside: false });
    const helper = this.add.image(-230, 20, 'npc_winnie'); helper.setScale(170 / helper.height); m.box.add(helper);
    const tips = [];
    if (WT.save.heartstones >= WT.GACHA.single) tips.push('• Summon new friends at the Wishing Oven');
    tips.push('• Level up your team with honey treats');
    if (!WT.save.team.some(id => WT.UNITS[id] && WT.UNITS[id].role === 'tank')) tips.push('• Bring a Tank to soak up hits');
    if (!WT.save.team.some(id => WT.UNITS[id] && WT.UNITS[id].role === 'support')) tips.push('• A Support can heal your team');
    tips.push('• Earlier battles can be replayed for honey');
    m.box.add(ui.text(this, -120, -70, 'Don\'t worry, the pastries play rough!', 22, TXT.dark, { ox: 0, weight: '700' }));
    m.box.add(ui.text(this, -120, 0, tips.slice(0, 4).join('\n'), 19, TXT.brown, { ox: 0, oy: 0.3, align: 'left', lineSpacing: 8, weight: '500' }));
    m.box.add(ui.button(this, -220, 170, 170, 60, 'Map', { color: 'cream', onClick: () => WT.go(this, 'MapScene', { openLoc: this.locIdx }) }));
    m.box.add(ui.button(this, 0, 170, 170, 60, 'Team', { color: 'caramel', onClick: () => WT.go(this, 'TeamScene') }));
    m.box.add(ui.button(this, 220, 170, 170, 60, 'Retry', { color: 'mint', onClick: () => WT.go(this, 'BattleScene', { locIdx: this.locIdx, wave: this.wave }) }));
    // a little honey even on defeat so progress never stalls (flat, so it can't be farmed)
    const consolation = 20;
    WT.save.honey += consolation; WT.persist();
    m.box.add(ui.text(this, 0, 110, `Winnie packed you a snack: +${consolation} honey`, 17, TXT.pink, { weight: '600' }));
  }
}
