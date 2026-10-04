/* Arcadia playground — a working home screen in the page.
   Vanilla, no dependencies, nothing fetched. Icons are drawn, not downloaded. */
(function () {
  'use strict';

  var home = document.getElementById('home');
  if (!home) return;

  var phone = document.getElementById('phone');
  var dock = document.getElementById('dock');
  var dots = document.getElementById('dots');
  var sheet = document.getElementById('panel-sheet');
  var hint = document.getElementById('playHint');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- data */

  var APPS = [
    { id: 'mail', name: 'Mail', hue: 206, glyph: '✉', badge: 3,
      notes: [['Ops weekly', 'Thread moved to Thursday'], ['Nadia', 'Re: invoice 4471']],
      cuts: ['Compose', 'Starred', 'Search'] },
    { id: 'calendar', name: 'Calendar', hue: 150, glyph: '▦', badge: 0,
      notes: [['Standup', '09:45 — in 20 minutes']],
      cuts: ['New event', 'Today', 'Week'] },
    { id: 'notes', name: 'Notes', hue: 44, glyph: '▤', badge: 0,
      notes: [['Shopping', 'oats, rice, lemons']],
      cuts: ['New note', 'Checklist', 'Pinned'] },
    { id: 'music', name: 'Music', hue: 320, glyph: '◉', badge: 0,
      notes: [['Now playing', 'Floating Points — Vocoder']],
      cuts: ['Shuffle', 'Liked', 'Recent'] },
    { id: 'maps', name: 'Maps', hue: 12, glyph: '◈', badge: 0,
      notes: [['Home', '24 min · light traffic']],
      cuts: ['Directions', 'Saved', 'Nearby'] },
    { id: 'camera', name: 'Camera', hue: 268, glyph: '◐', badge: 0,
      notes: [], cuts: ['Selfie', 'Video', 'Last shot'] },
    { id: 'files', name: 'Files', hue: 190, glyph: '▣', badge: 0,
      notes: [], cuts: ['Downloads', 'Recent', 'Search'] },
    { id: 'weather', name: 'Weather', hue: 220, glyph: '◍', badge: 0,
      notes: [['Tonight', 'Clear, 11°']], cuts: ['Hourly', 'Radar'] },
    { id: 'photos', name: 'Photos', hue: 340, glyph: '◱', badge: 0,
      notes: [], cuts: ['Albums', 'Favourites'] },
    { id: 'clock', name: 'Clock', hue: 96, glyph: '◷', badge: 0,
      notes: [], cuts: ['Alarm', 'Timer', 'Stopwatch'] },
    { id: 'phone', name: 'Phone', hue: 168, glyph: '◆', badge: 1,
      notes: [['Missed call', 'Dad — 8:02']], cuts: ['Keypad', 'Recents'] },
    { id: 'store', name: 'Store', hue: 286, glyph: '◇', badge: 0,
      notes: [], cuts: ['Updates', 'Library'] }
  ];
  var BY_ID = {};
  APPS.forEach(function (a) { BY_ID[a.id] = a; });

  /* Grid slots hold an app id, a folder, or nothing. */
  var slots = ['mail', 'calendar', 'notes', 'music', 'maps', 'camera', 'files', 'weather',
    null, null, null, null, null, null, null, null];
  var dockIds = ['phone', 'photos', 'clock', 'store'];
  var folders = {};
  var folderSeq = 0;

  var state = { cols: 4, shape: 'squircle', labels: true, opacity: 1, folded: false };

  /* ------------------------------------------------------------- drawing */

  /* Marks are drawn, not typed. The geometric glyphs the rest of the page uses render as empty
     boxes wherever that font range is missing, and an icon grid full of tofu is worse than no
     demo at all. These are shapes, so they cannot fail. */
  var MARKS = {
    mail: '<path d="M3 7l9 6 9-6" /><rect x="3" y="5" width="18" height="14" rx="2.5" />',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />',
    notes: '<rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" />',
    music: '<path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" />',
    maps: '<path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" />',
    camera: '<rect x="3" y="7" width="18" height="13" rx="3" /><circle cx="12" cy="13.5" r="3.5" /><path d="M9 7l1.5-3h3L15 7" />',
    files: '<path d="M4 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />',
    weather: '<circle cx="9" cy="9" r="3.5" /><path d="M7 18h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5 1.5A3 3 0 0 0 7 18z" />',
    photos: '<rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="9.5" r="1.5" />',
    clock: '<circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.5l3.5 2" />',
    phone: '<path d="M6 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 6.2 2 2 0 0 1 6 4z" />',
    store: '<path d="M5 8h14l-1 11H6z" /><path d="M9 8a3 3 0 0 1 6 0" />'
  };

  function markSvg(id, stroke) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (MARKS[id] || '') + '</svg>';
  }


  function iconEl(app) {
    var b = document.createElement('span');
    b.className = 'ic-art';
    b.style.setProperty('--h', app.hue);
    b.innerHTML = markSvg(app.id, 'rgba(10,13,22,.82)');
    return b;
  }

  function folderEl(folder) {
    var wrap = document.createElement('span');
    wrap.className = 'ic-art folder-art';
    folder.items.slice(0, 4).forEach(function (id) {
      var mini = document.createElement('i');
      mini.style.setProperty('--h', BY_ID[id].hue);
      mini.innerHTML = markSvg(id, 'rgba(10,13,22,.82)');
      wrap.appendChild(mini);
    });
    return wrap;
  }

  function tileFor(value, index, where) {
    var tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.dataset.index = String(index);
    tile.dataset.where = where;
    if (!value) { tile.classList.add('empty'); tile.tabIndex = -1; tile.setAttribute('aria-hidden', 'true'); return tile; }

    var isFolder = typeof value === 'string' && value.indexOf('folder:') === 0;
    if (isFolder) {
      var folder = folders[value];
      tile.appendChild(folderEl(folder));
      tile.dataset.folder = value;
      if (state.labels) {
        var fl = document.createElement('span');
        fl.className = 'tile-label';
        fl.textContent = folder.name;
        tile.appendChild(fl);
      }
      tile.setAttribute('aria-label', folder.name + ' folder, ' + folder.items.length + ' apps');
      return tile;
    }

    var app = BY_ID[value];
    tile.dataset.app = app.id;
    tile.appendChild(iconEl(app));
    if (app.badge) {
      var dot = document.createElement('span');
      dot.className = 'tile-badge';
      dot.textContent = String(app.badge);
      tile.appendChild(dot);
    }
    if (state.labels) {
      var label = document.createElement('span');
      label.className = 'tile-label';
      label.textContent = app.name;
      tile.appendChild(label);
    }
    tile.setAttribute('aria-label', app.name + '. Press and hold for its panel.');
    return tile;
  }

  function render() {
    home.style.setProperty('--cols', state.cols);
    home.dataset.shape = state.shape;
    home.style.setProperty('--icon-opacity', state.opacity);
    dock.dataset.shape = state.shape;
    dock.style.setProperty('--icon-opacity', state.opacity);

    home.textContent = '';
    var rows = Math.max(4, Math.ceil(slots.length / state.cols));
    var capacity = rows * state.cols;
    while (slots.length < capacity) slots.push(null);
    for (var i = 0; i < capacity; i++) home.appendChild(tileFor(slots[i], i, 'home'));

    dock.textContent = '';
    dockIds.forEach(function (id, i) { dock.appendChild(tileFor(id, i, 'dock')); });

    dots.textContent = '';
    for (var d = 0; d < 2; d++) {
      var dotEl = document.createElement('i');
      if (d === 0) dotEl.className = 'on';
      dots.appendChild(dotEl);
    }
  }

  /* --------------------------------------------------------------- panel */

  function openPanel(app) {
    sheet.textContent = '';
    sheet.setAttribute('aria-hidden', 'false');
    sheet.classList.add('open');

    var head = document.createElement('div');
    head.className = 'panel-head';
    head.appendChild(iconEl(app));
    var name = document.createElement('strong');
    name.textContent = app.name;
    head.appendChild(name);
    sheet.appendChild(head);

    if (app.notes.length) {
      app.notes.forEach(function (n) {
        var row = document.createElement('div');
        row.className = 'panel-note';
        var t = document.createElement('b'); t.textContent = n[0];
        var s = document.createElement('span'); s.textContent = n[1];
        row.appendChild(t); row.appendChild(s);
        sheet.appendChild(row);
      });
    } else {
      var none = document.createElement('p');
      none.className = 'panel-none';
      none.textContent = 'No notifications';
      sheet.appendChild(none);
    }

    var cuts = document.createElement('div');
    cuts.className = 'panel-cuts';
    app.cuts.forEach(function (c) {
      var chip = document.createElement('span');
      chip.textContent = c;
      cuts.appendChild(chip);
    });
    sheet.appendChild(cuts);

    var widget = document.createElement('div');
    widget.className = 'panel-widget';
    widget.style.setProperty('--h', app.hue);
    var wb = document.createElement('b'); wb.textContent = app.name + ' widget';
    var ws = document.createElement('span'); ws.textContent = 'live, inside the panel';
    widget.appendChild(wb); widget.appendChild(ws);
    sheet.appendChild(widget);

    say('Let go to close');
  }

  function closePanel() {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    say('Press and hold an icon');
  }

  function say(text) { if (hint) hint.textContent = text; }

  /* ------------------------------------------------------- press and drag */

  var holdTimer = null;
  var dragging = null;
  var ghost = null;
  var HOLD_MS = 380;

  function tileValue(where, index) {
    return where === 'dock' ? dockIds[index] : slots[index];
  }

  function setTileValue(where, index, value) {
    if (where === 'dock') dockIds[index] = value; else slots[index] = value;
  }

  function onDown(event) {
    var tile = event.target.closest('.tile');
    if (!tile || tile.classList.contains('empty')) return;
    var where = tile.dataset.where;
    var index = Number(tile.dataset.index);
    var value = tileValue(where, index);
    if (!value) return;

    var startX = event.clientX, startY = event.clientY, moved = false;
    tile.setPointerCapture(event.pointerId);

    holdTimer = setTimeout(function () {
      holdTimer = null;
      if (moved) return;
      if (tile.dataset.folder) { say('Folders open on tap in the app'); return; }
      openPanel(BY_ID[value]);
      if (navigator.vibrate && !reduced) navigator.vibrate(8);
    }, HOLD_MS);

    function move(e) {
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 8) {
        moved = true;
        clearTimeout(holdTimer); holdTimer = null;
        closePanel();
        beginDrag(tile, where, index, value, e);
      }
      if (dragging) dragTo(e);
    }

    function up(e) {
      tile.removeEventListener('pointermove', move);
      tile.removeEventListener('pointerup', up);
      tile.removeEventListener('pointercancel', up);
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      if (dragging) endDrag(e); else closePanel();
    }

    tile.addEventListener('pointermove', move);
    tile.addEventListener('pointerup', up);
    tile.addEventListener('pointercancel', up);
  }

  function beginDrag(tile, where, index, value, event) {
    dragging = { where: where, index: index, value: value, over: null };
    ghost = tile.cloneNode(true);
    ghost.className = 'tile ghost';
    document.body.appendChild(ghost);
    tile.classList.add('lifted');
    dragTo(event);
    say('Drop it anywhere. Onto another icon makes a folder.');
  }

  function dragTo(event) {
    if (!ghost) return;
    ghost.style.transform = 'translate(' + (event.clientX - 32) + 'px,' + (event.clientY - 32) + 'px)';
    var under = document.elementFromPoint(event.clientX, event.clientY);
    var target = under && under.closest ? under.closest('.tile') : null;
    document.querySelectorAll('.tile.over').forEach(function (t) { t.classList.remove('over'); });
    if (target && !(target.dataset.where === dragging.where && Number(target.dataset.index) === dragging.index)) {
      target.classList.add('over');
      dragging.over = target;
    } else {
      dragging.over = null;
    }
  }

  function endDrag() {
    var target = dragging.over;
    if (ghost) { ghost.remove(); ghost = null; }
    document.querySelectorAll('.tile.over').forEach(function (t) { t.classList.remove('over'); });

    if (target) {
      var tWhere = target.dataset.where;
      var tIndex = Number(target.dataset.index);
      var tValue = tileValue(tWhere, tIndex);
      var isApp = function (v) { return v && v.indexOf('folder:') !== 0; };

      if (isApp(tValue) && isApp(dragging.value) && tWhere === 'home') {
        /* Two apps meeting makes a folder — the same rule the launcher uses. */
        var key = 'folder:' + (++folderSeq);
        folders[key] = { name: 'Folder', items: [tValue, dragging.value] };
        setTileValue(tWhere, tIndex, key);
        setTileValue(dragging.where, dragging.index, null);
        say('Folder made. Four apps and it becomes a large tile.');
      } else if (tValue && tValue.indexOf('folder:') === 0 && isApp(dragging.value)) {
        folders[tValue].items.push(dragging.value);
        setTileValue(dragging.where, dragging.index, null);
        say(folders[tValue].items.length + ' apps in that folder');
      } else {
        /* A swap, never a cascade: nothing else on the page moves. */
        setTileValue(tWhere, tIndex, dragging.value);
        setTileValue(dragging.where, dragging.index, tValue || null);
        say('Moved. Nothing else shifted.');
      }
    } else {
      say('Press and hold an icon');
    }
    dragging = null;
    render();
  }

  home.addEventListener('pointerdown', onDown);
  dock.addEventListener('pointerdown', onDown);

  /* Keyboard: the panel has to be reachable without a pointer. */
  function keyOpen(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var tile = event.target.closest('.tile');
    if (!tile || !tile.dataset.app) return;
    event.preventDefault();
    if (sheet.classList.contains('open')) closePanel();
    else openPanel(BY_ID[tile.dataset.app]);
  }
  home.addEventListener('keydown', keyOpen);
  dock.addEventListener('keydown', keyOpen);

  /* ------------------------------------------------------------ controls */

  function wireSegment(attr, apply) {
    document.querySelectorAll('[data-' + attr + ']').forEach(function (button) {
      button.addEventListener('click', function () {
        var group = button.parentElement;
        group.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        button.classList.add('on');
        apply(button.dataset[attr]);
        render();
      });
    });
  }

  wireSegment('shape', function (v) { state.shape = v; });
  wireSegment('labels', function (v) { state.labels = v === 'true'; });
  wireSegment('fold', function (v) { setFolded(v === 'true'); });

  function setFolded(folded) {
    state.folded = folded;
    phone.dataset.folded = String(folded);
    /* The same layout at the same grid — the cover screen simply shows fewer columns of it.
       Nothing is rearranged, which is the claim the foldable section makes. */
    state.cols = folded ? Math.max(3, state.cols - 1) : Math.min(6, state.cols + 1);
    var slider = document.getElementById('cols');
    if (slider) { slider.value = String(state.cols); document.getElementById('colsOut').value = state.cols; }
    render();
  }

  var cols = document.getElementById('cols');
  if (cols) {
    cols.addEventListener('input', function () {
      state.cols = Number(cols.value);
      document.getElementById('colsOut').value = state.cols;
      render();
    });
  }

  var opacity = document.getElementById('opacity');
  if (opacity) {
    opacity.addEventListener('input', function () {
      state.opacity = Number(opacity.value) / 100;
      document.getElementById('opacityOut').value = opacity.value + '%';
      render();
    });
  }

  /* A clock that is actually the time, because a frozen 9:41 is the tell of a mock. */
  var clockEl = document.getElementById('demoClock');
  function tick() {
    if (!clockEl) return;
    var now = new Date();
    clockEl.textContent = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
  }
  tick();
  setInterval(tick, 20000);

  render();

  /* Exposed for the command bar. */
  window.arcadiaDemo = {
    fold: function (folded) {
      setFolded(folded);
      document.querySelectorAll('[data-fold]').forEach(function (b) {
        b.classList.toggle('on', (b.dataset.fold === 'true') === folded);
      });
    },
    openPanel: function () { openPanel(APPS[0]); },
    shape: function (name) {
      state.shape = name;
      document.querySelectorAll('[data-shape]').forEach(function (b) {
        b.classList.toggle('on', b.dataset.shape === name);
      });
      render();
    }
  };
})();
