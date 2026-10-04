/* Command bar — ⌘K / Ctrl-K. Jumps to a section or drives the playground.
   Vanilla, no dependencies, nothing fetched. */
(function () {
  'use strict';

  var root = document.getElementById('palette');
  if (!root) return;
  var input = document.getElementById('paletteInput');
  var list = document.getElementById('paletteList');
  var opener = document.getElementById('paletteOpen');
  var lastFocus = null;
  var active = 0;

  /* Say the key the visitor actually has. */
  var isApple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var comboKey = document.getElementById('comboKey');
  if (comboKey && isApple) comboKey.textContent = 'Cmd';

  var ITEMS = [
    { label: 'Try it', hint: 'the playground', go: function () { jump('#try'); } },
    { label: 'The panel', hint: 'hold an icon', go: function () { jump('#panel'); } },
    { label: 'Notifications', hint: 'history and previews', go: function () { jump('#notifications'); } },
    { label: 'Phones and foldables', hint: 'one layout, two screens', go: function () { jump('#fold'); } },
    { label: 'Scenes', hint: 'smart home', go: function () { jump('#scenes'); } },
    { label: 'Widgets', hint: 'stacks and scaling', go: function () { jump('#widgets'); } },
    { label: 'Control', hint: 'everything you can change', go: function () { jump('#control'); } },
    { label: 'Privacy', hint: 'no network permission', go: function () { jump('#privacy'); } },
    { label: 'Get Arcadia', hint: 'download', go: function () { jump('#get'); } },
    { label: 'Fold the phone', hint: 'cover screen', go: function () { demo('fold', true); } },
    { label: 'Unfold the phone', hint: 'inner screen', go: function () { demo('fold', false); } },
    { label: 'Open a panel', hint: 'in the demo', go: function () { demo('openPanel'); } },
    { label: 'Circle icons', hint: 'icon shape', go: function () { demo('shape', 'circle'); } },
    { label: 'Squircle icons', hint: 'icon shape', go: function () { demo('shape', 'squircle'); } }
  ];

  function jump(hash) {
    close();
    var el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function demo(method, arg) {
    close();
    var el = document.getElementById('try');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.arcadiaDemo && window.arcadiaDemo[method]) {
      setTimeout(function () { window.arcadiaDemo[method](arg); }, 260);
    }
  }

  /* Subsequence match, so "pf" finds "Phones and foldables". */
  function matches(item, query) {
    if (!query) return true;
    var haystack = (item.label + ' ' + item.hint).toLowerCase();
    var qi = 0;
    for (var i = 0; i < haystack.length && qi < query.length; i++) {
      if (haystack[i] === query[qi]) qi++;
    }
    return qi === query.length;
  }

  function draw() {
    var query = input.value.trim().toLowerCase();
    var found = ITEMS.filter(function (item) { return matches(item, query); });
    if (active >= found.length) active = Math.max(0, found.length - 1);
    list.textContent = '';
    if (!found.length) {
      var none = document.createElement('li');
      none.className = 'palette-none';
      none.textContent = 'Nothing matches';
      list.appendChild(none);
      return;
    }
    found.forEach(function (item, index) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', index === active ? 'true' : 'false');
      if (index === active) li.className = 'on';
      var b = document.createElement('b'); b.textContent = item.label;
      var s = document.createElement('span'); s.textContent = item.hint;
      li.appendChild(b); li.appendChild(s);
      li.addEventListener('mouseenter', function () { active = index; draw(); });
      li.addEventListener('click', function () { item.go(); });
      list.appendChild(li);
    });
    list.dataset.count = String(found.length);
    list._found = found;
  }

  function open() {
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('palette-on');
    input.value = '';
    active = 0;
    draw();
    input.focus();
  }

  function close() {
    root.hidden = true;
    document.body.classList.remove('palette-on');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('keydown', function (event) {
    var combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (combo) { event.preventDefault(); root.hidden ? open() : close(); return; }
    if (root.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    var found = list._found || [];
    if (event.key === 'ArrowDown') { event.preventDefault(); active = Math.min(active + 1, found.length - 1); draw(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); active = Math.max(active - 1, 0); draw(); }
    if (event.key === 'Enter' && found[active]) { event.preventDefault(); found[active].go(); }
  });

  input.addEventListener('input', function () { active = 0; draw(); });
  root.addEventListener('click', function (event) { if (event.target === root) close(); });
  if (opener) opener.addEventListener('click', open);

  /* ------------------------------------------------- install, and offline */

  var installEvent = null;
  var installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installEvent = event;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!installEvent) return;
      installEvent.prompt();
      installEvent = null;
      installBtn.hidden = true;
    });
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline is a bonus, not a requirement */ });
    });
  }
})();
