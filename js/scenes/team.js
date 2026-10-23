/* ================================================================
 *  TeamScene — pick three friends, read their skills, feed them
 *  treats (paid in coins) to level up.
 * ================================================================ */
class TeamScene extends Phaser.Scene {
  constructor() { super('TeamScene'); }

  create(data) {
    const { W, H, ui, TXT } = WT;
    this._leaving = false;
    this.cameras.main.fadeIn(300, 42, 22, 10);
    WT.audio.setMood('cafe');
    this.filter = (data && data.filter) || 'all';

    ui.background(this, 'bg_paper');
    this.bar = ui.topBar(this, { hideStars: true });
    ui.backButton(this, () => WT.go(this, 'CafeScene')).setDepth(450);
    ui.ribbon(this, 330, 50, 'Team Manager', { size: 28, h: 54 });

    this._teamPanel();
    this._rosterPanel();
  }

  // ── left: the active team ──────────────────────────────────────
  _teamPanel() {
    const { ui, TXT, COLORS: C } = WT;
    const x = 28, y = 100, w = 560, h = 600;
    ui.panel(this, x, y, w, h, { radius: 28 });
    ui.text(this, x + w / 2, y + 36, 'Your Team', 26, TXT.dark, { weight: '700' });

    const team = WT.save.team;
    for (let i = 0; i < 3; i++) {
      const cx = x + 100 + i * 180, cy = y + 210;
      const id = team[i];
      if (id && WT.save.roster[id]) {
        const r = WT.save.roster[id];
        ui.unitCard(this, cx, cy, 160, 214, id, { level: r.level, stars: r.stars, onClick: () => this._detail(id) });
      } else {
        const g = this.add.graphics();
        g.lineStyle(4, C.caramel, 0.8); g.fillStyle(C.cream2, 0.8);
        g.fillRoundedRect(cx - 80, cy - 107, 160, 214, 18); g.strokeRoundedRect(cx - 80, cy - 107, 160, 214, 18);
        const plus = ui.text(this, cx, cy - 10, '+', 64, TXT.brown, { weight: '700' });
        ui.text(this, cx, cy + 50, 'Empty', 20, TXT.brown);
        this.tweens.add({ targets: plus, scale: 1.12, duration: 700, yoyo: true, repeat: -1 });
      }
      ui.text(this, cx, cy + 128, i === 0 ? 'Leader' : `Slot ${i + 1}`, 17, TXT.brown, { weight: '600' });
    }

    // synergy + power
    const syn = WT.synergyFor(team.filter(Boolean));
    const sy = y + 395;
    const sg = this.add.graphics();
    sg.fillStyle(syn ? 0xfff0c9 : 0xf1e6da, 1); sg.fillRoundedRect(x + 30, sy - 34, w - 60, 68, 18);
    sg.lineStyle(3, syn ? C.gold : C.grey, 1); sg.strokeRoundedRect(x + 30, sy - 34, w - 60, 68, 18);
    if (syn) {
      const fb = this.add.image(x + 70, sy, syn.key === 'pastry' ? 'faction_pastry' : 'faction_bear'); fb.setScale(48 / fb.width);
      if (syn.key === 'friends') { fb.x -= 8; const fp = this.add.image(x + 86, sy + 6, 'faction_pastry'); fp.setScale(40 / fp.width); }
      ui.text(this, x + 110, sy - 12, syn.name, 22, TXT.dark, { ox: 0, weight: '700' });
      ui.text(this, x + 110, sy + 14, syn.desc, 17, TXT.brown, { ox: 0 });
    } else {
      ui.text(this, x + w / 2, sy, 'Team synergy: mix Bears & Pastries, or go all-in on one!', 17, TXT.grey, { wrap: w - 90 });
    }
    ui.text(this, x + w / 2, sy + 62, `Team power  ${WT.teamPower()}`, 24, TXT.dark, { weight: '700' });

    ui.imageButton(this, x + 150, y + h - 58, 'btn_auto', 200, 70, () => {
      WT.autoTeam();
      WT.ui.toast(this, 'Picked your strongest team!');
      this.scene.restart({ filter: this.filter });
    });
    ui.imageButton(this, x + w - 150, y + h - 58, 'btn_battle', 200, 70, () => WT.go(this, 'MapScene'), 'open');
  }

  // ── right: the roster ──────────────────────────────────────────
  _rosterPanel() {
    const { ui, TXT, COLORS: C } = WT;
    const x = 608, y = 100, w = 644, h = 600;
    ui.panel(this, x, y, w, h, { radius: 28 });
    const owned = Object.keys(WT.save.roster);
    ui.text(this, x + 30, y + 36, `Friends  ${owned.length}/${WT.UNIT_IDS.length}`, 24, TXT.dark, { ox: 0, weight: '700' });

    // filter tabs
    [['all', 'All'], ['bear', 'Bears'], ['pastry', 'Pastries']].forEach(([k, label], i) => {
      const b = ui.button(this, x + 335 + i * 108, y + 36, 100, 42, label, {
        color: this.filter === k ? 'pink' : 'cream', size: 18,
        onClick: () => this.scene.restart({ filter: k }),
      });
    });

    const list = owned
      .filter(id => this.filter === 'all' || WT.UNITS[id].faction === this.filter)
      .sort((a, b) => WT.RARITIES[WT.UNITS[b].rarity].tier - WT.RARITIES[WT.UNITS[a].rarity].tier || WT.unitPower(b) - WT.unitPower(a));

    const cols = 5, cw = 112, ch = 150, gap = 10;
    const areaX = x + 22, areaY = y + 72, areaW = w - 44, areaH = h - 92;
    const rows = Math.ceil(list.length / cols);
    const scroll = ui.scrollArea(this, areaX, areaY, areaW, areaH, rows * (ch + gap) + 10);
    list.forEach((id, i) => {
      const r = WT.save.roster[id];
      const cx = (i % cols) * (cw + gap) + cw / 2 + 4;
      const cy = Math.floor(i / cols) * (ch + gap) + ch / 2 + 6;
      const card = ui.unitCard(this, cx, cy, cw, ch, id, { level: r.level, stars: r.stars, compact: true, onClick: () => this._detail(id) });
      scroll.add(card);
      if (WT.save.team.includes(id)) {
        const tag = this.add.graphics();
        tag.fillStyle(C.mintDark, 1); tag.fillRoundedRect(cx + cw / 2 - 40, cy - ch / 2 - 4, 44, 22, 11);
        scroll.add(tag);
        scroll.add(ui.text(this, cx + cw / 2 - 18, cy - ch / 2 + 7, 'TEAM', 11, '#ffffff', { weight: '700' }));
      }
    });
    if (!list.length) {
      ui.text(this, x + w / 2, y + h / 2, 'No friends here yet.\nSummon some at the Wishing Oven!', 22, TXT.grey, { lineSpacing: 8 });
    }
  }

  // ── detail sheet ───────────────────────────────────────────────
  _detail(id) {
    const { ui, TXT, COLORS: C } = WT;
    const u = WT.UNITS[id];
    const r = WT.save.roster[id];
    const rar = WT.RARITIES[u.rarity];
    const m = ui.modal(this, 960, 600, null);
    const inTeam = WT.save.team.includes(id);

    m.box.add(ui.unitCard(this, -300, -20, 300, 400, id, { level: r.level, stars: r.stars }));
    m.box.add(ui.rarityTag(this, -300, 210, u.rarity, 18));

    const lx = -120;
    m.box.add(ui.text(this, lx, -248, u.name, 36, TXT.dark, { ox: 0, weight: '700' }));
    m.box.add(ui.text(this, lx, -208, `${WT.ROLES[u.role].name} · ${WT.FACTIONS[u.faction].name}  —  ${WT.ROLES[u.role].blurb}`, 18, TXT.brown, { ox: 0 }));

    // level + xp
    const need = WT.xpToNext(r.level);
    const xpPct = r.level >= WT.MAX_LEVEL ? 1 : r.xp / need;
    m.box.add(ui.text(this, lx, -168, `Level ${r.level}/${WT.MAX_LEVEL}`, 20, TXT.dark, { ox: 0, weight: '700' }));
    const xb = this.add.graphics();
    xb.fillStyle(0xead9c4, 1); xb.fillRoundedRect(lx + 150, -178, 260, 18, 9);
    xb.fillStyle(C.sky, 1); xb.fillRoundedRect(lx + 150, -178, Math.max(12, 260 * xpPct), 18, 9);
    m.box.add(xb);
    m.box.add(ui.text(this, lx + 425, -169, r.level >= WT.MAX_LEVEL ? 'MAX' : `${r.xp}/${need} XP`, 15, TXT.brown, { ox: 0 }));

    // stats
    const s = WT.statsFor(id, r.level, r.stars);
    const nextS = r.level < WT.MAX_LEVEL ? WT.statsFor(id, r.level + 1, r.stars) : null;
    const maxes = { hp: 2600, atk: 330, def: 170, spd: 125 };
    [['HP', 'hp', C.hp], ['Attack', 'atk', C.red], ['Defence', 'def', C.sky], ['Speed', 'spd', C.gold]].forEach(([label, k, col], i) => {
      const y = -120 + i * 36;
      m.box.add(ui.text(this, lx, y, label, 18, TXT.brown, { ox: 0, weight: '600' }));
      const g = this.add.graphics();
      g.fillStyle(0xead9c4, 1); g.fillRoundedRect(lx + 100, y - 8, 280, 16, 8);
      g.fillStyle(col, 1); g.fillRoundedRect(lx + 100, y - 8, Math.max(10, Math.min(280, 280 * s[k] / maxes[k])), 16, 8);
      m.box.add(g);
      m.box.add(ui.text(this, lx + 395, y, String(s[k]), 19, TXT.dark, { ox: 0, weight: '700' }));
      if (nextS && nextS[k] > s[k]) m.box.add(ui.text(this, lx + 455, y, `+${nextS[k] - s[k]}`, 15, '#4f9e70', { ox: 0, weight: '600' }));
    });

    // skill
    const sk = u.skill;
    const sg = this.add.graphics();
    sg.fillStyle(0xfff0f5, 1); sg.fillRoundedRect(lx - 10, 20, 590, 110, 16);
    sg.lineStyle(3, C.pink, 1); sg.strokeRoundedRect(lx - 10, 20, 590, 110, 16);
    m.box.add(sg);
    m.box.add(ui.text(this, lx + 8, 42, `${sk.name}`, 22, TXT.pink, { ox: 0, weight: '700' }));
    m.box.add(ui.text(this, lx + 570, 42, `Cooldown ${sk.cd}`, 15, TXT.brown, { ox: 1 }));
    m.box.add(ui.text(this, lx + 8, 66, sk.desc, 18, TXT.dark, { ox: 0, oy: 0, align: 'left', wrap: 560, weight: '500' }));
    m.box.add(ui.text(this, lx - 4, 152, `“${u.bio}”`, 16, TXT.brown, { ox: 0, oy: 0, align: 'left', wrap: 580, weight: '500' }));

    // actions
    const cost = WT.treatCost(r.level);
    const maxed = r.level >= WT.MAX_LEVEL;
    const treat = ui.button(this, lx + 130, 248, 250, 66, maxed ? 'Max level' : 'Give a treat', {
      color: 'gold', sub: maxed ? '' : `Level up · ${cost} coins`, size: 24, sfx: 'levelUp',
      onClick: () => {
        if (!WT.buyLevel(id)) { WT.ui.toast(this, 'Not enough coins — collect tips or win battles!'); return; }
        m.close();
        this.time.delayedCall(180, () => { this.scene.restart({ filter: this.filter }); });
        this.time.delayedCall(260, () => WT.ui.toast(this, `${u.name} reached level ${WT.save.roster[id].level}!`));
      },
    });
    if (maxed || WT.save.honey < cost) treat.setEnabled(false);
    m.box.add(treat);

    const teamBtn = ui.button(this, lx + 420, 248, 250, 66, inTeam ? 'Remove' : 'Add to team', {
      color: inTeam ? 'pink' : 'mint', size: 24,
      onClick: () => {
        if (inTeam) {
          if (WT.save.team.filter(Boolean).length <= 1) { WT.ui.toast(this, 'Your team needs at least one friend!'); return; }
          WT.save.team = WT.save.team.filter(t => t !== id);
          WT.persist(); m.close();
          this.time.delayedCall(180, () => this.scene.restart({ filter: this.filter }));
        } else if (WT.save.team.length < 3) {
          WT.save.team.push(id); WT.persist(); m.close();
          this.time.delayedCall(180, () => this.scene.restart({ filter: this.filter }));
        } else {
          m.close();
          this.time.delayedCall(180, () => this._replace(id));
        }
      },
    });
    m.box.add(teamBtn);
  }

  _replace(id) {
    const { ui, TXT } = WT;
    const m = ui.modal(this, 700, 420, 'Swap out who?');
    WT.save.team.forEach((tid, i) => {
      const r = WT.save.roster[tid];
      m.box.add(ui.unitCard(this, (i - 1) * 200, 10, 150, 200, tid, {
        level: r.level, stars: r.stars, compact: true,
        onClick: () => {
          WT.save.team[i] = id; WT.persist(); m.close();
          this.time.delayedCall(180, () => this.scene.restart({ filter: this.filter }));
        },
      }));
    });
    m.box.add(ui.text(this, 0, 160, `Tap the friend ${WT.UNITS[id].name} will replace`, 18, TXT.brown));
  }
}
