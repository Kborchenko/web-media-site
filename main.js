/* ═══════════════════════════════════════════════════════════
   КОД ТЕХ — сценарии
   Модули cinematic-site-components, адаптированные под проект:
     01 Text Mask Reveal · 02 Sticky Stack Narrative
     11 Accordion Slider · 16 Spotlight Border Cards
     20 Odometer Counter
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   НАСТРОЙКА: куда отправлять отклики и заявки заказчиков.
   Пока строки пустые — формы не отправляют данные и говорят
   об этом пользователю. Подставьте адреса обработчиков
   (например свой /api/apply и /api/project).
   ───────────────────────────────────────────────────────────── */
var FORM_ENDPOINT = '';
var PROJECT_FORM_ENDPOINT = '';

(function () {
  'use strict';

  var hasGsap = typeof window.gsap !== 'undefined';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ═══ Matrix Text — расшифровка заголовков ═══
     Список заголовков, на которые вешается эффект. Чтобы сузить
     или расширить охват — правится только эта строка.
     Фраза «Сеньоров мало…» сюда намеренно не входит: у неё уже
     есть своя механика заливки по скроллу, два эффекта на одном
     элементе спорят друг с другом.                              */
  var MATRIX_HEADINGS = '.hero-title, .sec-title, .fc-front h3, .acc-h3, .bento-card h3';

  if (window.MatrixText) {
    MatrixText.init(MATRIX_HEADINGS, {
      initialDelay: 80,
      letterAnimationDuration: 280,
      letterInterval: 50
    });
  }

  /* ═══ Навигация ═══ */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var links = document.querySelector('.nav-links');
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var navFrame = 0;

  function updateNavigation() {
    navFrame = 0;
    nav.classList.toggle('solid', window.scrollY > 40);
    // в самом верху ни один пункт меню не подсвечен
    if (window.scrollY < 120) {
      navAnchors.forEach(function (a) { a.classList.remove('on'); });
    }
  }

  function requestNavigationUpdate() {
    if (!navFrame) navFrame = window.requestAnimationFrame(updateNavigation);
  }

  updateNavigation();
  window.addEventListener('scroll', requestNavigationUpdate, { passive: true });

  burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  // Плавные переходы по внутренним ссылкам. Колесо, тач и инерция
  // остаются полностью нативными; отключение анимации учитывает ОС.
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest('a[href^="#"]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var hash = anchor.getAttribute('href');
    if (!hash || hash === '#') return;

    var target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    var navOffset = nav ? nav.getBoundingClientRect().height + 12 : 0;
    var targetTop = target.getBoundingClientRect().top + window.scrollY - navOffset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: reduced ? 'auto' : 'smooth' });

    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  });

  // подсветка активного пункта меню
  var sections = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ═══ Бегущая строка сфер ═══
     Содержимое дублируется, а анимация сдвигает ленту ровно на
     половину её ширины — за счёт этого стык не виден и цикл
     замыкается без рывка.                                       */
  var mRow = document.getElementById('marqueeRow');
  if (mRow) {
    mRow.innerHTML += mRow.innerHTML;
  }

  /* ═══ Модуль 20 — Odometer Counter ═══
     Адаптация: нецифровые символы («–», пробел) остаются
     статичными, крутятся только разряды.                      */
  function initOdometers() {
    document.querySelectorAll('.odometer').forEach(function (odo) {
      var raw = odo.dataset.value || '';
      var suffix = odo.dataset.suffix || '';
      var targets = [];

      odo.innerHTML = '';
      raw.split('').forEach(function (ch) {
        if (/[0-9]/.test(ch)) {
          var digit = document.createElement('span');
          digit.className = 'odo-digit';
          var strip = document.createElement('span');
          strip.className = 'odo-strip';
          for (var i = 0; i <= 9; i++) {
            var s = document.createElement('span');
            s.textContent = i;
            strip.appendChild(s);
          }
          digit.appendChild(strip);
          odo.appendChild(digit);
          targets.push(parseInt(ch, 10));
        } else {
          var sep = document.createElement('span');
          sep.className = 'odo-sep';
          sep.textContent = ch;
          odo.appendChild(sep);
        }
      });

      if (suffix) {
        var suf = document.createElement('span');
        suf.className = 'odo-suffix';
        suf.textContent = suffix;
        odo.appendChild(suf);
      }

      var roll = function () {
        odo.querySelectorAll('.odo-strip').forEach(function (strip, i) {
          var h = strip.children[0].getBoundingClientRect().height;
          strip.style.transitionDelay = (i * 0.11) + 's';
          strip.style.transform = 'translateY(-' + (targets[i] * h) + 'px)';
        });
      };

      if (hasGsap && window.ScrollTrigger) {
        ScrollTrigger.create({ trigger: odo, start: 'top 92%', once: true, onEnter: roll });
      } else {
        roll();
      }
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initOdometers);
  } else {
    initOdometers();
  }

  /* ═══ Magic Rings — фон под ключевой фразой ═══
     Настройки под палитру: оранжевый в центре уходит в тёмный
     по мере удаления кольца, чтобы дальние растворялись в фоне.
     Из интерактива включено только увеличение при наведении.  */
  if (window.MagicRings) {
    // Радиусы считаются от меньшей стороны холста: на узком экране
    // кольца с десктопными значениями уезжают за края, поэтому
    // на мобильном они собираются ближе к центру.
    var ringGeometry = function () {
      return window.innerWidth < 700
        ? { baseRadius: 0.34, radiusStep: 0.095, ringCount: 6 }
        : { baseRadius: 0.34, radiusStep: 0.115, ringCount: 7 };
    };

    var g = ringGeometry();
    var rings = MagicRings.mount(document.getElementById('rings'), {
      color: '#FF4B00',
      colorTwo: '#7A2A08',
      ringCount: g.ringCount,
      speed: 0.65,
      opacity: 0.72,
      baseRadius: g.baseRadius,
      radiusStep: g.radiusStep,
      lineThickness: 2,
      attenuation: 10,
      noiseAmount: 0.05,
      followMouse: false,
      parallax: 0,
      clickBurst: false,
      hoverScale: 1.14
    });

    if (rings) {
      var wide = window.innerWidth >= 700;
      window.addEventListener('resize', function () {
        var nowWide = window.innerWidth >= 700;
        if (nowWide === wide) return;
        wide = nowWide;
        rings.set(ringGeometry());
      });
    }
  }

  /* ═══ Модуль 02 — Sticky Stack Narrative ═══ */
  var cards = document.querySelectorAll('.feature-card');
  var states = document.querySelectorAll('.p-state');
  var panelNum = document.getElementById('panelNum');
  var principleScroller = document.querySelector('.stack-features');
  var suppressPrincipleClickUntil = 0;

  function activate(num) {
    cards.forEach(function (c) { c.classList.toggle('active', c.dataset.feature === num); });
    states.forEach(function (s) { s.classList.toggle('active', s.dataset.state === num); });
    if (panelNum) panelNum.textContent = num;
  }

  /* Один непрерывный расчёт активного принципа надёжнее нескольких
     пересекающихся ScrollTrigger: не пропускает шаги при быстром скролле,
     переходе по якорю и прокрутке в обратную сторону. */
  if (cards.length) {
    var principleFrame = 0;

    function syncPrincipleToScroll() {
      principleFrame = 0;
      var activationLine = window.innerHeight * .58;
      var activeNum = cards[0].dataset.feature;
      cards.forEach(function (card) {
        if (card.getBoundingClientRect().top <= activationLine) activeNum = card.dataset.feature;
      });

      activate(activeNum);
    }

    function requestPrincipleSync() {
      if (principleFrame) return;
      principleFrame = window.requestAnimationFrame(syncPrincipleToScroll);
    }

    window.addEventListener('scroll', requestPrincipleSync, { passive: true });
    window.addEventListener('resize', requestPrincipleSync);
    window.addEventListener('load', requestPrincipleSync, { once: true });
    requestPrincipleSync();
  }

  /* ═══ Card Flip поверх карточек принципов ═══
     На телефоне карточки остаются вертикальной колонкой. Горизонтальный
     свайп влево открывает оборот, вправо возвращает лицевую сторону;
     вертикальная прокрутка страницы при этом остаётся нативной. */
  if (window.matchMedia('(hover: none)').matches) {
    var principleGesture = null;

    function setPrincipleFlip(card, shouldFlip) {
      cards.forEach(function (item) {
        var isCurrent = item === card && shouldFlip;
        item.classList.toggle('flipped', isCurrent);
        item.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      });
    }

    if (principleScroller) {
      principleScroller.addEventListener('pointerdown', function (event) {
        if ((event.pointerType !== 'touch' && event.pointerType !== 'pen') || event.isPrimary === false || principleGesture) return;
        var card = event.target.closest('.feature-card');
        if (!card) return;
        principleGesture = {
          pointerId: event.pointerId,
          card: card,
          x: event.clientX,
          y: event.clientY,
          startedAt: performance.now(),
          horizontal: false
        };
      }, { passive: true });

      principleScroller.addEventListener('pointermove', function (event) {
        if (!principleGesture || principleGesture.pointerId !== event.pointerId) return;
        var dx = event.clientX - principleGesture.x;
        var dy = event.clientY - principleGesture.y;
        if (!principleGesture.horizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) + 5) {
          principleGesture.horizontal = true;
          if (principleGesture.card.setPointerCapture) principleGesture.card.setPointerCapture(event.pointerId);
        }
      }, { passive: true });

      function finishPrincipleGesture(event, cancelled) {
        if (!principleGesture || principleGesture.pointerId !== event.pointerId) return;
        var gesture = principleGesture;
        var dx = event.clientX - gesture.x;
        var elapsed = Math.max(1, performance.now() - gesture.startedAt);
        var velocity = Math.abs(dx) / elapsed;
        var swiped = !cancelled && gesture.horizontal && (Math.abs(dx) >= 42 || velocity >= .2);

        if (gesture.card.hasPointerCapture && gesture.card.hasPointerCapture(gesture.pointerId)) {
          gesture.card.releasePointerCapture(gesture.pointerId);
        }
        principleGesture = null;

        if (!swiped) return;
        suppressPrincipleClickUntil = performance.now() + 420;
        setPrincipleFlip(gesture.card, dx < 0);
        activate(gesture.card.dataset.feature);
      }
      principleScroller.addEventListener('pointerup', function (event) {
        finishPrincipleGesture(event, false);
      }, { passive: true });
      principleScroller.addEventListener('pointercancel', function (event) {
        finishPrincipleGesture(event, true);
      }, { passive: true });
    }

    cards.forEach(function (card) {
      card.setAttribute('aria-pressed', 'false');
      card.addEventListener('click', function (event) {
        if (performance.now() < suppressPrincipleClickUntil) {
          event.preventDefault();
          return;
        }
        var open = card.classList.contains('flipped');
        setPrincipleFlip(card, !open);
      });
    });
  }
  cards.forEach(function (card) {
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('flipped');
      }
    });
  });

  /* ═══ Модуль 11 — Accordion Slider ═══
     Наведение, клик и клавиатура используют один и тот же
     механизм: в каждый момент раскрыта только одна панель. */
  var accordion = document.getElementById('accordion');
  var accordionPanels = Array.from(document.querySelectorAll('.acc-panel'));
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function activateAccordionPanel(panel, instant) {
    if (instant && accordion) accordion.classList.add('is-instant');

    accordionPanels.forEach(function (item) {
      var isActive = item === panel;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });

    if (instant && accordion) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { accordion.classList.remove('is-instant'); });
      });
    }
  }

  accordionPanels.forEach(function (panel) {
    panel.setAttribute('role', 'button');
    panel.setAttribute('tabindex', '0');
    panel.setAttribute('aria-expanded', panel.classList.contains('active') ? 'true' : 'false');

    panel.addEventListener('mouseenter', function () {
      if (finePointer.matches) activateAccordionPanel(panel, false);
    });
    panel.addEventListener('click', function () {
      activateAccordionPanel(panel, false);
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateAccordionPanel(panel, true);
      }
    });
  });

  /* ═══ Cursor Grid для истории компании ═══
     Механика React Bits: курсор подсвечивает ячейки в радиусе,
     след мягко гаснет, а клик запускает расходящуюся волну. */
  function mountCompanyCursorGrid(container) {
    var canvas = container.querySelector('.company-cursor-grid');
    var fineCursor = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (!canvas || !fineCursor || reduced) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var accent = getComputedStyle(document.documentElement).getPropertyValue('--bright').trim() || '#FF4B00';
    var normalized = accent.replace('#', '');
    var colorValue = parseInt(normalized.length === 3 ? normalized.split('').map(function (part) {
      return part + part;
    }).join('') : normalized.slice(0, 6), 16);
    var color = Number.isNaN(colorValue) ? [255, 75, 0] : [
      (colorValue >> 16) & 255,
      (colorValue >> 8) & 255,
      colorValue & 255
    ];
    var settings = {
      cellSize: 62,
      radius: 155,
      holdTime: 140,
      fadeDuration: 720,
      lineWidth: .9,
      maxOpacity: .62,
      fillOpacity: .045,
      gridOpacity: .025,
      pulseSpeed: 520
    };
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cols = 0;
    var rows = 0;
    var offsetX = 0;
    var offsetY = 0;
    var width = 0;
    var height = 0;
    var alphas = new Float32Array(0);
    var touched = new Float64Array(0);
    var pulses = [];
    var frame = 0;
    var running = false;
    var lastFrame = 0;

    function rebuildCompanyGrid() {
      width = container.offsetWidth;
      height = container.offsetHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / settings.cellSize) + 1;
      rows = Math.ceil(height / settings.cellSize) + 1;
      offsetX = (width - cols * settings.cellSize) / 2;
      offsetY = (height - rows * settings.cellSize) / 2;
      alphas = new Float32Array(cols * rows);
      touched = new Float64Array(cols * rows);
      wakeCompanyGrid();
    }

    function companyCellCenter(index) {
      return [
        offsetX + (index % cols) * settings.cellSize + settings.cellSize / 2,
        offsetY + Math.floor(index / cols) * settings.cellSize + settings.cellSize / 2
      ];
    }

    function energizeCompanyGrid(x, y, boost) {
      var radius = settings.radius;
      var now = performance.now();
      var minCol = Math.max(0, Math.floor((x - radius - offsetX) / settings.cellSize));
      var maxCol = Math.min(cols - 1, Math.floor((x + radius - offsetX) / settings.cellSize));
      var minRow = Math.max(0, Math.floor((y - radius - offsetY) / settings.cellSize));
      var maxRow = Math.min(rows - 1, Math.floor((y + radius - offsetY) / settings.cellSize));

      for (var row = minRow; row <= maxRow; row++) {
        for (var col = minCol; col <= maxCol; col++) {
          var index = row * cols + col;
          var center = companyCellCenter(index);
          var distance = Math.hypot(center[0] - x, center[1] - y);
          if (distance > radius) continue;

          var proximity = 1 - distance / radius;
          var smoothFalloff = proximity * proximity * (3 - 2 * proximity);
          var level = smoothFalloff * settings.maxOpacity * (boost || 1);
          if (level > alphas[index]) alphas[index] = level;
          if (level > 0) touched[index] = now;
        }
      }
    }

    function drawCompanyGrid(now) {
      var delta = Math.min(now - lastFrame, 50);
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);

      if (settings.gridOpacity > 0) {
        ctx.strokeStyle = 'rgba(' + color.join(',') + ',' + settings.gridOpacity + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var col = 0; col <= cols; col++) {
          var lineX = Math.round(offsetX + col * settings.cellSize) + .5;
          ctx.moveTo(lineX, 0);
          ctx.lineTo(lineX, height);
        }
        for (var row = 0; row <= rows; row++) {
          var lineY = Math.round(offsetY + row * settings.cellSize) + .5;
          ctx.moveTo(0, lineY);
          ctx.lineTo(width, lineY);
        }
        ctx.stroke();
      }

      for (var pulseIndex = pulses.length - 1; pulseIndex >= 0; pulseIndex--) {
        var pulse = pulses[pulseIndex];
        var ringRadius = ((now - pulse.startedAt) / 1000) * settings.pulseSpeed;
        if (ringRadius > Math.hypot(width, height)) {
          pulses.splice(pulseIndex, 1);
          continue;
        }

        for (var cell = 0; cell < alphas.length; cell++) {
          var pulseCenter = companyCellCenter(cell);
          var pulseDistance = Math.hypot(pulseCenter[0] - pulse.x, pulseCenter[1] - pulse.y);
          if (Math.abs(pulseDistance - ringRadius) < settings.cellSize * .46) {
            alphas[cell] = Math.max(alphas[cell], settings.maxOpacity * .82);
            touched[cell] = now;
          }
        }
      }

      var anyVisible = pulses.length > 0;
      var fadeStep = delta / Math.max(settings.fadeDuration, 16);
      var half = settings.cellSize / 2;

      for (var index = 0; index < alphas.length; index++) {
        var alpha = alphas[index];
        if (alpha <= 0) continue;
        if (now - touched[index] > settings.holdTime) {
          alpha = Math.max(0, alpha - fadeStep);
          alphas[index] = alpha;
          if (alpha <= 0) continue;
        }

        anyVisible = true;
        var center = companyCellCenter(index);
        var gradient = ctx.createRadialGradient(center[0], center[1], 0, center[0], center[1], settings.cellSize * .82);
        gradient.addColorStop(0, 'rgba(' + color.join(',') + ',' + alpha + ')');
        gradient.addColorStop(1, 'rgba(' + color.join(',') + ',0)');
        var cellX = center[0] - half + .5;
        var cellY = center[1] - half + .5;
        var cellSize = settings.cellSize - 1;

        ctx.beginPath();
        ctx.rect(cellX, cellY, cellSize, cellSize);
        ctx.fillStyle = 'rgba(' + color.join(',') + ',' + (alpha * settings.fillOpacity) + ')';
        ctx.fill();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = settings.lineWidth;
        ctx.stroke();
      }

      if (anyVisible) frame = requestAnimationFrame(drawCompanyGrid);
      else running = false;
    }

    function wakeCompanyGrid() {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      frame = requestAnimationFrame(drawCompanyGrid);
    }

    function localCompanyPointer(event) {
      var rect = container.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    }

    container.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;
      var point = localCompanyPointer(event);
      energizeCompanyGrid(point[0], point[1], 1);
      wakeCompanyGrid();
    });
    container.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      var point = localCompanyPointer(event);
      pulses.push({ x: point[0], y: point[1], startedAt: performance.now() });
      wakeCompanyGrid();
    });

    var companyGridObserver = new ResizeObserver(rebuildCompanyGrid);
    companyGridObserver.observe(container);
    rebuildCompanyGrid();
  }

  var companyStoryMain = document.querySelector('[data-company-cursor-grid]');
  if (companyStoryMain) mountCompanyCursorGrid(companyStoryMain);

  /* ═══ Интерактивная история КОД ТЕХ ═══
     Один компонент управляет активным этапом, счётчиком и прогрессом.
     Клавиатурное переключение остаётся мгновенным; мышь и клик получают
     короткую прерываемую анимацию только transform/opacity. */
  var companySystem = document.querySelector('[data-company-system]');
  if (companySystem) {
    var companySteps = Array.from(companySystem.querySelectorAll('[data-company-step]'));
    var companyStepScroller = companySystem.querySelector('.company-system__steps');
    var companyStepCounter = document.getElementById('companyStepCounter');
    var companyMeter = companySystem.querySelector('.company-system__meter span');
    var companyDidSwipe = false;

    function activateCompanyStep(index, animateDisplay, skipScroll) {
      index = Math.max(0, Math.min(companySteps.length - 1, index));
      var activeStep = companySteps[index];
      if (!animateDisplay) companySystem.classList.add('is-keyboard-nav');

      companySteps.forEach(function (step, stepIndex) {
        var isActive = stepIndex === index;
        step.classList.toggle('active', isActive);
        step.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (isActive) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });

      companyStepCounter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(companySteps.length).padStart(2, '0');
      companyMeter.style.transform = 'scaleX(' + ((index + .5) / companySteps.length) + ')';

      if (!skipScroll && companyStepScroller.scrollWidth > companyStepScroller.clientWidth) {
        var centeredLeft = activeStep.offsetLeft - (companyStepScroller.clientWidth - activeStep.offsetWidth) / 2;
        companyStepScroller.scrollTo({
          left: Math.max(0, centeredLeft),
          behavior: animateDisplay && !reduced ? 'smooth' : 'auto'
        });
      }

      if (!animateDisplay) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            companySystem.classList.remove('is-keyboard-nav');
          });
        });
      }
    }

    companySteps.forEach(function (step, index) {
      step.addEventListener('click', function (event) {
        if (companyDidSwipe) {
          event.preventDefault();
          companyDidSwipe = false;
          return;
        }
        activateCompanyStep(index, true);
      });
      step.addEventListener('keydown', function (event) {
        var nextIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % companySteps.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + companySteps.length) % companySteps.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = companySteps.length - 1;
        else return;

        event.preventDefault();
        companySteps[nextIndex].focus();
        activateCompanyStep(nextIndex, false);
      });
    });

    activateCompanyStep(0, false);

    /* На узком экране активный этап следует за нативным свайпом.
       Обратный scrollTo здесь отключён, чтобы snap и JS не боролись за один кадр. */
    var companyScrollFrame = 0;
    companyStepScroller.addEventListener('scroll', function () {
      if (companyScrollFrame || companyStepScroller.scrollWidth <= companyStepScroller.clientWidth + 1) return;
      companyScrollFrame = requestAnimationFrame(function () {
        companyScrollFrame = 0;
        var viewportCenter = companyStepScroller.scrollLeft + companyStepScroller.clientWidth / 2;
        var nearest = 0;
        var nearestDistance = Infinity;
        companySteps.forEach(function (step, index) {
          var distance = Math.abs(step.offsetLeft + step.offsetWidth / 2 - viewportCenter);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = index;
          }
        });
        if (!companySteps[nearest].classList.contains('active')) activateCompanyStep(nearest, true, true);
      });
    }, { passive: true });

    /* Touch-аналог hover + переключение этапов горизонтальным свайпом. */
    if (!reduced && !companySystem.hasAttribute('data-magic-bento')) {
      var companyTouchStart = null;
      var companyTouchGlowTimer = 0;

      companyStepScroller.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        var touchedStep = event.target.closest('[data-company-step]');
        if (!touchedStep) return;
        var stepRect = touchedStep.getBoundingClientRect();
        companyTouchStart = {
          x: event.clientX,
          time: performance.now(),
          index: companySteps.indexOf(touchedStep)
        };
        companyDidSwipe = false;
        clearTimeout(companyTouchGlowTimer);
        companySteps.forEach(function (step) {
          step.classList.remove('is-touch-glow');
          step.style.setProperty('--glow-intensity', '0');
        });
        touchedStep.style.setProperty('--glow-x', ((event.clientX - stepRect.left) / stepRect.width * 100) + '%');
        touchedStep.style.setProperty('--glow-y', ((event.clientY - stepRect.top) / stepRect.height * 100) + '%');
        touchedStep.style.setProperty('--glow-intensity', '1');
        touchedStep.classList.add('is-touch-glow');
      }, { passive: true });

      companyStepScroller.addEventListener('pointermove', function (event) {
        if (!companyTouchStart) return;
        if (Math.abs(event.clientX - companyTouchStart.x) > 10) companyDidSwipe = true;
      }, { passive: true });

      function finishCompanySwipe(event) {
        if (!companyTouchStart) return;
        var dx = event.clientX - companyTouchStart.x;
        var elapsed = Math.max(1, performance.now() - companyTouchStart.time);
        var velocity = Math.abs(dx) / elapsed;
        if (Math.abs(dx) > 42 || velocity > .18) {
          var direction = dx < 0 ? 1 : -1;
          activateCompanyStep(companyTouchStart.index + direction, true);
          companyDidSwipe = true;
        }
        companyTouchStart = null;
        companyTouchGlowTimer = setTimeout(function () {
          companySteps.forEach(function (step) {
            step.classList.remove('is-touch-glow');
            step.style.setProperty('--glow-intensity', '0');
          });
        }, 420);
      }

      companyStepScroller.addEventListener('pointerup', finishCompanySwipe, { passive: true });
      companyStepScroller.addEventListener('pointercancel', function () {
        companyTouchStart = null;
      }, { passive: true });
    }

    if (finePointer.matches && !reduced && window.innerWidth > 768 && !companySystem.hasAttribute('data-magic-bento')) {
      var companySpotlight = document.createElement('div');
      companySpotlight.className = 'company-path-spotlight';
      document.body.appendChild(companySpotlight);
      var companyGlowRadius = 400;
      var companyGlowProximity = companyGlowRadius * .5;
      var companyGlowFade = companyGlowRadius * .75;

      function dimCompanyPath() {
        companySpotlight.style.opacity = '0';
        companySteps.forEach(function (step) {
          step.style.setProperty('--glow-intensity', '0');
        });
      }

      document.addEventListener('mousemove', function (event) {
        var pathRect = companyStepScroller.getBoundingClientRect();
        var insidePath = event.clientX >= pathRect.left && event.clientX <= pathRect.right &&
          event.clientY >= pathRect.top && event.clientY <= pathRect.bottom;

        if (!insidePath) {
          dimCompanyPath();
          return;
        }

        var minDistance = Infinity;
        companySteps.forEach(function (step) {
          var stepRect = step.getBoundingClientRect();
          var distance = Math.hypot(
            event.clientX - (stepRect.left + stepRect.width / 2),
            event.clientY - (stepRect.top + stepRect.height / 2)
          ) - Math.max(stepRect.width, stepRect.height) / 2;
          distance = Math.max(0, distance);
          minDistance = Math.min(minDistance, distance);

          var intensity = 0;
          if (distance <= companyGlowProximity) intensity = 1;
          else if (distance <= companyGlowFade) {
            intensity = (companyGlowFade - distance) / (companyGlowFade - companyGlowProximity);
          }

          step.style.setProperty('--glow-x', ((event.clientX - stepRect.left) / stepRect.width * 100) + '%');
          step.style.setProperty('--glow-y', ((event.clientY - stepRect.top) / stepRect.height * 100) + '%');
          step.style.setProperty('--glow-intensity', String(intensity));
        });

        companySpotlight.style.left = event.clientX + 'px';
        companySpotlight.style.top = event.clientY + 'px';
        companySpotlight.style.opacity = minDistance <= companyGlowFade ? '.72' : '0';
      });

      document.addEventListener('mouseleave', dimCompanyPath);
    }
  }

  /* Сетка вакансий и переход к форме с выбранной позицией —
     в bento.js (модуль Magic Bento).                          */

  /* ═══ Система роста: Scroll Stack по механике React Bits ═══
     Sticky закрепляет карточки, а rAF связывает их масштаб со
     скроллом. Расчёт не зависит от начального hash/положения страницы. */
  var growthCards = Array.from(document.querySelectorAll('.growth-card'));
  var growthStack = document.querySelector('.growth-stack');

  if (growthStack && growthCards.length > 1) {
    var growthFrame = 0;
    var growthNaturalTops = [];
    var growthStickyTops = [];

    function clampGrowth(value) {
      return Math.max(0, Math.min(1, value));
    }

    function syncGrowthStack() {
      growthFrame = 0;

      if (reduced) {
        growthCards.forEach(function (card) {
          card.style.transform = '';
          card.style.willChange = '';
        });
        return;
      }

      var scrollTop = window.scrollY;
      var viewportHeight = window.innerHeight;

      growthCards.forEach(function (card, index) {
        var nextTop = growthNaturalTops[index + 1];

        if (typeof nextTop !== 'number') {
          card.style.transform = 'translateZ(0) scale(1)';
          card.style.willChange = 'transform';
          return;
        }

        var animationStart = nextTop - viewportHeight * .92;
        var animationEnd = nextTop - growthStickyTops[index + 1];
        var progress = clampGrowth(
          (scrollTop - animationStart) /
          Math.max(1, animationEnd - animationStart)
        );
        var mobileStack = window.innerWidth <= 860;
        var targetScale = (mobileStack ? .94 : .88) + index * (mobileStack ? .009 : .018);
        var scale = 1 - progress * (1 - targetScale);

        card.style.transform = 'translateZ(0) scale(' + scale.toFixed(4) + ')';
        card.style.willChange = 'transform';
      });
    }

    function measureGrowthStack() {
      var stackTop = growthStack.getBoundingClientRect().top + window.scrollY;

      growthNaturalTops = growthCards.map(function (card) {
        return stackTop + card.offsetTop;
      });
      growthStickyTops = growthCards.map(function (card) {
        return parseFloat(window.getComputedStyle(card).top) || 0;
      });
      syncGrowthStack();
    }

    function requestGrowthSync() {
      if (!growthFrame) growthFrame = window.requestAnimationFrame(syncGrowthStack);
    }

    measureGrowthStack();
    window.addEventListener('scroll', requestGrowthSync, { passive: true });
    window.addEventListener('resize', measureGrowthStack);
    window.addEventListener('load', measureGrowthStack, { once: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureGrowthStack);
    }
  }

  /* ═══ Формы специалиста и заказчика ═══ */
  var formTabs = Array.from(document.querySelectorAll('[data-form-tab]'));
  var formPanels = Array.from(document.querySelectorAll('.form-panel'));

  function showFormPanel(panelId, focusTab) {
    formTabs.forEach(function (tab) {
      var active = tab.dataset.formTab === panelId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    });
    formPanels.forEach(function (panel) {
      panel.hidden = panel.id !== panelId;
    });
  }

  formTabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { showFormPanel(tab.dataset.formTab, false); });
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var direction = event.key === 'ArrowRight' ? 1 : -1;
      var next = (index + direction + formTabs.length) % formTabs.length;
      showFormPanel(formTabs[next].dataset.formTab, true);
    });
  });

  document.querySelectorAll('.bento-card').forEach(function (card) {
    card.addEventListener('click', function () { showFormPanel('candidatePanel', false); });
  });

  function setupForm(options) {
    var form = document.getElementById(options.formId);
    var status = document.getElementById(options.statusId);
    if (!form || !status) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.className = 'form-status';

      var bad = false;
      options.required.forEach(function (id) {
        var element = document.getElementById(id);
        if (!element) return;
        var empty = element.type === 'checkbox' ? !element.checked : !element.value.trim();
        element.classList.toggle('err', empty);
        if (empty) bad = true;
      });

      if (bad) {
        status.textContent = options.validationMessage;
        status.classList.add('warn');
        return;
      }

      if (!options.endpoint) {
        status.textContent = 'Форма готова, но отправка пока не подключена. Укажите адрес обработчика в main.js.';
        status.classList.add('warn');
        return;
      }

      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      status.textContent = 'Отправляем…';

      fetch(options.endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (response) {
          if (!response.ok) throw new Error(response.status);
          form.reset();
          status.textContent = options.successMessage;
          status.classList.add('ok');
        })
        .catch(function () {
          status.textContent = 'Не отправилось. Напишите нам в Telegram или на почту.';
          status.classList.add('warn');
        })
        .finally(function () { button.disabled = false; });
    });
  }

  setupForm({
    formId: 'applyForm',
    statusId: 'formStatus',
    required: ['f-name', 'f-contact', 'f-consent'],
    endpoint: FORM_ENDPOINT,
    validationMessage: 'Заполните имя и контакт, затем подтвердите согласие.',
    successMessage: 'Отклик отправлен.'
  });

  setupForm({
    formId: 'projectForm',
    statusId: 'projectFormStatus',
    required: ['p-name', 'p-contact', 'p-msg', 'p-consent'],
    endpoint: PROJECT_FORM_ENDPOINT,
    validationMessage: 'Заполните имя, контакт и задачу, затем подтвердите согласие.',
    successMessage: 'Заявка отправлена.'
  });

  /* Юридические документы открываются в нативном dialog:
     фокус не уходит под модальное окно, Escape работает без отдельного кода. */
  document.querySelectorAll('[data-legal-open]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var dialog = document.getElementById(button.dataset.legalOpen);
      if (dialog && dialog.showModal) dialog.showModal();
    });
  });
  document.querySelectorAll('.legal-dialog').forEach(function (dialog) {
    var close = dialog.querySelector('[data-legal-close]');
    if (close) close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  /* ═══ Появление секций ═══ */
  if (hasGsap && window.ScrollTrigger) {
    gsap.utils.toArray('.sec-head, .form-block').forEach(function (el) {
      gsap.from(el, {
        opacity: 0, y: 26, duration: .8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });
  }
})();
