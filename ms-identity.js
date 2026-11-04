/* Morning Star Staff Apps — shared identity (ms-identity.js) v1 · 11/4/26
   One sign-in for every app on snbadger.github.io, fed by the Paycom roster.

   Device modes (localStorage ms_device):
     personal (default) — department-head phones; the name is remembered until Log out.
     shared             — the six roaming iPads; tap your name before an entry, cleared after
                          5 minutes idle, leadership PINs never remembered.

   Identity (localStorage ms_user): {employee_number, name, first, last, department, position,
     roster_match, picked_at}. Picking a name also writes each app's legacy key (sh_name,
     ii_name/ii_dept, rc_name/rc_dept, dc_name, fr_name, cv_name) so every app — including the
     separate-repo Supply app — picks the person up with no change to how it saves.

   API: MS.identity.get() · set(user) · pick() → Promise<user|null> · card({title,hint})
        signOut() · clear() · dept('work'|'rc') · device() · setDevice(mode) · isShared()
   Roster: Supabase RPC staff_roster() (column-limited: number, name, department, position).
*/
(function () {
  var MS = (window.MS = window.MS || {});
  if (MS.identity) return;

  var SUPA = 'https://pmnudshutxwidxdtouqj.supabase.co/rest/v1/rpc/';
  var KEY = 'sb_publishable_wzX5nLx18cfErNTRPO671w_sH4ED7ET';
  var IDLE_MS = 5 * 60 * 1000, WARN_MS = 30 * 1000, ROSTER_TTL = 6 * 3600 * 1000;
  // Test hook: a tab can shorten the idle timeout for itself only (sessionStorage), e.g. 20000 ms.
  try { var t = +sessionStorage.getItem('msIdleTestMs'); if (t >= 10000) { IDLE_MS = t; WARN_MS = Math.min(WARN_MS, t / 2); } } catch (e) {}
  var HUB = (function () {
    var s = document.currentScript && document.currentScript.src;
    try { return s ? new URL('./', s).href : new URL('/morning-star-rounds/', location.href).href; } catch (e) { return '../'; }
  })();

  // Keys written when someone picks their name (app identity keys).
  var NAME_KEYS = ['sh_name', 'dc_name', 'fr_name', 'rc_name', 'cv_name', 'ii_name'];
  var DEPT_KEYS = { ii_dept: 'work', rc_dept: 'rc' };
  // Keys removed at sign-out (everything that identifies a person on this device).
  var SIGNOUT_KEYS = NAME_KEYS.concat(['ii_dept', 'rc_dept', 'dq_name', 'dq_role', 'dq_manual', 'ae_name']);
  // Extra keys removed on SHARED devices only (leadership sessions must never persist on an iPad).
  var SHARED_EXTRA = ['msHubLeader', 'msHubHR', 'su_pin', 'su_name', 'rl_name', 'mw_owner'];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- department mapping: Paycom → each app's own list ---------- */
  function mapDept(u, vocab) {
    if (!u) return '';
    var d = (u.department || '').toLowerCase(), p = (u.position || '').toLowerCase();
    if (vocab === 'rc') { // Room Changes list
      if (/nursing/.test(d)) return 'Nursing';
      if (/environmental/.test(d)) return 'Housekeeping';
      if (/culinary|dietary/.test(d)) return 'Dietary';
      if (/admission|business development/.test(p)) return 'Admissions';
      if (/social/.test(d)) return 'Social Services';
      if (/administration|executive|medical records/.test(d)) return 'Administration';
      return 'Other';
    }
    // Ideas / Repairs / Grievances / Shout Outs list
    if (/nursing/.test(d)) {
      if (/mds/.test(p)) return 'MDS';
      if (/cna|rna/.test(p)) return 'Nursing (CNA)';
      if (/lvn|rn|nurs|infection/.test(p)) return 'Nursing (LVN/RN)';
      return 'Other';
    }
    if (/culinary|dietary/.test(d)) return 'Dietary';
    if (/environmental/.test(d)) return /laundry/.test(p) ? 'Laundry' : 'Housekeeping';
    if (/activit/.test(d)) return 'Activities';
    if (/admission|business development/.test(p)) return 'Admissions';
    if (/social/.test(d)) return 'Social Services';
    if (/hr|payroll/.test(p)) return 'HR / Staffing';
    if (/business office/.test(p)) return 'Business Office';
    if (/medical records/.test(d)) return 'Medical Records';
    if (/therapy/.test(d)) return 'Therapy / Rehab';
    if (/administration|executive/.test(d)) return 'Administration';
    return 'Other';
  }

  /* ---------- identity ---------- */
  function get() { try { var u = JSON.parse(lsGet('ms_user') || 'null'); return u && u.name ? u : null; } catch (e) { return null; } }
  function writeLegacy(u) {
    NAME_KEYS.forEach(function (k) { lsSet(k, u.name); });
    Object.keys(DEPT_KEYS).forEach(function (k) { lsSet(k, mapDept(u, DEPT_KEYS[k])); });
  }
  function set(u) {
    u.picked_at = new Date().toISOString();
    lsSet('ms_user', JSON.stringify(u));
    writeLegacy(u);
    touch();
    dispatch('ms:identity', u);
    return u;
  }
  function clear() {
    lsDel('ms_user');
    SIGNOUT_KEYS.forEach(lsDel);
    if (isShared()) { SHARED_EXTRA.forEach(lsDel); try { sessionStorage.removeItem('msLeaderSession'); } catch (e) {} }
    dispatch('ms:identity', null);
  }
  function signOut() { clear(); location.href = HUB; }
  function dispatch(n, d) { try { window.dispatchEvent(new CustomEvent(n, { detail: d })); } catch (e) {} }

  /* ---------- device mode ---------- */
  function device() { return lsGet('ms_device') === 'shared' ? 'shared' : 'personal'; }
  function isShared() { return device() === 'shared'; }
  function setDevice(m) {
    if (m === 'shared') { lsSet('ms_device', 'shared'); clear(); SHARED_EXTRA.forEach(lsDel); }
    else lsDel('ms_device');
    document.documentElement.setAttribute('data-device', device());
  }
  document.documentElement.setAttribute('data-device', device());

  // On load: keep legacy keys in step with ms_user; on shared devices drop stale typed names.
  (function syncOnLoad() {
    var u = get();
    if (u) writeLegacy(u);
    else if (isShared()) SIGNOUT_KEYS.forEach(lsDel);
  })();

  /* ---------- idle timeout (shared devices only) ---------- */
  var idleTimer, warnTimer, warnEl;
  function hasSession() { return !!get() || sessionStorage.getItem('msLeaderSession') === '1'; }
  function touch() {
    if (!isShared()) return;
    clearTimeout(idleTimer); clearTimeout(warnTimer); hideWarn();
    if (!hasSession()) return;
    warnTimer = setTimeout(showWarn, IDLE_MS - WARN_MS);
    idleTimer = setTimeout(idleOut, IDLE_MS);
  }
  function idleOut() {
    if (!isShared() || !hasSession()) return;
    clear();
    try { sessionStorage.removeItem('msLeaderSession'); } catch (e) {}
    location.href = HUB;
  }
  function showWarn() {
    injectCss();
    if (!warnEl) {
      warnEl = document.createElement('div'); warnEl.className = 'msid-warn';
      warnEl.innerHTML = '<span>Still here? Signing out in 30 seconds.</span><button type="button">I’m here</button>';
      warnEl.querySelector('button').onclick = function () { touch(); };
      document.body.appendChild(warnEl);
    }
    warnEl.style.display = 'flex';
  }
  function hideWarn() { if (warnEl) warnEl.style.display = 'none'; }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (isShared() && hasSession()) touch(); }, { passive: true, capture: true });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', touch); else touch();

  /* ---------- roster ---------- */
  function rpc(fn) {
    return fetch(SUPA + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: '{}' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function cachedRoster() { try { return JSON.parse(lsGet('ms_roster') || 'null'); } catch (e) { return null; } }
  function loadRoster(force) {
    var c = cachedRoster();
    if (!force && c && c.rows && c.rows.length && Date.now() - c.at < ROSTER_TTL) return Promise.resolve(c.rows);
    return rpc('staff_roster').then(function (rows) {
      var slim = rows.map(function (r) { return { n: r.employee_number, d: r.display_name, f: r.first_name, l: r.last_name, dp: r.department, p: r.position_title }; });
      lsSet('ms_roster', JSON.stringify({ at: Date.now(), rows: slim }));
      return slim;
    }).catch(function () { return c && c.rows ? c.rows : []; });
  }

  /* ---------- picker UI ---------- */
  var cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent = [
      '.msid-ov{position:fixed;inset:0;z-index:400;background:rgba(5,43,73,.45);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}',
      '@media(min-width:700px){.msid-ov{align-items:center}}',
      '.msid-sh{background:#fff;color:#14212B;width:100%;max-width:620px;height:min(88vh,760px);border-radius:18px 18px 0 0;box-shadow:0 18px 50px rgba(5,43,73,.25);display:flex;flex-direction:column;animation:msidUp .22s cubic-bezier(.2,.8,.2,1)}',
      '@media(min-width:700px){.msid-sh{border-radius:18px}}',
      '@keyframes msidUp{from{transform:translateY(24px);opacity:0}}',
      '.msid-hd{padding:12px 18px 10px;border-bottom:1px solid #dde3e9}',
      '.msid-grab{width:40px;height:5px;border-radius:3px;background:#cfd7df;margin:0 auto 10px}',
      '.msid-t{display:flex;align-items:center;justify-content:space-between;gap:10px}',
      '.msid-t b{font-size:19px;font-weight:800}',
      '.msid-x{border:0;background:#eef1f4;color:#5B6B78;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}',
      '.msid-s{width:100%;margin-top:10px;padding:12px 14px;font:inherit;font-size:17px;border:1.5px solid #cfd7df;border-radius:12px;-webkit-appearance:none}',
      '.msid-s:focus{outline:none;border-color:#2980b9;box-shadow:0 0 0 3px rgba(41,128,185,.2)}',
      '.msid-ch{display:flex;gap:6px;overflow-x:auto;padding:10px 0 2px;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
      '.msid-ch::-webkit-scrollbar{display:none}',
      '.msid-c{flex:none;padding:8px 13px;border-radius:980px;border:1.5px solid #dde3e9;background:#fff;font-size:14px;font-weight:700;color:#5B6B78;cursor:pointer;white-space:nowrap}',
      '.msid-c.on{border-color:#1a3c5e;background:#e9f6f7;color:#1a3c5e}',
      '.msid-ls{flex:1;overflow-y:auto;padding:8px 12px;-webkit-overflow-scrolling:touch}',
      '.msid-r{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 12px;margin:0 0 6px;border:1.5px solid #dde3e9;border-radius:12px;background:#fff;cursor:pointer;font:inherit;color:inherit}',
      '.msid-r:active{transform:scale(.985);background:#e9f6f7}',
      '.msid-av{width:38px;height:38px;border-radius:50%;background:#e8edf1;color:#1a3c5e;display:grid;place-items:center;font-size:14px;font-weight:800;flex:none}',
      '.msid-nm{font-size:17px;font-weight:700}.msid-ps{font-size:13px;color:#5B6B78}',
      '.msid-ft{padding:10px 18px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #dde3e9;text-align:center}',
      '.msid-lnk{border:0;background:none;color:#1a3c5e;font:inherit;font-size:15px;font-weight:700;text-decoration:underline;cursor:pointer;padding:6px}',
      '.msid-em{text-align:center;color:#5B6B78;padding:28px 10px;font-size:15px}',
      '.msid-ty{padding:16px 18px}.msid-ty p{color:#5B6B78;font-size:14px;margin:6px 0 12px}',
      '.msid-bt{display:flex;width:100%;align-items:center;justify-content:center;min-height:50px;margin-top:12px;border:0;border-radius:980px;background:#1a3c5e;color:#fff;font:inherit;font-size:17px;font-weight:700;cursor:pointer}',
      '.msid-card{background:#fff;border:1px solid #dde3e9;border-radius:14px;padding:18px 16px;margin-bottom:12px;box-shadow:0 1px 2px rgba(5,43,73,.06)}',
      '.msid-card h2{font-size:18px;font-weight:800;color:#1a3c5e;margin:0}',
      '.msid-card p{font-size:14px;color:#5B6B78;margin:6px 0 0;line-height:1.4}',
      '.msid-warn{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom));z-index:450;display:none;align-items:center;gap:12px;padding:12px 14px;background:#14212B;color:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(5,43,73,.3);font:600 15px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:min(92vw,420px)}',
      '.msid-warn span{flex:1}.msid-warn button{border:0;border-radius:980px;padding:9px 14px;background:#f5b301;color:#14212B;font:inherit;font-weight:800;cursor:pointer}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var DEPT_CHIPS = [
    ['all', 'Everyone'], ['Nursing SNF', 'Nursing'], ['Environmental Services', 'Housekeeping'], ['Culinary', 'Dietary'],
    ['Therapy', 'Therapy'], ['Activities', 'Activities'], ['Social Services', 'Social Services'], ['office', 'Office']
  ];
  function chipMatch(row, chip) {
    if (chip === 'all') return true;
    if (chip === 'office') return /administration|executive|medical records/i.test(row.dp || '');
    return row.dp === chip;
  }
  function titleCase(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (s && (s === s.toLowerCase() || s === s.toUpperCase())) s = s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    return s;
  }
  function initials(r) { return ((r.f || '?')[0] + (r.l || '')[0]).toUpperCase(); }

  var openPromise = null;
  function pick(opts) {
    if (openPromise) return openPromise;
    opts = opts || {};
    injectCss();
    openPromise = new Promise(function (resolve) {
      var chip = opts.chip || (isShared() ? 'Nursing SNF' : 'all'), q = '', rows = null;
      var ov = document.createElement('div'); ov.className = 'msid-ov';
      ov.innerHTML = '<div class="msid-sh" role="dialog" aria-modal="true" aria-label="Pick your name">' +
        '<div class="msid-hd"><div class="msid-grab"></div><div class="msid-t"><b>' + esc(opts.title || 'Tap your name') + '</b>' +
        '<button type="button" class="msid-x" aria-label="Close">✕</button></div>' +
        '<input class="msid-s" type="search" placeholder="Search your name" autocomplete="off" autocapitalize="words">' +
        '<div class="msid-ch"></div></div><div class="msid-ls"><div class="msid-em">Loading the staff list…</div></div>' +
        '<div class="msid-ft"><button type="button" class="msid-lnk" data-typed>My name isn’t here</button></div></div>';
      document.body.appendChild(ov);
      var list = ov.querySelector('.msid-ls'), chips = ov.querySelector('.msid-ch'), search = ov.querySelector('.msid-s');

      function done(u) { ov.remove(); openPromise = null; if (u) set(u); resolve(u || null); }
      ov.addEventListener('click', function (e) { if (e.target === ov) done(null); });
      ov.querySelector('.msid-x').onclick = function () { done(null); };
      ov.querySelector('[data-typed]').onclick = typedView;

      function drawChips() {
        chips.innerHTML = DEPT_CHIPS.map(function (c) { return '<button type="button" class="msid-c' + (c[0] === chip ? ' on' : '') + '" data-c="' + esc(c[0]) + '">' + esc(c[1]) + '</button>'; }).join('');
        chips.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { chip = b.getAttribute('data-c'); drawChips(); drawList(); }; });
      }
      function drawList() {
        if (!rows) return;
        var qq = q.toLowerCase();
        var shown = rows.filter(function (r) { return (qq ? true : chipMatch(r, chip)) && (!qq || (r.d + ' ' + r.l).toLowerCase().indexOf(qq) >= 0); });
        if (!rows.length) { list.innerHTML = '<div class="msid-em">Couldn’t load the staff list. Use “My name isn’t here” below.</div>'; return; }
        if (!shown.length) { list.innerHTML = '<div class="msid-em">No match. Try your last name, or tap “My name isn’t here.”</div>'; return; }
        list.innerHTML = shown.map(function (r, i) {
          return '<button type="button" class="msid-r" data-i="' + rows.indexOf(r) + '"><span class="msid-av">' + esc(initials(r)) + '</span>' +
            '<span><span class="msid-nm">' + esc(r.l + ', ' + r.f) + '</span><br><span class="msid-ps">' + esc(r.p || r.dp || '') + '</span></span></button>';
        }).join('');
        list.querySelectorAll('[data-i]').forEach(function (b) {
          b.onclick = function () {
            var r = rows[+b.getAttribute('data-i')];
            done({ employee_number: r.n, name: r.d, first: r.f, last: r.l, department: r.dp, position: r.p, roster_match: true });
          };
        });
      }
      function typedView() {
        var box = ov.querySelector('.msid-sh');
        box.innerHTML = '<div class="msid-hd"><div class="msid-grab"></div><div class="msid-t"><b>Type your name</b><button type="button" class="msid-x" aria-label="Close">✕</button></div></div>' +
          '<div class="msid-ty"><p>New this week, or from a registry? Type your first and last name. Your name will be added to the list after the next payroll update.</p>' +
          '<input class="msid-s" id="msidTyped" placeholder="First and last name" autocomplete="name" autocapitalize="words">' +
          '<button type="button" class="msid-bt" id="msidGo">Continue</button></div>';
        box.querySelector('.msid-x').onclick = function () { done(null); };
        var inp = box.querySelector('#msidTyped');
        function go() {
          var n = titleCase(inp.value);
          if (n.split(' ').length < 2) { inp.style.borderColor = '#e74c3c'; inp.placeholder = 'First AND last name, please'; inp.focus(); return; }
          var parts = n.split(' ');
          done({ employee_number: null, name: n, first: parts[0], last: parts.slice(1).join(' '), department: '', position: '', roster_match: false });
        }
        box.querySelector('#msidGo').onclick = go;
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
        setTimeout(function () { inp.focus(); }, 60);
      }
      search.addEventListener('input', function () { q = search.value.trim(); drawList(); });
      drawChips();
      loadRoster().then(function (r) { rows = r || []; drawList(); });
    });
    return openPromise;
  }

  /* Card an app shows instead of its old typed-name form. The button opens the picker and
     then calls the app's own saveIdentity(), which reads MS.identity.get(). */
  var autoOpened = false, cardOpts = {};
  function card(opts) {
    opts = opts || {}; cardOpts = opts;
    injectCss();
    var u = get();
    if (!u && !autoOpened && opts.autoOpen !== false) { autoOpened = true; setTimeout(appPick, 120); }
    return '<div class="msid-card"><h2>' + esc(opts.title || 'Who are you?') + '</h2>' +
      (opts.hint ? '<p>' + esc(opts.hint) + '</p>' : '') +
      '<button type="button" class="msid-bt" onclick="MS.identity._appPick()">' + (u ? 'Not ' + esc(u.first || u.name) + '? Tap your name' : 'Tap your name') + '</button>' +
      (u ? '<div style="text-align:center;margin-top:8px"><button type="button" class="msid-lnk" onclick="MS.identity.signOut()">Log out</button></div>' : '') +
      '</div>';
  }
  function appPick() {
    return pick({ chip: cardOpts.chip, title: cardOpts.pickTitle }).then(function (u) { if (u && typeof window.saveIdentity === 'function') window.saveIdentity(); return u; });
  }

  MS.identity = {
    get: get, set: set, clear: clear, signOut: signOut, pick: pick, card: card, _appPick: appPick,
    dept: function (vocab) { var u = get(); return u ? mapDept(u, vocab) : ''; },
    mapDept: mapDept, device: device, isShared: isShared, setDevice: setDevice, touch: touch,
    loadRoster: loadRoster, hub: HUB, version: 1
  };
})();
