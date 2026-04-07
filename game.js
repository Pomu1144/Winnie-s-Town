/* ================================================================
 *  Winnie's Town — Café Game
 *  Phaser 3 · RESIZE mode · fade transitions · leaf animation
 * ================================================================ */

// ── helpers ──────────────────────────────────────────────────────

/** Scale & centre an image to cover the full game viewport (no letterbox). */
function coverFit(img, w, h) {
  img.setScale(Math.max(w / img.width, h / img.height));
  img.setPosition(w / 2, h / 2);
}

/**
 * Uniform scale an image so it fits WITHIN targetW × targetH
 * (contain-fit, no distortion).
 */
function fitScale(img, targetW, targetH) {
  return Math.min(targetW / img.width, targetH / img.height);
}

/** Draw a filled+stroked rounded rect pill on a Graphics object. */
function drawPill(gfx, x, y, w, h, radius, fillColor, fillAlpha, strokeColor, strokeAlpha) {
  gfx.fillStyle(fillColor, fillAlpha);
  gfx.fillRoundedRect(x, y, w, h, radius);
  gfx.lineStyle(2, strokeColor, strokeAlpha);
  gfx.strokeRoundedRect(x, y, w, h, radius);
}


// ── page routing ─────────────────────────────────────────

const PAGE_ROUTES = {
  storefront: 'index.html',
  shop: 'shop.html',
  maps: 'maps.html',
  inventory: 'inventory.html',
  decorate: 'decorate.html',
  'team-manager': 'team-manager.html',
};

const START_SCENE_BY_PAGE = {
  storefront: 'CafeFrontScene',
  shop: 'InsideCafeScene',
  maps: 'MapScene',
  inventory: 'InventoryScene',
  decorate: 'DecorateScene',
  'team-manager': 'TeamScene',
};

const CURRENT_PAGE = document.body?.dataset.page || 'storefront';

function navigateToPage(pageKey) {
  const target = PAGE_ROUTES[pageKey];
  if (!target) return;
  if (window.location.pathname.endsWith('/' + target) || window.location.pathname === '/' + target) return;
  window.location.href = target;
}

// ================================================================
//  BootScene — preload everything, generate procedural textures
// ================================================================
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.load.on('loaderror', f => console.warn('[Winnie] Asset not found:', f.key));

    // Scene backgrounds
    this.load.image('cafefront',  'assets/scene/cafefront.png');
    this.load.image('insidecafe', 'assets/scene/insidecafe.png');
    this.load.image('map',        'assets/scene/map.png');

    // HUD / interactive icons
    this.load.image('enterbtn',    'assets/icons/enterbtn_revised.png');
    this.load.image('mapbtn',      'assets/icons/mapbutton2.png');
    this.load.image('shopbtn',     'assets/icons/shopbutton2.png');
    this.load.image('decoratebtn', 'assets/icons/decoratebutton2.png');
    this.load.image('camerabtn',   'assets/icons/camerabutton2.png');
    this.load.image('teambtn',     'assets/icons/team_managerbtnicon.png');

    // UI overlays & backgrounds
    this.load.image('inventoryscreen',   'assets/backgrounds/inventoryscreen.png');
    this.load.image('inventorybg',       'assets/backgrounds/inventorybackground.png');

    // Top-bar holders
    this.load.image('starsholder',    'assets/icons/starsholder2.png');
    this.load.image('currencyholder', 'assets/icons/currencyholder2.png');

    // Team-manager UI
    this.load.image('textbox2',   'assets/icons/textbox2.png');
    this.load.image('autobtn',    'assets/icons/autobtn.png');
    this.load.image('battlebtn',  'assets/icons/battlebtn.png');
    this.load.image('removebtn',  'assets/icons/removebtn.png');
    this.load.image('reorderbtn', 'assets/icons/reorderbtn.png');

    // Character slots
    this.load.image('slot',           'assets/backgrounds/inventoryslot.png');
    this.load.image('charlocked',     'assets/backgrounds/characterlocked.png');
    this.load.image('charexist',      'assets/backgrounds/characterexist.png');
  }

  create() {
    // Procedural leaf texture
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x7db33a);
    g.fillEllipse(10, 20, 14, 30);
    g.fillStyle(0x4d7a1e);
    g.fillTriangle(10, 2, 3, 20, 17, 20);
    g.generateTexture('leaf', 20, 38);
    g.destroy();

    this.scene.start(START_SCENE_BY_PAGE[CURRENT_PAGE] || 'CafeFrontScene');
  }
}


// ================================================================
//  Mixin: top-bar (stars left, currency right)
// ================================================================
const TopBarMixin = {
  _buildTopBar() {
    if (this._topBarObjs) this._topBarObjs.forEach(o => o.destroy());
    this._topBarObjs = [];

    const W      = this.scale.width;
    const TARGET_H = Math.min(64, this.scale.height * 0.085); // height budget
    const PAD    = 12;

    // ── Stars holder — left ───────────────────────────────────────
    if (this.textures.exists('starsholder')) {
      const img = this.add.image(PAD, PAD, 'starsholder').setOrigin(0, 0);
      // Scale uniformly to fit within (screen_third × TARGET_H)
      const maxW = Math.min(200, W * 0.32);
      img.setScale(fitScale(img, maxW, TARGET_H));
      this._topBarObjs.push(img);
    } else {
      const bw = Math.min(190, W * 0.30);
      const g  = this.add.graphics();
      drawPill(g, PAD, PAD, bw, TARGET_H, 14, 0x120a04, 0.80, 0xf5c842, 0.85);
      const t = this.add.text(PAD + bw / 2, PAD + TARGET_H / 2, '⭐  0', {
        fontSize: '17px', color: '#ffe84a', fontFamily: 'Arial',
      }).setOrigin(0.5);
      this._topBarObjs.push(g, t);
    }

    // ── Currency holder — right ───────────────────────────────────
    if (this.textures.exists('currencyholder')) {
      const img = this.add.image(W - PAD, PAD, 'currencyholder').setOrigin(1, 0);
      const maxW = Math.min(200, W * 0.32);
      img.setScale(fitScale(img, maxW, TARGET_H));
      this._topBarObjs.push(img);
    } else {
      const bw = Math.min(190, W * 0.30);
      const rx = W - bw - PAD;
      const g2 = this.add.graphics();
      drawPill(g2, rx, PAD, bw, TARGET_H, 14, 0x120a04, 0.80, 0xf5c842, 0.85);
      const t2 = this.add.text(rx + bw / 2, PAD + TARGET_H / 2, '🍯  0', {
        fontSize: '17px', color: '#ffb347', fontFamily: 'Arial',
      }).setOrigin(0.5);
      this._topBarObjs.push(g2, t2);
    }
  },
};


// ================================================================
//  CafeFrontScene — exterior, leaves, enter button
// ================================================================
class CafeFrontScene extends Phaser.Scene {
  constructor() { super('CafeFrontScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.bg = this.add.image(W / 2, H / 2, 'cafefront');
    coverFit(this.bg, W, H);

    this._spawnLeaves();
    this._buildTopBar();
    this._buildEnterBtn();

    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  _buildEnterBtn() {
    const W = this.scale.width;
    const H = this.scale.height;

    if (this.enterBtn) {
      this.tweens.killTweensOf(this.enterBtn);
      this.enterBtn.destroy();
    }

    // Target width = 48% of screen width, max 300px, preserve aspect ratio
    const targetW = Math.min(W * 0.48, 300);
    const targetH = H * 0.14;

    const src = this.textures.get('enterbtn').source[0];
    const s   = fitScale({ width: src.width, height: src.height }, targetW, targetH);
    this.enterBtn = this.add.image(W / 2, H * 0.58, 'enterbtn')
      .setScale(s)
      .setInteractive({ useHandCursor: true });

    // Pulse
    this.tweens.add({
      targets: this.enterBtn,
      scaleX: s * 1.08,
      scaleY: s * 1.08,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.enterBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => navigateToPage('shop'));
    });
  }

  _spawnLeaves() {
    const TINTS = [0x8fbc44, 0xa5c44a, 0xc5a028, 0xe8b830, 0xd4601a, 0xba3810];
    const W = this.scale.width;
    const H = this.scale.height;

    for (let i = 0; i < 18; i++) {
      const sz    = Phaser.Math.Between(14, 28);
      const initX = Phaser.Math.Between(0, W);
      const startY = Phaser.Math.FloatBetween(-40, H);

      const leaf = this.add.image(initX, startY, 'leaf')
        .setDisplaySize(sz, sz * 1.6)
        .setTint(Phaser.Utils.Array.GetRandom(TINTS))
        .setAlpha(Phaser.Math.FloatBetween(0.55, 0.95));

      const fallDur = Phaser.Math.Between(5500, 11000);
      const sway    = Phaser.Math.Between(40, 120);

      this.tweens.add({
        targets: leaf, y: H + 55, duration: fallDur, ease: 'Linear', repeat: -1,
        onRepeat: () => { leaf.setX(Phaser.Math.Between(0, this.scale.width)); leaf.setY(-45); },
      });
      this.tweens.add({
        targets: leaf, x: initX + sway,
        duration: Phaser.Math.Between(1800, 3400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: leaf, angle: Phaser.Math.FloatBetween(-400, 400),
        duration: Phaser.Math.Between(2500, 6500), repeat: -1, ease: 'Linear',
      });
    }
  }

  _onResize(gameSize) {
    const W = gameSize.width;
    const H = gameSize.height;
    coverFit(this.bg, W, H);
    this._buildTopBar();
    this._buildEnterBtn();
  }

  shutdown() {
    this.scale.off('resize', this._onResize, this);
  }
}

Object.assign(CafeFrontScene.prototype, TopBarMixin);


// ================================================================
//  InsideCafeScene — interior, full bottom HUD, inventory overlay
// ================================================================
class InsideCafeScene extends Phaser.Scene {
  constructor() { super('InsideCafeScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.bg = this.add.image(W / 2, H / 2, 'insidecafe');
    coverFit(this.bg, W, H);

    this._buildTopBar();
    this._buildHUD();

    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  // ── Bottom HUD ─────────────────────────────────────────────────
  _buildHUD() {
    const W = this.scale.width;
    const H = this.scale.height;

    if (this._hudObjs) {
      this._hudObjs.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
    }
    this._hudObjs = [];

    const BTNS = [
      { key: 'mapbtn',      id: 'map'      },
      { key: 'shopbtn',     id: 'shop'     },
      { key: 'decoratebtn', id: 'decorate' },
      { key: 'camerabtn',   id: 'camera'   },
      { key: 'teambtn',     id: 'team'     },
    ];

    // Larger buttons: up to 96px, fill width generously
    const SZ  = Math.min(96, Math.floor(W / 5.2));
    const GAP = Math.max(10, Math.floor(SZ * 0.12));
    const TW  = BTNS.length * SZ + (BTNS.length - 1) * GAP;
    const SX  = (W - TW) / 2;
    const CY  = H - SZ / 2 - 18;
    const PX  = 22, PY = 14;

    const pill = this.add.graphics();
    drawPill(pill, SX - PX, CY - SZ / 2 - PY, TW + PX * 2, SZ + PY * 2, 30, 0x120a04, 0.82, 0xf5c842, 0.55);
    this._hudObjs.push(pill);

    BTNS.forEach((b, i) => {
      const bx  = SX + i * (SZ + GAP) + SZ / 2;
      // Uniform scale — fit the icon square within SZ × SZ
      const btn = this.add.image(bx, CY, b.key).setInteractive({ useHandCursor: true });
      const s   = fitScale(btn, SZ, SZ);
      btn.setScale(s);

      btn.on('pointerover', () => this.tweens.add({ targets: btn, scaleX: s * 1.12, scaleY: s * 1.12, duration: 120 }));
      btn.on('pointerout',  () => this.tweens.add({ targets: btn, scaleX: s, scaleY: s, duration: 120 }));
      btn.on('pointerdown', () => btn.setScale(s * 0.92));
      btn.on('pointerup',   () => {
        this.tweens.add({ targets: btn, scaleX: s, scaleY: s, duration: 100 });
        this._handleBtnAction(b.id);
      });

      this._hudObjs.push(btn);
    });
  }

  _handleBtnAction(id) {
    switch (id) {
      case 'map':
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => navigateToPage('maps'));
        break;
      case 'shop':
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => navigateToPage('shop'));
        break;
      case 'decorate':
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => navigateToPage('decorate'));
        break;
      case 'team':
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => navigateToPage('team-manager'));
        break;
      case 'camera':
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => navigateToPage('inventory'));
        break;
    }
  }

  // ── Inventory overlay ──────────────────────────────────────────
  _openInventory() {
    if (this._invOpen) return;
    this._invOpen = true;

    const W = this.scale.width;
    const H = this.scale.height;

    this._dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.60)
      .setDepth(10).setInteractive();
    this._dim.on('pointerdown', () => this._closeInventory());

    // Fill as much of the screen as possible without distortion
    const PW = W * 0.96;
    const PH = H * 0.94;

    if (this.textures.exists('inventoryscreen')) {
      this._invPanel = this.add.image(W / 2, H / 2, 'inventoryscreen')
        .setDepth(11).setInteractive();
      this._invPanel.on('pointerdown', (_p, _x, _y, ev) => ev.stopPropagation());

      // Uniform scale — no distortion
      const s = fitScale(this._invPanel, PW, PH);
      this._invPanel.setScale(0.01);
      this.tweens.add({ targets: this._invPanel, scaleX: s, scaleY: s, duration: 340, ease: 'Back.easeOut' });
      this._invTargetScale = s;
    } else {
      const cont = this.add.container(W / 2, H / 2).setDepth(11);
      const gfx  = this.add.graphics();
      drawPill(gfx, -PW / 2, -PH / 2, PW, PH, 22, 0x3d1f0c, 1.0, 0xf5c842, 1.0);
      const lbl = this.add.text(0, 0, '📦  Inventory', { fontSize: '26px', color: '#f5c842', fontFamily: 'Arial' }).setOrigin(0.5);
      cont.add([gfx, lbl]);
      cont.setInteractive(new Phaser.Geom.Rectangle(-PW / 2, -PH / 2, PW, PH), Phaser.Geom.Rectangle.Contains);
      cont.on('pointerdown', (_p, _x, _y, ev) => ev.stopPropagation());
      this._invPanel = cont;
      this._invPanel.setScale(0.01);
      this.tweens.add({ targets: this._invPanel, scaleX: 1, scaleY: 1, duration: 340, ease: 'Back.easeOut' });
      this._invTargetScale = 1;
    }
  }

  _closeInventory() {
    if (!this._invOpen) return;
    this.tweens.killTweensOf(this._invPanel);
    this.tweens.add({
      targets: this._invPanel, scaleX: 0.01, scaleY: 0.01, duration: 200, ease: 'Back.easeIn',
      onComplete: () => {
        this._invPanel?.destroy(); this._dim?.destroy();
        this._invPanel = this._dim = null;
        this._invOpen = false;
      },
    });
  }

  _onResize(gameSize) {
    const W = gameSize.width, H = gameSize.height;
    coverFit(this.bg, W, H);
    this._buildTopBar();
    this._buildHUD();
    if (this._invOpen) {
      this._dim?.setPosition(W / 2, H / 2).setSize(W, H);
      this._invPanel?.setPosition(W / 2, H / 2);
    }
  }

  shutdown() {
    this.scale.off('resize', this._onResize, this);
  }
}

Object.assign(InsideCafeScene.prototype, TopBarMixin);


// ================================================================
//  MapScene — full-screen map, back button
// ================================================================
class MapScene extends Phaser.Scene {
  constructor() { super('MapScene'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.bg = this.add.image(W / 2, H / 2, 'map');
    coverFit(this.bg, W, H);
    this._buildBack();
    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  _buildBack() {
    if (this._backObjs) this._backObjs.forEach(o => o.destroy());
    const BX = 16, BY = 14, BW = 118, BH = 46;
    const gfx = this.add.graphics();
    drawPill(gfx, BX, BY, BW, BH, 14, 0x120a04, 0.82, 0xf5c842, 0.80);
    const label = this.add.text(BX + BW / 2, BY + BH / 2, '← Back', {
      fontSize: '20px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.add.zone(BX, BY, BW, BH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => navigateToPage('shop'));
    });
    this._backObjs = [gfx, label, hit];
  }

  _onResize(gameSize) {
    coverFit(this.bg, gameSize.width, gameSize.height);
    this._buildBack();
  }

  shutdown() { this.scale.off('resize', this._onResize, this); }
}




// ================================================================
//  InventoryScene — full-screen inventory background
// ================================================================
class InventoryScene extends Phaser.Scene {
  constructor() { super('InventoryScene'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const bgKey = this.textures.exists('inventoryscreen') ? 'inventoryscreen' : 'inventorybg';
    this.bg = this.add.image(W / 2, H / 2, bgKey);
    coverFit(this.bg, W, H);
    this._buildBack();
    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  _buildBack() {
    if (this._backObjs) this._backObjs.forEach(o => o.destroy());
    const BX = 16, BY = 14, BW = 118, BH = 46;
    const gfx = this.add.graphics();
    drawPill(gfx, BX, BY, BW, BH, 14, 0x120a04, 0.82, 0xf5c842, 0.80);
    const label = this.add.text(BX + BW / 2, BY + BH / 2, '← Back', {
      fontSize: '20px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.add.zone(BX, BY, BW, BH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => navigateToPage('shop'));
    });
    this._backObjs = [gfx, label, hit];
  }

  _onResize(gameSize) {
    coverFit(this.bg, gameSize.width, gameSize.height);
    this._buildBack();
  }

  shutdown() { this.scale.off('resize', this._onResize, this); }
}


// ================================================================
//  DecorateScene — decorating view using inventory background
// ================================================================
class DecorateScene extends Phaser.Scene {
  constructor() { super('DecorateScene'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.bg = this.add.image(W / 2, H / 2, 'inventoryscreen');
    coverFit(this.bg, W, H);
    this._buildBack();
    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  _buildBack() {
    if (this._backObjs) this._backObjs.forEach(o => o.destroy());
    const BX = 16, BY = 14, BW = 118, BH = 46;
    const gfx = this.add.graphics();
    drawPill(gfx, BX, BY, BW, BH, 14, 0x120a04, 0.82, 0xf5c842, 0.80);
    const label = this.add.text(BX + BW / 2, BY + BH / 2, '← Back', {
      fontSize: '20px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.add.zone(BX, BY, BW, BH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => navigateToPage('shop'));
    });
    this._backObjs = [gfx, label, hit];
  }

  _onResize(gameSize) {
    coverFit(this.bg, gameSize.width, gameSize.height);
    this._buildBack();
  }

  shutdown() { this.scale.off('resize', this._onResize, this); }
}

// ================================================================
//  TeamScene — team manager
// ================================================================
class TeamScene extends Phaser.Scene {
  constructor() { super('TeamScene'); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // Full-screen dark backdrop (reuse insidecafe bg, dimmed)
    this.bg = this.add.image(W / 2, H / 2, 'insidecafe');
    coverFit(this.bg, W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);

    this._buildUI();

    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  _buildUI() {
    const W = this.scale.width, H = this.scale.height;

    if (this._uiObjs) this._uiObjs.forEach(o => o.destroy());
    this._uiObjs = [];

    // ── Title panel ───────────────────────────────────────────────
    if (this.textures.exists('textbox2')) {
      const title = this.add.image(W / 2, 38, 'textbox2').setOrigin(0.5, 0);
      const ts = fitScale(title, Math.min(W * 0.55, 340), 68);
      title.setScale(ts);
      const label = this.add.text(W / 2, 38 + (title.height * ts) / 2, 'Team Manager', {
        fontSize: '20px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._uiObjs.push(title, label);
    } else {
      const tw = Math.min(W * 0.55, 340);
      const gfx = this.add.graphics();
      drawPill(gfx, W / 2 - tw / 2, 14, tw, 56, 14, 0x120a04, 0.85, 0xf5c842, 0.9);
      const label = this.add.text(W / 2, 42, 'Team Manager', {
        fontSize: '20px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._uiObjs.push(gfx, label);
    }

    // ── Character slots grid ──────────────────────────────────────
    const COLS  = 3;
    const ROWS  = 2;
    const slotW = Math.min((W - 60) / COLS, 160);
    const slotH = slotW * 1.25;
    const gridW = COLS * slotW + (COLS - 1) * 14;
    const gx    = (W - gridW) / 2;
    const gy    = 110;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sx = gx + c * (slotW + 14);
        const sy = gy + r * (slotH + 14);

        // Slot background
        const slotImg = this.add.image(sx + slotW / 2, sy + slotH / 2,
          this.textures.exists('slot') ? 'slot' : '__DEFAULT');
        slotImg.setScale(fitScale(slotImg, slotW, slotH));
        this._uiObjs.push(slotImg);

        // Locked indicator for empty slots
        const lockImg = this.add.image(sx + slotW / 2, sy + slotH / 2,
          this.textures.exists('charlocked') ? 'charlocked' : '__DEFAULT');
        lockImg.setScale(fitScale(lockImg, slotW * 0.62, slotH * 0.62));
        lockImg.setAlpha(0.85);
        this._uiObjs.push(lockImg);
      }
    }

    // ── Action buttons row ────────────────────────────────────────
    const actionBtns = [
      { key: 'autobtn',    label: 'Auto'    },
      { key: 'battlebtn',  label: 'Battle'  },
      { key: 'reorderbtn', label: 'Reorder' },
    ];
    const btnH  = Math.min(56, H * 0.075);
    const btnW  = Math.min((W - 60) / actionBtns.length - 10, 130);
    const row2Y = H - btnH - 80;
    const row2X = (W - (actionBtns.length * (btnW + 10) - 10)) / 2;

    actionBtns.forEach((b, i) => {
      const bx = row2X + i * (btnW + 10) + btnW / 2;
      if (this.textures.exists(b.key)) {
        const img = this.add.image(bx, row2Y, b.key);
        img.setScale(fitScale(img, btnW, btnH));
        img.setInteractive({ useHandCursor: true });
        this._uiObjs.push(img);
      } else {
        const gfx = this.add.graphics();
        drawPill(gfx, bx - btnW / 2, row2Y - btnH / 2, btnW, btnH, 12, 0x2a1408, 0.9, 0xf5c842, 0.8);
        const t = this.add.text(bx, row2Y, b.label, { fontSize: '15px', color: '#ffe84a', fontFamily: 'Arial' }).setOrigin(0.5);
        this._uiObjs.push(gfx, t);
      }
    });

    // ── Back button ───────────────────────────────────────────────
    const BX = 16, BY = 14, BW = 118, BH = 46;
    const backGfx = this.add.graphics();
    drawPill(backGfx, BX, BY, BW, BH, 14, 0x120a04, 0.82, 0xf5c842, 0.80);
    const backLabel = this.add.text(BX + BW / 2, BY + BH / 2, '← Back', {
      fontSize: '20px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    const backHit = this.add.zone(BX, BY, BW, BH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    backHit.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => navigateToPage('shop'));
    });
    this._uiObjs.push(backGfx, backLabel, backHit);
  }

  _onResize(gameSize) {
    coverFit(this.bg, gameSize.width, gameSize.height);
    this._buildUI();
  }

  shutdown() { this.scale.off('resize', this._onResize, this); }
}


// ================================================================
//  Phaser config & bootstrap
// ================================================================
window.addEventListener('load', () => {
  new Phaser.Game({
    type: Phaser.AUTO,
    backgroundColor: '#1a0f06',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent: 'game-container',
    },
    scene: [
      BootScene,
      CafeFrontScene,
      InsideCafeScene,
      MapScene,
      InventoryScene,
      DecorateScene,
      TeamScene,
    ],
  });
});
