/* Morning Star Staff Apps — app group strip (ms-group.js) v1 · 11/16/26
   Several leader apps share one hub tile. This adds a strip under the header so a leader can
   move between the apps in that group. Load with defer:  <script src="../ms-group.js?v=1" defer></script>
   The group is chosen by the app's folder name. To add an app, add it to GROUPS below. */
(function () {
  var GROUPS = [
    [
      { dir: 'inservice-dashboard', label: 'In-Service Completion' },
      { dir: 'competency', label: 'Skill Validation' },
      { dir: 'shower-audit', label: 'Shower Audit' }
    ]
  ];
  var here = (location.pathname.replace(/\/(index\.html)?$/, '').split('/').pop() || '');
  var group = null;
  GROUPS.forEach(function (g) { g.forEach(function (a) { if (a.dir === here) group = g; }); });
  if (!group) return;

  function build() {
    if (document.getElementById('msGroup')) return;
    var css = document.createElement('style');
    css.textContent =
      '#msGroup{display:flex;gap:6px;overflow-x:auto;padding:10px 14px 0;max-width:900px;margin:0 auto;-webkit-overflow-scrolling:touch}' +
      '#msGroup a{flex:none;padding:8px 14px;border-radius:18px;font:700 13.5px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'text-decoration:none;white-space:nowrap;color:#1a5276;background:#fff;border:1.5px solid #d5dbe1}' +
      '#msGroup a.on{background:#1a5276;border-color:#1a5276;color:#fff}' +
      '@media print{#msGroup{display:none}}';
    document.head.appendChild(css);
    var nav = document.createElement('nav');
    nav.id = 'msGroup';
    nav.setAttribute('aria-label', 'Related tools');
    group.forEach(function (a) {
      var el = document.createElement('a');
      el.href = '../' + a.dir + '/';
      el.textContent = a.label;
      if (a.dir === here) { el.className = 'on'; el.setAttribute('aria-current', 'page'); }
      nav.appendChild(el);
    });
    var hdr = document.querySelector('.header, .ms-header');
    if (hdr && hdr.parentNode) hdr.parentNode.insertBefore(nav, hdr.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
