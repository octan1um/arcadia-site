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
