# Winnie's Town — Bears & Pastries

A cosy mobile café-decorating game. Win cute 3v3 animal battles to earn coins, then spend them making Winnie's café the cosiest in town. Collect 30 bears (and 8 pastries) across five rarities, build a team of three, and battle your way across the map.

**Core loop:** battle → earn coins & heartstones → buy furniture and themes → decorate → café levels up and earns more tips → summon stronger friends → battle further.

![Winnie's Town](assets/ui/og-image.jpg)

## Play

It's a static site with no build step.

```bash
npm start            # serves on http://localhost:8080 (python3 http.server)
npm test             # battle engine + summon tests (Node 22)
```

**Publishing:** push to `main` and `.github/workflows/pages.yml` deploys to GitHub Pages. Turn it on once in *Settings → Pages → Source: GitHub Actions*. Any static host also works (Netlify, Vercel, itch.io as an HTML5 game): upload the repo root.

## The game loop

| Screen | What you do |
| --- | --- |
| **Storefront** | Title screen. Tap *Enter*. |
| **Café** (hub) | Winnie gives a daily treat (100 heartstones + 150 coins). The tip jar fills with coins over time, faster with more charm. Customers show up as the café levels up, and each new café level pays out heartstones. |
| **Map** | 9 locations × 3 battles. Clearing a location's boss unlocks the next one. Earn up to 3 stars per battle by winning without losing anyone. |
| **Battle** | 3v3, turn order set by speed. Tap an enemy to target it, then **Attack** or use your **Skill** (it has a cooldown). Auto battle and 1×/2×/3× speed. |
| **Team Manager** | Pick 3 friends, read their stats and skills, and level them up with treats (paid in coins). *Auto* picks your strongest team. |
| **Shop** | The **Wishing Oven** summons friends (100 heartstones, or 900 for ten with an Epic or better guaranteed). The **Café Decor** tab sells 46 pieces of counter, floor and wall decor plus café themes. |
| **Decorate** | Drag furniture anywhere in the café, flip it, or put it back in storage (up to 30 pieces). Switch between five café themes: Rose Classic, Honey Cottage, Matcha Garden, Strawberry Parlor, Starlight Night. Charm from decor and themes raises the café level (10 levels). |
| **Camera** | The photo album: every friend in town, with silhouettes for the ones you haven't met yet. |

### Rarities

| Rarity | Rate | Stats | Bears (30) | Pastries (8) |
| --- | --- | --- | --- | --- |
| Common | 52% | ×1.00 | Honey Cub, Cocoa Cub, Latte Cub, Sprout Cub, Biscuit Bear, Sleepy Bear, Blueberry Cub, Postie Bear, Gummy Bear | Crumbly Croissant, Mochi Puff |
| Rare | 30% | ×1.18 | Maple Scout, Berry Medic, Sunny, Nana Knit, Chef Bruno, Lantern Bear, Drum Major, Captain Paws | Macaron Twins, Cinnamon Healer |
| Epic | 13% | ×1.40 | Panda Ronin, Polar Barista, Kodiak Jarl, Moon Ninja, Blossom Druid, Sloth Sage | Éclair Duelist, Duchess Shortcake |
| Legendary | 4.2% | ×1.70 | Sir Bumble, Frost Empress, Shogun Kuma, Seraph | Gâteau Golem |
| Mythic | 0.8% | ×2.05 | Aurora, Sol the Sun King, Elder Oak | Crème Phoenix |

A Legendary or better is guaranteed within 40 summons. Duplicates add a star (+10% stats each, up to 5★); after that they turn into honey.

### Combat

- **Roles:** Tanks taunt and shield, Strikers hit one target hard, Mages hit the whole enemy team, Supports heal and buff.
- **Statuses:** Taunt, Slow, Frozen (lose a turn), Burn (damage over time), ATK Up.
- **Synergy:** 3 Bears give *Hibernation Hug* (+15% HP), 3 Pastries give *Sugar Rush* (+15% ATK), and a mixed team gets *Café Friends* (+8% speed).
- **Overtime:** after turn 60, damage ramps up so tank-vs-tank stalemates always end.
- The Crème Phoenix comes back once at 40% HP after being defeated.

## Project layout

```
index.html              entry point (the other *.html files are deep links into scenes)
css/style.css           page shell, letterbox backdrop, rotate-device hint
js/data.js              rarities, roster, skills, stages, decor (plain data)
js/battle-engine.js     turn order, damage, skills, statuses, AI (no Phaser, runs in Node)
js/save.js              localStorage save, summoning, levelling, café income
js/audio.js             synthesised music-box loop + sound effects (Web Audio, no files)
js/ui.js                Phaser UI kit: panels, buttons, rarity cards, modals, top bar
js/scenes/*.js          Boot, Title, Café, Map, Battle, Team, Shop, Decorate, Album
tests/engine.test.js    battle and summon tests
assets/units|arenas|ui  game-ready WebP art
assets/opt/             web-sized copies of the original art; full-size sources stay in assets/*
```

### Mobile

Built for phones in landscape. Every screen is laid out in a 1280×720 safe area, and the canvas stretches to the device's real shape (up to 21:9 phones and 4:3 tablets), so there are no black bars. The first tap goes fullscreen and locks landscape where the browser allows (toggle in Settings). Small text is enlarged on touch screens, and rotating mid-battle keeps the fight going. On iPhone, *Share → Add to Home Screen* runs it fullscreen as an app. Held upright, it asks you to rotate.

## Art

The original café, map, decor, UI and NPC art lives in `assets/scene`, `assets/decor`, `assets/icons`, `assets/backgrounds` and `assets/characters`. The 38 fighters, 7 battle arenas, 4 café themes, 20 new decor pieces, the coin, the logo, the Wishing Oven and the role and faction badges were generated with Higgsfield (Nano Banana Pro), using the existing bear and panda art as style references, and their backgrounds were removed with Higgsfield's background remover.
