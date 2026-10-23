/* ================================================================
 *  Winnie's Town — UI kit
 *  Shared Phaser widgets: panels, buttons, unit cards, modals, top bar.
 *  Design resolution is 1280×720 (Scale.FIT), so sizes are in those units.
 * ================================================================ */
globalThis.WT = globalThis.WT || {};

(function (WT) {
  const W = 1280, H = 720;
  WT.W = W; WT.H = H;

  const C = WT.COLORS = {
    cream: 0xfff7ea, cream2: 0xfde9cf, paper: 0xfff1dc,
    caramel: 0xd8914f, caramelDark: 0xa8622b, brown: 0x7a4520, dark: 0x4e2a12,
    pink: 0xf5a3bf, pinkDark: 0xd06d8d, mint: 0x8fd1a8, mintDark: 0x4f9e70,
    sky: 0x9fd0ef, grey: 0xc9bfb3, greyDark: 0x8d8277, red: 0xe0605a, gold: 0xf4c34a,
    hp: 0x7fcf6b, hpEnemy: 0xf07a74, shield: 0xbfe6ff,
  };
  const TXT = WT.TXT = { dark: '#4e2a12', brown: '#7a4520', cream: '#fff7ea', pink: '#d06d8d', gold: '#c98208', grey: '#8d8277' };
  const FONT = '"Fredoka", "Baloo 2", "Nunito", system-ui, sans-serif';
  WT.FONT = FONT;

  const ui = WT.ui = {};

  /** False when the pointer was dragging, or the object is scrolled out of its clip area. */
  ui.tapOk = function (obj, p) {
    if (p && p.getDistance && p.getDistance() > 14) return false;
    const clip = obj.parentContainer && obj.parentContainer.clip;
    if (clip && p && !clip.contains(p.worldX, p.worldY)) return false;
    return true;
  };

  // ── text ───────────────────────────────────────────────────────
  ui.text = function (scene, x, y, str, size, color, opts = {}) {
    // Phones show the 1280×720 stage at roughly half size, so small text gets a boost.
    if (WT.isTouch && !opts.exact) size = size <= 12 ? 14 : size < 18 ? size + 2 : size;
    const style = {
      fontFamily: FONT, fontSize: size + 'px', color: color || TXT.dark,
      fontStyle: opts.weight || '600', align: opts.align || 'center',
      resolution: 2,
    };
    if (opts.stroke) { style.stroke = opts.stroke; style.strokeThickness = opts.strokeW || Math.max(3, size / 6); }
    if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
    if (opts.lineSpacing) style.lineSpacing = opts.lineSpacing;
    const t = scene.add.text(x, y, str, style).setOrigin(opts.ox == null ? 0.5 : opts.ox, opts.oy == null ? 0.5 : opts.oy);
    if (opts.shadow) t.setShadow(0, 2, 'rgba(78,42,18,0.35)', 2, false, true);
    return t;
  };

  // ── panels ─────────────────────────────────────────────────────
  /** Soft cream panel with caramel border and drop shadow. Returns Graphics. */
  ui.panel = function (scene, x, y, w, h, opts = {}) {
    const g = scene.add.graphics();
    const r = opts.radius == null ? 22 : opts.radius;
    if (opts.shadow !== false) {
      g.fillStyle(0x4e2a12, 0.22);
      g.fillRoundedRect(x + 3, y + 7, w, h, r);
    }
    g.fillStyle(opts.border == null ? C.caramel : opts.border, 1);
    g.fillRoundedRect(x, y, w, h, r);
    const b = opts.borderW == null ? 5 : opts.borderW;
    g.fillStyle(opts.fill == null ? C.cream : opts.fill, opts.alpha == null ? 1 : opts.alpha);
    g.fillRoundedRect(x + b, y + b, w - b * 2, h - b * 2, Math.max(4, r - b));
    if (opts.inner !== false) {
      g.lineStyle(2, 0xffffff, 0.6);
      g.strokeRoundedRect(x + b + 3, y + b + 3, w - b * 2 - 6, h - b * 2 - 6, Math.max(4, r - b - 3));
    }
    return g;
  };

  /** Ribbon header (used as screen titles). */
  ui.ribbon = function (scene, x, y, label, opts = {}) {
    const c = scene.add.container(x, y);
    const t = ui.text(scene, 0, -2, label, opts.size || 30, TXT.cream, { stroke: '#7a4520', strokeW: 6, weight: '700' });
    const w = Math.max(opts.minW || 240, t.width + 90);
    const h = opts.h || 58;
    const g = scene.add.graphics();
    const col = opts.color || C.caramel, dark = opts.dark || C.caramelDark;
    // tails
    g.fillStyle(dark, 1);
    g.fillTriangle(-w / 2 - 26, -h / 2 + 10, -w / 2 + 6, -h / 2 + 10, -w / 2 + 6, h / 2 + 8);
    g.fillTriangle(-w / 2 - 26, h / 2 + 8, -w / 2 - 10, (h + 18) / 2 - h / 4, -w / 2 + 6, h / 2 + 8);
    g.fillTriangle(w / 2 + 26, -h / 2 + 10, w / 2 - 6, -h / 2 + 10, w / 2 - 6, h / 2 + 8);
    g.fillTriangle(w / 2 + 26, h / 2 + 8, w / 2 + 10, (h + 18) / 2 - h / 4, w / 2 - 6, h / 2 + 8);
    g.fillStyle(0x4e2a12, 0.25); g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16);
    g.fillStyle(col, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(-w / 2 + 8, -h / 2 + 5, w - 16, h * 0.35, 10);
    g.lineStyle(3, dark, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    // little hearts
    g.fillStyle(C.cream, 0.9);
    [-1, 1].forEach(s => { g.fillCircle(s * (w / 2 - 22) - 4, -2, 5); g.fillCircle(s * (w / 2 - 22) + 4, -2, 5); g.fillTriangle(s * (w / 2 - 22) - 9, 0, s * (w / 2 - 22) + 9, 0, s * (w / 2 - 22), 10); });
    c.add([g, t]);
    return c;
  };

  // ── buttons ────────────────────────────────────────────────────
  const BTN_COLORS = {
    caramel: [C.caramel, C.caramelDark, TXT.cream, '#7a4520'],
    pink:    [C.pink, C.pinkDark, TXT.cream, '#a54866'],
    mint:    [C.mint, C.mintDark, TXT.cream, '#2f6e48'],
    cream:   [C.cream, C.caramel, TXT.brown, null],
    grey:    [C.grey, C.greyDark, '#f4efe9', '#6e655c'],
    gold:    [C.gold, 0xc98a1a, TXT.cream, '#8a5a06'],
  };

  /**
   * Chunky rounded button. Returns a container with `.setEnabled(bool)` and `.setLabel(str)`.
   * opts: color, size, icon (texture key), onClick, sfx, sub (small second line)
   */
  ui.button = function (scene, x, y, w, h, label, opts = {}) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    let colors = BTN_COLORS[opts.color || 'caramel'];
    const draw = (pressed) => {
      const [fill, dark] = colors;
      g.clear();
      const off = pressed ? 3 : 0;
      g.fillStyle(0x4e2a12, 0.25); g.fillRoundedRect(-w / 2 + 1, -h / 2 + 6, w, h, h / 2.4);
      g.fillStyle(dark, 1); g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, h / 2.4);
      g.fillStyle(fill, 1); g.fillRoundedRect(-w / 2, -h / 2 + off, w, h - 4, h / 2.4);
      g.fillStyle(0xffffff, 0.28); g.fillRoundedRect(-w / 2 + 8, -h / 2 + off + 4, w - 16, (h - 4) * 0.36, h / 4);
    };
    draw(false);
    c.add(g);

    const size = opts.size || Math.min(26, h * 0.42);
    let tx = 0;
    if (opts.icon) {
      const ic = scene.add.image(0, -2, opts.icon);
      const s = (h * 0.62) / Math.max(ic.width, ic.height);
      ic.setScale(s);
      c.add(ic);
      c.icon = ic;
    }
    const t = ui.text(scene, 0, opts.sub ? -h * 0.14 : -2, label, size, colors[2], colors[3] ? { stroke: colors[3], strokeW: 4, weight: '700' } : { weight: '700' });
    c.add(t);
    if (opts.icon) {
      const total = c.icon.displayWidth + 8 + t.width;
      c.icon.x = -total / 2 + c.icon.displayWidth / 2;
      t.x = c.icon.x + c.icon.displayWidth / 2 + 8 + t.width / 2;
      tx = t.x;
    }
    let sub = null;
    if (opts.sub) {
      sub = ui.text(scene, tx, h * 0.2, opts.sub, Math.max(13, size * 0.6), colors[2], colors[3] ? { stroke: colors[3], strokeW: 3 } : {});
      c.add(sub);
    }

    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.enabled = true;
    c.on('pointerover', () => { if (c.enabled) scene.tweens.add({ targets: c, scale: 1.05, duration: 100 }); });
    c.on('pointerout', () => { scene.tweens.add({ targets: c, scale: 1, duration: 100 }); draw(false); });
    c.on('pointerdown', () => { if (c.enabled) draw(true); });
    c.on('pointerup', (p) => {
      draw(false);
      if (!ui.tapOk(c, p)) return;
      if (!c.enabled) { WT.audio.play('error'); return; }
      WT.audio.play(opts.sfx || 'tap');
      opts.onClick && opts.onClick();
    });
    c.setEnabled = (on) => {
      c.enabled = on;
      colors = on ? BTN_COLORS[opts.color || 'caramel'] : BTN_COLORS.grey;
      t.setColor(colors[2]);
      if (colors[3]) t.setStroke(colors[3], 4);
      if (sub) { sub.setColor(colors[2]); if (colors[3]) sub.setStroke(colors[3], 3); }
      draw(false);
      return c;
    };
    c.setLabel = (s) => { t.setText(s); return c; };
    c.setSub = (s) => { sub && sub.setText(s); return c; };
    return c;
  };

  /** Make an existing image act like a button, with hover/press bounce. */
  ui.imageButton = function (scene, x, y, key, maxW, maxH, onClick, sfx) {
    const img = scene.add.image(x, y, key);
    const s = Math.min(maxW / img.width, maxH / img.height);
    img.setScale(s).setInteractive({ useHandCursor: true });
    img.baseScale = s;
    img.on('pointerover', () => scene.tweens.add({ targets: img, scale: s * 1.08, duration: 110 }));
    img.on('pointerout', () => scene.tweens.add({ targets: img, scale: s, duration: 110 }));
    img.on('pointerdown', () => img.setScale(s * 0.93));
    img.on('pointerup', () => {
      scene.tweens.add({ targets: img, scale: s, duration: 90 });
      WT.audio.play(sfx || 'tap');
      onClick && onClick();
    });
    return img;
  };

  /** Round cream "back" button with a drawn arrow. */
  ui.backButton = function (scene, onClick) {
    const c = scene.add.container(52, 50);
    const g = scene.add.graphics();
    g.fillStyle(0x4e2a12, 0.25); g.fillCircle(2, 5, 30);
    g.fillStyle(C.caramel, 1); g.fillCircle(0, 0, 30);
    g.fillStyle(C.cream, 1); g.fillCircle(0, 0, 25);
    g.fillStyle(C.brown, 1);
    g.fillTriangle(-13, 0, 0, -12, 0, 12);
    g.fillRoundedRect(-2, -5, 15, 10, 3);
    c.add(g);
    c.setSize(64, 64).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.08, duration: 100 }));
    c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 100 }));
    c.on('pointerup', () => { WT.audio.play('back'); onClick(); });
    return c;
  };

  // ── unit cards ─────────────────────────────────────────────────
  /** Draw a rarity frame + portrait card. Returns container sized w×h, origin centre. */
  ui.unitCard = function (scene, x, y, w, h, id, opts = {}) {
    const u = WT.UNITS[id];
    const r = WT.RARITIES[u.rarity];
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const rad = Math.min(18, w * 0.12);

    g.fillStyle(0x4e2a12, 0.22); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, rad);
    g.fillStyle(r.color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, rad);
    // inner background: soft rarity tint fading to cream
    const ih = h - 10;
    g.fillStyle(r.glow, 1); g.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, ih, rad - 4);
    g.fillStyle(C.cream, 0.55); g.fillRoundedRect(-w / 2 + 5, -h / 2 + 5 + ih * 0.5, w - 10, ih * 0.5, { tl: 0, tr: 0, bl: rad - 4, br: rad - 4 });
    // sunburst behind portrait for Legendary+
    if (r.tier >= 4) {
      g.fillStyle(0xffffff, 0.35);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const R = w * 0.55;
        g.fillTriangle(0, -h * 0.08, Math.cos(a) * R, -h * 0.08 + Math.sin(a) * R, Math.cos(a + 0.18) * R, -h * 0.08 + Math.sin(a + 0.18) * R);
      }
    }
    c.add(g);

    const locked = opts.locked;
    const key = 'unit_' + id;
    const img = scene.add.image(0, -h * 0.06, key);
    const nameH = opts.compact ? h * 0.2 : h * 0.22;
    const s = Math.min((w - 14) / img.width, (h - nameH - 14) / img.height);
    img.setScale(s);
    if (locked) img.setTintFill(0x9a7656).setAlpha(0.55);
    c.add(img);
    c.portrait = img;

    // shimmer sweep for Mythic
    if (r.tier === 5 && !locked && opts.shimmer !== false) {
      const sh = scene.add.graphics();
      sh.fillStyle(0xffffff, 0.35);
      sh.fillRect(-12, -h / 2, 24, h);
      sh.angle = 20;
      const mask = g.createGeometryMask();
      sh.setMask(mask);
      c.add(sh);
      sh.x = -w;
      scene.tweens.add({ targets: sh, x: w, duration: 1600, repeat: -1, repeatDelay: 1400, ease: 'Sine.easeInOut' });
    }

    // name strip
    const strip = scene.add.graphics();
    strip.fillStyle(r.color, 1);
    strip.fillRoundedRect(-w / 2 + 5, h / 2 - nameH - 5, w - 10, nameH, { tl: 0, tr: 0, bl: rad - 4, br: rad - 4 });
    strip.fillStyle(0x000000, 0.12);
    strip.fillRect(-w / 2 + 5, h / 2 - nameH - 5, w - 10, 3);
    c.add(strip);
    const nameSize = Math.max(11, Math.min(17, w * 0.105));
    const nm = ui.text(scene, 0, h / 2 - nameH / 2 - 5 - (opts.showStars !== false && !locked ? nameH * 0.16 : 0), locked ? '???' : u.name, nameSize, TXT.cream, { stroke: '#4e2a12', strokeW: 3, weight: '700' });
    if (nm.width > w - 14) nm.setScale((w - 14) / nm.width);
    c.add(nm);

    if (!locked && opts.showStars !== false) {
      const stars = opts.stars || 1;
      const ss = Math.max(7, w * 0.045);
      for (let i = 0; i < WT.MAX_STARS; i++) {
        const sx = (i - (WT.MAX_STARS - 1) / 2) * ss * 2.2;
        const st = ui.star(scene, sx, h / 2 - nameH * 0.3 - 5, ss, i < stars ? C.gold : 0x000000, i < stars ? 1 : 0.2);
        c.add(st);
      }
    }

    // role badge & level
    if (!locked && !opts.compact) {
      const rb = scene.add.image(-w / 2 + w * 0.15, -h / 2 + w * 0.15, 'role_' + u.role);
      rb.setScale((w * 0.26) / rb.width);
      c.add(rb);
      const fb = scene.add.image(w / 2 - w * 0.15, -h / 2 + w * 0.15, 'faction_' + u.faction);
      fb.setScale((w * 0.24) / fb.width);
      c.add(fb);
    }
    if (!locked && opts.level) {
      const lv = ui.text(scene, -w / 2 + 10, h / 2 - nameH - 12, 'Lv ' + opts.level, Math.max(12, w * 0.1), TXT.cream, { stroke: '#4e2a12', strokeW: 4, ox: 0, oy: 1, weight: '700' });
      c.add(lv);
    }

    if (opts.selected) {
      const sel = scene.add.graphics();
      sel.lineStyle(5, C.pinkDark, 1); sel.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, rad + 3);
      c.add(sel);
    }

    c.setSize(w, h);
    if (opts.onClick) {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.04, duration: 100 }));
      c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 100 }));
      c.on('pointerup', (p) => {
        if (!ui.tapOk(c, p)) return;
        WT.audio.play('tap'); opts.onClick();
      });
    }
    return c;
  };

  ui.star = function (scene, x, y, r, color, alpha) {
    const g = scene.add.graphics({ x, y });
    g.fillStyle(color, alpha == null ? 1 : alpha);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? r : r * 0.48;
      pts.push(new Phaser.Geom.Point(Math.cos(a) * rr, Math.sin(a) * rr));
    }
    g.fillPoints(pts, true);
    if (alpha !== 0.2 && color === C.gold) { g.lineStyle(1.5, 0xb07a10, 0.9); g.strokePoints(pts, true); }
    return g;
  };

  /** Rarity pill label. */
  ui.rarityTag = function (scene, x, y, rarity, size = 16) {
    const r = WT.RARITIES[rarity];
    const c = scene.add.container(x, y);
    const t = ui.text(scene, 0, 0, r.name.toUpperCase(), size, TXT.cream, { stroke: '#4e2a12', strokeW: 3, weight: '700' });
    const w = t.width + 26, h = size + 14;
    const g = scene.add.graphics();
    g.fillStyle(r.color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(2, 0xffffff, 0.7); g.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, h / 2 - 2);
    c.add([g, t]);
    c.setSize(w, h);
    return c;
  };

  // ── modal ──────────────────────────────────────────────────────
  /**
   * Opens a centred modal panel. Returns { box, close, w, h } — add your
   * content to `box` using coordinates relative to the panel centre.
   */
  ui.modal = function (scene, w, h, title, opts = {}) {
    const layer = scene.add.container(0, 0).setDepth(opts.depth || 500);
    const dim = ui.fullRect(scene, 0x2a160a, 0.55).setInteractive();
    layer.add(dim);
    const box = scene.add.container(W / 2, H / 2);
    box.add(ui.panel(scene, -w / 2, -h / 2, w, h, { radius: 28, borderW: 6 }));
    if (title) box.add(ui.ribbon(scene, 0, -h / 2 + 4, title, { size: 26, h: 50 }));
    layer.add(box);

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      scene.tweens.add({ targets: box, scale: 0.85, alpha: 0, duration: 140, ease: 'Back.easeIn' });
      scene.tweens.add({ targets: dim, alpha: 0, duration: 160, onComplete: () => { layer.destroy(); opts.onClose && opts.onClose(); } });
    };
    if (opts.closeButton !== false) {
      const xb = scene.add.container(w / 2 - 16, -h / 2 + 16);
      const g = scene.add.graphics();
      g.fillStyle(C.pinkDark, 1); g.fillCircle(0, 2, 22);
      g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 21);
      g.lineStyle(5, 0xffffff, 1);
      g.lineBetween(-7, -7, 7, 7); g.lineBetween(7, -7, -7, 7);
      xb.add(g);
      xb.setSize(48, 48).setInteractive({ useHandCursor: true });
      xb.on('pointerup', () => { WT.audio.play('back'); close(); });
      box.add(xb);
    }
    if (opts.tapOutside !== false) dim.on('pointerup', close);

    box.setScale(0.8).setAlpha(0);
    scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    WT.audio.play('open');
    return { layer, box, close, w, h };
  };

  /** Small floating message near the top of the screen. */
  ui.toast = function (scene, msg, color) {
    const c = scene.add.container(W / 2, 120).setDepth(900);
    const t = ui.text(scene, 0, 0, msg, 22, TXT.cream, { stroke: '#4e2a12', strokeW: 4, weight: '700' });
    const g = scene.add.graphics();
    const w = t.width + 40, h = 46;
    g.fillStyle(color || C.brown, 0.92); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    c.add([g, t]);
    c.setAlpha(0).setScale(0.8);
    scene.tweens.add({ targets: c, alpha: 1, scale: 1, y: 110, duration: 200, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: c, alpha: 0, y: 90, delay: 1700, duration: 300, onComplete: () => c.destroy() });
    return c;
  };

  // ── top bar ────────────────────────────────────────────────────
  function pill(scene, x, y, iconKey, value, color, onPlus) {
    const c = scene.add.container(x, y);
    const w = 168, h = 44;
    const g = scene.add.graphics();
    g.fillStyle(0x4e2a12, 0.25); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, h / 2);
    g.fillStyle(C.caramel, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(C.cream, 1); g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, h / 2 - 4);
    c.add(g);
    const ic = scene.add.image(-w / 2 + 18, 0, iconKey);
    ic.setScale(54 / Math.max(ic.width, ic.height));
    c.add(ic);
    const t = ui.text(scene, 6, 0, String(value), 22, color, { weight: '700' });
    c.add(t);
    if (onPlus) {
      const pg = scene.add.graphics();
      pg.fillStyle(C.mint, 1); pg.fillCircle(w / 2 - 20, 0, 13);
      pg.lineStyle(4, 0xffffff, 1); pg.lineBetween(w / 2 - 26, 0, w / 2 - 14, 0); pg.lineBetween(w / 2 - 20, -6, w / 2 - 20, 6);
      c.add(pg);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => { WT.audio.play('tap'); onPlus(); });
    }
    c.valueText = t;
    c.icon = ic;
    return c;
  }

  /** Stars / coins / heartstones + settings. Scenes call bar.refresh() after changes. */
  ui.topBar = function (scene, opts = {}) {
    const bar = scene.add.container(0, 0).setDepth(400);
    // scenes with a back button shift the stars pill right to make room
    const stars = pill(scene, opts.back ? 200 : 110, 40, 'icon_star', WT.totalStars(), TXT.gold);
    const honey = pill(scene, W - 470, 40, 'icon_coin', WT.save.honey, TXT.brown);
    const gems = pill(scene, W - 290, 40, 'icon_heartstone', WT.save.heartstones, TXT.pink,
      opts.noShopLink ? null : () => WT.go(scene, 'ShopScene', { tab: 'summon' }));
    bar.add([stars, honey, gems]);
    if (opts.hideStars) stars.setVisible(false);

    const gear = ui.imageButton(scene, W - 150, 40, 'btn_settings', 56, 56, () => ui.settings(scene));
    bar.add(gear);

    bar.honeyPill = honey; bar.gemPill = gems; bar.starPill = stars;
    bar.refresh = () => {
      stars.valueText.setText(String(WT.totalStars()));
      honey.valueText.setText(String(WT.save.honey));
      gems.valueText.setText(String(WT.save.heartstones));
    };
    bar.bump = (which) => {
      const p = which === 'honey' ? honey : which === 'gems' ? gems : stars;
      scene.tweens.add({ targets: p, scale: 1.12, duration: 90, yoyo: true });
    };
    return bar;
  };

  ui.settings = function (scene) {
    const m = ui.modal(scene, 540, 440, 'Settings');
    const row = (y, label, getter, setter) => {
      m.box.add(ui.text(scene, -150, y, label, 24, TXT.dark, { ox: 0, weight: '600' }));
      const b = ui.button(scene, 150, y, 140, 52, getter() ? 'On' : 'Off', {
        color: getter() ? 'mint' : 'grey',
        onClick: () => { setter(!getter()); scene.scene.restart(scene.sys.settings.data); m.close(); },
      });
      m.box.add(b);
    };
    row(-110, 'Music', () => WT.save.settings.music, v => WT.audio.setMusic(v));
    row(-45, 'Sound effects', () => WT.save.settings.sound, v => WT.audio.setSound(v));
    row(20, 'Fullscreen', () => WT.save.settings.fullscreen !== false, v => {
      WT.save.settings.fullscreen = v; WT.persist();
      if (v) WT.enterFullscreen(); else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    });
    const reset = ui.button(scene, 0, 95, 300, 54, 'Reset progress', { color: 'pink', size: 22, onClick: () => {
      m.close();
      const c = ui.modal(scene, 520, 300, 'Are you sure?');
      c.box.add(ui.text(scene, 0, -30, 'This erases your whole café,\nevery friend and all progress.', 22, TXT.dark, { lineSpacing: 6 }));
      c.box.add(ui.button(scene, -110, 80, 180, 56, 'Keep it', { color: 'mint', onClick: () => c.close() }));
      c.box.add(ui.button(scene, 110, 80, 180, 56, 'Erase', { color: 'pink', onClick: () => { WT.resetSave(); WT.go(scene, 'TitleScene'); } }));
    } });
    m.box.add(reset);
    m.box.add(ui.text(scene, 0, 170, 'Winnie\'s Town v1.1 · progress saves automatically', 16, TXT.grey));
  };

  // ── scene helpers ──────────────────────────────────────────────
  /** Fade out and switch scenes. */
  WT.go = function (scene, key, data) {
    if (scene._leaving) return;
    scene._leaving = true;
    scene.input.enabled = false;
    scene.cameras.main.fadeOut(260, 42, 22, 10);
    scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
  };

  /** Cover-fit a background image to the 1280×720 stage. Returns the image. */
  ui.background = function (scene, key) {
    const V = WT.VIEW;
    const img = scene.add.image(W / 2, H / 2, key);
    img.setScale(Math.max(V.w / img.width, V.h / img.height));
    return img;
  };

  /** A rectangle covering the whole visible screen (safe area plus any extra width/height). */
  ui.fullRect = function (scene, color, alpha) {
    const V = WT.VIEW;
    return scene.add.rectangle(V.x + V.w / 2, V.y + V.h / 2, V.w + 4, V.h + 4, color, alpha);
  };

  /** Map a point from a cover-fitted background's source pixels to stage coordinates. */
  ui.bgPoint = function (img, x, y) {
    return { x: img.x + (x - img.width / 2) * img.scaleX, y: img.y + (y - img.height / 2) * img.scaleY };
  };

  /** Ambient floating sparkles (cheap, decorative). */
  ui.sparkles = function (scene, count = 14, tint = 0xfff1c9) {
    for (let i = 0; i < count; i++) {
      const V = WT.VIEW;
      const s = scene.add.image(Phaser.Math.Between(V.x, V.x + V.w), Phaser.Math.Between(V.y, V.y + V.h), 'fx_spark')
        .setTint(tint).setAlpha(0).setScale(Phaser.Math.FloatBetween(0.25, 0.6)).setDepth(5);
      scene.tweens.add({
        targets: s, alpha: { from: 0, to: 0.9 }, y: s.y - Phaser.Math.Between(20, 60), angle: 90,
        duration: Phaser.Math.Between(1800, 3200), delay: Phaser.Math.Between(0, 3000), yoyo: true, repeat: -1,
        onRepeat: () => { s.x = Phaser.Math.Between(V.x, V.x + V.w); },
      });
    }
  };

  /** A tiny red dot used to flag something new on a button. */
  ui.notifyDot = function (scene, x, y) {
    const g = scene.add.graphics({ x, y });
    g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, 13);
    g.fillStyle(C.red, 1); g.fillCircle(0, 0, 10);
    scene.tweens.add({ targets: g, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
    return g;
  };

  /** Simple vertical drag-scroll for a container inside a masked rect. */
  ui.scrollArea = function (scene, x, y, w, h, contentHeight) {
    const content = scene.add.container(x, y);
    const maskG = scene.make.graphics({ add: false });
    maskG.fillStyle(0xffffff); maskG.fillRect(x, y, w, h);
    content.setMask(maskG.createGeometryMask());
    let minY = y - Math.max(0, contentHeight - h), maxY = y;
    const zone = scene.add.zone(x, y, w, h).setOrigin(0).setInteractive();
    let dragging = false, startY = 0, startC = 0;
    zone.on('pointerdown', p => { dragging = true; startY = p.y; startC = content.y; });
    scene.input.on('pointermove', p => {
      if (!dragging || !p.isDown) return;
      content.y = Phaser.Math.Clamp(startC + (p.y - startY), minY, maxY);
    });
    scene.input.on('pointerup', () => { dragging = false; });
    scene.input.on('wheel', (p, objs, dx, dy) => {
      if (p.worldX < x || p.worldX > x + w || p.worldY < y || p.worldY > y + h) return;
      content.y = Phaser.Math.Clamp(content.y - dy * 0.6, minY, maxY);
    });
    content.zone = zone;
    content.clip = new Phaser.Geom.Rectangle(x, y, w, h);
    content.setContentHeight = (hh) => { minY = y - Math.max(0, hh - h); content.y = Phaser.Math.Clamp(content.y, minY, maxY); };
    // keep the zone beneath card hit areas so taps reach the cards
    zone.setDepth(-1);
    return content;
  };
})(globalThis.WT);
