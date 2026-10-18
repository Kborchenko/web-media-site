/* ═══════════════════════════════════════════════════════════
   Magic Bento — карточки вакансий.

   Механика адаптирована из React Bits Magic Bento (MIT):
   · spotlight следует за мышью/пером на любой ширине экрана;
   · граница светится в точке указателя;
   · при входе в карточку появляются частицы;
   · касание запускает локальное свечение и ripple;
   · лёгкий magnetism работает только для точного указателя.

   Реализация не зависит от GSAP/CDN: Pointer Events + WAAPI.
   Палитра заменена на фирменный оранжевый CODETECHNO.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var PARTICLE_COUNT = 12;
  var SPOTLIGHT_RADIUS = 400;
  var TOUCH_GLOW_DURATION = 620;
  var ENABLE_MAGNETISM = true;

  var grid = document.getElementById('bentoGrid');
  if (!grid) return;

  var section = grid.closest('.bento-section') || grid;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.bento-card'));
  if (!cards.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mobilePerformance = !finePointer;
  var spotlight = null;
  var spotlightFrame = 0;
  var latestPointer = null;
  var carouselGesture = null;
  var suppressCarouselClickUntil = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOut() {
    return 'cubic-bezier(.23,1,.32,1)';
  }

  function setGlow(card, clientX, clientY, intensity, radius) {
    var rect = card.getBoundingClientRect();
    var x = clamp((clientX - rect.left) / rect.width * 100, 0, 100);
    var y = clamp((clientY - rect.top) / rect.height * 100, 0, 100);
    card.style.setProperty('--glow-x', x + '%');
    card.style.setProperty('--glow-y', y + '%');
    card.style.setProperty('--glow-intensity', String(clamp(intensity, 0, 1)));
    card.style.setProperty('--glow-radius', (radius || SPOTLIGHT_RADIUS) + 'px');
  }

  function dimCard(card) {
    card.style.setProperty('--glow-intensity', '0');
    card.classList.remove('is-bento-active');
  }

  function createParticle(card, originX, originY, index) {
    var rect = card.getBoundingClientRect();
    var particle = document.createElement('span');
    var startX = typeof originX === 'number' ? originX : Math.random() * rect.width;
    var startY = typeof originY === 'number' ? originY : Math.random() * rect.height;
    var angle = Math.random() * Math.PI * 2;
    var distance = 28 + Math.random() * 64;
    var dx = Math.cos(angle) * distance;
    var dy = Math.sin(angle) * distance;

    particle.className = 'bento-particle';
    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    card.appendChild(particle);

    if (reduceMotion || typeof particle.animate !== 'function') {
      particle.style.opacity = '.7';
      window.setTimeout(function () { particle.remove(); }, 260);
      return;
    }

    particle.animate([
      { transform: 'translate3d(0,0,0) scale(.55)', opacity: 0, offset: 0 },
      { transform: 'translate3d(' + (dx * .22) + 'px,' + (dy * .22) + 'px,0) scale(1)', opacity: 1, offset: .16 },
      { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(.72)', opacity: .28, offset: 1 }
    ], {
      duration: finePointer ? 1450 + Math.random() * 850 : 560 + Math.random() * 180,
      delay: index * 42,
      easing: easeOut(),
      direction: finePointer ? 'alternate' : 'normal',
      iterations: finePointer ? Infinity : 1,
      fill: finePointer ? 'none' : 'forwards'
    });
  }

  function clearParticles(card) {
    var particles = Array.prototype.slice.call(card.querySelectorAll('.bento-particle'));
    particles.forEach(function (particle) {
      particle.getAnimations().forEach(function (animation) { animation.cancel(); });
      if (typeof particle.animate !== 'function' || reduceMotion) {
        particle.remove();
        return;
      }
      var fade = particle.animate([
        { transform: 'scale(1)', opacity: parseFloat(getComputedStyle(particle).opacity) || .45 },
        { transform: 'scale(.45)', opacity: 0 }
      ], { duration: 180, easing: easeOut(), fill: 'forwards' });
      fade.onfinish = function () { particle.remove(); };
    });
  }

  function spawnParticles(card, clientX, clientY) {
    if (mobilePerformance) return;
    if (card.querySelector('.bento-particle')) return;
    var rect = card.getBoundingClientRect();
    var localX = typeof clientX === 'number' ? clientX - rect.left : null;
    var localY = typeof clientY === 'number' ? clientY - rect.top : null;
    var count = reduceMotion ? 3 : (finePointer ? PARTICLE_COUNT : 4);
    for (var i = 0; i < count; i++) {
      var spreadX = localX == null ? null : clamp(localX + (Math.random() - .5) * 56, 8, rect.width - 8);
      var spreadY = localY == null ? null : clamp(localY + (Math.random() - .5) * 56, 8, rect.height - 8);
      createParticle(card, spreadX, spreadY, i);
    }
  }

  function createRipple(card, clientX, clientY) {
    if (mobilePerformance) return;
    var rect = card.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var maxDistance = Math.max(
      Math.hypot(x, y),
      Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height),
      Math.hypot(x - rect.width, y - rect.height)
    );
    var ripple = document.createElement('span');
    ripple.className = 'bento-ripple';
    ripple.style.width = (maxDistance * 2) + 'px';
    ripple.style.height = (maxDistance * 2) + 'px';
    ripple.style.left = (x - maxDistance) + 'px';
    ripple.style.top = (y - maxDistance) + 'px';
    card.appendChild(ripple);

    if (typeof ripple.animate !== 'function') {
      window.setTimeout(function () { ripple.remove(); }, 480);
      return;
    }
    var animation = ripple.animate([
      { transform: 'scale(.08)', opacity: .9 },
      { transform: 'scale(1)', opacity: 0 }
    ], {
      duration: reduceMotion ? 220 : 620,
      easing: easeOut(),
      fill: 'forwards'
    });
    animation.onfinish = function () { ripple.remove(); };
  }

  function ensureSpotlight() {
    if (spotlight) return spotlight;
    spotlight = document.createElement('div');
    spotlight.className = 'bento-spotlight';
    spotlight.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spotlight);
    return spotlight;
  }

  function dimSpotlight() {
    if (spotlight) spotlight.style.opacity = '0';
    cards.forEach(function (card) {
      if (!card.classList.contains('is-touch-glow')) dimCard(card);
    });
  }

  function renderSpotlight() {
    spotlightFrame = 0;
    if (!latestPointer) return;

    var event = latestPointer;
    var sectionRect = section.getBoundingClientRect();
    var inside = event.clientX >= sectionRect.left && event.clientX <= sectionRect.right &&
      event.clientY >= sectionRect.top && event.clientY <= sectionRect.bottom;

    if (!inside) {
      dimSpotlight();
      return;
    }

    var spot = ensureSpotlight();
    var proximity = SPOTLIGHT_RADIUS * .5;
    var fadeDistance = SPOTLIGHT_RADIUS * .75;
    var minDistance = Infinity;

    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var distance = Math.hypot(
        event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2)
      ) - Math.max(rect.width, rect.height) / 2;
      distance = Math.max(0, distance);
      minDistance = Math.min(minDistance, distance);

      var intensity = 0;
      if (distance <= proximity) intensity = 1;
      else if (distance <= fadeDistance) {
        intensity = (fadeDistance - distance) / (fadeDistance - proximity);
      }
      setGlow(card, event.clientX, event.clientY, intensity, SPOTLIGHT_RADIUS);
    });

    spot.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px,0) translate(-50%,-50%)';
    spot.style.opacity = minDistance <= proximity
      ? '.78'
      : minDistance <= fadeDistance
        ? String((fadeDistance - minDistance) / (fadeDistance - proximity) * .78)
        : '0';
  }

  function scheduleSpotlight(event) {
    latestPointer = { clientX: event.clientX, clientY: event.clientY };
    if (!spotlightFrame) spotlightFrame = window.requestAnimationFrame(renderSpotlight);
  }

  function openPosition(card) {
    var role = card.dataset.role;
    var select = document.getElementById('f-role');
    if (role && select) {
      Array.prototype.forEach.call(select.options, function (option) {
        if (option.text.trim() === role.trim()) select.value = option.value;
      });
    }
    var target = document.getElementById('contact');
    if (target) {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  cards.forEach(function (card) {
    var touchFadeTimer = 0;
    var lastPointerType = 'mouse';

    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Выбрать позицию: ' + (card.dataset.role || 'вакансия'));

    card.addEventListener('pointerenter', function (event) {
      lastPointerType = event.pointerType || 'mouse';
      if (lastPointerType === 'touch') return;
      card.classList.add('is-bento-active');
      setGlow(card, event.clientX, event.clientY, 1, SPOTLIGHT_RADIUS);
      spawnParticles(card);
    });

    card.addEventListener('pointermove', function (event) {
      lastPointerType = event.pointerType || lastPointerType;
      if (lastPointerType === 'touch') return;
      setGlow(card, event.clientX, event.clientY, 1, SPOTLIGHT_RADIUS);
      if (!finePointer || !ENABLE_MAGNETISM || lastPointerType === 'touch' || reduceMotion) return;
      var rect = card.getBoundingClientRect();
      var x = event.clientX - rect.left - rect.width / 2;
      var y = event.clientY - rect.top - rect.height / 2;
      card.style.transform = 'translate3d(' + (x * .035) + 'px,' + (y * .035) + 'px,0)';
    }, { passive: true });

    card.addEventListener('pointerleave', function (event) {
      if ((event.pointerType || lastPointerType) === 'touch') return;
      window.clearTimeout(touchFadeTimer);
      dimCard(card);
      clearParticles(card);
      card.style.transform = '';
    });

    card.addEventListener('pointerdown', function (event) {
      lastPointerType = event.pointerType || lastPointerType;
      window.clearTimeout(touchFadeTimer);
      card.classList.add('is-bento-active');
      if (lastPointerType === 'touch' || lastPointerType === 'pen') {
        cards.forEach(function (item) {
          if (item !== card) {
            dimCard(item);
            clearParticles(item);
          }
        });
        card.classList.add('is-touch-glow');
      }
      setGlow(card, event.clientX, event.clientY, 1, lastPointerType === 'touch' ? 260 : SPOTLIGHT_RADIUS);
      spawnParticles(card, event.clientX, event.clientY);
      createRipple(card, event.clientX, event.clientY);
    }, { passive: true });

    function releaseTouch() {
      if (lastPointerType !== 'touch' && lastPointerType !== 'pen') return;
      touchFadeTimer = window.setTimeout(function () {
        card.classList.remove('is-touch-glow');
        dimCard(card);
        clearParticles(card);
      }, TOUCH_GLOW_DURATION);
    }

    card.addEventListener('pointerup', releaseTouch, { passive: true });
    card.addEventListener('pointercancel', releaseTouch, { passive: true });

    card.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPosition(card);
    });

    card.addEventListener('click', function (event) {
      if (event.detail === 0) return;
      if (lastPointerType === 'touch' || lastPointerType === 'pen') {
        window.setTimeout(function () { openPosition(card); }, 240);
      } else {
        openPosition(card);
      }
    });
  });

  /* Мобильная лента использует нативный inertial scroll + CSS snap.
     JS не переписывает scrollLeft на каждом кадре: так свайп остаётся
     плавным и прерываемым, а Magic Bento не конфликтует с жестом. */
  var prevButton = document.getElementById('bentoPrev');
  var nextButton = document.getElementById('bentoNext');
  var carouselStatus = document.getElementById('bentoCarouselStatus');
  var carouselMedia = window.matchMedia('(max-width: 599px)');
  var scrollFrame = 0;

  function carouselEnabled() {
    return carouselMedia.matches && grid.scrollWidth > grid.clientWidth + 1;
  }

  function nearestCardIndex() {
    var nearest = 0;
    var nearestDistance = Infinity;
    cards.forEach(function (card, index) {
      var viewportCenter = grid.scrollLeft + grid.clientWidth / 2;
      var cardCenter = card.offsetLeft + card.offsetWidth / 2;
      var distance = Math.abs(cardCenter - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    return nearest;
  }

  function updateCarouselControls() {
    var index = carouselEnabled() ? nearestCardIndex() : 0;
    if (prevButton) prevButton.disabled = !carouselEnabled() || index === 0;
    if (nextButton) nextButton.disabled = !carouselEnabled() || index === cards.length - 1;
    if (carouselStatus) carouselStatus.textContent = (index + 1) + ' / ' + cards.length;
  }

  function scrollToCard(index, smooth) {
    var targetIndex = clamp(index, 0, cards.length - 1);
    var target = cards[targetIndex].offsetLeft;
    grid.scrollTo({
      left: target,
      behavior: smooth && !reduceMotion && carouselEnabled() ? 'smooth' : 'auto'
    });
  }

  if (prevButton) {
    prevButton.addEventListener('click', function () {
      scrollToCard(nearestCardIndex() - 1, true);
    });
  }
  if (nextButton) {
    nextButton.addEventListener('click', function () {
      scrollToCard(nearestCardIndex() + 1, true);
    });
  }

  grid.addEventListener('pointerdown', function (event) {
    if (!carouselEnabled() || carouselGesture || (event.pointerType === 'mouse' && event.button !== 0)) return;
    carouselGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false
    };
  }, { passive: true });

  grid.addEventListener('pointermove', function (event) {
    if (!carouselGesture || event.pointerId !== carouselGesture.pointerId) return;
    var dx = event.clientX - carouselGesture.startX;
    var dy = event.clientY - carouselGesture.startY;
    if (!carouselGesture.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) + 4) {
      carouselGesture.dragging = true;
    }
  }, { passive: true });

  function finishCarouselGesture(event, cancelled) {
    if (!carouselGesture || event.pointerId !== carouselGesture.pointerId) return;
    var gesture = carouselGesture;
    carouselGesture = null;
    if (gesture.dragging) suppressCarouselClickUntil = performance.now() + 420;
  }

  grid.addEventListener('pointerup', function (event) {
    finishCarouselGesture(event, false);
  });
  grid.addEventListener('pointercancel', function (event) {
    finishCarouselGesture(event, true);
  });
  grid.addEventListener('click', function (event) {
    if (event.isTrusted && performance.now() < suppressCarouselClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  grid.addEventListener('scroll', function () {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(function () {
      scrollFrame = 0;
      updateCarouselControls();
    });
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!carouselEnabled()) {
      carouselGesture = null;
    }
    updateCarouselControls();
  }, { passive: true });
  updateCarouselControls();

  section.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') return;
    scheduleSpotlight(event);
  }, { passive: true });
  section.addEventListener('pointerleave', dimSpotlight);
  document.addEventListener('mouseleave', dimSpotlight);
})();
