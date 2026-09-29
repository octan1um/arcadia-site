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

  /* The Play button is a placeholder until the listing is live; say so rather than 404. */
  document.querySelectorAll('[data-placeholder="true"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (el.getAttribute('href') !== 'PLAY_URL_PLACEHOLDER') return;
      e.preventDefault();
      el.textContent = 'Coming soon';
      setTimeout(function () { el.innerHTML = 'Google&nbsp;Play'; }, 1600);
    });
  });
})();
