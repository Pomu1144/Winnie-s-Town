/* ================================================================
 *  DecorateScene — place owned decor on the café's counter and floor.
 * ================================================================ */
class DecorateScene extends Phaser.Scene {
  constructor() { super('DecorateScene'); }

  create() {
    const { W, H, ui, TXT, COLORS: C } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(300, 42, 22, 10);
    this.bg = ui.background(this, 'bg_cafe');
    this.bar = ui.topBar(this, { hideStars: true });
    ui.backButton(this, () => WT.go(this, 'CafeScene')).setDepth(450);
    ui.ribbon(this, 330, 50, 'Decorate', { size: 28, h: 54 });

    const charm = WT.cafeCharm();
    const info = this.add.container(W / 2, H - 46).setDepth(300);
    const ig = this.add.graphics();
    ig.fillStyle(0x4e2a12, 0.55); ig.fillRoundedRect(-330, -26, 660, 52, 26);
    info.add(ig);
    info.add(ui.text(this, 0, 0, `Charm ${charm}  ·  tips ${WT.incomePerMin(charm).toFixed(1)} honey/min  ·  tap a glowing spot`, 19, TXT.cream, { weight: '600' }));

    WT.DECOR_SPOTS.forEach(spot => this._spot(spot));
  }

  _spot(spot) {
    const { ui, COLORS: C, TXT } = WT;
    const floor = spot.slot === 'floor';
    const p = ui.bgPoint(this.bg, spot.x, floor ? 830 : spot.y);
    const key = WT.save.decorPlaced[spot.id];
    const ring = this.add.image(p.x, p.y - (floor ? 10 : 4), 'fx_ring').setTint(C.pink).setScale(floor ? 2.6 : 1.8, floor ? 0.8 : 0.6).setAlpha(0.9);
    this.tweens.add({ targets: ring, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    if (key) {
      const img = this.add.image(p.x, p.y, 'decor_' + key).setOrigin(0.5, floor ? 1 : 0.92);
      const t = floor ? { w: 230, h: 130 } : { w: 140, h: 92 };
      img.setScale(Math.min(t.w / img.width, t.h / img.height));
    } else {
      const plus = ui.text(this, p.x, p.y - (floor ? 50 : 34), '+', 44, TXT.cream, { stroke: '#d06d8d', strokeW: 7, weight: '700' });
      this.tweens.add({ targets: plus, y: plus.y - 6, duration: 600, yoyo: true, repeat: -1 });
    }
    const zone = this.add.zone(p.x, p.y - (floor ? 60 : 40), floor ? 240 : 150, floor ? 150 : 110).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => { WT.audio.play('tap'); this._picker(spot); });
  }

  _picker(spot) {
    const { ui, TXT, COLORS: C } = WT;
    const m = ui.modal(this, 900, 520, spot.slot === 'floor' ? 'Floor spot' : 'Counter spot');
    const placedElsewhere = k => Object.entries(WT.save.decorPlaced).filter(([sid, v]) => v === k && sid !== spot.id).length;
    const opts = Object.keys(WT.DECOR).filter(k => WT.DECOR[k].slot === spot.slot && (WT.save.decorOwned[k] || 0) > 0);

    if (!opts.length) {
      m.box.add(ui.text(this, 0, -40, `You don't own any ${spot.slot} decor yet.`, 24, TXT.dark, { weight: '600' }));
      m.box.add(ui.button(this, 0, 60, 280, 64, 'Visit the shop', { color: 'pink', onClick: () => WT.go(this, 'ShopScene', { tab: 'decor' }) }));
      return;
    }
    const cols = 5, cw = 150, ch = 170, gap = 16;
    const all = ['__empty'].concat(opts);
    const x0 = -((Math.min(cols, all.length) - 1) * (cw + gap)) / 2;
    const scroll = ui.scrollArea(this, WT.W / 2 - 420, WT.H / 2 - 200, 840, 400, Math.ceil(all.length / cols) * (ch + gap));
    scroll.setDepth(m.layer.depth + 1);
    all.forEach((k, i) => {
      const cx = 420 + x0 + (i % cols) * (cw + gap);
      const cy = Math.floor(i / cols) * (ch + gap) + ch / 2;
      const current = WT.save.decorPlaced[spot.id] === k || (k === '__empty' && !WT.save.decorPlaced[spot.id]);
      const free = k === '__empty' || (WT.save.decorOwned[k] - placedElsewhere(k)) > 0;
      const g = this.add.graphics();
      g.fillStyle(current ? 0xffe7f0 : C.paper, 1); g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 16);
      g.lineStyle(current ? 5 : 3, current ? C.pinkDark : C.caramel, 1); g.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 16);
      scroll.add(g);
      if (k === '__empty') {
        scroll.add(ui.text(this, cx, cy - 10, 'Empty', 22, TXT.grey, { weight: '700' }));
      } else {
        const img = this.add.image(cx, cy - 26, 'decor_' + k);
        img.setScale(Math.min(120 / img.width, 80 / img.height));
        if (!free) img.setAlpha(0.4);
        scroll.add(img);
        scroll.add(ui.text(this, cx, cy + 34, WT.DECOR[k].name, 15, TXT.dark, { weight: '700', wrap: cw - 12 }));
        scroll.add(ui.text(this, cx, cy + 60, free ? `♥ ${WT.DECOR[k].charm}` : 'In use', 14, free ? TXT.pink : TXT.grey, { weight: '600' }));
      }
      const hit = this.add.zone(cx, cy, cw, ch).setInteractive({ useHandCursor: true });
      hit.on('pointerup', (p) => {
        if (!ui.tapOk(hit, p)) return;
        if (!free) { WT.audio.play('error'); WT.ui.toast(this, 'Every one of those is already placed!'); return; }
        WT.audio.play('coin');
        if (k === '__empty') delete WT.save.decorPlaced[spot.id]; else WT.save.decorPlaced[spot.id] = k;
        WT.persist();
        scroll.destroy();
        m.close();
        this.time.delayedCall(180, () => this.scene.restart());
      });
      scroll.add(hit);
    });
    // clean the scroll layer if the modal is closed with the X
    m.layer.once('destroy', () => scroll.active && scroll.destroy());
  }
}
