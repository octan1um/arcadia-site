/* Arcadia landing page — scroll reveal, the headline's words rising in turn, clips that play
   only while they are on screen. Vanilla only: nothing is fetched, nothing is tracked. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Hidden-until-revealed only applies once this has run, so without a script the page is
     simply all there. */
  document.documentElement.classList.add('js');

  /* Reveal on scroll. Without IntersectionObserver, or with less motion asked for, everything
     is simply shown. */
  var targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduced) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* Split the headline into words so they rise in sequence. */
  if (!reduced) {
    document.querySelectorAll('.hero h1').forEach(function (h1) {
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3 && child.textContent.trim()) {
            var frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
              var span = document.createElement('span');
              span.className = 'word';
              span.textContent = part;
              frag.appendChild(span);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName === 'EM') {
            /* The coloured line rises as one piece, so its gradient runs unbroken across it. */
            child.classList.add('word');
          } else if (child.nodeType === 1 && child.tagName !== 'BR') {
            walk(child);
          }
        });
      };
      walk(h1);
      h1.querySelectorAll('.word').forEach(function (w, i) {
        w.style.animationDelay = (0.05 + i * 0.08) + 's';
      });
    });
  }

  /* Condense the nav once the page has moved. */
  var onScroll = function () {
    document.body.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hold the Home icon on the hero's cover phone and its panel opens, for as long as you hold
     it. The loop is an attract mode until the first press; then the panel follows the finger.
     Pointer events cover mouse, touch and pen; Space and Enter, held down, do the same, because
     the gesture is a hold and a click that toggles would teach a gesture the app does not have. */
  var demo = document.querySelector('.demo');
  var hold = demo && demo.querySelector('.hold');
  var hint = document.querySelector('.demo-hint');
  if (demo && hold) {
    var startHold = function (e) {
      if (e && e.cancelable) e.preventDefault();
      demo.classList.add('live', 'holding');
      if (hint) hint.textContent = 'Let go to close';
      if (e && e.pointerId !== undefined && hold.setPointerCapture) {
        try { hold.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      }
    };
    var endHold = function () {
      demo.classList.remove('holding');
      if (hint) hint.textContent = 'Hold the Home icon';
    };
    hold.addEventListener('pointerdown', startHold);
    hold.addEventListener('pointerup', endHold);
    hold.addEventListener('pointercancel', endHold);
    hold.addEventListener('pointerleave', function (e) {
      if (!hold.hasPointerCapture || !hold.hasPointerCapture(e.pointerId)) endHold();
    });
    hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var isKey = function (e) { return e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar'; };
    hold.addEventListener('keydown', function (e) { if (!isKey(e) || e.repeat) return; e.preventDefault(); startHold(null); });
    hold.addEventListener('keyup', function (e) { if (isKey(e)) endHold(); });
    hold.addEventListener('blur', endHold);
    hold.addEventListener('pointerenter', function () { demo.classList.add('live'); });
    hold.addEventListener('focus', function () { demo.classList.add('live'); });
  }

  /* The loops (the hero's field, the demos, the bands) only run while they are on screen. */
  if (!reduced && 'IntersectionObserver' in window) {
    var loopIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.classList.toggle('idle', !entry.isIntersecting); });
    }, { threshold: 0 });
    document.querySelectorAll('[data-anim]').forEach(function (el) { loopIo.observe(el); });
  }

  /* The clips are real screen recordings. They play muted while on screen and pause when
     scrolled away. With less motion asked for they stay on their poster frame. */
  var clips = document.querySelectorAll('video.clip');
  if (reduced) {
    clips.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
  } else if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () { /* autoplay refused: the poster stays */ });
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    clips.forEach(function (v) { vio.observe(v); });
  }
})();
