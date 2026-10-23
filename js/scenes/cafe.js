/* ================================================================
 *  CafeScene — the hub. Winnie runs the counter, decor earns charm,
 *  customers drop by, and the tip jar fills with coins over time.
 * ================================================================ */
class CafeScene extends Phaser.Scene {
  constructor() { super('CafeScene'); }

  create() {
    const { W, H, ui } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(350, 42, 22, 10);
    WT.audio.setMood('cafe');

    this.theme = WT.THEMES[WT.save.theme] || WT.THEMES.classic;
    this.bg = ui.background(this, this.theme.key);
    this._chalkboard();
    this._winnie();
    this._decor();
    this._customers();
    this._princessBear();
    this._tipJar();
    ui.sparkles(this, 10, 0xffe7b8);

    this.bar = ui.topBar(this);
    this._hud();

    const levelUps = WT.claimCafeLevels();
    if (levelUps.length) {
      this.time.delayedCall(450, () => this._levelUp(levelUps));
    } else if (!WT.save.flags.intro) {
      this.time.delayedCall(500, () => this._dialog(WT.DIALOG.intro, () => { WT.save.flags.intro = true; WT.persist(); this._pulseMap(); }));
    } else if (WT.save.stats.wins > 0 && !WT.save.flags.summonHint) {
      this.time.delayedCall(500, () => this._dialog(WT.DIALOG.summonHint, () => { WT.save.flags.summonHint = true; WT.persist(); }));
    } else if (WT.dailyAvailable()) {
      this.time.delayedCall(600, () => this._bubble('A treat for you! Tap me!'));
    }

    // refresh the tip jar every few seconds
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this._updateJar() });
  }

  // ── scenery ────────────────────────────────────────────────────
  _p(x, y) { return WT.ui.bgPoint(this.bg, x, y); }

  _chalkboard() {
    const a = this._p(462, 205), b = this._p(462, 262);
    const chalk = { stroke: 'rgba(0,0,0,0.15)', strokeW: 2 };
    WT.ui.text(this, a.x, a.y, 'Winnie\'s Café', 30, '#fffaf0', Object.assign({ weight: '700' }, chalk));
    const charm = WT.cafeCharm();
    this.chalkLine = WT.ui.text(this, b.x, b.y, `Café Lv ${WT.cafeLevelFor(charm)}  ·  Charm ${charm}  ·  ${WT.incomePerMin(charm).toFixed(1)} coins/min`, 18, '#f7e7cf', chalk);
  }

  _winnie() {
    const top = this._p(750, this.theme.counterY);
    const img = this.add.image(top.x, top.y + 40, 'npc_winnie').setOrigin(0.5, 1);
    img.setScale(250 / img.height);
    // hide everything below the counter top so Winnie stands behind it
    const m = this.make.graphics({ add: false });
    m.fillStyle(0xffffff); m.fillRect(0, 0, WT.W, top.y + 2);
    img.setMask(m.createGeometryMask());
    this.tweens.add({ targets: img, y: img.y - 6, scaleY: img.scaleY * 1.015, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    img.setInteractive({ useHandCursor: true, pixelPerfect: false });
    img.on('pointerup', () => this._talkToWinnie());
    this.winnie = img;

    if (WT.dailyAvailable()) this.winnieDot = WT.ui.notifyDot(this, top.x + 70, top.y - 190).setDepth(20);
  }

  _decor() {
    WT.save.decorPlaced.forEach(item => { if (WT.DECOR[item.k]) WT.decorSprite(this, this.bg, item); });
  }

  /** Celebrate café levels reached since the last visit. */
  _levelUp(levels) {
    const { ui, TXT, COLORS: C } = WT;
    const last = levels[levels.length - 1];
    const gems = levels.reduce((s, l) => s + l.heartstones, 0);
    const m = ui.modal(this, 620, 380, `Café Level ${last.level}!`);
    WT.audio.play('victory');
    for (let i = 0; i < 18; i++) {
      const h = this.add.image(Phaser.Math.Between(-280, 280), Phaser.Math.Between(-150, 150), i % 2 ? 'fx_heart' : 'fx_spark').setTint(i % 3 ? 0xffb7cf : 0xffe08a).setScale(0.3).setAlpha(0);
      m.box.add(h);
      this.tweens.add({ targets: h, alpha: { from: 1, to: 0 }, y: h.y - 60, delay: i * 60, duration: 1200, repeat: 1 });
    }
    m.box.add(ui.text(this, 0, -70, 'Your café is getting so cosy!', 26, TXT.dark, { weight: '700' }));
    m.box.add(ui.text(this, 0, -30, 'More customers are dropping by, and tips flow faster.', 19, TXT.brown, { weight: '500' }));
    const gi = this.add.image(-50, 40, 'icon_heartstone'); gi.setScale(56 / gi.height); m.box.add(gi);
    m.box.add(ui.text(this, -10, 40, `+${gems}`, 34, TXT.pink, { ox: 0, weight: '700' }));
    m.box.add(ui.button(this, 0, 128, 220, 62, 'Lovely!', { color: 'mint', size: 26, onClick: () => { m.close(); this.bar.refresh(); this.bar.bump('gems'); } }));
  }

  _customers() {
    const charm = WT.cafeCharm();
    const who = [['npc_fox', 520], ['npc_bird', 1010], ['npc_monkey', 330], ['npc_seal', 1180]];
    const lvl = WT.cafeLevelFor(charm);
    const n = lvl >= 5 ? 4 : lvl >= 3 ? 3 : lvl >= 2 ? 2 : 1;
    who.slice(0, n).forEach(([key, x], i) => {
      const p = this._p(x, 808);
      const img = this.add.image(p.x, p.y, key).setOrigin(0.5, 1).setDepth(25 + 808 / 10);
      img.setScale((key === 'npc_seal' ? 95 : 165) / img.height);
      if (x > 750) img.setFlipX(true);
      this.tweens.add({ targets: img, y: p.y - 4, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 200 });
      this.time.addEvent({ delay: 3500 + i * 1700, loop: true, callback: () => this._heartPop(img.x, img.y - img.displayHeight) });
    });
  }

  /** Princess Bear wanders the café floor in front of the customers. */
  _princessBear() {
    if (!this.textures.exists(WT.PRINCESS_BEAR.key)) return;
    const ground = this._p(750, 800), left = this._p(300, 800), right = this._p(1200, 800);
    this.princessBear = new PrincessBear(this, { x: ground.x, groundY: ground.y, height: 150, minX: left.x, maxX: right.x })
      .setDepth(25 + 800 / 10);
  }

  _heartPop(x, y) {
    const h = this.add.image(x + Phaser.Math.Between(-14, 14), y, 'fx_heart').setTint(0xf28fb0).setScale(0.3).setAlpha(0).setDepth(40);
    this.tweens.add({ targets: h, y: y - 50, alpha: { from: 1, to: 0 }, scale: 0.45, duration: 1400, ease: 'Sine.easeOut', onComplete: () => h.destroy() });
  }

  _tipJar() {
    const p = this._p(1300, 505);
    const jar = this.add.image(p.x, p.y, 'decor_honeyjar').setOrigin(0.5, 0.95).setDepth(25 + 505 / 10);
    jar.setScale(80 / jar.height);
    jar.setInteractive({ useHandCursor: true });
    jar.on('pointerup', () => this._collect());
    this.jar = jar;
    this.jarBubble = this.add.container(p.x, p.y - 108).setDepth(50);
    const g = this.add.graphics();
    g.fillStyle(0x4e2a12, 0.2); g.fillRoundedRect(-52, -18, 104, 40, 20);
    g.fillStyle(WT.COLORS.cream, 1); g.fillRoundedRect(-54, -22, 108, 40, 20);
    g.fillTriangle(-8, 16, 8, 16, 0, 28);
    g.lineStyle(3, WT.COLORS.caramel, 1); g.strokeRoundedRect(-54, -22, 108, 40, 20);
    this.jarText = WT.ui.text(this, 0, -2, '+0', 20, WT.TXT.brown, { weight: '700' });
    this.jarBubble.add([g, this.jarText]);
    this.jarBubble.setSize(108, 40).setInteractive({ useHandCursor: true });
    this.jarBubble.on('pointerup', () => this._collect());
    this.tweens.add({ targets: this.jarBubble, y: this.jarBubble.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this._updateJar();
  }

  _updateJar() {
    const amt = WT.pendingIncome();
    this.jarText.setText('+' + amt);
    this.jarBubble.setVisible(amt >= 5);
  }

  _collect() {
    const amt = WT.collectIncome();
    if (amt <= 0) { WT.ui.toast(this, 'The tip jar is empty — check back soon!'); return; }
    WT.audio.play('coin');
    this._flyCoins(this.jar.x, this.jar.y - 40, this.bar.honeyPill, 'icon_coin', Math.min(10, 3 + Math.floor(amt / 30)));
    this.time.delayedCall(650, () => { this.bar.refresh(); this.bar.bump('honey'); });
    WT.ui.toast(this, `Collected ${amt} coins from tips!`);
    this._updateJar();
  }

  _flyCoins(x, y, targetPill, key, n) {
    for (let i = 0; i < n; i++) {
      const c = this.add.image(x, y, key).setScale(0.18).setDepth(800);
      const mx = x + Phaser.Math.Between(-80, 80), my = y - Phaser.Math.Between(30, 110);
      this.tweens.add({
        targets: c, x: mx, y: my, duration: 260, ease: 'Quad.easeOut', delay: i * 40,
        onComplete: () => this.tweens.add({ targets: c, x: targetPill.x - 60, y: targetPill.y, scale: 0.1, duration: 380, ease: 'Quad.easeIn', onComplete: () => c.destroy() }),
      });
    }
  }

  // ── HUD ────────────────────────────────────────────────────────
  _hud() {
    const { W, H, ui } = WT;
    const btns = [
      { key: 'btn_map', go: 'MapScene' },
      { key: 'btn_shop', go: 'ShopScene' },
      { key: 'btn_decorate', go: 'DecorateScene' },
      { key: 'btn_camera', go: 'AlbumScene' },
      { key: 'btn_team', go: 'TeamScene' },
    ];
    const bw = 138, bh = 84, gap = 12;
    const total = btns.length * bw + (btns.length - 1) * gap;
    const x0 = W / 2 - total / 2 + bw / 2;
    const y = H - 58;
    const g = this.add.graphics().setDepth(90);
    g.fillStyle(0x4e2a12, 0.35); g.fillRoundedRect(x0 - bw / 2 - 18, y - bh / 2 - 12, total + 36, bh + 26, 30);
    g.fillStyle(0xfff3e2, 0.55); g.fillRoundedRect(x0 - bw / 2 - 14, y - bh / 2 - 8, total + 28, bh + 18, 26);
    this.hudBtns = {};
    btns.forEach((b, i) => {
      const img = ui.imageButton(this, x0 + i * (bw + gap), y, b.key, bw, bh, () => WT.go(this, b.go), 'open').setDepth(100);
      this.hudBtns[b.go] = img;
    });
    if (WT.save.heartstones >= WT.GACHA.single) {
      const s = this.hudBtns.ShopScene;
      ui.notifyDot(this, s.x + bw / 2 - 10, s.y - bh / 2 + 6).setDepth(110);
    }
  }

  _pulseMap() {
    const m = this.hudBtns.MapScene;
    const arrow = this.add.container(m.x, m.y - 90).setDepth(120);
    const g = this.add.graphics();
    g.fillStyle(WT.COLORS.pinkDark, 1); g.fillTriangle(-16, -10, 16, -10, 0, 12); g.fillRoundedRect(-7, -34, 14, 26, 4);
    arrow.add(g);
    this.tweens.add({ targets: arrow, y: arrow.y - 14, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ── Winnie ─────────────────────────────────────────────────────
  _talkToWinnie() {
    WT.audio.play('tap');
    this.tweens.add({ targets: this.winnie, scaleX: this.winnie.scaleX * 1.05, duration: 90, yoyo: true });
    if (WT.dailyAvailable()) {
      const gift = WT.claimDaily();
      this.winnieDot && this.winnieDot.destroy();
      this._dialog([`Here's today's treat: ${gift.heartstones} heartstones and ${gift.honey} coins! Come back tomorrow for more.`], () => {
        this.bar.refresh(); this.bar.bump('gems'); this.bar.bump('honey'); WT.audio.play('coin');
      });
      return;
    }
    this._dialog([Phaser.Utils.Array.GetRandom(WT.DIALOG.tips)]);
  }

  _bubble(msg) {
    const p = this._p(750, 300);
    const c = this.add.container(p.x + 150, p.y - 40).setDepth(60);
    const t = WT.ui.text(this, 0, 0, msg, 18, WT.TXT.brown, { weight: '700' });
    const g = this.add.graphics();
    const w = t.width + 30;
    g.fillStyle(WT.COLORS.cream, 1); g.fillRoundedRect(-w / 2, -20, w, 40, 20);
    g.fillTriangle(-w / 2 + 14, 12, -w / 2 + 36, 12, -w / 2 + 4, 34);
    g.lineStyle(3, WT.COLORS.caramel, 1); g.strokeRoundedRect(-w / 2, -20, w, 40, 20);
    c.add([g, t]);
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: c.y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
    this.time.delayedCall(6000, () => this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() }));
  }

  /** Visual-novel style dialog with Winnie's portrait. Tap to advance. */
  _dialog(lines, done) {
    WT.dialog(this, lines, done);
  }
}

/** Shared dialog box (also used by other scenes). */
WT.dialog = function (scene, lines, done, speaker) {
  const { W, H, ui } = WT;
  const layer = scene.add.container(0, 0).setDepth(700);
  const dim = ui.fullRect(scene, 0x2a160a, 0.35).setInteractive();
  const portrait = scene.add.image(200, H - 20, speaker || 'npc_winnie').setOrigin(0.5, 1);
  portrait.setScale(300 / portrait.height);
  const boxW = 860, boxH = 170, bx = W / 2 + 90, by = H - 120;
  const panel = ui.panel(scene, bx - boxW / 2, by - boxH / 2, boxW, boxH, { radius: 26, fill: 0xfff6e8 });
  const name = ui.ribbon(scene, bx - boxW / 2 + 120, by - boxH / 2 + 2, speaker === 'npc_seal' ? 'Sealia' : 'Winnie', { size: 22, h: 42, minW: 150, color: WT.COLORS.pink, dark: WT.COLORS.pinkDark });
  const text = ui.text(scene, bx - boxW / 2 + 40, by - 34, '', 24, WT.TXT.dark, { ox: 0, oy: 0, align: 'left', wrap: boxW - 80, lineSpacing: 6, weight: '500' });
  const more = ui.text(scene, bx + boxW / 2 - 40, by + boxH / 2 - 26, 'tap ▸', 18, WT.TXT.pink, { weight: '700' });
  scene.tweens.add({ targets: more, x: more.x + 6, duration: 500, yoyo: true, repeat: -1 });
  layer.add([dim, portrait, panel, name, text, more]);
  portrait.x = 120; portrait.alpha = 0;
  scene.tweens.add({ targets: portrait, x: 200, alpha: 1, duration: 300, ease: 'Back.easeOut' });

  let i = 0, typing = null;
  const show = () => {
    const full = lines[i];
    let n = 0;
    text.setText('');
    typing && typing.remove();
    typing = scene.time.addEvent({ delay: 18, repeat: full.length - 1, callback: () => { n++; text.setText(full.slice(0, n)); } });
    scene.tweens.add({ targets: portrait, y: H - 30, duration: 120, yoyo: true });
  };
  dim.on('pointerup', () => {
    if (typing && typing.getProgress() < 1) { typing.remove(); text.setText(lines[i]); typing = null; return; }
    WT.audio.play('tap');
    i++;
    if (i >= lines.length) {
      scene.tweens.add({ targets: layer, alpha: 0, duration: 200, onComplete: () => { layer.destroy(); done && done(); } });
      return;
    }
    show();
  });
  show();
};

WT.DIALOG = {
  intro: [
    'Oh! A visitor! Welcome to Winnie\'s Town. I\'m Winnie, and this little café is my pride and joy.',
    'Lately the Bears and the Pastries all over town have been squabbling in teams of three. Somebody has to calm everyone down!',
    'Honey Cub, Crumbly Croissant and Mochi Puff have offered to help you. Tap the Map below to start your first battle.',
    'Win battles to earn coins and heartstones. Coins buy furniture and treats to make the café cosier, and heartstones summon new friends from the Wishing Oven!',
  ],
  summonHint: [
    'Wonderful work out there! Every friend you meet has their own rarity — Common, Rare, Epic, Legendary, and the very rare Mythic.',
    'Visit the Shop to try the Wishing Oven. Duplicate friends add a star and make that friend stronger.',
    'And don\'t forget the tip jar on the counter. The more charming the café looks, the faster it fills with coins!',
  ],
  tips: [
    'Tanks can taunt — enemies have to hit them first. Put one in your team to keep your strikers safe!',
    'Three Bears in a team get Hibernation Hug: +15% max HP. Three Pastries get Sugar Rush: +15% attack.',
    'A mixed team of Bears and Pastries gets Café Friends: +8% speed. Speed decides who acts first!',
    'Give your friends treats in the Team Manager to level them up between battles.',
    'Every 40 summons without a Legendary guarantees one. The oven always keeps its promises.',
    'Decorating the café raises its charm, and charm makes the tip jar fill faster.',
    'Win without losing anyone to earn three stars. Stars show how well you know the town!',
    'The Crème Phoenix can rise again once after falling. I\'ve only ever seen one…',
    'Supports heal and buff. A healer can turn a close battle into a cosy win.',
  ],
};
