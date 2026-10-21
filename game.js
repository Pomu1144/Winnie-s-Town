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

    // Characters
    this.load.spritesheet('princessbear', 'assets/characters/princess_bear_seal.png', {
      frameWidth: PRINCESS_BEAR.frameWidth, frameHeight: PRINCESS_BEAR.frameHeight,
    });
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

    if (this.textures.exists('princessbear')) {
      this.anims.create({
        key: 'princessbear-sleep',
        frames: this.anims.generateFrameNumbers('princessbear', { frames: PRINCESS_BEAR.frames.sleep }),
        frameRate: 0.8,
        repeat: -1,
      });
    }

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
//  Princess Bear — a crowned bear in a pink gown riding her seal
// ================================================================

/**
 * Sprite sheet: 4 × 3 grid. Every pose faces left (the seal's head),
 * so the sprite is flipped when travelling right.
 */
const PRINCESS_BEAR = {
  key: 'princessbear',
  name: 'Princess Bear',
  frameWidth: 282,
  frameHeight: 254,
  portraitFrame: 2,
  frames: {
    scepter: 0, sleep: [1, 9], hearts: 2, roses: 3,
    cheer: 4, bow: 5, point: 6, dash: 7,
    hug: 8, snooze: 9, boba: 10, cool: 11,
  },
};

const PB_IDLE_POSES = ['scepter', 'hearts', 'roses', 'point', 'hug', 'boba', 'cool'];

class PrincessBear extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} opts  { x, groundY, height, minX, maxX, wander }
   */
  constructor(scene, opts) {
    super(scene, opts.x, opts.groundY, PRINCESS_BEAR.key, PRINCESS_BEAR.frames.hearts);
    scene.add.existing(this);
    this.setOrigin(0.5, 1);

    this._wander = opts.wander !== false;
    this._idleCount = 0;
    this._timer = null;
    this._busy = false;
    this.setArea(opts);

    this.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 1 });
    this.on('pointerdown', () => this.react());
    this.once('destroy', () => this._clearTimer());

    this._startBreathing();
    this._idle();
  }

  /** Re-layout (called on resize). */
  setArea({ groundY, height, minX, maxX }) {
    this.baseScale = height / PRINCESS_BEAR.frameHeight;
    this.groundY = groundY;
    this.minX = minX ?? this.x;
    this.maxX = maxX ?? this.x;
    this.x = Phaser.Math.Clamp(this.x, this.minX, this.maxX);
    this.y = groundY;
    this.setScale(this.baseScale);
    if (this._breath) this._startBreathing();
  }

  // ── Behaviour loop ─────────────────────────────────────────────
  _schedule(ms, fn) {
    this._clearTimer();
    this._timer = this.scene.time.delayedCall(ms, fn, null, this);
  }

  _clearTimer() {
    if (this._timer) { this._timer.remove(false); this._timer = null; }
  }

  _setPose(name) {
    this.anims.stop();
    this.setFrame(PRINCESS_BEAR.frames[name]);
  }

  _startBreathing() {
    if (this._breath) this._breath.stop();
    // Gentle seal squish: wider + shorter, anchored at the ground line
    this.setScale(this.baseScale);
    this._breath = this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * 1.025,
      scaleY: this.baseScale * 0.975,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _idle() {
    this._busy = false;
    this._setPose(Phaser.Utils.Array.GetRandom(PB_IDLE_POSES));
    this._idleCount++;
    this._schedule(Phaser.Math.Between(2400, 4200), this._next);
  }

  _next() {
    const roll = Math.random();
    if (this._idleCount > 4 && roll < 0.25) return this._sleep();
    if (roll < 0.12) return this._showBow();
    if (this._wander && this.maxX > this.minX && roll < 0.6) return this._dash();
    this._idle();
  }

  _dash() {
    const span = this.maxX - this.minX;
    let tx = Phaser.Math.FloatBetween(this.minX, this.maxX);
    if (Math.abs(tx - this.x) < span * 0.2) tx = this.x < (this.minX + this.maxX) / 2 ? this.maxX : this.minX;

    this._busy = true;
    this._setPose('dash');
    this.setFlipX(tx > this.x);
    this._clearTimer();
    this.scene.tweens.add({
      targets: this,
      x: tx,
      duration: Math.max(600, Math.abs(tx - this.x) / 0.18),
      ease: 'Sine.easeInOut',
      onComplete: () => { if (this.active) this._idle(); },
    });
  }

  _showBow() {
    this._setPose('bow');
    this._puff('♥', 0xff8fb8);
    this._schedule(1800, this._idle);
  }

  _sleep() {
    this._idleCount = 0;
    this.anims.play('princessbear-sleep');
    this._zzz = this.scene.time.addEvent({
      delay: 1100, repeat: 4,
      callback: () => this.active && this._puff('z', 0x9b6fd0, 20),
    });
    this._schedule(Phaser.Math.Between(6000, 9000), () => { this._zzz?.remove(); this._idle(); });
  }

  /** Tap reaction: hop, cheer and burst of hearts. */
  react() {
    if (this._hopping) return;
    this._hopping = true;
    this._zzz?.remove();
    this.scene.tweens.killTweensOf(this);
    this._breath = null;
    this.setScale(this.baseScale);
    this._setPose(Math.random() < 0.5 ? 'cheer' : 'scepter');

    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 90, () => this.active && this._puff('♥', 0xff6fa5));
    }

    this.scene.tweens.add({
      targets: this,
      y: this.groundY - this.displayHeight * 0.18,
      duration: 220,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!this.active) return;
        this.y = this.groundY;
        this._hopping = false;
        this._startBreathing();
        this._schedule(1200, this._idle);
      },
    });
  }

  /** Floating emote (heart / z) above her crown. */
  _puff(char, color, size) {
    const s = this.scene;
    const top = this.y - this.displayHeight * 0.9;
    const t = s.add.text(
      this.x + Phaser.Math.Between(-this.displayWidth * 0.3, this.displayWidth * 0.3), top, char,
      {
        fontSize: `${size || Math.round(18 + Math.random() * 12)}px`,
        color: '#' + color.toString(16).padStart(6, '0'),
        fontFamily: 'Arial', fontStyle: 'bold',
        stroke: '#ffffff', strokeThickness: 3,
      },
    ).setOrigin(0.5).setDepth(this.depth + 1);
    s.tweens.add({
      targets: t,
      y: top - Phaser.Math.Between(40, 80),
      x: t.x + Phaser.Math.Between(-20, 20),
      alpha: 0,
      duration: 1300,
      ease: 'Sine.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}


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
    this._spawnPrincessBear();

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

    this._hudTop = CY - SZ / 2 - PY;
    const pill = this.add.graphics().setDepth(6);
    drawPill(pill, SX - PX, CY - SZ / 2 - PY, TW + PX * 2, SZ + PY * 2, 30, 0x120a04, 0.82, 0xf5c842, 0.55);
    this._hudObjs.push(pill);

    BTNS.forEach((b, i) => {
      const bx  = SX + i * (SZ + GAP) + SZ / 2;
      // Uniform scale — fit the icon square within SZ × SZ
      const btn = this.add.image(bx, CY, b.key).setDepth(6).setInteractive({ useHandCursor: true });
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

  // ── Princess Bear wandering the café floor ─────────────────────
  _bearArea() {
    const W = this.scale.width, H = this.scale.height;
    // Floor starts ~76% down the background art; stay above the HUD pill
    const floorY = this.bg.y + (0.88 - 0.5) * this.bg.displayHeight;
    const groundY = Math.min(floorY, this._hudTop - 6);
    const height = Phaser.Math.Clamp(H * 0.26, 110, 240);
    const halfW = height * (PRINCESS_BEAR.frameWidth / PRINCESS_BEAR.frameHeight) / 2;
    return { groundY, height, minX: halfW + 8, maxX: W - halfW - 8 };
  }

  _spawnPrincessBear() {
    if (!this.textures.exists(PRINCESS_BEAR.key)) return;
    const area = this._bearArea();
    this.princessBear = new PrincessBear(this, { x: this.scale.width * 0.5, ...area }).setDepth(5);
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
    this.princessBear?.setArea(this._bearArea());
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
        fontSize: '30px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._uiObjs.push(title, label);
    } else {
      const tw = Math.min(W * 0.55, 340);
      const gfx = this.add.graphics();
      drawPill(gfx, W / 2 - tw / 2, 14, tw, 56, 14, 0x120a04, 0.85, 0xf5c842, 0.9);
      const label = this.add.text(W / 2, 42, 'Team Manager', {
        fontSize: '30px', color: '#ffe84a', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._uiObjs.push(gfx, label);
    }

    // ── Character slots grid ──────────────────────────────────────
    const COLS = 3;
    const ROWS = 2;
    const sideMargin = Math.max(20, W * 0.05);
    const gap = Math.max(14, Math.min(26, W * 0.02));
    const headerBottom = 104;
    const controlsTop = H - 140;
    const availableHeight = Math.max(190, controlsTop - headerBottom);
    const maxSlotWByWidth = (W - sideMargin * 2 - gap * (COLS - 1)) / COLS;
    const maxSlotWByHeight = (availableHeight - gap * (ROWS - 1)) / (ROWS * 1.25);
    const slotW = Math.max(112, Math.min(maxSlotWByWidth, maxSlotWByHeight, 260));
    const slotH = slotW * 1.25;
    const gridW = COLS * slotW + (COLS - 1) * gap;
    const gridH = ROWS * slotH + (ROWS - 1) * gap;
    const gx = (W - gridW) / 2;
    const gy = headerBottom + (availableHeight - gridH) / 2;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sx = gx + c * (slotW + gap);
        const sy = gy + r * (slotH + gap);

        // Slot background
        const slotImg = this.add.image(sx + slotW / 2, sy + slotH / 2,
          this.textures.exists('slot') ? 'slot' : '__DEFAULT');
        slotImg.setScale(fitScale(slotImg, slotW, slotH));
        this._uiObjs.push(slotImg);

        if (r === 0 && c === 0 && this.textures.exists(PRINCESS_BEAR.key)) {
          this._buildBearCard(sx, sy, slotW, slotH);
          continue;
        }

        // Locked indicator for empty slots
        const lockImg = this.add.image(sx + slotW / 2, sy + slotH / 2,
          this.textures.exists('charlocked') ? 'charlocked' : '__DEFAULT');
        lockImg.setScale(fitScale(lockImg, slotW * 0.72, slotH * 0.72));
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
    const btnH  = Math.max(52, Math.min(76, H * 0.1));
    const btnW  = Math.max(110, Math.min((W - sideMargin * 2) / actionBtns.length - gap, 180));
    const row2Y = H - btnH * 0.75 - 40;
    const row2X = (W - (actionBtns.length * (btnW + gap) - gap)) / 2;

    actionBtns.forEach((b, i) => {
      const bx = row2X + i * (btnW + gap) + btnW / 2;
      if (this.textures.exists(b.key)) {
        const img = this.add.image(bx, row2Y, b.key);
        img.setScale(fitScale(img, btnW, btnH));
        img.setInteractive({ useHandCursor: true });
        this._uiObjs.push(img);
      } else {
        const gfx = this.add.graphics();
        drawPill(gfx, bx - btnW / 2, row2Y - btnH / 2, btnW, btnH, 12, 0x2a1408, 0.9, 0xf5c842, 0.8);
        const t = this.add.text(bx, row2Y, b.label, { fontSize: '20px', color: '#ffe84a', fontFamily: 'Arial' }).setOrigin(0.5);
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

  /** Unlocked team slot: Princess Bear portrait — tap to cycle her poses. */
  _buildBearCard(sx, sy, slotW, slotH) {
    // The slot art (1500×1000 canvas) shows as a ~0.64·slotW square at the slot centre
    const cx = sx + slotW / 2;
    const cy = sy + slotH / 2;

    const sprite = this.add.sprite(cx, cy + slotW * 0.13, PRINCESS_BEAR.key, PRINCESS_BEAR.portraitFrame)
      .setOrigin(0.5, 1);
    const s = fitScale(sprite, slotW * 0.56, slotW * 0.42);
    sprite.setScale(s).setInteractive({ useHandCursor: true });

    const poses = PB_IDLE_POSES.concat('cheer');
    let i = 0;
    sprite.on('pointerdown', () => {
      i = (i + 1) % poses.length;
      sprite.setFrame(PRINCESS_BEAR.frames[poses[i]]);
      this.tweens.add({ targets: sprite, scaleX: s * 1.08, scaleY: s * 0.94, duration: 110, yoyo: true });
    });

    const name = this.add.text(cx, cy + slotW * 0.15, PRINCESS_BEAR.name, {
      fontSize: `${Math.round(Phaser.Math.Clamp(slotW * 0.075, 11, 18))}px`,
      color: '#5a2d0c', fontFamily: 'Arial', fontStyle: 'bold',
      align: 'center', wordWrap: { width: slotW * 0.7 },
    }).setOrigin(0.5, 0);

    this._uiObjs.push(sprite, name);
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
