/* Morning Star Staff Apps — shared UI helpers (ms-ui.js) v0.1
   Pairs with ms-ui.css. Exposes window.MS = { icons, toast, open, close, confirm }.
   - Loads Lucide icons from CDN and renders every <i data-lucide="name">.
     If the CDN is unreachable, <html> gets class "no-icons" and any
     <span class="fb"> emoji fallbacks inside .tile-icon are shown instead.
   - toast(message, {desc, type:'success'|'destructive', action:{label, onClick}, duration})
   - open(id) / close(id) for .overlay dialogs and bottom sheets
   - confirm({title, desc, confirmText, cancelText, destructive}) → Promise<boolean>
*/
(function () {
  var MS = (window.MS = window.MS || {});
  var LUCIDE_SRC = 'https://cdn.jsdelivr.net/npm/lucide@0.460.0/dist/umd/lucide.min.js';

  /* ---- icons ---- */
  function renderIcons(root) {
    if (!window.lucide || !window.lucide.createIcons) return;
    try { window.lucide.createIcons(root ? { nameAttr: 'data-lucide', attrs: {}, icons: undefined } : undefined); } catch (e) { window.lucide.createIcons(); }
    document.documentElement.classList.add('has-icons');
  }
  MS.icons = renderIcons;
  function loadIcons() {
    if (window.lucide) { renderIcons(); return; }
    var s = document.createElement('script');
    s.src = LUCIDE_SRC; s.async = true;
    s.onload = function () { renderIcons(); };
    s.onerror = function () { document.documentElement.classList.add('no-icons'); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadIcons);
  else loadIcons();

  /* ---- toast ---- */
  var ICONS = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>',
    destructive: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };
  function toaster() {
    var t = document.querySelector('.toaster');
    if (!t) { t = document.createElement('div'); t.className = 'toaster'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    return t;
  }
  MS.toast = function (message, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'toast' + (opts.type ? ' ' + opts.type : '');
    var icon = ICONS[opts.type || 'info'] || '';
    var body = '<div class="t-body">' + escapeHtml(message) + (opts.desc ? '<span class="t-desc">' + escapeHtml(opts.desc) + '</span>' : '') + '</div>';
    el.innerHTML = icon + body;
    var timer, ms = opts.duration || (opts.action ? 6000 : 3000);
    function dismiss() { clearTimeout(timer); el.classList.add('out'); setTimeout(function () { el.remove(); }, 200); }
    if (opts.action) {
      var b = document.createElement('button'); b.className = 't-action'; b.type = 'button';
      b.textContent = opts.action.label || 'Undo';
      b.onclick = function () { dismiss(); if (opts.action.onClick) opts.action.onClick(); };
      el.appendChild(b);
    }
    toaster().appendChild(el);
    timer = setTimeout(dismiss, ms);
    return { dismiss: dismiss, el: el };
  };

  /* ---- dialogs & sheets ---- */
  MS.open = function (id) {
    var o = typeof id === 'string' ? document.getElementById(id) : id; if (!o) return;
    o.classList.add('open'); o.setAttribute('aria-hidden', 'false');
    var f = o.querySelector('input,select,textarea,button'); if (f) setTimeout(function () { f.focus(); }, 60);
  };
  MS.close = function (id) {
    var o = typeof id === 'string' ? document.getElementById(id) : id; if (!o) return;
    o.classList.remove('open'); o.setAttribute('aria-hidden', 'true');
  };
  document.addEventListener('click', function (e) {
    var o = e.target.closest('.overlay'); if (o && e.target === o && !o.hasAttribute('data-static')) MS.close(o);
    var c = e.target.closest('[data-close]'); if (c) MS.close(c.closest('.overlay'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(function (o) { if (!o.hasAttribute('data-static')) MS.close(o); });
  });
  MS.confirm = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var o = document.createElement('div'); o.className = 'overlay'; o.setAttribute('data-static', '');
      o.innerHTML = '<div class="dialog" role="alertdialog" aria-modal="true">' +
        '<div class="d-title">' + escapeHtml(opts.title || 'Are you sure?') + '</div>' +
        (opts.desc ? '<div class="d-desc">' + escapeHtml(opts.desc) + '</div>' : '') +
        '<div class="d-actions"><button type="button" class="btn secondary" data-r="0">' + escapeHtml(opts.cancelText || 'Cancel') + '</button>' +
        '<button type="button" class="btn ' + (opts.destructive ? 'destructive' : '') + '" data-r="1">' + escapeHtml(opts.confirmText || 'Confirm') + '</button></div></div>';
      o.addEventListener('click', function (e) {
        var b = e.target.closest('[data-r]'); if (!b) return;
        o.remove(); resolve(b.getAttribute('data-r') === '1');
      });
      document.body.appendChild(o); MS.open(o);
      var cancel = o.querySelector('[data-r="0"]'); if (cancel) cancel.focus();
    });
  };

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
})();
