/* Arcadia site — five things the page does.
   Vanilla, no dependencies, nothing fetched.

   Third attempt at this. The first added five more cards of copy; the second added a toy home
   screen that duplicated the hero's own interaction. These are built around what the page
   actually has: eight real screenshots, a video, and a visitor who is deciding whether to
   install an Android launcher. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================= 1. screenshot viewer
     The screenshots are 1200-1400px and the page shows them a few hundred wide. Everything
     worth looking at is in the detail, so make the detail reachable. */

  var shots = [];
  document.querySelectorAll('figure img').forEach(function (img) {
    if (img.closest('.hero')) return;              /* the hero device is furniture, not a shot */
    var figure = img.closest('figure');
    var caption = figure.querySelector('figcaption');
    shots.push({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      caption: caption ? caption.textContent.trim() : ''
    });
    var index = shots.length - 1;
    img.classList.add('zoomable');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'View full size: ' + (img.getAttribute('alt') || 'screenshot'));
    img.addEventListener('click', function () { openViewer(index); });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(index); }
    });
  });

  var viewer = null;
  var viewerIndex = 0;
  var lastFocus = null;

  function buildViewer() {
    viewer = document.createElement('div');
    viewer.className = 'viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Screenshot viewer');
    viewer.hidden = true;
    viewer.innerHTML =
      '<button class="viewer-close" type="button" aria-label="Close">×</button>' +
      '<button class="viewer-nav prev" type="button" aria-label="Previous screenshot">‹</button>' +
      '<button class="viewer-nav next" type="button" aria-label="Next screenshot">›</button>' +
      '<figure class="viewer-figure"><img alt=""><figcaption></figcaption></figure>' +
      '<p class="viewer-count"></p>';
    document.body.appendChild(viewer);

    viewer.querySelector('.viewer-close').addEventListener('click', closeViewer);
    viewer.querySelector('.prev').addEventListener('click', function () { step(-1); });
    viewer.querySelector('.next').addEventListener('click', function () { step(1); });
    viewer.addEventListener('click', function (e) {
      if (e.target === viewer || e.target.classList.contains('viewer-figure')) closeViewer();
    });

    /* Swipe, because most of the people looking at an Android launcher are on a phone. */
    var startX = null;
    viewer.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    viewer.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
    });
  }

  function showShot() {
    var shot = shots[viewerIndex];
    var img = viewer.querySelector('img');
    img.setAttribute('src', shot.src);
    img.setAttribute('alt', shot.alt);
    viewer.querySelector('figcaption').textContent = shot.caption;
    viewer.querySelector('.viewer-count').textContent = (viewerIndex + 1) + ' of ' + shots.length;
  }

  function openViewer(index) {
    if (!shots.length) return;
    if (!viewer) buildViewer();
    lastFocus = document.activeElement;
    viewerIndex = index;
    showShot();
    viewer.hidden = false;
    document.body.classList.add('viewer-on');
    viewer.querySelector('.viewer-close').focus();
  }

  function closeViewer() {
    if (!viewer) return;
    viewer.hidden = true;
    document.body.classList.remove('viewer-on');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function step(delta) {
    viewerIndex = (viewerIndex + delta + shots.length) % shots.length;
    showShot();
  }

  document.addEventListener('keydown', function (e) {
    if (!viewer || viewer.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  /* ============================================================ 4. media behaves
     The stack video autoplayed forever, on screen or not. On a phone that is somebody's
     battery being spent on a video they are not looking at. */

  document.querySelectorAll('video').forEach(function (video) {
    video.setAttribute('aria-hidden', 'false');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !video.dataset.pausedByUser) {
            video.play().catch(function () { /* autoplay refused; the poster stands in */ });
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.25 });
      io.observe(video);
    }
    video.style.cursor = 'pointer';
    video.addEventListener('click', function () {
      if (video.paused) { delete video.dataset.pausedByUser; video.play(); }
      else { video.dataset.pausedByUser = '1'; video.pause(); }
    });
  });

  /* ============================================================== 3. device check
     Arcadia's minSdk is 26, which is Android 8.0. Telling a visitor on the spot whether their
     own phone qualifies is worth more than a line of small print saying "Android 8 and above". */

  var MIN_ANDROID = 8;
  var check = document.getElementById('deviceCheck');
  if (check) {
    var ua = navigator.userAgent || '';
    var android = ua.match(/Android\s+([\d.]+)/);
    var verdict = check.querySelector('.check-verdict');
    var detail = check.querySelector('.check-detail');

    if (android) {
      var major = parseInt(android[1], 10);
      var model = (ua.match(/Android[^;]*;\s*([^;)]+)/) || [])[1];
      model = model ? model.replace(/\s+Build.*/, '').trim() : '';
      if (major >= MIN_ANDROID) {
        check.dataset.state = 'yes';
        verdict.textContent = 'Your phone can run Arcadia.';
        detail.textContent = (model ? model + ', ' : '') + 'Android ' + android[1] +
          '. Arcadia needs Android ' + MIN_ANDROID + ' or newer.';
      } else {
        check.dataset.state = 'no';
        verdict.textContent = 'This phone is below the minimum.';
        detail.textContent = 'Android ' + android[1] + '. Arcadia needs Android ' +
          MIN_ANDROID + ' or newer.';
      }
    } else {
      check.dataset.state = 'desktop';
      verdict.textContent = 'Open this page on your Android phone.';
      detail.textContent = 'Arcadia replaces the home screen, so there is nothing to install here.' +
        ' It needs Android ' + MIN_ANDROID + ' or newer.';
    }
  }

  /* ============================================================ 2. comparison table
     "Only the differences" because the shared ground is long and nobody reads it twice. */

  var only = document.getElementById('onlyDiff');
  var table = document.getElementById('compare');
  if (only && table) {
    only.addEventListener('change', function () {
      table.classList.toggle('diff-only', only.checked);
    });
  }

  /* ============================================================ 5. permissions panel */

  document.querySelectorAll('.perm').forEach(function (row) {
    var button = row.querySelector('.perm-head');
    if (!button) return;
    button.addEventListener('click', function () {
      var open = row.classList.toggle('open');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  if (reduced) return;
})();
