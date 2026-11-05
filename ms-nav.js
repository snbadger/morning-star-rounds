/* Morning Star Staff Apps — shared navigation bar (ms-nav.js) v1 · 11/5/26
   A fixed bar at the bottom of every app: ‹ Back · All apps · Log out.
   The six shared iPads run the hub from the Home Screen with no Safari back button,
   so every app needs its own way back.

   Back:
     1. If the app defines window.msNavBack (or MS.nav.config({back: fn})) and it returns true, done.
     2. Else, for apps built on a global `view` + `render()` (the template apps), Back returns to the
        previous screen the person saw in this app (the "Who are you?" screen is skipped).
     3. Else (first screen, or a one-screen app): go to the hub.
   All apps: always the hub.
   Log out: the app's own logOut()/logout() if it has one, else MS.identity.signOut(), else the hub.

   Load at the end of <body> (or with defer) so the app's render() already exists:
     <script src="../ms-nav.js?v=1" defer></script>
*/
(function () {
  var MS = (window.MS = window.MS || {});
  if (MS.nav) return;

  var HUB = (function () {
    var s = document.currentScript && document.currentScript.src;
    try { return s ? new URL('./', s).href : new URL('/morning-star-rounds/', location.href).href; } catch (e) { return '../'; }
  })();
  var cfg = {}, stack = [], restoring = false;

  function goHub() { location.href = HUB; }

  /* ---------- screen history for template apps (global `view` + `render`) ---------- */
  function hasViewApp() { return typeof window.render === 'function' && typeof window.view === 'string'; }
  function record() {
    if (restoring || !hasViewApp()) return;
    var v = window.view;
    if (!v || v === 'identity') return;
    if (stack[stack.length - 1] !== v) stack.push(v);
    if (stack.length > 30) stack.shift();
  }
  function wrapRender() {
    if (!hasViewApp() || window.render.__msnav) return;
    var orig = window.render;
    var wrapped = function () { var r = orig.apply(this, arguments); record(); return r; };
    wrapped.__msnav = true;
    window.render = wrapped;
    record();
  }
  function viewBack() {
    if (!hasViewApp()) return false;
    if (window.view === 'identity' && stack.length) { show(stack[stack.length - 1]); return true; }
    if (stack.length < 2) return false;
    stack.pop();
    show(stack[stack.length - 1]);
    return true;
  }
  function show(v) {
    restoring = true;
    try { if (typeof window.go === 'function') window.go(v); else { window.view = v; window.render(); } }
    finally { restoring = false; }
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ---------- actions ---------- */
  function back() {
    var h = typeof cfg.back === 'function' ? cfg.back : window.msNavBack;
    try { if (typeof h === 'function' && h() === true) return; } catch (e) {}
    if (viewBack()) return;
    goHub();
  }
  function logOut() {
    if (typeof cfg.logOut === 'function') return cfg.logOut();
    if (typeof window.logOut === 'function') return window.logOut();
    if (typeof window.logout === 'function') return window.logout();
    if (MS.identity && MS.identity.signOut) return MS.identity.signOut();
    goHub();
  }

  /* ---------- bar ---------- */
  var ICON = {
    back: '<path d="m15 18-6-6 6-6"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }

  function injectCss() {
    var s = document.createElement('style');
    s.textContent = [
      '.msnav{position:fixed;left:0;right:0;bottom:0;z-index:90;display:flex;justify-content:center;gap:4px;padding:0 6px;',
      ' background:rgba(255,255,255,.92);-webkit-backdrop-filter:saturate(180%) blur(16px);backdrop-filter:saturate(180%) blur(16px);',
      ' border-top:1px solid #dde3e9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.msnav button{flex:1;max-width:150px;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:none;cursor:pointer;',
      ' padding:9px 0 max(9px,env(safe-area-inset-bottom));font:700 12.5px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a3c5e;-webkit-tap-highlight-color:transparent}',
      '.msnav button:active{opacity:.6}',
      '.msnav .msnav-out{color:#c0392b}',
      'body.msnav-on{padding-bottom:calc(74px + env(safe-area-inset-bottom)) !important}',
      'body.msnav-on .toast,body.msnav-on .toaster{bottom:calc(84px + env(safe-area-inset-bottom)) !important}',
      'body.msnav-on .fab{bottom:calc(82px + env(safe-area-inset-bottom)) !important}',
      'body.msnav-on .msid-warn{bottom:calc(150px + env(safe-area-inset-bottom)) !important}',
      '.tabbar > [data-msnav="out"]{color:#c0392b}',
      '.tabbar.msnav-merged > *{min-width:0;white-space:nowrap}',
      '@media (max-width:420px){.tabbar.msnav-merged > *{font-size:11px;letter-spacing:-.1px}}',
      'html[data-device="shared"] .msnav button{font-size:14px;padding-top:11px}',
      'html[data-device="shared"] .msnav svg{width:26px;height:26px}',
      '@media print{.msnav{display:none !important}body.msnav-on{padding-bottom:0 !important}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function mount() {
    if (document.querySelector('.msnav') || window.MS_NAV_OFF) return;
    injectCss();
    var bar = document.createElement('nav');
    bar.className = 'msnav'; bar.setAttribute('aria-label', 'App navigation');
    bar.innerHTML =
      '<button type="button" data-a="back">' + svg('back') + '<span>Back</span></button>' +
      '<button type="button" data-a="home">' + svg('home') + '<span>All apps</span></button>' +
      '<button type="button" data-a="out" class="msnav-out">' + svg('out') + '<span>Log out</span></button>';
    bar.querySelector('[data-a="back"]').onclick = back;
    bar.querySelector('[data-a="home"]').onclick = goHub;
    bar.querySelector('[data-a="out"]').onclick = logOut;
    document.body.appendChild(bar);
    document.body.classList.add('msnav-on');
    mergeIntoAppBar(bar);
    wrapRender();
  }

  // An app with its own bottom tab bar (Shower Sheet: My Showers / Charge Nurse) gets the three
  // buttons inside that bar — one row, not two. The separate bar shows only while the app's bar is hidden.
  function mergeIntoAppBar(bar) {
    var appBar = document.querySelector('.tabbar:not(.msnav)');
    if (!appBar) return;
    function item(a, label, fn) {
      var d = document.createElement('div');
      d.setAttribute('data-msnav', a); d.setAttribute('role', 'button');
      d.innerHTML = svg(a === 'home' ? 'home' : a) + label; d.onclick = fn; return d;
    }
    appBar.classList.add('msnav-merged');
    appBar.insertBefore(item('back', 'Back', back), appBar.firstChild);
    appBar.appendChild(item('home', 'All apps', goHub));
    appBar.appendChild(item('out', 'Log out', logOut));
    function sync() { bar.style.display = getComputedStyle(appBar).display === 'none' ? 'flex' : 'none'; }
    try { new MutationObserver(sync).observe(appBar, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] }); } catch (e) {}
    sync();
  }

  MS.nav = {
    // config({back: fn returning true when it handled the tap, logOut: fn})
    config: function (o) { for (var k in (o || {})) cfg[k] = o[k]; },
    back: back, home: goHub, hub: HUB, version: 1
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
