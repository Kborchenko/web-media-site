/* ═══════════════════════════════════════════════════════════
   Matrix Text — посимвольная «расшифровка» заголовков.

   Порт компонента Matrix Text (@dorianbaffier, kokonutui.com,
   MIT) с React + Motion на чистый JS.

   Что изменено против оригинала и почему:
   · Цвет вспышки — оранжевый вместо зелёного #00ff00.
   · Убрана моноширинность и фиксированная ширина 1ch: настоящая
     буква остаётся в потоке и прячется через visibility, цифра
     рисуется поверх неё абсолютом. Ширина не меняется, шрифт и
     трекинг заголовка сохраняются.
   · Запуск не при загрузке, а когда заголовок попадает в кадр,
     и ровно один раз.
   · Текст в разметке не подменяется — поиск и скринридеры видят
     исходный заголовок.

   Использование:
     MatrixText.init('.sec-title, h1', { letterInterval: 45 });
   ═══════════════════════════════════════════════════════════ */

window.MatrixText = (function () {
  'use strict';

  var DEFAULTS = {
    initialDelay: 80,           // пауза перед стартом, мс
    letterAnimationDuration: 380, // сколько держится цифра, мс
    letterInterval: 45,         // задержка между буквами, мс
    chars: '01',                // из чего набирается «шум»
    // порог по доле площади не годится: заголовок бывает выше экрана.
    // вместо него — полоса внутри окна, которую заголовок должен пересечь
    rootMargin: '-8% 0px -18% 0px'
  };

  /* Разбор заголовка на символы.
     Слова заворачиваются целиком, чтобы перенос по строкам
     работал как обычно и слова не рвались посередине. */
  function split(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.trim()) nodes.push(n);
    }

    var cells = [];

    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      // делим на слова, разделители сохраняем как обычный текст
      var parts = node.nodeValue.split(/(\s+)/);

      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }

        var word = document.createElement('span');
        word.className = 'mtx-w';

        part.split('').forEach(function (ch) {
          var cell = document.createElement('span');
          cell.className = 'mtx-c';

          var real = document.createElement('span');
          real.className = 'mtx-r';
          real.textContent = ch;

          var fake = document.createElement('span');
          fake.className = 'mtx-f';
          fake.setAttribute('aria-hidden', 'true');

          cell.appendChild(real);
          cell.appendChild(fake);
          word.appendChild(cell);
          cells.push(cell);
        });

        frag.appendChild(word);
      });

      node.parentNode.replaceChild(frag, node);
    });

    return cells;
  }

  /* Цифра уже кириллической буквы, поэтому в её боксе остаётся
     воздух — на крупном заголовке это выглядит как дыры в строке.
     Растягиваем цифру по ширине конкретной буквы. Отношение не
     зависит от кегля: при ресайзе обе величины меняются одинаково. */
  function fit(el, cells) {
    var probe = document.createElement('span');
    probe.className = 'mtx-probe';
    probe.textContent = '0';
    el.appendChild(probe);
    var dw = probe.getBoundingClientRect().width;
    el.removeChild(probe);
    if (!dw) return;

    cells.forEach(function (cell) {
      var cw = cell.getBoundingClientRect().width;
      if (cw > 0) cell.style.setProperty('--sx', (cw / dw).toFixed(3));
    });
  }

  function run(cells, p) {
    var timers = [];

    cells.forEach(function (cell, i) {
      var start = p.initialDelay + i * p.letterInterval;

      timers.push(setTimeout(function () {
        var fake = cell.querySelector('.mtx-f');
        fake.textContent = p.chars.charAt(Math.floor(Math.random() * p.chars.length));
        cell.classList.add('on');

        timers.push(setTimeout(function () {
          cell.classList.remove('on');
          fake.textContent = ''; // не оставляем цифру в разметке
        }, p.letterAnimationDuration));
      }, start));
    });

    return timers;
  }

  function init(selector, options) {
    var p = {};
    var k;
    for (k in DEFAULTS) p[k] = DEFAULTS[k];
    for (k in (options || {})) p[k] = options[k];

    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!els.length) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function prepare() {
      els.forEach(function (el) {
        if (el.dataset.mtx) return;
        el.dataset.mtx = '1';

        // исходный текст остаётся доступным для скринридеров
        if (!el.getAttribute('aria-label')) {
          el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
        }

        var cells = split(el);
        if (!cells.length) return;
        fit(el, cells);

        if (reduced) return; // текст уже на месте, анимацию пропускаем

        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          run(cells, p);
        }, { threshold: 0, rootMargin: p.rootMargin });

        io.observe(el);
      });
    }

    // ждём шрифты: до их загрузки заголовок меряется другим шрифтом
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(prepare);
    } else {
      prepare();
    }
  }

  return { init: init };
})();
