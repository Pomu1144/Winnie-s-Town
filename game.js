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

/** Draw a filled+stroked rounded rect pill on a Graphics object. */
function drawPill(gfx, x, y, w, h, radius, fillColor, fillAlpha, strokeColor, strokeAlpha) {
  gfx.fillStyle(fillColor, fillAlpha);
  gfx.fillRoundedRect(x, y, w, h, radius);
  gfx.lineStyle(2, strokeColor, strokeAlpha);
  gfx.strokeRoundedRect(x, y, w, h, radius);
}


// ================================================================
//  BootScene — preload everything, generate procedural textures
// ================================================================
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Suppress 404s gracefully — we have fallback rendering for missing UI assets
    this.load.on('loaderror', f => console.warn('[Winnie] Asset not found (fallback in use):', f.key));

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

    // UI overlays
    this.load.image('inventoryscreen', 'assets/backgrounds/inventoryscreen.png');

    // Top-bar holder images
    this.load.image('starsholder',    'assets/icons/starsholder2.png');
    this.load.image('currencyholder', 'assets/icons/currencyholder2.png');
  }

  create() {
    // Generate a leaf sprite texture procedurally so no leaf image is needed
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x7db33a);
    g.fillEllipse(10, 20, 14, 30);
    g.fillStyle(0x4d7a1e);
    g.fillTriangle(10, 2, 3, 20, 17, 20);
    g.generateTexture('leaf', 20, 38);
    g.destroy();

    this.scene.start('CafeFrontScene');
  }
}


// ================================================================
//  Mixin: top-bar (stars left, currency right)
//  Call _buildTopBar() from create() and _onResize()
// ================================================================
const TopBarMixin = {
  _buildTopBar() {
    // Destroy any previously created top-bar objects
    if (this._topBarObjs) this._topBarObjs.forEach(o => o.destroy());
    this._topBarObjs = [];

    const W   = this.scale.width;
    const BW  = Math.min(190, W * 0.30);
    const BH  = 54;
    const BY  = 10;
    const RAD = 14;

    // ── Stars holder — left ───────────────────────────────────────
    if (this.textures.exists('starsholder')) {
      const img = this.add.image(12, BY, 'starsholder').setOrigin(0, 0).setDisplaySize(BW, BH);
      this._topBarObjs.push(img);
    } else {
      const g = this.add.graphics();
      drawPill(g, 12, BY, BW, BH, RAD, 0x120a04, 0.80, 0xf5c842, 0.85);
      const t = this.add.text(12 + BW / 2, BY + BH / 2, '⭐  0', {
        fontSize: '17px', color: '#ffe84a', fontFamily: 'Arial',
      }).setOrigin(0.5);
      this._topBarObjs.push(g, t);
    }

    // ── Currency holder — right ───────────────────────────────────
    const rx = W - BW - 12;
    if (this.textures.exists('currencyholder')) {
      const img = this.add.image(W - 12, BY, 'currencyholder').setOrigin(1, 0).setDisplaySize(BW, BH);
      this._topBarObjs.push(img);
    } else {
      const g2 = this.add.graphics();
      drawPill(g2, rx, BY, BW, BH, RAD, 0x120a04, 0.80, 0xf5c842, 0.85);
      const t2 = this.add.text(rx + BW / 2, BY + BH / 2, '🍯  0', {
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

    // Background
    this.bg = this.add.image(W / 2, H / 2, 'cafefront');
    coverFit(this.bg, W, H);

    // Falling leaves (spawned behind UI elements)
    this._spawnLeaves();

    // Top bar
    this._buildTopBar();

    // Enter button — centred, with a continuous pulse
    this.enterBtn = this.add.image(W / 2, H / 2, 'enterbtn')
      .setDisplaySize(220, 76)
      .setInteractive({ useHandCursor: true });

    this._addPulse(this.enterBtn);

    this.enterBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('InsideCafeScene'));
    });

    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  // Continuous subtle scale pulse
  _addPulse(target) {
    const bx = target.scaleX;
    const by = target.scaleY;
    this.tweens.add({
      targets: target,
      scaleX: bx * 1.09,
      scaleY: by * 1.09,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _spawnLeaves() {
    const LEAF_TINTS = [0x8fbc44, 0xa5c44a, 0xc5a028, 0xe8b830, 0xd4601a, 0xba3810];
    const W = this.scale.width;
    const H = this.scale.height;

    for (let i = 0; i < 18; i++) {
      const sz     = Phaser.Math.Between(14, 28);
      const startY = Phaser.Math.FloatBetween(-40, H); // scatter across screen on first spawn
      const initX  = Phaser.Math.Between(0, W);

      const leaf = this.add.image(initX, startY, 'leaf')
        .setDisplaySize(sz, sz * 1.6)
        .setTint(Phaser.Utils.Array.GetRandom(LEAF_TINTS))
        .setAlpha(Phaser.Math.FloatBetween(0.55, 0.95));

      const fallDur = Phaser.Math.Between(5500, 11000);
      const sway    = Phaser.Math.Between(40, 120);

      // Fall straight down, looping
      this.tweens.add({
        targets: leaf,
        y: H + 55,
        duration: fallDur,
        ease: 'Linear',
        repeat: -1,
        onRepeat: () => {
          leaf.setX(Phaser.Math.Between(0, this.scale.width));
          leaf.setY(-45);
        },
      });

      // Horizontal sway (oscillates from spawn x ± sway)
      this.tweens.add({
        targets: leaf,
        x: initX + sway,
        duration: Phaser.Math.Between(1800, 3400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Rotation tumble
      this.tweens.add({
        targets: leaf,
        angle: Phaser.Math.FloatBetween(-400, 400),
        duration: Phaser.Math.Between(2500, 6500),
        repeat: -1,
        ease: 'Linear',
      });
    }
  }

  _onResize(gameSize) {
    const W = gameSize.width;
    const H = gameSize.height;
    coverFit(this.bg, W, H);
    this.enterBtn?.setPosition(W / 2, H / 2);
    this._buildTopBar();
  }

  shutdown() {
    this.scale.off('resize', this._onResize, this);
  }
}

// Apply top-bar mixin
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

    // Destroy previous HUD objects
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

    const SZ  = Math.min(72, Math.floor(W / 6.5));  // button size
    const GAP = Math.max(8, Math.floor(SZ * 0.13)); // tight gap between buttons
    const TW  = BTNS.length * SZ + (BTNS.length - 1) * GAP; // total group width
    const SX  = (W - TW) / 2;                       // group left edge (centred)
    const CY  = H - SZ / 2 - 22;                    // button centre y
    const PX  = 20, PY = 14;                         // pill padding

    // Pill backdrop behind buttons
    const pill = this.add.graphics();
    drawPill(
      pill,
      SX - PX, CY - SZ / 2 - PY,
      TW + PX * 2, SZ + PY * 2,
      28,
      0x120a04, 0.82,
      0xf5c842, 0.55
    );
    this._hudObjs.push(pill);

    BTNS.forEach((b, i) => {
      const bx  = SX + i * (SZ + GAP) + SZ / 2;
      const btn = this.add.image(bx, CY, b.key)
        .setDisplaySize(SZ, SZ)
        .setInteractive({ useHandCursor: true });

      const sx0 = btn.scaleX, sy0 = btn.scaleY;

      btn.on('pointerover', () =>
        this.tweens.add({ targets: btn, scaleX: sx0 * 1.12, scaleY: sy0 * 1.12, duration: 120 })
      );
      btn.on('pointerout', () =>
        this.tweens.add({ targets: btn, scaleX: sx0, scaleY: sy0, duration: 120 })
      );
      btn.on('pointerdown', () => btn.setScale(sx0 * 0.92, sy0 * 0.92));
      btn.on('pointerup', () => {
        this.tweens.add({ targets: btn, scaleX: sx0, scaleY: sy0, duration: 100 });
        this._handleBtnAction(b.id);
      });

      this._hudObjs.push(btn);
    });
  }

  _handleBtnAction(id) {
    switch (id) {
      case 'map':
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => this.scene.start('MapScene'));
        break;
      case 'decorate':
        this._openInventory();
        break;
      // shop, camera, team — placeholders for future scenes
    }
  }

  // ── Inventory overlay ──────────────────────────────────────────
  _openInventory() {
    if (this._invOpen) return;
    this._invOpen = true;

    const W = this.scale.width;
    const H = this.scale.height;

    // Dim backdrop — click anywhere on it to dismiss
    this._dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.60)
      .setDepth(10)
      .setInteractive();
    this._dim.on('pointerdown', () => this._closeInventory());

    // Panel sizing
    const PW = Math.min(W * 0.90, 560);
    const PH = Math.min(H * 0.80, 480);

    if (this.textures.exists('inventoryscreen')) {
      this._invPanel = this.add.image(W / 2, H / 2, 'inventoryscreen')
        .setDepth(11)
        .setInteractive(); // blocks pointer events from falling through to dim
      this._invPanel.on('pointerdown', (_p, _x, _y, ev) => ev.stopPropagation());

      const tx = PW / this._invPanel.width;
      const ty = PH / this._invPanel.height;

      this._invPanel.setScale(0.01);
      this.tweens.add({
        targets: this._invPanel,
        scaleX: tx, scaleY: ty,
        duration: 340,
        ease: 'Back.easeOut',
      });
    } else {
      // Fallback drawn panel (Container scales from centre)
      const cont = this.add.container(W / 2, H / 2).setDepth(11);
      const gfx  = this.add.graphics();
      drawPill(gfx, -PW / 2, -PH / 2, PW, PH, 22, 0x3d1f0c, 1.0, 0xf5c842, 1.0);
      const lbl = this.add.text(0, 0, '📦  Inventory', {
        fontSize: '26px', color: '#f5c842', fontFamily: 'Arial',
      }).setOrigin(0.5);
      cont.add([gfx, lbl]);
      cont.setInteractive(
        new Phaser.Geom.Rectangle(-PW / 2, -PH / 2, PW, PH),
        Phaser.Geom.Rectangle.Contains
      );
      cont.on('pointerdown', (_p, _x, _y, ev) => ev.stopPropagation());
      this._invPanel = cont;

      this._invPanel.setScale(0.01);
      this.tweens.add({
        targets: this._invPanel,
        scaleX: 1, scaleY: 1,
        duration: 340,
        ease: 'Back.easeOut',
      });
    }
  }

  _closeInventory() {
    if (!this._invOpen) return;
    this.tweens.killTweensOf(this._invPanel);
    this.tweens.add({
      targets: this._invPanel,
      scaleX: 0.01, scaleY: 0.01,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this._invPanel?.destroy();
        this._dim?.destroy();
        this._invPanel = null;
        this._dim      = null;
        this._invOpen  = false;
      },
    });
  }

  _onResize(gameSize) {
    const W = gameSize.width;
    const H = gameSize.height;
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
    const W = this.scale.width;
    const H = this.scale.height;

    this.bg = this.add.image(W / 2, H / 2, 'map');
    coverFit(this.bg, W, H);

    this._buildBack();

    this.scale.on('resize', this._onResize, this);
    this.cameras.main.fadeIn(400);
  }

  _buildBack() {
    // Destroy old back button objects
    if (this._backObjs) this._backObjs.forEach(o => o.destroy());
    this._backObjs = [];

    const BX = 16, BY = 14, BW = 118, BH = 46;

    const gfx = this.add.graphics();
    drawPill(gfx, BX, BY, BW, BH, 14, 0x120a04, 0.82, 0xf5c842, 0.80);

    const label = this.add.text(BX + BW / 2, BY + BH / 2, '← Back', {
      fontSize: '20px',
      color: '#ffe84a',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Invisible Zone as the hit area
    const hit = this.add.zone(BX, BY, BW, BH)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('InsideCafeScene'));
    });

    this._backObjs = [gfx, label, hit];
  }

  _onResize(gameSize) {
    coverFit(this.bg, gameSize.width, gameSize.height);
    this._buildBack();
  }

  shutdown() {
    this.scale.off('resize', this._onResize, this);
  }
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
    scene: [BootScene, CafeFrontScene, InsideCafeScene, MapScene],
  });
});
