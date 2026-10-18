/* ═══════════════════════════════════════════════════════════
   Magic Rings — фоновая сцена для секции с ключевой фразой.

   Порт компонента MagicRings (reactbits.dev, react-bits,
   MIT) с React + Three.js на чистый WebGL.
   Фрагментный шейдер перенесён без изменений; Three.js убран —
   он использовался только чтобы нарисовать один полноэкранный
   квад, ради этого тянуть ~600 КБ библиотеки на сайт без
   сборки смысла нет.

   Использование:
     MagicRings.mount(document.querySelector('.rings'), { ... });
   ═══════════════════════════════════════════════════════════ */

window.MagicRings = (function () {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  /* Шейдер оригинала. CYCLE 3.45 — длительность полного прохода
     кольца от центра наружу. */
  var FRAG = [
    'precision highp float;',
    '',
    'uniform float uTime, uAttenuation, uLineThickness;',
    'uniform float uBaseRadius, uRadiusStep, uScaleRate;',
    'uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;',
    'uniform float uFadeIn, uFadeOut;',
    'uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;',
    'uniform vec2 uResolution, uMouse;',
    'uniform vec3 uColor, uColorTwo;',
    'uniform int uRingCount;',
    '',
    'const float HP = 1.5707963;',
    'const float CYCLE = 3.45;',
    '',
    'float fade(float t) {',
    '  return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);',
    '}',
    '',
    'float ring(vec2 p, float ri, float cut, float t0, float px) {',
    '  float t = mod(uTime + t0, CYCLE);',
    '  float r = ri + t / CYCLE * uScaleRate;',
    '  float d = abs(length(p) - r);',
    '  float a = atan(abs(p.y), abs(p.x)) / HP;',
    '  float th = max(1.0 - a, 0.5) * px * uLineThickness;',
    '  float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;',
    '  d += pow(cut * a, 3.0) * r;',
    '  return h * exp(-uAttenuation * d) * fade(t);',
    '}',
    '',
    'void main() {',
    '  float px = 1.0 / min(uResolution.x, uResolution.y);',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;',
    '  float cr = cos(uRotation), sr = sin(uRotation);',
    '  p = mat2(cr, -sr, sr, cr) * p;',
    '  p -= uMouse * uMouseInfluence;',
    '  float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;',
    '  p /= sc;',
    '  vec3 c = vec3(0.0);',
    '  float rcf = max(float(uRingCount) - 1.0, 1.0);',
    '  for (int i = 0; i < 10; i++) {',
    '    if (i >= uRingCount) break;',
    '    float fi = float(i);',
    '    vec2 pr = p - fi * uParallax * uMouse;',
    '    vec3 rc = mix(uColor, uColorTwo, fi / rcf);',
    '    c = mix(c, rc, vec3(ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px)));',
    '  }',
    '  c *= 1.0 + uBurst * 2.0;',
    '  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);',
    '  c += (n - 0.5) * uNoiseAmount;',
    '  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)) * uOpacity);',
    '}'
  ].join('\n');

  var DEFAULTS = {
    color: '#FF4B00',
    colorTwo: '#7A2A08',
    speed: 1,
    ringCount: 6,
    attenuation: 10,
    lineThickness: 2,
    baseRadius: 0.35,
    radiusStep: 0.1,
    scaleRate: 0.1,
    opacity: 1,
    noiseAmount: 0.1,
    rotation: 0,
    ringGap: 1.5,
    fadeIn: 0.7,
    fadeOut: 0.5,
    followMouse: false,
    mouseInfluence: 0.2,
    hoverScale: 1.2,
    parallax: 0.05,
    clickBurst: false
  };

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function mount(host, options) {
    if (!host) return null;

    var p = {};
    var k;
    for (k in DEFAULTS) p[k] = DEFAULTS[k];
    for (k in (options || {})) p[k] = options[k];

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false }) ||
             canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });

    // Без WebGL — не показываем пустой canvas, отдаём запасной фон на CSS
    if (!gl) {
      host.classList.add('rings-fallback');
      return null;
    }

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      host.classList.add('rings-fallback');
      return null;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      host.classList.add('rings-fallback');
      return null;
    }
    gl.useProgram(prog);

    // Полноэкранный квад из двух треугольников
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    var u = {};
    ['uTime', 'uAttenuation', 'uLineThickness', 'uBaseRadius', 'uRadiusStep', 'uScaleRate',
     'uOpacity', 'uNoiseAmount', 'uRotation', 'uRingGap', 'uFadeIn', 'uFadeOut',
     'uMouseInfluence', 'uHoverAmount', 'uHoverScale', 'uParallax', 'uBurst',
     'uResolution', 'uMouse', 'uColor', 'uColorTwo', 'uRingCount'
    ].forEach(function (name) { u[name] = gl.getUniformLocation(prog, name); });

    host.appendChild(canvas);

    var dpr = 1;
    function resize() {
      var w = host.clientWidth;
      var h = host.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    }

    var mouse = [0, 0], smooth = [0, 0];
    var hovered = false, hoverAmount = 0, burst = 0;

    function onMove(e) {
      if (!p.followMouse && !p.parallax) return;
      var r = host.getBoundingClientRect();
      mouse[0] = (e.clientX - r.left) / r.width - 0.5;
      mouse[1] = -((e.clientY - r.top) / r.height - 0.5);
    }
    function onEnter() { hovered = true; }
    function onLeave() { hovered = false; mouse[0] = 0; mouse[1] = 0; }
    function onClick() { if (p.clickBurst) burst = 1; }

    // Курсорные эффекты не имеют смысла на тач-устройствах
    var touch = window.matchMedia('(hover: none)').matches;
    if (!touch) {
      host.addEventListener('mousemove', onMove);
      host.addEventListener('mouseenter', onEnter);
      host.addEventListener('mouseleave', onLeave);
      host.addEventListener('click', onClick);
    }

    // На touch-устройствах непрерывный WebGL-рендер конкурирует с нативным
    // скроллом. Там оставляем один статичный кадр — композиция сохраняется,
    // а GPU не перерисовывает большой canvas во время каждого свайпа.
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)').matches;
    var elapsed = 0, lastT = 0, frame = 0;
    var visible = false, pageVisible = !document.hidden;

    function draw(t) {
      frame = requestAnimationFrame(draw);

      var dt = lastT === 0 ? 0 : Math.min(t - lastT, 100);
      lastT = t;
      elapsed += dt * 0.001 * p.speed;

      smooth[0] += (mouse[0] - smooth[0]) * 0.08;
      smooth[1] += (mouse[1] - smooth[1]) * 0.08;
      hoverAmount += ((hovered ? 1 : 0) - hoverAmount) * 0.08;
      burst *= 0.95;
      if (burst < 0.001) burst = 0;

      render();
    }

    function render() {
      gl.uniform1f(u.uTime, elapsed);
      gl.uniform1f(u.uAttenuation, p.attenuation);
      gl.uniform1f(u.uLineThickness, p.lineThickness);
      gl.uniform1f(u.uBaseRadius, p.baseRadius);
      gl.uniform1f(u.uRadiusStep, p.radiusStep);
      gl.uniform1f(u.uScaleRate, p.scaleRate);
      gl.uniform1f(u.uOpacity, p.opacity);
      gl.uniform1f(u.uNoiseAmount, p.noiseAmount);
      gl.uniform1f(u.uRotation, p.rotation * Math.PI / 180);
      gl.uniform1f(u.uRingGap, p.ringGap);
      gl.uniform1f(u.uFadeIn, p.fadeIn);
      gl.uniform1f(u.uFadeOut, p.fadeOut);
      gl.uniform1f(u.uMouseInfluence, p.followMouse ? p.mouseInfluence : 0);
      gl.uniform1f(u.uHoverAmount, hoverAmount);
      gl.uniform1f(u.uHoverScale, p.hoverScale);
      gl.uniform1f(u.uParallax, p.parallax);
      gl.uniform1f(u.uBurst, p.clickBurst ? burst : 0);
      gl.uniform2f(u.uMouse, smooth[0], smooth[1]);
      var c1 = hexToRgb(p.color), c2 = hexToRgb(p.colorTwo);
      gl.uniform3f(u.uColor, c1[0], c1[1], c1[2]);
      gl.uniform3f(u.uColorTwo, c2[0], c2[1], c2[2]);
      gl.uniform1i(u.uRingCount, p.ringCount);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* Рендер идёт только когда блок в кадре и вкладка активна —
       иначе видеокарта греется на фоне зря. */
    function start() {
      if (reduced) return;
      if (visible && pageVisible && frame === 0) {
        lastT = 0;
        frame = requestAnimationFrame(draw);
      }
    }
    function stop() {
      if (frame !== 0) { cancelAnimationFrame(frame); frame = 0; }
    }

    resize();
    render();

    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host);
    window.addEventListener('resize', resize);

    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0 });
    io.observe(host);

    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      pageVisible ? start() : stop();
    });

    start();

    return {
      set: function (next) { for (var key in next) p[key] = next[key]; if (reduced) render(); },
      destroy: function () {
        stop();
        io.disconnect();
        if (ro) ro.disconnect();
        window.removeEventListener('resize', resize);
        if (!touch) {
          host.removeEventListener('mousemove', onMove);
          host.removeEventListener('mouseenter', onEnter);
          host.removeEventListener('mouseleave', onLeave);
          host.removeEventListener('click', onClick);
        }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  return { mount: mount };
})();
