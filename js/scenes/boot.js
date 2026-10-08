/* ================================================================
 *  BootScene — loads every asset behind a cosy progress bar and
 *  generates the small particle textures used for effects.
 * ================================================================ */
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // The logo is tiny and loads first so the loading screen can show it.
    this.load.image('logo', 'assets/ui/logo.webp');
  }

  create() {
    const { W, H, COLORS: C } = WT;
    this.cameras.main.setBackgroundColor('#fbe3cf');
    const logo = this.add.image(W / 2, H / 2 - 70, 'logo');
    logo.setScale(420 / logo.width);
    this.tweens.add({ targets: logo, y: logo.y - 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const bw = 460, bh = 26, bx = W / 2 - bw / 2, by = H / 2 + 120;
    const g = this.add.graphics();
    g.fillStyle(C.caramel, 1); g.fillRoundedRect(bx - 5, by - 5, bw + 10, bh + 10, (bh + 10) / 2);
    g.fillStyle(C.cream, 1); g.fillRoundedRect(bx, by, bw, bh, bh / 2);
    const fill = this.add.graphics();
    const label = WT.ui.text(this, W / 2, by + bh + 32, 'Warming up the ovens…', 20, WT.TXT.brown);

    const tips = [
      'Warming up the ovens…', 'Brushing the bears…', 'Glazing the éclairs…',
      'Polishing heartstones…', 'Fluffing the mochi…', 'Steeping the tea…',
    ];
    let tipIdx = 0;
    this.time.addEvent({ delay: 700, loop: true, callback: () => label.setText(tips[++tipIdx % tips.length]) });

    this.load.on('progress', p => {
      fill.clear();
      fill.fillStyle(C.pink, 1);
      fill.fillRoundedRect(bx + 3, by + 3, Math.max(bh - 6, (bw - 6) * p), bh - 6, (bh - 6) / 2);
      fill.fillStyle(0xffffff, 0.35);
      fill.fillRoundedRect(bx + 8, by + 5, Math.max(4, (bw - 16) * p), 6, 3);
    });
    this.load.on('loaderror', f => console.warn('[Winnie] Missing asset:', f.key, f.src));

    this._queueAssets();
    this.load.once('complete', () => this._finish());
    this.load.start();
  }

  _queueAssets() {
    const L = this.load;
    // scenes
    L.image('bg_front', 'assets/opt/scene/cafefront.webp');
    L.image('bg_cafe', 'assets/opt/scene/insidecafe.webp');
    L.image('bg_map', 'assets/opt/scene/map.webp');
    L.image('bg_shop', 'assets/opt/backgrounds/shopwindow.webp');
    L.image('bg_paper', 'assets/opt/backgrounds/inventorybackground.webp');
    L.image('card_locked', 'assets/opt/backgrounds/characterlocked.webp');
    // arenas
    ['cafe', 'park', 'mall', 'beach', 'tvcity', 'capitol', 'stadium', 'bank'].forEach(k => L.image('arena_' + k, `assets/arenas/arena_${k}.webp`));
    // units
    WT.UNIT_IDS.forEach(id => L.image('unit_' + id, `assets/units/${id}.webp`));
    // characters around town
    L.image('npc_winnie', 'assets/opt/characters/bearorginator.webp');
    ['fox', 'bird', 'monkey'].forEach(k => L.image('npc_' + k, `assets/opt/characters/civillian_${k}.webp`));
    L.image('npc_seal', 'assets/opt/characters/sealorigin.webp');
    // ui
    L.image('oven', 'assets/ui/oven.webp');
    ['tank', 'striker', 'mage', 'support'].forEach(k => L.image('role_' + k, `assets/ui/role_${k}.webp`));
    ['bear', 'pastry'].forEach(k => L.image('faction_' + k, `assets/ui/faction_${k}.webp`));
    const icons = {
      btn_enter: 'enterbtn_revised', btn_map: 'mapbutton2', btn_shop: 'shopbutton2', btn_decorate: 'decoratebutton2',
      btn_camera: 'camerabutton2', btn_team: 'team_managerbtnicon', btn_settings: 'settingbutton2',
      btn_auto: 'autobtn', btn_battle: 'battlebtn', btn_remove: 'removebtn', btn_reorder: 'reorderbtn',
      textbox: 'textbox2',
    };
    Object.entries(icons).forEach(([k, f]) => L.image(k, `assets/opt/icons/${f}.webp`));
    // decor
    Object.keys(WT.DECOR).forEach(k => L.image('decor_' + k, `assets/opt/decor/${k}.webp`));
    L.image('icon_honey', 'assets/opt/decor/honeyjar.webp');
    L.image('icon_heartstone', 'assets/opt/decor/heartstone.webp');
  }

  _finish() {
    this._makeTextures();
    const start = WT.START_SCENE || 'TitleScene';
    this.cameras.main.fadeOut(250, 251, 227, 207);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(start));
  }

  /** Procedural particle / icon textures. */
  _makeTextures() {
    const g = this.make.graphics({ add: false });

    // 4-point sparkle
    g.clear(); g.fillStyle(0xffffff, 1);
    g.fillPoints([{ x: 32, y: 0 }, { x: 38, y: 26 }, { x: 64, y: 32 }, { x: 38, y: 38 }, { x: 32, y: 64 }, { x: 26, y: 38 }, { x: 0, y: 32 }, { x: 26, y: 26 }], true);
    g.generateTexture('fx_spark', 64, 64);

    // heart
    g.clear(); g.fillStyle(0xffffff, 1);
    g.fillCircle(18, 18, 14); g.fillCircle(42, 18, 14); g.fillTriangle(5, 25, 55, 25, 30, 54);
    g.generateTexture('fx_heart', 60, 58);

    // soft dot
    g.clear();
    for (let r = 16; r > 0; r -= 2) { g.fillStyle(0xffffff, (1 - r / 16) * 0.5 + 0.08); g.fillCircle(16, 16, r); }
    g.generateTexture('fx_dot', 32, 32);

    // ring
    g.clear(); g.lineStyle(6, 0xffffff, 1); g.strokeCircle(40, 40, 34);
    g.generateTexture('fx_ring', 80, 80);

    // hexagon (shields)
    g.clear(); g.lineStyle(5, 0xffffff, 1); g.fillStyle(0xffffff, 0.25);
    const hex = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; hex.push({ x: 40 + Math.cos(a) * 34, y: 40 + Math.sin(a) * 34 }); }
    g.fillPoints(hex, true); g.strokePoints(hex, true);
    g.generateTexture('fx_hex', 80, 80);

    // snowflake
    g.clear(); g.lineStyle(4, 0xffffff, 1);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.lineBetween(24 - Math.cos(a) * 20, 24 - Math.sin(a) * 20, 24 + Math.cos(a) * 20, 24 + Math.sin(a) * 20); }
    g.generateTexture('fx_snow', 48, 48);

    // crumb (for pastry hits)
    g.clear(); g.fillStyle(0xffffff, 1); g.fillEllipse(10, 8, 18, 13);
    g.generateTexture('fx_crumb', 20, 16);

    // star icon for the top bar
    g.clear();
    const star = (cx, cy, R, col) => {
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? R * 0.5 : R; pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr }); }
      g.fillStyle(col, 1); g.fillPoints(pts, true);
    };
    star(34, 36, 32, 0xc98208); star(32, 32, 30, 0xf4c34a);
    g.fillStyle(0xffffff, 0.55); g.fillCircle(24, 22, 6);
    g.generateTexture('icon_star', 68, 68);

    // falling leaf (title screen)
    g.clear(); g.fillStyle(0x7db33a); g.fillEllipse(10, 20, 14, 30); g.fillStyle(0x4d7a1e); g.fillTriangle(10, 2, 3, 20, 17, 20);
    g.generateTexture('fx_leaf', 20, 38);

    // petal
    g.clear(); g.fillStyle(0xffffff); g.fillEllipse(10, 7, 20, 12);
    g.generateTexture('fx_petal', 20, 14);

    g.destroy();
  }
}
