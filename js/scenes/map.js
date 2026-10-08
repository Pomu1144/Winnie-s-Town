/* ================================================================
 *  MapScene — the town map. Each building is a location with three
 *  battles; clearing the last one unlocks the next location.
 * ================================================================ */
class MapScene extends Phaser.Scene {
  constructor() { super('MapScene'); }

  create(data) {
    const { ui } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(350, 42, 22, 10);
    WT.audio.setMood('cafe');
    this.bg = ui.background(this, 'bg_map');
    this._clouds();

    const frontier = this._frontier();
    WT.LOCATIONS.forEach((loc, i) => this._node(loc, i, i === frontier));

    this.bar = ui.topBar(this, { back: true });
    ui.backButton(this, () => WT.go(this, 'CafeScene')).setDepth(450);

    // team power chip between the stars and honey pills
    const chip = this.add.container(470, 40).setDepth(400);
    const cg = this.add.graphics();
    cg.fillStyle(0x4e2a12, 0.55); cg.fillRoundedRect(-95, -20, 190, 40, 20);
    chip.add(cg);
    chip.add(ui.text(this, 0, 0, `Team power ${WT.teamPower()}`, 18, WT.TXT.cream, { weight: '700' }));

    if (data && data.openLoc != null) this.time.delayedCall(250, () => this._stagePanel(data.openLoc));
  }

  /** Index of the first location that still has an uncleared battle. */
  _frontier() {
    for (let i = 0; i < WT.LOCATIONS.length; i++) {
      if (!WT.locationUnlocked(i)) return i - 1;
      if (WT.stageStarsEarned(WT.LOCATIONS[i].id, 2) === 0) return i;
    }
    return -1;
  }

  _clouds() {
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(Phaser.Math.Between(0, WT.W), Phaser.Math.Between(40, 260), 'fx_dot').setTint(0xffffff).setAlpha(0.5).setScale(Phaser.Math.FloatBetween(3, 6), Phaser.Math.FloatBetween(1.2, 2));
      this.tweens.add({ targets: c, x: c.x + 200, duration: Phaser.Math.Between(16000, 26000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  _node(loc, idx, isFrontier) {
    const { ui, COLORS: C } = WT;
    const p = ui.bgPoint(this.bg, loc.x, loc.y);
    const unlocked = WT.locationUnlocked(idx);
    const stars = [0, 1, 2].reduce((s, w) => s + WT.stageStarsEarned(loc.id, w), 0);

    const hit = this.add.zone(p.x, p.y, 200, 150).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      if (!unlocked) { WT.audio.play('error'); ui.toast(this, `Clear ${WT.LOCATIONS[idx - 1].name} first!`); return; }
      this._stagePanel(idx);
    });

    if (!unlocked) {
      const g = this.add.graphics();
      g.fillStyle(0x3a2414, 0.45); g.fillEllipse(p.x, p.y + 10, 230, 150);
      // padlock
      g.fillStyle(0x4e2a12, 0.3); g.fillRoundedRect(p.x - 22, p.y - 6, 48, 40, 8);
      g.lineStyle(7, C.cream, 1); g.beginPath(); g.arc(p.x, p.y - 10, 14, Math.PI, 0); g.strokePath();
      g.fillStyle(C.cream, 1); g.fillRoundedRect(p.x - 24, p.y - 10, 48, 40, 8);
      g.fillStyle(C.caramel, 1); g.fillCircle(p.x, p.y + 6, 6); g.fillRect(p.x - 2, p.y + 6, 4, 12);
      return;
    }

    // star counter plaque
    const plaque = this.add.container(p.x, p.y + 70);
    const pg = this.add.graphics();
    pg.fillStyle(0x4e2a12, 0.25); pg.fillRoundedRect(-44, -13, 88, 30, 15);
    pg.fillStyle(stars === 9 ? C.gold : C.cream, 1); pg.fillRoundedRect(-46, -16, 92, 30, 15);
    pg.lineStyle(2, C.caramel, 1); pg.strokeRoundedRect(-46, -16, 92, 30, 15);
    plaque.add(pg);
    plaque.add(ui.star(this, -22, -1, 9, C.gold, 1));
    plaque.add(ui.text(this, 10, -1, `${stars}/9`, 17, WT.TXT.brown, { weight: '700' }));

    if (isFrontier) {
      const pin = this.add.container(p.x, Math.max(p.y - 90, 96));   // stay clear of the top bar
      const g = this.add.graphics();
      g.fillStyle(0x4e2a12, 0.25); g.fillEllipse(0, 58, 30, 10);
      g.fillStyle(C.pinkDark, 1); g.fillCircle(0, 0, 22); g.fillTriangle(-19, 10, 19, 10, 0, 44);
      g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, 10);
      pin.add(g);
      this.tweens.add({ targets: pin, y: pin.y - 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const ring = this.add.image(p.x, p.y + 10, 'fx_ring').setTint(C.pink).setAlpha(0.8);
      this.tweens.add({ targets: ring, scale: { from: 1.5, to: 3 }, alpha: { from: 0.7, to: 0 }, duration: 1500, repeat: -1 });
    }
  }

  // ── stage select ───────────────────────────────────────────────
  _stagePanel(idx) {
    const { ui, COLORS: C, TXT } = WT;
    const loc = WT.LOCATIONS[idx];
    const m = ui.modal(this, 900, 560, loc.name);

    // arena preview strip
    const thumb = this.add.image(0, -188, loc.arena);
    thumb.setScale(840 / thumb.width);
    const tmask = this.make.graphics({ add: false });
    tmask.fillStyle(0xffffff); tmask.fillRoundedRect(WT.W / 2 - 420, WT.H / 2 - 236, 840, 96, 16);
    thumb.setMask(tmask.createGeometryMask());
    m.box.add(thumb);
    const shade = this.add.graphics(); shade.fillStyle(0x2a160a, 0.35); shade.fillRoundedRect(-420, -236, 840, 96, 16);
    m.box.add(shade);
    m.box.add(ui.text(this, 0, -188, loc.blurb, 20, TXT.cream, { stroke: '#4e2a12', strokeW: 4, wrap: 780, weight: '600' }));

    const power = WT.teamPower();
    for (let w = 0; w < 3; w++) {
      const y = -80 + w * 112;
      const open = WT.waveUnlocked(idx, w);
      const earned = WT.stageStarsEarned(loc.id, w);
      const lvl = WT.stageLevel(idx, w);
      const row = this.add.graphics();
      row.fillStyle(open ? C.paper : 0xe9ddd0, 1); row.fillRoundedRect(-420, y - 48, 840, 96, 18);
      row.lineStyle(3, open ? C.caramel : C.grey, 1); row.strokeRoundedRect(-420, y - 48, 840, 96, 18);
      m.box.add(row);

      m.box.add(ui.text(this, -395, y - 16, w === 2 ? `Battle ${w + 1} · Boss` : `Battle ${w + 1}`, 22, open ? TXT.dark : TXT.grey, { ox: 0, weight: '700' }));
      m.box.add(ui.text(this, -395, y + 18, `Enemy Lv ${lvl}`, 17, open ? TXT.brown : TXT.grey, { ox: 0 }));
      for (let s = 0; s < 3; s++) m.box.add(ui.star(this, -270 + s * 26, y + 18, 10, s < earned ? C.gold : 0x000000, s < earned ? 1 : 0.18));

      // enemy portraits
      loc.waves[w].forEach((id, k) => {
        const cx = -110 + k * 82;
        const r = WT.RARITIES[WT.UNITS[id].rarity];
        const cg = this.add.graphics();
        cg.fillStyle(r.color, 1); cg.fillCircle(cx, y, 36);
        cg.fillStyle(r.glow, 1); cg.fillCircle(cx, y, 31);
        m.box.add(cg);
        const pi = this.add.image(cx, y + 2, 'unit_' + id);
        pi.setScale(58 / Math.max(pi.width, pi.height));
        if (!open) pi.setTintFill(0x9a8676).setAlpha(0.6);
        m.box.add(pi);
      });

      // rewards
      const rw = WT.stageRewards(idx, w, earned === 0);
      const rx = 170;
      const hi = this.add.image(rx, y - 14, 'icon_coin'); hi.setScale(30 / hi.height); m.box.add(hi);
      m.box.add(ui.text(this, rx + 18, y - 14, String(rw.honey), 18, TXT.brown, { ox: 0, weight: '700' }));
      if (rw.heartstones) {
        const gi = this.add.image(rx, y + 18, 'icon_heartstone'); gi.setScale(30 / gi.height); m.box.add(gi);
        m.box.add(ui.text(this, rx + 18, y + 18, `${rw.heartstones} first clear`, 16, TXT.pink, { ox: 0, weight: '700' }));
      }

      const enemyPower = loc.waves[w].reduce((s, id) => s + WT.powerOf(id, lvl, 1), 0) * WT.ENEMY_SCALE;
      const ratio = power / enemyPower;
      const btn = ui.button(this, 345, y, 120, 58, open ? 'Fight!' : 'Locked', {
        color: !open ? 'grey' : ratio >= 1.05 ? 'mint' : ratio >= 0.85 ? 'caramel' : 'pink',
        size: 22, sfx: 'open',
        onClick: () => { m.close(); this._startBattle(idx, w); },
      });
      if (!open) btn.setEnabled(false);
      m.box.add(btn);
      if (open) {
        const label = ratio >= 1.05 ? 'Easy' : ratio >= 0.85 ? 'Fair' : 'Tough';
        m.box.add(ui.text(this, 345, y + 38, label, 14, ratio >= 1.05 ? '#2f6e48' : ratio >= 0.85 ? TXT.brown : TXT.pink, { weight: '700' }));
      }
    }
  }

  _startBattle(locIdx, wave) {
    if (!WT.save.team.filter(Boolean).length) {
      WT.ui.toast(this, 'Pick at least one friend in the Team Manager!');
      return;
    }
    WT.go(this, 'BattleScene', { locIdx, wave });
  }
}
