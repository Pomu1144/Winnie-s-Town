/* ================================================================
 *  Princess Bear — a crowned bear in a pink gown riding her seal.
 *  She idles through poses, dashes across the café floor, naps with
 *  floating Z's, and hops with hearts when tapped.
 * ================================================================ */

/**
 * Sprite sheet: 4 × 3 grid. Every pose faces left (the seal's head),
 * so the sprite is flipped when travelling right.
 */
WT.PRINCESS_BEAR = {
  key: 'princessbear',
  name: 'Princess Bear',
  frameWidth: 282,
  frameHeight: 254,
  frames: {
    scepter: 0, sleep: [1, 9], hearts: 2, roses: 3,
    cheer: 4, bow: 5, point: 6, dash: 7,
    hug: 8, snooze: 9, boba: 10, cool: 11,
  },
  idlePoses: ['scepter', 'hearts', 'roses', 'point', 'hug', 'boba', 'cool'],
};

/** Queue the sheet (call from a scene's preload/loader). */
WT.loadPrincessBear = function (load) {
  const PB = WT.PRINCESS_BEAR;
  load.spritesheet(PB.key, 'assets/characters/princess_bear_seal.png', { frameWidth: PB.frameWidth, frameHeight: PB.frameHeight });
};

/** Register her animations once the sheet has loaded. */
WT.makePrincessBearAnims = function (scene) {
  const PB = WT.PRINCESS_BEAR;
  if (!scene.textures.exists(PB.key) || scene.anims.exists(PB.key + '-sleep')) return;
  scene.anims.create({
    key: PB.key + '-sleep',
    frames: scene.anims.generateFrameNumbers(PB.key, { frames: PB.frames.sleep }),
    frameRate: 0.8,
    repeat: -1,
  });
};

class PrincessBear extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} opts  { x, groundY, height, minX, maxX, wander }
   */
  constructor(scene, opts) {
    const PB = WT.PRINCESS_BEAR;
    super(scene, opts.x, opts.groundY, PB.key, PB.frames.hearts);
    scene.add.existing(this);
    this.setOrigin(0.5, 1);

    this._wander = opts.wander !== false;
    this._idleCount = 0;
    this._timer = null;
    this.baseScale = opts.height / PB.frameHeight;
    this.groundY = opts.groundY;
    this.minX = opts.minX ?? this.x;
    this.maxX = opts.maxX ?? this.x;
    this.setScale(this.baseScale);

    this.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 1 });
    this.on('pointerup', () => this.react());
    this.once('destroy', () => { this._clearTimer(); this._zzz && this._zzz.remove(); });

    this._startBreathing();
    this._idle();
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
    this.setFrame(WT.PRINCESS_BEAR.frames[name]);
  }

  _startBreathing() {
    if (this._breath) this._breath.stop();
    // Gentle seal squish: wider + shorter, anchored at the ground line
    this.setScale(this.baseScale);
    this._breath = this.scene.tweens.add({
      targets: this, scaleX: this.baseScale * 1.025, scaleY: this.baseScale * 0.975,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _idle() {
    this._setPose(Phaser.Utils.Array.GetRandom(WT.PRINCESS_BEAR.idlePoses));
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

    this._setPose('dash');
    this.setFlipX(tx > this.x);
    this._clearTimer();
    this._move = this.scene.tweens.add({
      targets: this, x: tx,
      duration: Math.max(600, Math.abs(tx - this.x) / 0.18),
      ease: 'Sine.easeInOut',
      onComplete: () => { this._move = null; if (this.active) this._idle(); },
    });
  }

  _showBow() {
    this._setPose('bow');
    this._puff('♥', 0xff8fb8);
    this._schedule(1800, this._idle);
  }

  _sleep() {
    this._idleCount = 0;
    this.anims.play(WT.PRINCESS_BEAR.key + '-sleep');
    this._zzz = this.scene.time.addEvent({
      delay: 1100, repeat: 4,
      callback: () => this.active && this._puff('z', 0x9b6fd0, 20),
    });
    this._schedule(Phaser.Math.Between(6000, 9000), () => { this._zzz && this._zzz.remove(); this._idle(); });
  }

  /** Tap reaction: hop, cheer and burst of hearts. */
  react() {
    if (this._hopping) return;
    this._hopping = true;
    WT.audio.play('tap');
    this._clearTimer();
    this._zzz && this._zzz.remove();
    this.scene.tweens.killTweensOf(this);
    this._move = null;
    this._breath = null;
    this.setScale(this.baseScale);
    this._setPose(Math.random() < 0.5 ? 'cheer' : 'scepter');

    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 90, () => this.active && this._puff('♥', 0xff6fa5));
    }

    this.scene.tweens.add({
      targets: this, y: this.groundY - this.displayHeight * 0.18,
      duration: 220, yoyo: true, repeat: 1, ease: 'Quad.easeOut',
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
    const x = this.x + Phaser.Math.Between(-this.displayWidth * 0.3, this.displayWidth * 0.3);
    const t = WT.ui.text(s, x, top, char, size || Math.round(18 + Math.random() * 12),
      '#' + color.toString(16).padStart(6, '0'), { weight: '700', stroke: '#ffffff', strokeW: 3 })
      .setDepth(this.depth + 1);
    s.tweens.add({
      targets: t, y: top - Phaser.Math.Between(40, 80), x: t.x + Phaser.Math.Between(-20, 20), alpha: 0,
      duration: 1300, ease: 'Sine.easeOut', onComplete: () => t.destroy(),
    });
  }
}
