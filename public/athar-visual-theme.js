/* ATHAR VISUAL CONNECTOR — عمليات بصرية فقط (كلاسات وصور وخلفيات).
   لا يعدّل منطق التطبيق ولا الأحداث ولا الروابط. العناصر غير الموجودة تُتجاهل. */
(function () {
  "use strict";
  var config = window.ATHAR_VISUAL_CONFIG;
  if (!config || config.enabled !== true) return;
  var A = config.assets || {};

  // محددات العناصر الفعلية في الصفحة الرئيسية (src/Site.jsx)
  var SELECTORS = {
    home: ".hm",
    background: ".hm",
    hero: ".hm-hero",
    heroImage: ".hm-hero .hm-slide:first-of-type",
    heroOverlay: ".hm-hero .hm-shade",
    heroVideoContainer: "",
    logo: "",
    sectionHeadings: ".hm-h",
    studioCards: ".hm-studio",
    portfolio: ".works .work",
    portfolioImages: ".works .work img",
    primaryButtons: ".hm-btn, .hm-order, .hm-pill",
    secondaryButtons: ".hm-out",
    menuIcon: "", accountIcon: "", videoIcon: "", identityIcon: "", designIcon: "", templatesIcon: "", arrowIcons: ""
  };

  function queryAll(sel) {
    if (!sel || typeof sel !== "string") return [];
    try { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
    catch (e) { console.warn("[Athar Visual] Invalid selector:", sel); return []; }
  }
  function addVisualClass(sel, cls) { queryAll(sel).forEach(function (el) { el.classList.add(cls); }); }
  function setImages(sel, path) {
    if (!path) return;
    queryAll(sel).forEach(function (el) {
      if (el instanceof HTMLImageElement && el.getAttribute("src") !== path) el.src = path;
    });
  }
  function setBackground(sel, path) {
    if (!path) return;
    queryAll(sel).forEach(function (el) {
      var v = 'url("' + path + '")';
      if (el.style.getPropertyValue("background-image") !== v) el.style.setProperty("background-image", v, "important");
    });
  }
  function setIcon(sel, path) {
    if (!path) return;
    queryAll(sel).forEach(function (el) {
      el.classList.add("athar-v-icon");
      el.style.setProperty("background-image", 'url("' + path + '")');
    });
  }
  function setHeroVideo(sel, path) {
    if (!sel || !path) return;
    queryAll(sel).forEach(function (box) {
      if (box.querySelector("[data-athar-visual-video]")) return;
      var v = document.createElement("video");
      v.dataset.atharVisualVideo = "true"; v.className = "athar-v-video-layer";
      v.setAttribute("aria-hidden", "true"); v.muted = true; v.loop = true; v.autoplay = true;
      v.setAttribute("playsinline", ""); v.preload = "metadata"; v.controls = false; v.src = path;
      box.prepend(v);
      var p = v.play(); if (p && typeof p.catch === "function") p.catch(function () {});
    });
  }
  function setPortfolioImages(sel) {
    var imgs = A.portfolio || [];
    queryAll(sel).forEach(function (el, i) {
      if (el instanceof HTMLImageElement && imgs[i] && el.getAttribute("src") !== imgs[i]) el.src = imgs[i];
    });
  }
  function setStudioImages() {
    var imgs = A.studioImages || {}, targets = A.studioTargets || {};
    Object.keys(targets).forEach(function (k) { setBackground(targets[k], imgs[k]); });
  }

  function applyVisualTheme() {
    var I = A.icons || {};
    addVisualClass(SELECTORS.home, "athar-v-home");
    addVisualClass(SELECTORS.background, "athar-v-background");
    addVisualClass(SELECTORS.hero, "athar-v-hero");
    addVisualClass(SELECTORS.heroOverlay, "athar-v-hero-overlay");
    addVisualClass(SELECTORS.sectionHeadings, "athar-v-section-heading");
    addVisualClass(SELECTORS.studioCards, "athar-v-card");
    addVisualClass(SELECTORS.portfolio, "athar-v-portfolio");
    addVisualClass(SELECTORS.primaryButtons, "athar-v-primary");
    addVisualClass(SELECTORS.secondaryButtons, "athar-v-secondary");
    setBackground(SELECTORS.heroImage, A.heroImage);
    setImages(SELECTORS.logo, A.logo);
    setStudioImages();
    setPortfolioImages(SELECTORS.portfolioImages);
    setIcon(SELECTORS.menuIcon, I.menu); setIcon(SELECTORS.accountIcon, I.account);
    setIcon(SELECTORS.videoIcon, I.video); setIcon(SELECTORS.identityIcon, I.identity);
    setIcon(SELECTORS.designIcon, I.design); setIcon(SELECTORS.templatesIcon, I.templates);
    setIcon(SELECTORS.arrowIcons, I.arrow);
    setHeroVideo(SELECTORS.heroVideoContainer, A.heroVideo);
  }

  // الصفحة تُرسم بعد التحميل (React) ويصل المحتوى لاحقاً، لذا نعيد التطبيق عند ظهور عناصر جديدة.
  // العملية بصرية فقط ولا تراقب الخصائص، فلا تتكرر ذاتياً.
  var queued = false;
  function schedule() {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; try { applyVisualTheme(); } catch (e) { console.warn("[Athar Visual]", e); } });
  }
  function start() {
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
