/* ═══════════════════════════════════════════════════════════
   Magic Bento — сетка вакансий.

   Порт компонента MagicBento (reactbits.dev, react-bits, MIT)
   с React на чистый JS. GSAP уже подключён на сайте и
   используется тот же, что в оригинале.

   Механики перенесены как есть:
   · глобальный прожектор за курсором на всю секцию;
   · свечение рамки каждой карточки по близости курсора;
   · частицы, всплывающие при наведении;
   · магнетизм — карточка тянется за курсором;
   · волна по клику.
   Наклон (tilt) в оригинале выключен по умолчанию — оставлен
   выключенным. На ширине до 768px вся анимация отключается,
   как в оригинале.

   Изменены только цвета: фиолетовый заменён на брендовый
   оранжевый.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var GLOW = '255, 75, 0';          // было '132, 0, 255'
  var PARTICLE_COUNT = 12;
  var SPOTLIGHT_RADIUS = 400;
  var MOBILE_BREAKPOINT = 768;

  var ENABLE_TILT = false;          // как в оригинале
  var ENABLE_MAGNETISM = true;
  var CLICK_EFFECT = true;

  var grid = document.getElementById('bentoGrid');
  if (!grid || typeof window.gsap === 'undefined') return;

  var section = grid.closest('.bento-section') || grid;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.bento-card'));
  if (!cards.length) return;

  var touchMode = window.innerWidth <= MOBILE_BREAKPOINT ||
                  window.matchMedia('(pointer: coarse)').matches;
  var disabled = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function makeParticle(x, y) {
    var el = document.createElement('div');
    el.className = 'bento-particle';
    el.style.cssText =
      'position:absolute;width:4px;height:4px;border-radius:50%;' +
      'background:rgba(' + GLOW + ',1);box-shadow:0 0 6px rgba(' + GLOW + ',.6);' +
      'pointer-events:none;z-index:100;left:' + x + 'px;top:' + y + 'px;';
    return el;
  }

  /* ── частицы, магнетизм, волна по клику ── */
  function initCard(card) {
    var particles = [];      // живые копии в DOM
    var memo = [];           // заготовки со случайными позициями
    var timeouts = [];
    var hovered = false;
    var ready = false;
    var magnet = null;

    function build() {
      if (ready) return;
      var r = card.getBoundingClientRect();
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        memo.push(makeParticle(Math.random() * r.width, Math.random() * r.height));
      }
      ready = true;
    }

    function clear() {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      if (magnet) magnet.kill();
      particles.forEach(function (p) {
        gsap.to(p, {
          scale: 0, opacity: 0, duration: .3, ease: 'back.in(1.7)',
          onComplete: function () { if (p.parentNode) p.parentNode.removeChild(p); }
        });
      });
      particles = [];
    }

    function spawn() {
      if (!hovered) return;
      build();
      memo.forEach(function (proto, i) {
        timeouts.push(setTimeout(function () {
          if (!hovered) return;
          var p = proto.cloneNode(true);
          card.appendChild(p);
          particles.push(p);

          gsap.fromTo(p, { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: .3, ease: 'back.out(1.7)' });
          gsap.to(p, {
            x: (Math.random() - .5) * 100,
            y: (Math.random() - .5) * 100,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: 'none', repeat: -1, yoyo: true
          });
          gsap.to(p, {
            opacity: .3, duration: 1.5, ease: 'power2.inOut',
            repeat: -1, yoyo: true
          });
        }, i * 100));
      });
    }

    card.addEventListener('mouseenter', function () {
      hovered = true;
      spawn();
      if (ENABLE_TILT) {
        gsap.to(card, { rotateX: 5, rotateY: 5, duration: .3, ease: 'power2.out', transformPerspective: 1000 });
      }
    });

    card.addEventListener('mouseleave', function () {
      hovered = false;
      clear();
      if (ENABLE_TILT) gsap.to(card, { rotateX: 0, rotateY: 0, duration: .3, ease: 'power2.out' });
      if (ENABLE_MAGNETISM) gsap.to(card, { x: 0, y: 0, duration: .3, ease: 'power2.out' });
    });

    card.addEventListener('mousemove', function (e) {
      if (!ENABLE_TILT && !ENABLE_MAGNETISM) return;
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var cx = r.width / 2, cy = r.height / 2;

      if (ENABLE_TILT) {
        gsap.to(card, {
          rotateX: ((y - cy) / cy) * -10,
          rotateY: ((x - cx) / cx) * 10,
          duration: .1, ease: 'power2.out', transformPerspective: 1000
        });
      }
      if (ENABLE_MAGNETISM) {
        magnet = gsap.to(card, {
          x: (x - cx) * .05, y: (y - cy) * .05,
          duration: .3, ease: 'power2.out'
        });
      }
    });

    /* На touch-устройствах нет hover, поэтому коротко воспроизводим
       тот же border glow и частицы в точке касания. */
    if (touchMode) {
      var touchFadeTimer = 0;

      card.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;

        clearTimeout(touchFadeTimer);
        cards.forEach(function (item) {
          if (item === card) return;
          item.classList.remove('is-touch-glow');
          item.style.setProperty('--glow-intensity', '0');
        });
        card.style.setProperty('--glow-x', (x / r.width * 100) + '%');
        card.style.setProperty('--glow-y', (y / r.height * 100) + '%');
        card.style.setProperty('--glow-intensity', '1');
        card.style.setProperty('--glow-radius', '240px');
        card.classList.add('is-touch-glow');
        hovered = true;
        spawn();
      }, { passive: true });

      function releaseTouchGlow() {
        touchFadeTimer = setTimeout(function () {
          hovered = false;
          card.classList.remove('is-touch-glow');
          card.style.setProperty('--glow-intensity', '0');
          clear();
        }, 520);
      }

      card.addEventListener('pointerup', releaseTouchGlow, { passive: true });
      card.addEventListener('pointercancel', releaseTouchGlow, { passive: true });
    }

    if (CLICK_EFFECT) {
      card.addEventListener('click', function (e) {
        var r = card.getBoundingClientRect();
        var keyboardClick = e.detail === 0;
        var x = keyboardClick ? r.width / 2 : e.clientX - r.left;
        var y = keyboardClick ? r.height / 2 : e.clientY - r.top;
        var max = Math.max(
          Math.hypot(x, y), Math.hypot(x - r.width, y),
          Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height)
        );
        var ripple = document.createElement('div');
        ripple.style.cssText =
          'position:absolute;width:' + (max * 2) + 'px;height:' + (max * 2) + 'px;' +
          'border-radius:50%;pointer-events:none;z-index:1000;' +
          'left:' + (x - max) + 'px;top:' + (y - max) + 'px;' +
          'background:radial-gradient(circle,rgba(' + GLOW + ',.4) 0%,rgba(' + GLOW + ',.2) 30%,transparent 70%);';
        card.appendChild(ripple);
        gsap.fromTo(ripple, { scale: 0, opacity: 1 }, {
          scale: 1, opacity: 0, duration: .8, ease: 'power2.out',
          onComplete: function () { ripple.remove(); }
        });
      });
    }
  }

  /* ── глобальный прожектор + свечение рамок по близости ── */
  function initSpotlight() {
    var spot = document.createElement('div');
    spot.className = 'bento-spotlight';
    spot.style.cssText =
      'position:fixed;width:800px;height:800px;border-radius:50%;pointer-events:none;' +
      'z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;' +
      'background:radial-gradient(circle,' +
      'rgba(' + GLOW + ',.15) 0%,rgba(' + GLOW + ',.08) 15%,rgba(' + GLOW + ',.04) 25%,' +
      'rgba(' + GLOW + ',.02) 40%,rgba(' + GLOW + ',.01) 65%,transparent 70%);';
    document.body.appendChild(spot);

    var proximity = SPOTLIGHT_RADIUS * .5;
    var fade = SPOTLIGHT_RADIUS * .75;

    function dim() {
      gsap.to(spot, { opacity: 0, duration: .3, ease: 'power2.out' });
      cards.forEach(function (c) { c.style.setProperty('--glow-intensity', '0'); });
    }

    document.addEventListener('mousemove', function (e) {
      var r = section.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) { dim(); return; }

      var min = Infinity;
      cards.forEach(function (card) {
        var cr = card.getBoundingClientRect();
        var d = Math.hypot(e.clientX - (cr.left + cr.width / 2),
                           e.clientY - (cr.top + cr.height / 2)) -
                Math.max(cr.width, cr.height) / 2;
        d = Math.max(0, d);
        min = Math.min(min, d);

        var intensity = 0;
        if (d <= proximity) intensity = 1;
        else if (d <= fade) intensity = (fade - d) / (fade - proximity);

        card.style.setProperty('--glow-x', ((e.clientX - cr.left) / cr.width * 100) + '%');
        card.style.setProperty('--glow-y', ((e.clientY - cr.top) / cr.height * 100) + '%');
        card.style.setProperty('--glow-intensity', String(intensity));
        card.style.setProperty('--glow-radius', SPOTLIGHT_RADIUS + 'px');
      });

      gsap.to(spot, { left: e.clientX, top: e.clientY, duration: .1, ease: 'power2.out' });

      var target = min <= proximity ? .8
                 : min <= fade ? ((fade - min) / (fade - proximity)) * .8
                 : 0;
      gsap.to(spot, { opacity: target, duration: target > 0 ? .2 : .5, ease: 'power2.out' });
    });

    document.addEventListener('mouseleave', dim);
  }

  if (!disabled) {
    cards.forEach(initCard);
    if (!touchMode) initSpotlight();
  }

  /* «Подробнее» ведёт к форме с уже выбранной позицией —
     поведение сохранено с прежней сетки вакансий. */
  cards.forEach(function (card) {
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Выбрать позицию: ' + (card.dataset.role || 'вакансия'));
    card.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      card.click();
    });
    card.addEventListener('click', function () {
      var role = card.dataset.role;
      var select = document.getElementById('f-role');
      if (role && select) {
        Array.prototype.forEach.call(select.options, function (o) {
          if (o.text.trim() === role.trim()) select.value = o.value;
        });
      }
      var target = document.getElementById('contact');
      if (target) target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });
})();
