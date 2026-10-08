/* ================================================================
 *  AlbumScene — the camera album: every Bear & Pastry in town,
 *  with silhouettes for friends you haven't met yet.
 * ================================================================ */
class AlbumScene extends Phaser.Scene {
  constructor() { super('AlbumScene'); }

  create() {
    const { W, H, ui, TXT, COLORS: C } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(300, 42, 22, 10);
    ui.background(this, 'bg_paper');
    this.bar = ui.topBar(this, { back: true });
    ui.backButton(this, () => WT.go(this, 'CafeScene')).setDepth(450);
    ui.ribbon(this, 330, 50, 'Photo Album', { size: 28, h: 54 });

    const owned = WT.UNIT_IDS.filter(WT.owned).length;
    const px = 40, py = 100, pw = W - 80, ph = H - 120;
    ui.panel(this, px, py, pw, ph, { radius: 28 });
    ui.text(this, px + 30, py + 34, `${owned}/${WT.UNIT_IDS.length} friends photographed`, 22, TXT.dark, { ox: 0, weight: '700' });
    // completion bar
    const g = this.add.graphics();
    g.fillStyle(0xead9c4, 1); g.fillRoundedRect(px + 400, py + 24, 360, 20, 10);
    g.fillStyle(C.pink, 1); g.fillRoundedRect(px + 400, py + 24, Math.max(14, 360 * owned / WT.UNIT_IDS.length), 20, 10);
    ui.text(this, px + pw - 30, py + 34, 'Bears on top · Pastries below', 17, TXT.brown, { ox: 1 });

    ['bear', 'pastry'].forEach((fac, row) => {
      const ids = WT.UNIT_IDS.filter(id => WT.UNITS[id].faction === fac);
      const fb = this.add.image(px + 50, py + 175 + row * 270, 'faction_' + fac); fb.setScale(60 / fb.width);
      ids.forEach((id, i) => {
        const x = px + 150 + i * 132, y = py + 175 + row * 270;
        const have = WT.owned(id);
        if (have) {
          const r = WT.save.roster[id];
          ui.unitCard(this, x, y, 124, 166, id, { stars: r.stars, compact: true, onClick: () => this._photo(id) });
        } else {
          const lock = this.add.image(x, y, 'card_locked');
          lock.setScale(Math.min(124 / lock.width, 166 / lock.height));
          lock.setInteractive({ useHandCursor: true });
          lock.on('pointerup', () => { WT.audio.play('tap'); WT.ui.toast(this, `A ${WT.RARITIES[WT.UNITS[id].rarity].name} friend you haven't met yet…`); });
        }
        ui.rarityTag(this, x, y + 104, WT.UNITS[id].rarity, 12);
      });
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
