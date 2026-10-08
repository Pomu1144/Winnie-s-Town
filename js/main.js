/* ================================================================
 *  Winnie's Town — bootstrap
 *  1280×720 design resolution, scaled to fit any screen.
 * ================================================================ */
(function () {
  // Legacy per-page entry points (shop.html, maps.html…) jump straight to their scene.
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

  function start() {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-container',
      backgroundColor: '#2a160a',
      width: WT.W,
      height: WT.H,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, roundPixels: false },
      input: { activePointers: 2 },
      scene: [BootScene, TitleScene, CafeScene, MapScene, BattleScene, TeamScene, ShopScene, DecorateScene, AlbumScene],
    });
    WT.game = game;
    document.getElementById('boot-splash')?.remove();
  }

  // Wait for the rounded font so the first frame doesn't flash a fallback face.
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([
        Promise.all([document.fonts.load('600 24px "Fredoka"'), document.fonts.load('700 24px "Fredoka"'), document.fonts.load('500 24px "Fredoka"')]),
        new Promise(r => setTimeout(r, 2500)),
      ])
    : Promise.resolve();
  window.addEventListener('load', () => fontReady.then(start, start));
})();
