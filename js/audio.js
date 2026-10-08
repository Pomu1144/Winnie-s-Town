/* ================================================================
 *  Winnie's Town — sound
 *  Everything is synthesised with Web Audio: a soft music-box loop
 *  and short cute sound effects. No audio files to download.
 * ================================================================ */
globalThis.WT = globalThis.WT || {};

(function (WT) {
  let ctx = null;
  let master = null, sfxBus = null, musicBus = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicMood = 'cafe';

  function ensure() {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.18; musicBus.connect(master);
    return ctx;
  }

  function tone(freq, start, dur, opts = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), start + dur);
    const peak = opts.vol == null ? 0.5 : opts.vol;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + (opts.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(opts.bus || sfxBus);
    o.start(start); o.stop(start + dur + 0.05);
  }

  function noise(start, dur, opts = {}) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = opts.filter || 'bandpass'; f.frequency.value = opts.freq || 1200; f.Q.value = opts.q || 1;
    const g = ctx.createGain(); g.gain.value = opts.vol || 0.3;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(start);
  }

  const N = n => 440 * Math.pow(2, (n - 69) / 12);   // midi -> Hz

  const SFX = {
    tap()     { const t = ctx.currentTime; tone(880, t, 0.08, { type: 'triangle', vol: 0.25 }); },
    open()    { const t = ctx.currentTime; tone(N(76), t, 0.1, { type: 'triangle', vol: 0.25 }); tone(N(83), t + 0.06, 0.14, { type: 'triangle', vol: 0.22 }); },
    back()    { const t = ctx.currentTime; tone(N(79), t, 0.08, { type: 'triangle', vol: 0.22 }); tone(N(72), t + 0.06, 0.12, { type: 'triangle', vol: 0.2 }); },
    coin()    { const t = ctx.currentTime; tone(N(88), t, 0.07, { type: 'square', vol: 0.12 }); tone(N(93), t + 0.07, 0.18, { type: 'square', vol: 0.12 }); },
    error()   { const t = ctx.currentTime; tone(220, t, 0.12, { type: 'square', vol: 0.1 }); tone(180, t + 0.1, 0.18, { type: 'square', vol: 0.1 }); },
    hit()     { const t = ctx.currentTime; noise(t, 0.12, { freq: 900, q: 0.8, vol: 0.35 }); tone(180, t, 0.12, { type: 'sine', slide: 0.5, vol: 0.4 }); },
    crit()    { const t = ctx.currentTime; noise(t, 0.18, { freq: 1600, q: 0.6, vol: 0.4 }); tone(300, t, 0.2, { type: 'triangle', slide: 0.4, vol: 0.45 }); tone(N(91), t + 0.02, 0.15, { type: 'square', vol: 0.08 }); },
    whoosh()  { const t = ctx.currentTime; noise(t, 0.22, { filter: 'highpass', freq: 1800, vol: 0.18 }); },
    heal()    { const t = ctx.currentTime; [72, 76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.06, 0.3, { type: 'sine', vol: 0.2 })); },
    shield()  { const t = ctx.currentTime; tone(N(67), t, 0.35, { type: 'triangle', vol: 0.22 }); tone(N(74), t + 0.03, 0.35, { type: 'triangle', vol: 0.18 }); tone(N(79), t + 0.06, 0.4, { type: 'sine', vol: 0.15 }); },
    magic()   { const t = ctx.currentTime; [84, 88, 91, 96, 100].forEach((n, i) => tone(N(n), t + i * 0.04, 0.22, { type: 'sine', vol: 0.15 })); noise(t, 0.4, { filter: 'highpass', freq: 4000, vol: 0.08 }); },
    skill()   { const t = ctx.currentTime; tone(N(72), t, 0.12, { type: 'triangle', vol: 0.25 }); tone(N(79), t + 0.08, 0.12, { type: 'triangle', vol: 0.25 }); tone(N(84), t + 0.16, 0.25, { type: 'triangle', vol: 0.25 }); },
    ko()      { const t = ctx.currentTime; tone(N(72), t, 0.5, { type: 'triangle', slide: 0.5, vol: 0.25 }); },
    freeze()  { const t = ctx.currentTime; [96, 100, 103].forEach((n, i) => tone(N(n), t + i * 0.03, 0.3, { type: 'sine', vol: 0.12 })); noise(t, 0.25, { filter: 'highpass', freq: 5000, vol: 0.1 }); },
    burn()    { const t = ctx.currentTime; noise(t, 0.3, { filter: 'lowpass', freq: 700, vol: 0.25 }); },
    victory() { const t = ctx.currentTime; [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone(N(n), t + i * 0.11, i === 6 ? 0.7 : 0.2, { type: 'triangle', vol: 0.25 })); },
    defeat()  { const t = ctx.currentTime; [72, 70, 67, 64].forEach((n, i) => tone(N(n), t + i * 0.18, 0.35, { type: 'triangle', vol: 0.22 })); },
    ovenShake() { const t = ctx.currentTime; for (let i = 0; i < 6; i++) tone(N(60 + i * 2), t + i * 0.09, 0.08, { type: 'square', vol: 0.06 }); },
    reveal(tier) {
      const t = ctx.currentTime;
      const chord = [[72, 76, 79], [74, 78, 81], [76, 80, 83, 88], [72, 76, 79, 84, 88], [72, 76, 79, 84, 88, 91, 96]][tier - 1];
      chord.forEach((n, i) => tone(N(n), t + i * 0.07, 0.6 + tier * 0.1, { type: tier >= 4 ? 'triangle' : 'sine', vol: 0.18 }));
      if (tier >= 4) noise(t, 0.8, { filter: 'highpass', freq: 5000, vol: 0.12 });
    },
    levelUp() { const t = ctx.currentTime; [76, 79, 83, 88].forEach((n, i) => tone(N(n), t + i * 0.07, 0.22, { type: 'square', vol: 0.08 })); },
  };

  // ── music: a gentle music-box loop, two moods ──────────────────
  const SONGS = {
    // [melody midi or 0 for rest] over a bass pattern; 8th notes.
    cafe: {
      tempo: 0.24,
      melody: [76, 0, 79, 81, 79, 0, 76, 74, 72, 0, 74, 76, 74, 0, 0, 0, 76, 0, 79, 84, 83, 0, 81, 79, 77, 0, 76, 74, 72, 0, 0, 0],
      bass:   [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50],
    },
    battle: {
      tempo: 0.17,
      melody: [72, 72, 79, 0, 77, 76, 74, 0, 72, 72, 79, 0, 81, 79, 77, 0, 76, 76, 84, 0, 83, 81, 79, 0, 77, 79, 81, 79, 77, 76, 74, 0],
      bass:   [36, 43, 36, 43, 41, 48, 41, 48, 45, 52, 45, 52, 43, 50, 43, 50],
    },
  };

  function scheduleMusic() {
    const song = SONGS[musicMood];
    const t = ctx.currentTime + 0.05;
    const m = song.melody[musicStep % song.melody.length];
    if (m) tone(N(m), t, song.tempo * 2.2, { type: 'sine', vol: 0.35, bus: musicBus });
    if (musicStep % 2 === 0) {
      const b = song.bass[(musicStep / 2) % song.bass.length];
      tone(N(b), t, song.tempo * 1.8, { type: 'triangle', vol: 0.3, bus: musicBus });
    }
    musicStep++;
    musicTimer = setTimeout(scheduleMusic, song.tempo * 1000);
  }

  WT.audio = {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (WT.save.settings.music && !musicTimer) scheduleMusic();
    },
    play(name, arg) {
      if (!WT.save.settings.sound || !ensure() || ctx.state !== 'running') return;
      try { SFX[name] && SFX[name](arg); } catch (e) { /* ignore */ }
    },
    setMood(mood) {
      if (mood === musicMood) return;
      musicMood = mood;
      musicStep = 0;
    },
    setMusic(on) {
      WT.save.settings.music = on;
      WT.persist();
      if (!on && musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
      if (on && ctx && !musicTimer) scheduleMusic();
    },
    setSound(on) { WT.save.settings.sound = on; WT.persist(); },
  };

  // Browsers only allow audio after a user gesture.
  if (typeof document !== 'undefined') {
    const kick = () => { WT.audio.unlock(); };
    document.addEventListener('pointerdown', kick);
    document.addEventListener('keydown', kick);
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }
})(globalThis.WT);
