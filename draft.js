/* Shared state + data for the MLBB draft overlay & control panel. */
(function (global) {
  'use strict';

  const HEROES = [
    'Aamon','Akai','Aldous','Alice','Alpha','Alucard','Angela','Argus','Arlott','Atlas','Aulus','Aurora',
    'Badang','Balmond','Bane','Barats','Baxia','Beatrix','Belerick','Benedetta','Brody','Bruno',
    'Carmilla','Cecilion',"Chang'e",'Chip','Chou','Cici','Claude','Clint','Cyclops',
    'Diggie','Dyrroth','Edith','Esmeralda','Estes','Eudora','Fanny','Faramis','Floryn','Franco','Fredrinn','Freya',
    'Gatotkaca','Gloo','Gord','Granger','Grock','Guinevere','Gusion',
    'Hanabi','Hanzo','Harith','Harley','Hayabusa','Helcurt','Hilda','Hylos',
    'Ixia','Jawhead','Johnson','Joy','Julian',
    'Kadita','Kagura','Kaja','Kalea','Karina','Karrie','Khaleed','Khufra','Kimmy',
    'Lancelot','Lapu-Lapu','Layla','Leomord','Lesley','Ling','Lolita','Lukas','Lunox','Luo Yi','Lylia',
    'Marcel','Martis','Masha','Mathilda','Melissa','Minotaur','Minsitthar','Miya','Moskov',
    'Nana','Natalia','Natan','Novaria','Obsidia','Odette',
    'Paquito','Pharsa','Phoveus','Popol and Kupa','Rafaela','Roger','Ruby',
    'Saber','Selena','Silvanna','Sora','Sun','Suyou','Terizla','Thamuz','Tigreal',
    'Uranus','Vale','Valentina','Valir','Vexana','Wanwan','X.Borg','Xavier',
    'Yi Sun-shin','Yin','Yu Zhong','Yve','Zetian','Zhask','Zhuxin','Zilong'
  ];

  // Tournament draft order (10 bans, 10 picks).
  // Ban 1: B R B R B R | Pick 1: B | R R | B B | R
  // Ban 2: R B R B     | Pick 2: R | B B | R
  const SEQ = [
    ['ban','blue',0],['ban','red',0],['ban','blue',1],['ban','red',1],['ban','blue',2],['ban','red',2],
    ['pick','blue',0],['pick','red',0],['pick','red',1],['pick','blue',1],['pick','blue',2],['pick','red',2],
    ['ban','red',3],['ban','blue',3],['ban','red',4],['ban','blue',4],
    ['pick','red',3],['pick','blue',3],['pick','blue',4],['pick','red',4]
  ].map(([type, side, idx], i) => ({ type, side, idx, i }));

  function phaseOf(step) {
    if (step >= SEQ.length) return 'DRAFT COMPLETE';
    if (step < 6) return 'BAN PHASE 1';
    if (step < 12) return 'PICK PHASE 1';
    if (step < 16) return 'BAN PHASE 2';
    return 'PICK PHASE 2';
  }

  const NO_BAN = '__none__';
  const KEY = 'mlbb-draft-state-v1';

  function team(name, tag, color) {
    return { name, tag, logo: '', color, score: 0, players: ['Player 1','Player 2','Player 3','Player 4','Player 5'] };
  }

  function defaultState() {
    return {
      rev: 0,
      title: 'MLBB CHAMPIONSHIP',
      subtitle: 'REGULAR SEASON · WEEK 1',
      game: 'GAME 1',
      bestOf: 3,
      blue: team('BLUE TEAM', 'BLU', '#2f8cff'),
      red: team('RED TEAM', 'RED', '#ff3b4f'),
      bans: { blue: [null,null,null,null,null], red: [null,null,null,null,null] },
      picks: { blue: [null,null,null,null,null], red: [null,null,null,null,null] },
      step: 0,
      hover: null,
      timer: { duration: 30, running: false, endsAt: 0, remaining: 30, auto: true },
      imgBase: 'heroes/',
      imgExt: 'png',
      customHeroes: []
    };
  }

  function merge(base, s) {
    const out = Object.assign(base, s);
    out.blue = Object.assign(defaultState().blue, s.blue || {});
    out.red = Object.assign(defaultState().red, s.red || {});
    out.timer = Object.assign(defaultState().timer, s.timer || {});
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaultState(), JSON.parse(raw));
    } catch (e) { /* storage blocked */ }
    return defaultState();
  }

  const bc = ('BroadcastChannel' in global) ? new BroadcastChannel('mlbb-draft') : null;

  function save(s) {
    s.rev = (s.rev || 0) + 1;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    if (bc) { try { bc.postMessage(s); } catch (e) {} }
  }

  // Calls cb(state) whenever another page changes the state.
  function subscribe(cb, getRev) {
    if (bc) bc.addEventListener('message', e => { if (e.data && e.data.rev !== getRev()) cb(merge(defaultState(), e.data)); });
    global.addEventListener('storage', e => {
      if (e.key === KEY && e.newValue) {
        try { const s = JSON.parse(e.newValue); if (s.rev !== getRev()) cb(merge(defaultState(), s)); } catch (err) {}
      }
    });
    // Polling fallback (some OBS/file:// setups don't deliver events).
    setInterval(() => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.rev !== getRev()) cb(merge(defaultState(), s));
      } catch (e) {}
    }, 500);
  }

  function slug(n) { return String(n).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function hue(n) {
    let h = 0;
    for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 360;
  }

  function initials(n) {
    const parts = String(n).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // Hero art: tries heroes/<slug>.png, falls back to a generated gradient tile.
  function artHTML(name, s) {
    if (!name || name === NO_BAN) return '';
    const base = (s && s.imgBase != null) ? s.imgBase : 'heroes/';
    const ext = (s && s.imgExt) || 'png';
    const src = base + slug(name) + '.' + ext;
    return '<div class="art" style="--hue:' + hue(name) + '">' +
      '<span class="ini">' + esc(initials(name)) + '</span>' +
      '<img alt="" src="' + esc(src) + '" onerror="this.remove()">' +
      '</div>';
  }

  function timeLeft(t) {
    const secs = t.running ? (t.endsAt - Date.now()) / 1000 : t.remaining;
    return Math.max(0, secs);
  }

  global.Draft = { HEROES, SEQ, NO_BAN, phaseOf, defaultState, load, save, subscribe, slug, hue, initials, esc, artHTML, timeLeft };
})(window);
