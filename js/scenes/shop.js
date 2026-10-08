/* ================================================================
 *  ShopScene — the Wishing Oven (summons) and the café decor store.
 * ================================================================ */
class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create(data) {
    const { ui } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(300, 42, 22, 10);
    WT.audio.setMood('cafe');
    this.tab = (data && data.tab) || 'summon';

    ui.background(this, 'bg_shop');
    ui.sparkles(this, 12, 0xffd6e6);
    this.bar = ui.topBar(this, { noShopLink: true, hideStars: true });
    ui.backButton(this, () => WT.go(this, 'CafeScene')).setDepth(450);

    [['summon', 'Wishing Oven'], ['decor', 'Café Decor']].forEach(([k, label], i) => {
      ui.button(this, 260 + i * 210, 50, 196, 50, label, {
        color: this.tab === k ? 'pink' : 'cream', size: 21,
        onClick: () => { if (this.tab !== k) this.scene.restart({ tab: k }); },
      }).setDepth(450);
    });

    if (this.tab === 'summon') this._summonTab(); else this._decorTab();
  }

  // ── summon tab ─────────────────────────────────────────────────
  _summonTab() {
    const { ui, TXT, COLORS: C } = WT;
    // oven on a soft pedestal
    const halo = this.add.image(400, 400, 'fx_dot').setTint(0xffe2ef).setScale(16).setAlpha(0.8);
    this.tweens.add({ targets: halo, scale: 17.5, alpha: 0.6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const ped = this.add.ellipse(400, 640, 360, 60, 0xd06d8d, 0.25);
    this.oven = this.add.image(400, 640, 'oven').setOrigin(0.5, 1);
    this.oven.setScale(470 / this.oven.height);
    this.tweens.add({ targets: this.oven, scaleY: this.oven.scaleY * 1.015, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // steam hearts
    this.time.addEvent({ delay: 900, loop: true, callback: () => {
      const h = this.add.image(400 + 120, 200, 'fx_heart').setTint(0xffb7cf).setScale(0.25).setAlpha(0.9);
      this.tweens.add({ targets: h, y: 120, x: h.x + Phaser.Math.Between(-20, 20), alpha: 0, scale: 0.4, duration: 1800, onComplete: () => h.destroy() });
    } });
    ui.ribbon(this, 400, 140, 'The Wishing Oven', { size: 28, h: 54, color: C.pink, dark: C.pinkDark });

    // info panel
    const px = 700, py = 110, pw = 550, ph = 590;
    ui.panel(this, px, py, pw, ph, { radius: 28 });
    ui.text(this, px + pw / 2, py + 40, 'Summon rates', 24, TXT.dark, { weight: '700' });
    WT.RARITY_ORDER.slice().reverse().forEach((k, i) => {
      const r = WT.RARITIES[k];
      const y = py + 86 + i * 40;
      const tag = ui.rarityTag(this, px + 110, y, k, 15);
      const count = WT.UNIT_IDS.filter(id => WT.UNITS[id].rarity === k).length;
      ui.text(this, px + 210, y, `${r.weight}%`, 20, TXT.dark, { ox: 0, weight: '700' });
      ui.text(this, px + 300, y, `${count} friends`, 17, TXT.brown, { ox: 0 });
      // owned dots
      const owned = WT.UNIT_IDS.filter(id => WT.UNITS[id].rarity === k && WT.owned(id)).length;
      for (let d = 0; d < count; d++) {
        const g = this.add.graphics();
        g.fillStyle(d < owned ? r.color : 0xe6d8c8, 1); g.fillCircle(px + 420 + d * 22, y, 8);
      }
    });

    const left = WT.GACHA.pity - WT.save.pity;
    const pg = this.add.graphics();
    pg.fillStyle(0xfff0c9, 1); pg.fillRoundedRect(px + 30, py + 296, pw - 60, 58, 16);
    pg.lineStyle(3, C.gold, 1); pg.strokeRoundedRect(px + 30, py + 296, pw - 60, 58, 16);
    ui.text(this, px + pw / 2, py + 325, `Legendary or better guaranteed within ${left} summon${left === 1 ? '' : 's'}`, 18, TXT.gold, { weight: '700' });

    // featured mythics
    ui.text(this, px + pw / 2, py + 382, 'Mythic friends', 18, TXT.pink, { weight: '700' });
    ['aurora_bear', 'creme_phoenix'].forEach((id, i) => {
      const im = this.add.image(px + pw / 2 - 70 + i * 140, py + 430, 'unit_' + id);
      im.setScale(80 / im.height);
      if (!WT.owned(id)) im.setTintFill(0xc7a6b3).setAlpha(0.7);
      this.tweens.add({ targets: im, y: im.y - 5, duration: 1000 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const can1 = WT.save.heartstones >= WT.GACHA.single;
    const can10 = WT.save.heartstones >= WT.GACHA.ten;
    const b1 = ui.button(this, px + 145, py + 528, 230, 78, 'Summon ×1', { color: 'caramel', sub: `${WT.GACHA.single} heartstones`, size: 26, sfx: 'open', onClick: () => this._summon(1) });
    const b10 = ui.button(this, px + pw - 145, py + 528, 230, 78, 'Summon ×10', { color: 'pink', sub: `${WT.GACHA.ten} · 1 Epic+ guaranteed`, size: 26, sfx: 'open', onClick: () => this._summon(10) });
    b1.setEnabled(can1); b10.setEnabled(can10);
    if (can1) this.tweens.add({ targets: can10 ? b10 : b1, scale: 1.04, duration: 700, yoyo: true, repeat: -1 });
  }

  _summon(n) {
    const cost = n === 10 ? WT.GACHA.ten : WT.GACHA.single;
    if (WT.save.heartstones < cost) { WT.ui.toast(this, 'Not enough heartstones — win battles to earn more!'); return; }
    WT.save.heartstones -= cost;
    const results = WT.summon(n);
    this.bar.refresh();
    this._summonAnim(results);
  }

  async _summonAnim(results) {
    const { W, H, ui, COLORS: C } = WT;
    this.input.enabled = false;
    const best = Math.max(...results.map(r => WT.RARITIES[WT.UNITS[r.id].rarity].tier));
    const bestColor = WT.RARITIES[WT.RARITY_ORDER[best - 1]].color;
    const layer = this.add.container(0, 0).setDepth(1000);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x2a160a, 0).setInteractive();
    layer.add(dim);
    this.tweens.add({ targets: dim, fillAlpha: 0.75, duration: 300 });

    const oven = this.add.image(W / 2, H / 2 + 220, 'oven').setOrigin(0.5, 1);
    oven.setScale(440 / oven.height);
    layer.add(oven);
    const glow = this.add.image(W / 2, H / 2 - 20, 'fx_dot').setTint(bestColor).setScale(2).setAlpha(0);
    layer.add(glow);

    const wait = ms => new Promise(r => this.time.delayedCall(ms, r));
    for (let i = 0; i < 3; i++) {
      WT.audio.play('ovenShake');
      this.tweens.add({ targets: oven, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 3 });
      this.tweens.add({ targets: glow, alpha: 0.4 + i * 0.25, scale: 4 + i * 3, duration: 300 });
      for (let k = 0; k < 6; k++) {
        const s = this.add.image(W / 2 + Phaser.Math.Between(-260, 260), H / 2 + Phaser.Math.Between(-220, 160), 'fx_spark').setTint(bestColor).setScale(0.4);
        layer.add(s);
        this.tweens.add({ targets: s, x: W / 2, y: H / 2 - 30, scale: 0.1, alpha: 0.2, duration: 420, onComplete: () => s.destroy() });
      }
      await wait(i === 2 && best >= 4 ? 700 : 480);
    }
    if (best >= 4) this.cameras.main.shake(300, 0.01);
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0);
    layer.add(flash);
    await new Promise(r => this.tweens.add({ targets: flash, fillAlpha: 1, duration: 160, yoyo: true, onYoyo: () => { oven.destroy(); glow.destroy(); }, onComplete: r }));

    if (results.length === 1) await this._revealSingle(layer, results[0]);
    else await this._revealGrid(layer, results);

    this.input.enabled = true;
    const ok = ui.button(this, W / 2, H - 60, 220, 64, 'Yay!', { color: 'mint', size: 28, onClick: () => this.scene.restart({ tab: 'summon' }) });
    layer.add(ok);
    ok.setScale(0);
    this.tweens.add({ targets: ok, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  _rays(layer, x, y, color, scale) {
    const g = this.add.graphics({ x, y });
    g.fillStyle(color, 0.45);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.fillTriangle(0, 0, Math.cos(a) * 400, Math.sin(a) * 400, Math.cos(a + 0.12) * 400, Math.sin(a + 0.12) * 400);
    }
    g.setScale(scale || 1);
    layer.add(g);
    this.tweens.add({ targets: g, angle: 360, duration: 14000, repeat: -1 });
    return g;
  }

  _resultTag(r) {
    if (r.isNew) return ['NEW!', '#ffe27a', '#a54866'];
    if (r.starUp) return [`★ ${r.stars}`, '#ffe27a', '#8a5a06'];
    return [`+${r.honey} honey`, '#fff7ea', '#7a4520'];
  }

  async _revealSingle(layer, r) {
    const { W, H, ui } = WT;
    const u = WT.UNITS[r.id];
    const rar = WT.RARITIES[u.rarity];
    if (rar.tier >= 3) this._rays(layer, W / 2, H / 2 - 30, rar.color, 1.2);
    const card = ui.unitCard(this, W / 2, H / 2 - 30, 300, 400, r.id, { stars: r.stars });
    layer.add(card);
    card.scaleX = 0;
    WT.audio.play('reveal', rar.tier);
    await new Promise(res => this.tweens.add({ targets: card, scaleX: 1, duration: 360, ease: 'Back.easeOut', onComplete: res }));
    const title = ui.text(this, W / 2, 70, rar.tier >= 4 ? `${rar.name}!!` : rar.name, rar.tier >= 4 ? 52 : 40, WT.TXT.cream, { stroke: rar.hex, strokeW: 10, weight: '700' });
    layer.add(title);
    title.setScale(0); this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });
    const [tag, col, stroke] = this._resultTag(r);
    const t = ui.text(this, W / 2 + 130, H / 2 - 220, tag, 30, col, { stroke, strokeW: 6, weight: '700' });
    t.angle = 12;
    layer.add(t);
    for (let i = 0; i < (rar.tier >= 4 ? 30 : 12); i++) {
      const s = this.add.image(W / 2, H / 2 - 30, i % 2 ? 'fx_spark' : 'fx_heart').setTint(i % 3 ? rar.glow : rar.color).setScale(0.35);
      layer.add(s);
      const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(180, 360);
      this.tweens.add({ targets: s, x: W / 2 + Math.cos(a) * d, y: H / 2 - 30 + Math.sin(a) * d, alpha: 0, angle: 200, duration: 900, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
    }
    layer.add(ui.text(this, W / 2, H - 130, u.bio, 18, WT.TXT.cream, { wrap: 640, weight: '500' }));
  }

  async _revealGrid(layer, results) {
    const { W, H, ui } = WT;
    const cw = 150, ch = 200, gx = 22, gy = 24;
    const x0 = W / 2 - (5 * cw + 4 * gx) / 2 + cw / 2;
    const y0 = 160;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const rar = WT.RARITIES[WT.UNITS[r.id].rarity];
      const x = x0 + (i % 5) * (cw + gx), y = y0 + Math.floor(i / 5) * (ch + gy) + 40;
      if (rar.tier >= 4) this._rays(layer, x, y, rar.color, 0.35);
      const card = ui.unitCard(this, x, y, cw, ch, r.id, { stars: r.stars, compact: true });
      card.scaleX = 0;
      layer.add(card);
      WT.audio.play('reveal', rar.tier);
      this.tweens.add({ targets: card, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
      const [tag, col, stroke] = this._resultTag(r);
      const t = ui.text(this, x + cw / 2 - 12, y - ch / 2 + 2, tag, 18, col, { stroke, strokeW: 5, weight: '700' });
      t.angle = 10;
      layer.add(t);
      if (rar.tier >= 4) this.cameras.main.shake(160, 0.006);
      await new Promise(res => this.time.delayedCall(rar.tier >= 4 ? 520 : 200, res));
    }
    const counts = {};
    results.forEach(r => { const k = WT.UNITS[r.id].rarity; counts[k] = (counts[k] || 0) + 1; });
    const summary = WT.RARITY_ORDER.filter(k => counts[k]).map(k => `${counts[k]} ${WT.RARITIES[k].name}`).join('  ·  ');
    layer.add(ui.text(this, W / 2, 80, summary, 24, WT.TXT.cream, { stroke: '#4e2a12', strokeW: 6, weight: '700' }));
  }

  // ── decor tab ──────────────────────────────────────────────────
  _decorTab() {
    const { ui, TXT, COLORS: C } = WT;
    const x = 40, y = 100, w = 1200, h = 600;
    ui.panel(this, x, y, w, h, { radius: 28 });
    ui.text(this, x + 30, y + 36, 'Make the café cosier — more charm means more tips!', 22, TXT.dark, { ox: 0, weight: '700' });
    ui.text(this, x + w - 30, y + 36, `Café charm ${WT.cafeCharm()}`, 20, TXT.pink, { ox: 1, weight: '700' });

    const keys = Object.keys(WT.DECOR).sort((a, b) => WT.DECOR[a].cost - WT.DECOR[b].cost);
    const cols = 6, cw = 176, ch = 210, gap = 14;
    const rows = Math.ceil(keys.length / cols);
    const scroll = ui.scrollArea(this, x + 24, y + 70, w - 48, h - 90, rows * (ch + gap) + 10);
    keys.forEach((k, i) => {
      const d = WT.DECOR[k];
      const cx = (i % cols) * (cw + gap) + cw / 2 + 4;
      const cy = Math.floor(i / cols) * (ch + gap) + ch / 2 + 4;
      const g = this.add.graphics();
      g.fillStyle(C.paper, 1); g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 18);
      g.lineStyle(3, C.caramel, 1); g.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 18);
      scroll.add(g);
      const img = this.add.image(cx, cy - 40, 'decor_' + k);
      img.setScale(Math.min(140 / img.width, 90 / img.height));
      scroll.add(img);
      scroll.add(ui.text(this, cx, cy + 22, d.name, 16, TXT.dark, { weight: '700', wrap: cw - 16 }));
      scroll.add(ui.text(this, cx, cy + 44, `♥ +${d.charm} charm · ${d.slot}`, 13, TXT.pink, { weight: '600' }));
      const owned = WT.save.decorOwned[k] || 0;
      if (owned) {
        const b = this.add.graphics(); b.fillStyle(C.mintDark, 1); b.fillRoundedRect(cx + cw / 2 - 58, cy - ch / 2 + 8, 50, 22, 11);
        scroll.add(b);
        scroll.add(ui.text(this, cx + cw / 2 - 33, cy - ch / 2 + 19, `×${owned}`, 13, '#ffffff', { weight: '700' }));
      }
      const btn = ui.button(this, cx, cy + 78, cw - 30, 44, `${d.cost}`, { color: WT.save.honey >= d.cost ? 'gold' : 'grey', icon: 'icon_honey', size: 20, sfx: 'coin',
        onClick: () => {
          if (WT.save.honey < d.cost) { WT.ui.toast(this, 'Not enough honey yet!'); WT.audio.play('error'); return; }
          WT.save.honey -= d.cost;
          WT.save.decorOwned[k] = owned + 1;
          WT.persist();
          WT.ui.toast(this, `Bought ${d.name}! Place it in Decorate.`);
          this.time.delayedCall(250, () => this.scene.restart({ tab: 'decor' }));
        } });
      scroll.add(btn);
    });
  }
}
