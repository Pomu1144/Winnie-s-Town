/* ================================================================
 *  DecorateScene — the café editor. Drag pieces anywhere, flip them,
 *  put them back in storage, and switch the café's theme.
 * ================================================================ */

/** Draw one placed decor piece into a café scene. Shared with CafeScene. */
WT.decorSprite = function (scene, bg, item) {
  const d = WT.DECOR[item.k];
  const p = WT.ui.bgPoint(bg, item.x, item.y);
  const img = scene.add.image(p.x, p.y, 'decor_' + item.k).setOrigin(0.5, 1);
  const size = WT.DECOR_SIZE_OVERRIDE[item.k] || WT.DECOR_SIZE[d.slot];
  img.setScale(Math.min(size.w / img.width, size.h / img.height));
  img.setFlipX(!!item.f);
  img.setDepth(d.layer === 'rug' ? 20 : 25 + item.y / 10);
  return img;
};

WT.buyTheme = function (key) {
  const t = WT.THEMES[key];
  if (WT.save.themesOwned[key]) return true;
  if (WT.save.honey < t.cost) return false;
  WT.save.honey -= t.cost;
  WT.save.themesOwned[key] = 1;
  WT.save.theme = key;
  WT.persist();
  return true;
};

class DecorateScene extends Phaser.Scene {
  constructor() { super('DecorateScene'); }

  create(data) {
    const { ui, TXT } = WT;
    this._leaving = false;
    if (!(data && data.keep)) this.cameras.main.fadeIn(300, 42, 22, 10);
    this.filter = (data && data.filter) || 'all';
    this.trayOpen = !(data && data.trayClosed);
    this.selected = null;

    this.bg = ui.background(this, WT.THEMES[WT.save.theme].key);
    this.sprites = [];
    WT.save.decorPlaced.forEach(item => this._addSprite(item));

    // tapping empty café space clears the selection
    this.bg.setInteractive();
    this.bg.on('pointerup', () => this._select(null));

    this.bar = ui.topBar(this, { hideStars: true });
    ui.backButton(this, () => WT.go(this, 'CafeScene')).setDepth(450);
    this._header();
    this._tray();
    this._toolbar();
    this._wireDrag();
    if (data && data.selectIdx != null && this.sprites[data.selectIdx]) this._select(this.sprites[data.selectIdx]);

    if (!WT.save.flags.decorTut) {
      WT.save.flags.decorTut = true; WT.persist();
      this.time.delayedCall(400, () => ui.toast(this, 'Drag furniture anywhere · tap a piece to flip or store it'));
    }
  }

  // ── header: charm, level, themes, shop ─────────────────────────
  _header() {
    const { ui, TXT, COLORS: C } = WT;
    const charm = WT.cafeCharm();
    const lvl = WT.cafeLevelFor(charm);
    const next = WT.CAFE_LEVELS[lvl];
    const chip = this.add.container(330, 40).setDepth(450);
    const g = this.add.graphics();
    g.fillStyle(0x4e2a12, 0.6); g.fillRoundedRect(-140, -26, 280, 52, 26);
    chip.add(g);
    chip.add(ui.text(this, -120, -8, `Café Lv ${lvl}`, 20, TXT.cream, { ox: 0, weight: '700' }));
    chip.add(ui.text(this, -120, 13, next ? `Charm ${charm} / ${next}` : `Charm ${charm} · max level`, 15, '#ffd9e6', { ox: 0, weight: '600' }));
    const pg = this.add.graphics();
    const pct = next ? (charm - (WT.CAFE_LEVELS[lvl - 1] || 0)) / (next - (WT.CAFE_LEVELS[lvl - 1] || 0)) : 1;
    pg.fillStyle(0xffffff, 0.25); pg.fillRoundedRect(30, -6, 96, 12, 6);
    pg.fillStyle(C.pink, 1); pg.fillRoundedRect(30, -6, Math.max(8, 96 * Phaser.Math.Clamp(pct, 0, 1)), 12, 6);
    chip.add(pg);

    ui.button(this, 560, 40, 130, 50, 'Themes', { color: 'pink', size: 20, onClick: () => this._themes() }).setDepth(450);
  }

  // ── placed pieces ──────────────────────────────────────────────
  _addSprite(item) {
    const img = WT.decorSprite(this, this.bg, item);
    img.item = item;
    img.setInteractive({ useHandCursor: true, draggable: true, pixelPerfect: true, alphaTolerance: 40 });
    img.on('pointerup', (p) => { if (!img.dragged) this._select(img); });
    this.sprites.push(img);
    return img;
  }

  _wireDrag() {
    this.input.dragDistanceThreshold = 8;
    this.input.on('dragstart', (p, img) => {
      if (!img.item) return;
      img.dragged = true;
      this._select(img);
      // slide the tray out of the way so the whole floor is reachable
      if (this.tray && this.trayOpen) this.tweens.add({ targets: this.tray, y: this.trayH - 6, duration: 160 });
      img.setDepth(300);
      this.tweens.add({ targets: img, scale: img.scale * 1.06, duration: 90 });
      img.baseScale = img.baseScale || img.scale;
    });
    this.input.on('drag', (p, img, dx, dy) => {
      if (!img.item) return;
      const b = this._toBg(p.worldX, p.worldY + img.displayHeight * 0.35);
      const pos = WT.ui.bgPoint(this.bg, b.x, b.y);
      img.setPosition(pos.x, pos.y);
      this._placeToolbar();
    });
    this.input.on('dragend', (p, img) => {
      if (!img.item) return;
      const b = this._toBg(img.x, img.y);
      img.item.x = Math.round(b.x); img.item.y = Math.round(b.y);
      const d = WT.DECOR[img.item.k];
      img.setDepth(d.layer === 'rug' ? 20 : 25 + img.item.y / 10);
      if (img.baseScale) img.setScale(img.baseScale);
      WT.persist();
      WT.audio.play('tap');
      this.time.delayedCall(50, () => { img.dragged = false; });
      if (this.tray && this.trayOpen) this.tweens.add({ targets: this.tray, y: 0, duration: 200, delay: 250 });
      this._placeToolbar();
    });
  }

  /** Stage point → café-art coordinates, clamped to the room. */
  _toBg(x, y) {
    const bg = this.bg;
    const bx = (x - bg.x) / bg.scaleX + bg.width / 2;
    const by = (y - bg.y) / bg.scaleY + bg.height / 2;
    return { x: Phaser.Math.Clamp(bx, 90, 1410), y: Phaser.Math.Clamp(by, 170, 990) };
  }

  // ── selection toolbar ──────────────────────────────────────────
  _toolbar() {
    const { ui, COLORS: C } = WT;
    const tb = this.add.container(0, 0).setDepth(420).setVisible(false);
    const mk = (x, label, color, fn) => {
      const b = ui.button(this, x, 0, 108, 50, label, { color, size: 19, onClick: fn });
      tb.add(b);
    };
    mk(-118, 'Flip', 'cream', () => this._flip());
    mk(0, 'Store', 'pink', () => this._store());
    mk(118, 'Done', 'mint', () => this._select(null));
    this.tb = tb;
    this.selRing = this.add.image(0, 0, 'fx_ring').setTint(C.pink).setDepth(19).setVisible(false);
    this.tweens.add({ targets: this.selRing, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
  }

  _select(img) {
    if (this.selected && this.selected.active) this.selected.clearTint();
    this.selected = img;
    if (!img) { this.tb.setVisible(false); this.selRing.setVisible(false); return; }
    img.setTint(0xfff0f6);
    this._placeToolbar();
  }

  _placeToolbar() {
    const img = this.selected;
    if (!img || !img.active) return;
    const top = img.y - img.displayHeight - 40;
    const x = Phaser.Math.Clamp(img.x, 200, WT.W - 200);
    this.tb.setPosition(x, Math.max(110, top)).setVisible(true);
    this.selRing.setPosition(img.x, img.y - 4).setScale(Math.max(1, img.displayWidth / 60), 0.5).setVisible(true);
  }

  _flip() {
    const img = this.selected;
    if (!img) return;
    img.item.f = img.item.f ? 0 : 1;
    img.setFlipX(!!img.item.f);
    WT.persist();
  }

  _store() {
    const img = this.selected;
    if (!img) return;
    const i = WT.save.decorPlaced.indexOf(img.item);
    if (i >= 0) WT.save.decorPlaced.splice(i, 1);
    WT.persist();
    this.sprites = this.sprites.filter(s => s !== img);
    this._select(null);
    this.tweens.add({ targets: img, scale: 0, alpha: 0, duration: 180, onComplete: () => { img.destroy(); this._refresh(); } });
  }

  _place(k) {
    if (WT.decorInStorage(k) <= 0) { WT.audio.play('error'); WT.ui.toast(this, 'All of those are already in the café!'); return; }
    if (WT.save.decorPlaced.length >= WT.MAX_PLACED) { WT.audio.play('error'); WT.ui.toast(this, `The café fits ${WT.MAX_PLACED} pieces — store something first.`); return; }
    const slot = WT.DECOR[k].slot;
    const base = { counter: { x: 750, y: 512 }, wall: { x: 1000, y: 330 }, floor: { x: 750, y: 790 } }[slot];
    const item = { k, x: base.x + Phaser.Math.Between(-220, 220), y: base.y + (slot === 'floor' ? Phaser.Math.Between(-60, 30) : 0), f: 0 };
    WT.save.decorPlaced.push(item);
    WT.persist();
    WT.audio.play('coin');
    const img = this._addSprite(item);
    const s = img.scale;
    img.setScale(0);
    this.tweens.add({ targets: img, scale: s, duration: 220, ease: 'Back.easeOut', onComplete: () => this._refresh(WT.save.decorPlaced.length - 1) });
  }

  /** Rebuild the parts of the UI that show counts and charm. */
  _refresh(selectIdx) {
    this.scene.restart({ filter: this.filter, trayClosed: !this.trayOpen, keep: true, selectIdx });
  }

  // ── storage tray ───────────────────────────────────────────────
  _tray() {
    const { ui, TXT, COLORS: C, W, H } = WT;
    const trayH = 150;
    const tray = this.add.container(0, this.trayOpen ? 0 : trayH - 6).setDepth(430);
    this.tray = tray; this.trayH = trayH;
    const V = WT.VIEW;
    const g = this.add.graphics();
    g.fillStyle(0x4e2a12, 0.3); g.fillRoundedRect(V.x + 12, H - trayH + 4, V.w - 24, trayH + 40, 26);
    g.fillStyle(C.cream, 0.97); g.fillRoundedRect(V.x + 14, H - trayH, V.w - 28, trayH + 40, 26);
    g.lineStyle(4, C.caramel, 1); g.strokeRoundedRect(V.x + 14, H - trayH, V.w - 28, trayH + 40, 26);
    tray.add(g);

    // handle
    const handle = this.add.container(W / 2, H - trayH - 18);
    const hg = this.add.graphics();
    hg.fillStyle(C.caramel, 1); hg.fillRoundedRect(-70, -18, 140, 36, 18);
    handle.add(hg);
    handle.add(ui.text(this, 0, 0, this.trayOpen ? 'Storage ▾' : 'Storage ▴', 17, TXT.cream, { weight: '700' }));
    handle.setSize(140, 36).setInteractive({ useHandCursor: true });
    handle.on('pointerup', () => {
      WT.audio.play('tap');
      this.trayOpen = !this.trayOpen;
      this.tweens.add({ targets: tray, y: this.trayOpen ? 0 : trayH - 6, duration: 220, ease: 'Quad.easeOut' });
      handle.list[1].setText(this.trayOpen ? 'Storage ▾' : 'Storage ▴');
    });
    tray.add(handle);

    // category tabs
    const cats = [['all', 'All'], ['counter', 'Counter'], ['floor', 'Floor'], ['wall', 'Wall']];
    cats.forEach(([k, label], i) => {
      const b = ui.button(this, V.x + 90, H - trayH + 26 + i * 31, 120, 28, label, {
        color: this.filter === k ? 'pink' : 'cream', size: 15,
        onClick: () => this.scene.restart({ filter: k, trayClosed: !this.trayOpen, keep: true }),
      });
      tray.add(b);
    });

    // tiles
    const owned = Object.keys(WT.DECOR)
      .filter(k => (WT.save.decorOwned[k] || 0) > 0 && (this.filter === 'all' || WT.DECOR[k].slot === this.filter))
      .sort((a, b) => WT.decorInStorage(b) - WT.decorInStorage(a) || WT.DECOR[a].cost - WT.DECOR[b].cost);
    const x0 = V.x + 170, tileW = 112, gap = 10, areaW = V.w - 200 - (x0 - V.x);
    const strip = this.add.container(x0, H - trayH + 18);
    tray.add(strip);
    owned.forEach((k, i) => {
      const left = WT.decorInStorage(k);
      const tx = i * (tileW + gap) + tileW / 2;
      const tg = this.add.graphics();
      tg.fillStyle(left > 0 ? C.paper : 0xeee4d8, 1); tg.fillRoundedRect(tx - tileW / 2, 0, tileW, 118, 16);
      tg.lineStyle(3, left > 0 ? C.caramel : C.grey, 1); tg.strokeRoundedRect(tx - tileW / 2, 0, tileW, 118, 16);
      strip.add(tg);
      const im = this.add.image(tx, 48, 'decor_' + k);
      im.setScale(Math.min(90 / im.width, 70 / im.height));
      if (left <= 0) im.setAlpha(0.4);
      strip.add(im);
      strip.add(ui.text(this, tx, 100, left > 0 ? `×${left}` : 'placed', 15, left > 0 ? TXT.brown : TXT.grey, { weight: '700' }));
      const hit = this.add.zone(tx, 59, tileW, 118).setInteractive({ useHandCursor: true });
      hit.on('pointerup', (p) => { if (this._stripDragged) return; this._place(k); });
      strip.add(hit);
    });
    if (!owned.length) strip.add(ui.text(this, areaW / 2, 58, 'Nothing here yet — visit the Shop for furniture!', 20, TXT.grey, { weight: '600' }));

    // horizontal drag-scroll for the strip
    const contentW = owned.length * (tileW + gap);
    const minX = x0 - Math.max(0, contentW - areaW), maxX = x0;
    const m = this.make.graphics({ add: false });
    m.fillStyle(0xffffff); m.fillRect(x0 - 4, H - trayH, areaW + 8, trayH);
    strip.setMask(m.createGeometryMask());
    let down = false, sx = 0, sc = 0;
    this.input.on('pointerdown', p => { if (p.worldY > H - trayH && p.worldX > x0) { down = true; sx = p.worldX; sc = strip.x; this._stripDragged = false; } });
    this.input.on('pointermove', p => {
      if (!down || !p.isDown) return;
      if (Math.abs(p.worldX - sx) > 10) this._stripDragged = true;
      strip.x = Phaser.Math.Clamp(sc + (p.worldX - sx), minX, maxX);
    });
    this.input.on('pointerup', () => { down = false; this.time.delayedCall(30, () => { this._stripDragged = false; }); });
    this.input.on('wheel', (p, o, dx, dy) => { if (p.worldY > H - trayH) strip.x = Phaser.Math.Clamp(strip.x - (dy + dx) * 0.8, minX, maxX); });

    // shop shortcut
    const shop = ui.button(this, V.x + V.w - 100, H - trayH / 2 + 4, 140, 60, 'Shop', { color: 'gold', size: 22, onClick: () => WT.go(this, 'ShopScene', { tab: 'decor' }) });
    tray.add(shop);
    tray.add(ui.text(this, V.x + V.w - 100, H - trayH + 22, `${WT.save.decorPlaced.length}/${WT.MAX_PLACED} placed`, 14, TXT.brown, { weight: '600' }));
  }

  // ── themes ─────────────────────────────────────────────────────
  _themes() {
    const { ui, TXT, COLORS: C } = WT;
    const m = ui.modal(this, 1180, 560, 'Café Themes');
    const keys = Object.keys(WT.THEMES);
    keys.forEach((k, i) => {
      const t = WT.THEMES[k];
      const x = -470 + i * 235, y = -10;
      const owned = !!WT.save.themesOwned[k];
      const active = WT.save.theme === k;
      const g = this.add.graphics();
      g.fillStyle(active ? 0xffe7f0 : C.paper, 1); g.fillRoundedRect(x - 108, y - 200, 216, 400, 20);
      g.lineStyle(active ? 5 : 3, active ? C.pinkDark : C.caramel, 1); g.strokeRoundedRect(x - 108, y - 200, 216, 400, 20);
      m.box.add(g);
      const th = this.add.image(x, y - 110, t.key);
      th.setScale(196 / th.width);
      m.box.add(th);
      m.box.add(ui.text(this, x, y + 10, t.name, 21, TXT.dark, { weight: '700', wrap: 200 }));
      m.box.add(ui.text(this, x, y + 44, t.charm ? `♥ +${t.charm} charm` : 'The original look', 16, TXT.pink, { weight: '600' }));
      let label, color, enabled = true;
      if (active) { label = 'In use'; color = 'grey'; enabled = false; }
      else if (owned) { label = 'Use'; color = 'mint'; }
      else { label = `${t.cost}`; color = WT.save.honey >= t.cost ? 'gold' : 'grey'; }
      const b = ui.button(this, x, y + 140, 170, 58, label, {
        color, size: 22, icon: owned ? null : 'icon_coin', sfx: 'coin',
        onClick: () => {
          if (owned) { WT.save.theme = k; WT.persist(); }
          else if (!WT.buyTheme(k)) { WT.ui.toast(this, 'Not enough coins yet — win battles to earn more!'); return; }
          m.close();
          this.time.delayedCall(200, () => this.scene.restart({ filter: this.filter, trayClosed: !this.trayOpen }));
        },
      });
      if (!enabled) b.setEnabled(false);
      m.box.add(b);
    });
    m.box.add(ui.text(this, 0, 238, 'Themes add charm, which raises your café level and the tips you earn.', 18, TXT.brown, { weight: '500' }));
  }
}
