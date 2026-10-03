/* Arcadia landing page — scroll reveal, pointer glow, gentle parallax.
   Vanilla only: nothing is fetched, nothing is tracked. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal on scroll. Without IntersectionObserver everything is simply shown. */
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
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* Split the headline into words so they can rise in sequence. */
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
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(h1);
    h1.querySelectorAll('.word').forEach(function (w, i) {
      w.style.animationDelay = (0.05 + i * 0.07) + 's';
    });
  });

  /* Condense the nav once the page has moved. */
  var onScroll = function () {
    document.body.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hold the Home icon and its panel opens, for as long as you hold it.
   *
   * The looping animation is an attract mode for someone who has not touched anything. The first
   * press hands control over: the loop stops and the panel follows the finger instead, which is
   * the only part of Arcadia a visitor can try without installing it.
   *
   * Pointer events cover mouse, touch and pen in one path. Keyboard gets the same thing through
   * Space and Enter, held down, because the gesture *is* a hold - a click that toggles would be
   * teaching a gesture the app does not have.
   */
  var demo = document.querySelector('.demo');
  var hold = demo && demo.querySelector('.hold');
  var hint = demo && demo.querySelector('.demo-hint');
  if (demo && hold) {
    var HINT_IDLE = 'Hold the Home icon';
    var HINT_HELD = 'Let go to close';

    function startHold(e) {
      if (e && e.cancelable) e.preventDefault();
      demo.classList.add('live', 'holding');
      if (hint) hint.textContent = HINT_HELD;
      /* Keep receiving the release even if the finger slides off the icon, or the panel would
         stay open with nothing holding it. */
      if (e && e.pointerId !== undefined && hold.setPointerCapture) {
        try { hold.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      }
    }

    function endHold() {
      demo.classList.remove('holding');
      if (hint) hint.textContent = HINT_IDLE;
    }

    hold.addEventListener('pointerdown', startHold);
    hold.addEventListener('pointerup', endHold);
    hold.addEventListener('pointercancel', endHold);
    hold.addEventListener('pointerleave', function (e) {
      /* With capture held, leave fires only when the pointer is genuinely gone. */
      if (!hold.hasPointerCapture || !hold.hasPointerCapture(e.pointerId)) endHold();
    });
    /* A long-press on a touch screen otherwise raises the text-selection or context menu. */
    hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    hold.addEventListener('keydown', function (e) {
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Spacebar') return;
      if (e.repeat) return;
      e.preventDefault();
      startHold(null);
    });
    hold.addEventListener('keyup', function (e) {
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Spacebar') return;
      endHold();
    });
    hold.addEventListener('blur', endHold);

    /* Hand over on the first press, not on load: until then the loop is doing the teaching. */
    hold.addEventListener('pointerenter', function () { demo.classList.add('live'); });
    hold.addEventListener('focus', function () { demo.classList.add('live'); });
  }

  /* The Play button is a placeholder until the listing is live; say so rather than 404. */
  document.querySelectorAll('[data-placeholder="true"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (el.getAttribute('href') !== 'PLAY_URL_PLACEHOLDER') return;
      e.preventDefault();
      el.textContent = 'Coming soon';
      setTimeout(function () { el.innerHTML = 'Google&nbsp;Play'; }, 1600);
    });
  });
  /* Everything below is motion: hover tilts, card glows, parallax. Nothing below is
     behaviour, which is why the two blocks above moved up here - with them under this
     return, the one interactive thing on the page and the Play placeholder both did
     nothing at all for anyone who asked for less motion. */
  if (reduced) return;

  /* Cards light up under the cursor. */
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* Hero phone leans toward the pointer. Skipped on touch, where there is no hover. */
  var hero = document.querySelector('.hero');
  var heroPhone = document.querySelector('.hero-device .phone');
  if (hero && heroPhone && window.matchMedia('(hover: hover)').matches) {
    var raf = null, tx = 0, ty = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 12;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -8;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        heroPhone.style.transform = 'perspective(1100px) rotateY(' + tx + 'deg) rotateX(' + ty + 'deg)';
      });
    });
    hero.addEventListener('pointerleave', function () {
      heroPhone.style.transform = '';
    });
  }

})();
