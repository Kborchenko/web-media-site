/* Magic Bento interaction for “Система развития команды”.
   Pointer glow works at every viewport; touch adds particles/ripple
   and a two-way, interruptible horizontal swipe. */
(function () {
  'use strict';

  var system = document.querySelector('[data-company-system][data-magic-bento]');
  if (!system) return;

  var track = system.querySelector('.company-system__steps');
  var steps = Array.prototype.slice.call(system.querySelectorAll('[data-company-step]'));
  if (!track || !steps.length) return;

  var RADIUS = 400;
  var PARTICLES = 10;
  var SWIPE_DISTANCE = 36;
  var SWIPE_VELOCITY = .18;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var spotlight = null;
  var pointerFrame = 0;
  var latestPointer = null;
  var gesture = null;
  var suppressClickUntil = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOut() {
    return 'cubic-bezier(.23,1,.32,1)';
  }

  function setGlow(step, clientX, clientY, intensity, radius) {
    var rect = step.getBoundingClientRect();
    step.style.setProperty('--glow-x', clamp((clientX - rect.left) / rect.width * 100, 0, 100) + '%');
    step.style.setProperty('--glow-y', clamp((clientY - rect.top) / rect.height * 100, 0, 100) + '%');
    step.style.setProperty('--glow-intensity', String(clamp(intensity, 0, 1)));
    step.style.setProperty('--glow-radius', (radius || RADIUS) + 'px');
  }

  function dimStep(step) {
    step.classList.remove('is-company-bento-active', 'is-touch-glow');
    step.style.setProperty('--glow-intensity', '0');
  }

  function clearParticles(step) {
    Array.prototype.slice.call(step.querySelectorAll('.company-bento-particle')).forEach(function (particle) {
      particle.getAnimations().forEach(function (animation) { animation.cancel(); });
      if (reduceMotion || typeof particle.animate !== 'function') {
        particle.remove();
        return;
      }
      var fade = particle.animate([
        { transform: 'scale(1)', opacity: .5 },
        { transform: 'scale(.5)', opacity: 0 }
      ], { duration: 160, easing: easeOut(), fill: 'forwards' });
      fade.onfinish = function () { particle.remove(); };
    });
  }

  function spawnParticles(step, clientX, clientY) {
    if (step.querySelector('.company-bento-particle')) return;
    var rect = step.getBoundingClientRect();
    var originX = typeof clientX === 'number' ? clientX - rect.left : rect.width / 2;
    var originY = typeof clientY === 'number' ? clientY - rect.top : rect.height / 2;
    var count = reduceMotion ? 3 : (finePointer ? PARTICLES : 4);

    for (var i = 0; i < count; i++) {
      var particle = document.createElement('span');
      var angle = Math.random() * Math.PI * 2;
      var distance = 18 + Math.random() * 42;
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance;
      particle.className = 'company-bento-particle';
      particle.style.left = clamp(originX + (Math.random() - .5) * 28, 6, rect.width - 6) + 'px';
      particle.style.top = clamp(originY + (Math.random() - .5) * 24, 6, rect.height - 6) + 'px';
      step.appendChild(particle);

      if (reduceMotion || typeof particle.animate !== 'function') {
        particle.style.opacity = '.65';
        window.setTimeout((function (node) { return function () { node.remove(); }; })(particle), 220);
        continue;
      }

      particle.animate([
        { transform: 'translate3d(0,0,0) scale(.6)', opacity: 0, offset: 0 },
        { transform: 'translate3d(' + (dx * .2) + 'px,' + (dy * .2) + 'px,0) scale(1)', opacity: 1, offset: .18 },
        { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(.72)', opacity: .26, offset: 1 }
      ], {
        duration: finePointer ? 1200 + Math.random() * 600 : 520 + Math.random() * 180,
        delay: i * 34,
        easing: easeOut(),
        direction: finePointer ? 'alternate' : 'normal',
        iterations: finePointer ? Infinity : 1,
        fill: finePointer ? 'none' : 'forwards'
      });
    }
  }

  function ripple(step, clientX, clientY) {
    var rect = step.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var max = Math.max(
      Math.hypot(x, y), Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height), Math.hypot(x - rect.width, y - rect.height)
    );
    var wave = document.createElement('span');
    wave.className = 'company-bento-ripple';
    wave.style.width = max * 2 + 'px';
    wave.style.height = max * 2 + 'px';
    wave.style.left = x - max + 'px';
    wave.style.top = y - max + 'px';
    step.appendChild(wave);

    if (typeof wave.animate !== 'function') {
      window.setTimeout(function () { wave.remove(); }, 420);
      return;
    }
    var animation = wave.animate([
      { transform: 'scale(.08)', opacity: .84 },
      { transform: 'scale(1)', opacity: 0 }
    ], { duration: reduceMotion ? 180 : 520, easing: easeOut(), fill: 'forwards' });
    animation.onfinish = function () { wave.remove(); };
  }

  function ensureSpotlight() {
    if (spotlight) return spotlight;
    spotlight = document.createElement('div');
    spotlight.className = 'company-path-spotlight';
    spotlight.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spotlight);
    return spotlight;
  }

  function dimSpotlight() {
    if (spotlight) spotlight.style.opacity = '0';
    steps.forEach(function (step) {
      if (!step.classList.contains('is-touch-glow')) {
        step.classList.remove('is-company-bento-active');
        step.style.setProperty('--glow-intensity', '0');
      }
    });
  }

  function renderSpotlight() {
    pointerFrame = 0;
    if (!latestPointer) return;
    var event = latestPointer;
    var rect = track.getBoundingClientRect();
    var inside = event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) {
      dimSpotlight();
      return;
    }

    var proximity = RADIUS * .5;
    var fadeDistance = RADIUS * .75;
    var minDistance = Infinity;
    steps.forEach(function (step) {
      var stepRect = step.getBoundingClientRect();
      var distance = Math.hypot(
        event.clientX - (stepRect.left + stepRect.width / 2),
        event.clientY - (stepRect.top + stepRect.height / 2)
      ) - Math.max(stepRect.width, stepRect.height) / 2;
      distance = Math.max(0, distance);
      minDistance = Math.min(minDistance, distance);
      var intensity = distance <= proximity ? 1 :
        distance <= fadeDistance ? (fadeDistance - distance) / (fadeDistance - proximity) : 0;
      setGlow(step, event.clientX, event.clientY, intensity, RADIUS);
    });

    var spot = ensureSpotlight();
    spot.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px,0) translate(-50%,-50%)';
    spot.style.opacity = minDistance <= proximity ? '.72' :
      minDistance <= fadeDistance ? String((fadeDistance - minDistance) / (fadeDistance - proximity) * .72) : '0';
  }

  function scheduleSpotlight(event) {
    latestPointer = { clientX: event.clientX, clientY: event.clientY };
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderSpotlight);
  }

  function activeIndex() {
    var index = steps.findIndex(function (step) { return step.classList.contains('active'); });
    return index < 0 ? 0 : index;
  }

  function activate(index) {
    index = clamp(index, 0, steps.length - 1);
    steps[index].click();
  }

  steps.forEach(function (step) {
    step.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'touch') return;
      step.classList.add('is-company-bento-active');
      setGlow(step, event.clientX, event.clientY, 1, RADIUS);
      spawnParticles(step);
    });

    step.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;
      setGlow(step, event.clientX, event.clientY, 1, RADIUS);
    }, { passive: true });

    step.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'touch') return;
      step.classList.remove('is-company-bento-active');
      step.style.setProperty('--glow-intensity', '0');
      clearParticles(step);
    });
  });

  track.addEventListener('pointermove', function (event) {
    if (gesture && event.pointerId === gesture.pointerId) {
      var dx = event.clientX - gesture.x;
      var dy = event.clientY - gesture.y;
      if (!gesture.dragging && Math.abs(dx) > Math.abs(dy) + 5 && Math.abs(dx) > 8) {
        gesture.dragging = true;
      }
    }
    if (event.pointerType === 'touch') return;
    scheduleSpotlight(event);
  }, { passive: true });

  track.addEventListener('pointerdown', function (event) {
    var step = event.target.closest('[data-company-step]');
    if (!step) return;

    step.classList.add('is-company-bento-active');
    setGlow(step, event.clientX, event.clientY, 1, event.pointerType === 'touch' ? 240 : RADIUS);
    spawnParticles(step, event.clientX, event.clientY);
    ripple(step, event.clientX, event.clientY);

    var draggablePointer = event.pointerType === 'touch' || event.pointerType === 'pen';
    if (!draggablePointer) return;
    steps.forEach(function (item) {
      if (item !== step) {
        dimStep(item);
        clearParticles(item);
      }
    });
    step.classList.add('is-touch-glow');
    gesture = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      step: step,
      dragging: false
    };
  }, { passive: true });

  function finishGesture(event, cancelled) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    var current = gesture;
    gesture = null;

    if (current.dragging) suppressClickUntil = performance.now() + 420;

    window.setTimeout(function () {
      current.step.classList.remove('is-touch-glow', 'is-company-bento-active');
      current.step.style.setProperty('--glow-intensity', '0');
      clearParticles(current.step);
    }, 520);
  }

  track.addEventListener('pointerup', function (event) { finishGesture(event, false); }, { passive: true });
  track.addEventListener('pointercancel', function (event) { finishGesture(event, true); }, { passive: true });
  track.addEventListener('pointerleave', function (event) {
    if (event.pointerType !== 'touch') dimSpotlight();
  });

  track.addEventListener('click', function (event) {
    if (event.isTrusted && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('mouseleave', dimSpotlight);
})();
