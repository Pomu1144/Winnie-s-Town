/* ================================================================
 *  TitleScene — the café storefront with falling leaves and Enter.
 * ================================================================ */
class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const { W, H, ui } = WT;
    this.cameras.main.fadeIn(400, 42, 22, 10);
    WT.audio.setMood('cafe');

    const bg = ui.background(this, 'bg_front');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.03, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this._leaves();
    ui.sparkles(this, 16, 0xfff3c4);

    // logo
    const logo = this.add.image(W / 2, 150, 'logo').setDepth(10);
    const ls = 470 / logo.width;
    logo.setScale(ls * 0.6).setAlpha(0);
    this.tweens.add({ targets: logo, scale: ls, alpha: 1, duration: 700, ease: 'Back.easeOut', delay: 150 });
    this.tweens.add({ targets: logo, y: 158, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 900 });

    // enter button
    const enter = ui.imageButton(this, W / 2, H * 0.66, 'btn_enter', 330, 150, () => this._enter(), 'open').setDepth(10);
    const s = enter.baseScale;
    this.tweens.add({ targets: enter, scale: s * 1.07, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const hint = ui.text(this, W / 2, H - 46, 'Tap Enter to open the café', 20, WT.TXT.cream, { stroke: '#7a4520', strokeW: 5 }).setDepth(10);
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 1100, yoyo: true, repeat: -1 });

    const firstTime = !WT.save.flags.intro;
    if (!firstTime) {
      ui.text(this, 22, H - 20, `${Object.keys(WT.save.roster).length}/${WT.UNIT_IDS.length} friends · ${WT.totalStars()}★`, 16, WT.TXT.cream, { stroke: '#7a4520', strokeW: 4, ox: 0, oy: 1 }).setDepth(10);
    }
    ui.text(this, W - 22, H - 20, 'v1.0', 16, WT.TXT.cream, { stroke: '#7a4520', strokeW: 4, ox: 1, oy: 1 }).setDepth(10);

    this.input.keyboard.once('keydown-ENTER', () => this._enter());
    this.input.keyboard.once('keydown-SPACE', () => this._enter());
  }

  _enter() {
    WT.audio.unlock();
    WT.go(this, 'CafeScene');
  }

  _leaves() {
    const { W, H } = WT;
    const TINTS = [0x8fbc44, 0xa5c44a, 0xc5a028, 0xe8b830, 0xd4601a, 0xf2a7c0];
    for (let i = 0; i < 20; i++) {
      const petal = i % 3 === 0;
      const sz = Phaser.Math.Between(14, 26);
      const V = WT.VIEW;
      const x0 = Phaser.Math.Between(V.x, V.x + V.w);
      const leaf = this.add.image(x0, Phaser.Math.FloatBetween(-40, H), petal ? 'fx_petal' : 'fx_leaf')
        .setDisplaySize(petal ? sz : sz, petal ? sz * 0.7 : sz * 1.6)
        .setTint(petal ? 0xf7b8cd : Phaser.Utils.Array.GetRandom(TINTS))
        .setAlpha(Phaser.Math.FloatBetween(0.6, 0.95)).setDepth(6);
      this.tweens.add({
        targets: leaf, y: V.y + V.h + 50, duration: Phaser.Math.Between(6000, 11000), repeat: -1,
        onRepeat: () => { leaf.x = Phaser.Math.Between(V.x, V.x + V.w); leaf.y = V.y - 40; },
      });
      this.tweens.add({ targets: leaf, x: x0 + Phaser.Math.Between(40, 120), duration: Phaser.Math.Between(1800, 3400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: leaf, angle: Phaser.Math.FloatBetween(-400, 400), duration: Phaser.Math.Between(2500, 6500), repeat: -1 });
    }
  }
}
