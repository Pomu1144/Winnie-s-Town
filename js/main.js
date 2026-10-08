/* ================================================================
 *  Winnie's Town — bootstrap
 *
 *  Layout model: every scene is designed inside a 1280×720 "safe area".
 *  The canvas grows wider (phones, up to ~21:9) or taller (tablets, up
 *  to 4:3) to match the screen, and each camera is offset so the safe
 *  area stays centred. Backgrounds cover the whole canvas, so there are
 *  no black bars on any device.
 * ================================================================ */
(function () {
  const START_SCENE_BY_PAGE = {
    storefront: 'TitleScene',
    shop: 'ShopScene',
    maps: 'MapScene',
    inventory: 'AlbumScene',
    decorate: 'DecorateScene',
    'team-manager': 'TeamScene',
  };
  const page = document.body.dataset.page || 'storefront';
  WT.START_SCENE = START_SCENE_BY_PAGE[page] || 'TitleScene';
  // Skip the title on deep links only after the intro has been seen.
  if (WT.START_SCENE !== 'TitleScene' && !WT.save.flags.intro) WT.START_SCENE = 'TitleScene';

  WT.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  /** Work out the canvas size for the current window. */
  function computeView() {
    const vw = window.innerWidth || 1280, vh = window.innerHeight || 720;
    let aspect = vw / vh;
    // In portrait we show the rotate hint; plan the canvas for landscape.
    if (aspect < 1) aspect = 1 / aspect;
    let fw = WT.W, fh = WT.H;
    if (aspect > WT.W / WT.H) fw = Math.round(Math.min(WT.H * aspect, 1720));
    else fh = Math.round(Math.min(WT.W / aspect, 960));
    const ox = (fw - WT.W) / 2, oy = (fh - WT.H) / 2;
    return { x: -ox, y: -oy, w: fw, h: fh };
  }

  WT.VIEW = computeView();

  /** Offset a scene's camera so the 1280×720 safe area is centred. */
  WT.frameCamera = function (scene) {
    scene.cameras.main.setScroll(WT.VIEW.x, WT.VIEW.y);
  };

  function start() {
    const SCENES = [BootScene, TitleScene, CafeScene, MapScene, BattleScene, TeamScene, ShopScene, DecorateScene, AlbumScene];
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-container',
      backgroundColor: '#2a160a',
      width: WT.VIEW.w,
      height: WT.VIEW.h,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, roundPixels: false },
      input: { activePointers: 3 },
      disableContextMenu: true,
      scene: SCENES,
    });
    WT.game = game;

    // Every scene starts with its camera framed on the safe area.
    game.events.once('ready', () => {
      game.scene.scenes.forEach(s => s.events.on('create', () => WT.frameCamera(s)));
    });
    document.getElementById('boot-splash')?.remove();

    // Re-fit when the device rotates or the window changes shape.
    let timer = null;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const v = computeView();
        if (v.w === WT.VIEW.w && v.h === WT.VIEW.h) return;
        WT.VIEW = v;
        game.scale.setGameSize(v.w, v.h);
        game.scene.getScenes(true).forEach(s => {
          WT.frameCamera(s);
          // Battles keep their state and just re-cover the arena; other scenes rebuild.
          if (s.onRelayout) s.onRelayout();
          else if (s.sys.settings.key !== 'BootScene') s.scene.restart(s.sys.settings.data);
        });
      }, 250);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // On phones, the first tap goes fullscreen and locks landscape where supported.
    if (WT.isTouch) {
      const goFull = () => { WT.enterFullscreen(); };
      document.addEventListener('pointerup', goFull, { once: true });
    }
  }

  WT.enterFullscreen = function () {
    if (!WT.save.settings.fullscreen && WT.save.settings.fullscreen !== undefined) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } catch (e) { /* not allowed here (e.g. iPhone Safari) */ }
  };

  // Wait for the rounded font so the first frame doesn't flash a fallback face.
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([
        Promise.all([document.fonts.load('600 24px "Fredoka"'), document.fonts.load('700 24px "Fredoka"'), document.fonts.load('500 24px "Fredoka"')]),
        new Promise(r => setTimeout(r, 2500)),
      ])
    : Promise.resolve();
  window.addEventListener('load', () => fontReady.then(start, start));
})();
