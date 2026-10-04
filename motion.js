/* Arcadia site — the page as an app.
   A section rail you can navigate by, an accent that follows where you are, and transitions
   between sections instead of jumps. Vanilla, nothing fetched, nothing tracked.

   Deliberately not another demo: the hero already has the hold-an-icon interaction, and a second
   one further down the page was duplication with a settings form attached. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Sections worth navigating to, in document order, each with the hue it tints the page. */
  var SECTIONS = [
    { id: 'panel', label: 'The panel', hue: 196 },
    { id: 'notifications', label: 'Notifications', hue: 268 },
    { id: 'fold', label: 'Foldables', hue: 174 },
    { id: 'scenes', label: 'Scenes', hue: 36 },
    { id: 'widgets', label: 'Widgets', hue: 318 },
    { id: 'control', label: 'Control', hue: 212 },
    { id: 'privacy', label: 'Privacy', hue: 150 },
    { id: 'get', label: 'Get it', hue: 196 }
  ].filter(function (s) { return document.getElementById(s.id); });

  if (!SECTIONS.length) return;

  /* ----------------------------------------------------------------- rail */

  var rail = document.createElement('nav');
  rail.className = 'rail';
  rail.setAttribute('aria-label', 'Sections');
  var progress = document.createElement('span');
  progress.className = 'rail-progress';
  progress.setAttribute('aria-hidden', 'true');
  rail.appendChild(progress);

  SECTIONS.forEach(function (section) {
    var link = document.createElement('a');
    link.href = '#' + section.id;
    link.className = 'rail-tick';
    link.dataset.id = section.id;
    var dot = document.createElement('i');
    dot.setAttribute('aria-hidden', 'true');
    var name = document.createElement('span');
    name.textContent = section.label;
    link.appendChild(dot);
    link.appendChild(name);
    rail.appendChild(link);
  });
  document.body.appendChild(rail);

  /* ------------------------------------------------ where the reader is */

  var current = null;

  function setCurrent(id) {
    if (id === current) return;
    current = id;
    rail.querySelectorAll('.rail-tick').forEach(function (link) {
      link.classList.toggle('on', link.dataset.id === id);
      if (link.dataset.id === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    var section = SECTIONS.find(function (s) { return s.id === id; });
    if (section) {
      /* The page's own glow follows the section. No control for it, nothing to read -
         it is only meant to be felt as the page moving with you. */
      document.documentElement.style.setProperty('--accent-h', section.hue);
    }
  }

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    SECTIONS.forEach(function (s) { spy.observe(document.getElementById(s.id)); });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.transform = 'scaleY(' + ratio + ')';
      rail.classList.toggle('visible', window.scrollY > window.innerHeight * 0.5);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------- jumps, not teleports */

  /* View Transitions where the browser has them: a jump between sections cross-fades the page
     rather than cutting. Everywhere else this is simply the ordinary smooth scroll. */
  function go(hash) {
    var target = document.querySelector(hash);
    if (!target) return;
    var scroll = function () {
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', hash);
    };
    if (!reduced && document.startViewTransition) {
      document.startViewTransition(scroll);
    } else {
      scroll();
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute('href');
    if (hash.length < 2 || !document.querySelector(hash)) return;
    event.preventDefault();
    go(hash);
  });

  /* ------------------------------------------------------ keyboard paging */

  /* J and K, and the arrow keys with a modifier, move a section at a time. A long page that
     answers to the keyboard is the difference between a document and an application. */
  document.addEventListener('keydown', function (event) {
    if (event.target.matches('input, textarea, select, [contenteditable]')) return;
    var forward = event.key === 'j' || (event.key === 'ArrowDown' && event.shiftKey);
    var back = event.key === 'k' || (event.key === 'ArrowUp' && event.shiftKey);
    if (!forward && !back) return;
    event.preventDefault();
    var index = SECTIONS.findIndex(function (s) { return s.id === current; });
    if (index < 0) index = 0;
    var next = Math.min(SECTIONS.length - 1, Math.max(0, index + (forward ? 1 : -1)));
    go('#' + SECTIONS[next].id);
  });
})();
