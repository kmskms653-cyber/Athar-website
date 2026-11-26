/* مساعدات مشتركة لأدوات أثر المضمّنة: بوابة الدخول + تضمين الخطوط في الملفات المصدَّرة */
(function () {
  var route = document.documentElement.getAttribute('data-route') || '';
  // خارج الموقع (فتح الملف مباشرة): نعيد التوجيه إلى صفحة الأداة داخل الموقع
  if (window.parent === window && route) { location.replace('/#' + route); return; }

  // علامة أثر المائية على مناطق المعاينة (data-wm = محددات CSS)
  var wmSel = document.documentElement.getAttribute('data-wm');
  if (wmSel) {
    var st = document.createElement('style');
    var sels = wmSel.split(',').map(function (x) { return x.trim(); });
    st.textContent = sels.map(function (x) { return x + '{position:relative}'; }).join('') +
      sels.map(function (x) { return x + '::after'; }).join(',') +
      '{content:"";position:absolute;inset:0;pointer-events:none;z-index:20;user-select:none;background:url(/img/athar-wm-tile.png) center/240px 165px repeat;opacity:.55;border-radius:inherit}' +
      '@media print{' + sels.map(function (x) { return x + '::after'; }).join(',') + '{display:none}}';
    document.documentElement.appendChild(st);
    // إيقاف العلامة من لوحة الإدارة (يضبطها الموقع الأب)
    try {
      var pd = window.parent.document.documentElement;
      var sync = function () { st.disabled = pd.hasAttribute('data-wm-off'); };
      sync();
      new MutationObserver(sync).observe(pd, { attributes: true, attributeFilter: ['data-wm-off'] });
    } catch (e) {}
  }

  window.__gated = function (label, fn) {
    return function () {
      var args = arguments, self = this;
      var g = window.parent && window.parent.__atharRequireAuth;
      if (typeof g === 'function') g(function () { fn.apply(self, args); }, { label: label });
      else fn.apply(self, args);
    };
  };

  var cssCache = null;
  function toDataUrl(blob) {
    return new Promise(function (res, rej) { var f = new FileReader(); f.onload = function () { res(f.result); }; f.onerror = rej; f.readAsDataURL(blob); });
  }
  window.__fontCss = async function () {
    if (cssCache) return cssCache;
    var link = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
    if (!link) return '';
    var css = await (await fetch(link.href)).text();
    var re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g, m, keep = [];
    while ((m = re.exec(css))) if (m[1] === 'arabic' || m[1] === 'latin') keep.push(m[2]);
    var out = [];
    for (var i = 0; i < keep.length; i++) {
      var u = keep[i].match(/url\((https:[^)]+)\)/);
      if (!u) continue;
      var blob = await (await fetch(u[1])).blob();
      out.push(keep[i].replace(u[1], await toDataUrl(blob)));
    }
    cssCache = out.join('\n');
    return cssCache;
  };
  window.__embedFonts = async function (svg) {
    try { var css = await window.__fontCss(); return css ? svg.replace(/(<svg[^>]*>)/, '$1<style>' + css + '</style>') : svg; }
    catch (e) { return svg; }
  };
  window.__pngFromSvg = function (svg, w, h, bg) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d');
        if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
        x.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('png')); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('img')); };
      img.src = url;
    });
  };
  window.__save = function (blob, name) {
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
  };
})();
