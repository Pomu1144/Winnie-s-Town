/* ================================================================
 *  AlbumScene — the camera album: every Bear & Pastry in town,
 *  with silhouettes for friends you haven't met yet.
 * ================================================================ */
class AlbumScene extends Phaser.Scene {
  constructor() { super('AlbumScene'); }

  create(data) {
    const { W, H, ui, TXT, COLORS: C } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(300, 42, 22, 10);
    this.filter = (data && data.filter) || 'bear';
    ui.background(this, 'bg_paper');
    this.bar = ui.topBar(this, { back: true });
    ui.backButton(this, () => WT.go(this, 'CafeScene')).setDepth(450);

    const px = 30, py = 92, pw = W - 60, ph = H - 106;
    ui.panel(this, px, py, pw, ph, { radius: 28 });
    const ids = WT.UNIT_IDS.filter(id => this.filter === 'all' || WT.UNITS[id].faction === this.filter)
      .sort((a, b) => WT.RARITIES[WT.UNITS[a].rarity].tier - WT.RARITIES[WT.UNITS[b].rarity].tier);
    const owned = ids.filter(WT.owned).length;
    const label = this.filter === 'bear' ? 'Bears' : this.filter === 'pastry' ? 'Pastries' : 'Friends';
    ui.text(this, px + 28, py + 36, `${label} photographed  ${owned}/${ids.length}`, 22, TXT.dark, { ox: 0, weight: '700' });
    const g = this.add.graphics();
    g.fillStyle(0xead9c4, 1); g.fillRoundedRect(px + 400, py + 27, 260, 18, 9);
    g.fillStyle(C.pink, 1); g.fillRoundedRect(px + 400, py + 27, Math.max(owned ? 12 : 0, 260 * owned / ids.length), 18, 9);

    [['bear', 'Bears'], ['pastry', 'Pastries'], ['all', 'All']].forEach(([k, l], i) => {
      ui.button(this, px + 790 + i * 140, py + 36, 128, 44, l, { color: this.filter === k ? 'pink' : 'cream', size: 18, onClick: () => this.scene.restart({ filter: k }) });
    });

    const cols = 8, cw = 136, ch = 182, gx = 12, gy = 40;
    const rows = Math.ceil(ids.length / cols);
    const scroll = ui.scrollArea(this, px + 18, py + 70, pw - 36, ph - 84, rows * (ch + gy) + 10);
    ids.forEach((id, i) => {
      const x = (i % cols) * (cw + gx) + cw / 2 + 6;
      const y = Math.floor(i / cols) * (ch + gy) + ch / 2 + 6;
      if (WT.owned(id)) {
        const r = WT.save.roster[id];
        scroll.add(ui.unitCard(this, x, y, cw, ch, id, { stars: r.stars, compact: true, onClick: () => this._photo(id) }));
      } else {
        const lock = this.add.image(x, y, 'card_locked');
        lock.setScale(Math.min(cw / lock.width, ch / lock.height));
        lock.setInteractive({ useHandCursor: true });
        lock.on('pointerup', (p) => { if (!ui.tapOk(lock, p)) return; WT.audio.play('tap'); WT.ui.toast(this, `A ${WT.RARITIES[WT.UNITS[id].rarity].name} friend you haven't met yet…`); });
        scroll.add(lock);
      }
      scroll.add(ui.rarityTag(this, x, y + ch / 2 + 16, WT.UNITS[id].rarity, 12));
    });
  }

  _photo(id) {
    const { ui, TXT } = WT;
    const u = WT.UNITS[id];
    const r = WT.save.roster[id];
    const rar = WT.RARITIES[u.rarity];
    const m = ui.modal(this, 820, 560, null);
    // polaroid
    const pg = this.add.graphics();
    pg.fillStyle(0x4e2a12, 0.2); pg.fillRect(-372, -232, 330, 400);
    pg.fillStyle(0xffffff, 1); pg.fillRect(-376, -240, 330, 400);
    pg.fillStyle(rar.glow, 1); pg.fillRect(-356, -220, 290, 290);
    m.box.add(pg);
    const pic = this.add.image(-211, -75, 'unit_' + id);
    pic.setScale(Math.min(260 / pic.width, 260 / pic.height));
    m.box.add(pic);
    m.box.add(ui.text(this, -211, 115, u.name, 26, TXT.dark, { weight: '700' }));
    m.box.add(ui.rarityTag(this, -211, 210, u.rarity, 18));

    m.box.add(ui.text(this, 0, -200, `${WT.ROLES[u.role].name} · ${WT.FACTIONS[u.faction].name}`, 22, TXT.brown, { ox: 0, weight: '700' }));
    m.box.add(ui.text(this, 0, -150, `“${u.bio}”`, 20, TXT.dark, { ox: 0, oy: 0, align: 'left', wrap: 360, lineSpacing: 6, weight: '500' }));
    m.box.add(ui.text(this, 0, 10, u.skill.name, 22, TXT.pink, { ox: 0, weight: '700' }));
    m.box.add(ui.text(this, 0, 36, u.skill.desc, 18, TXT.dark, { ox: 0, oy: 0, align: 'left', wrap: 360, weight: '500' }));
    m.box.add(ui.text(this, 0, 150, `Level ${r.level} · ${r.stars}★ · Power ${WT.unitPower(id)}`, 20, TXT.brown, { ox: 0, weight: '600' }));
    m.box.add(ui.button(this, 180, 220, 220, 56, 'Team Manager', { color: 'caramel', size: 20, onClick: () => WT.go(this, 'TeamScene') }));
  }
}
