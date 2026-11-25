export const DEFAULT_CONTENT = {
  hero: {
    kicker: "استوديو إبداعي مستقل",
    title: "لكل حكاية",
    subtitle: "نصمم الهويات ونبتكر التجارب ونصنع محتوى يعبّر عنك، ويمنح مشروعك مكاناً يستحقه.",
    cta: "اكتشف أعمالنا",
  },
  about: {
    title: "عن أثر",
    text: "أثر استوديو إبداعي يؤمن أن العلامة الجيدة تُحَسّ قبل أن تُقرأ. نصمم هويات بصرية هادئة وفاخرة، ونصنع محتوى وتجارب رقمية تترك انطباعاً حقيقياً لدى جمهورك.",
  },
  services: [
    { title: "الهوية البصرية", text: "نبني هويات متكاملة تعبّر عن شخصية مشروعك وتمنحه حضوراً لا يُنسى." },
    { title: "صناعة المحتوى", text: "نحوّل الأفكار والمنتجات إلى محتوى بصري يحكي قصتك بوضوح." },
    { title: "التصميم الرقمي", text: "تصاميم وتجارب رقمية تجمع بين الجمال وسهولة الاستخدام." },
    { title: "التصميم الإبداعي", text: "حلول تصميمية مرنة للحملات والمطبوعات والمواد التسويقية." },
    { title: "البصمة والهوية", text: "أسمِ بصمات الخط والتوقيع بأسلوب مميّز يعبّر عنك." },
    { title: "المنتجات", text: "عبوات وتغليف ومنتجات تحمل هويتك بتفاصيل فاخرة." },
  ],
  // ترتيب عرض الخدمات في الصفحة الرئيسية (فهارس القائمة أعلاه) وصورها الافتراضية وسعر «من»
  serviceOrder: [4, 3, 5, 0, 1, 2],
  serviceImages: ["/img/svc-identity.jpg", "/img/svc-content.jpg", "/img/svc-digital.jpg", "/img/svc-creative.jpg", "/img/svc-calligraphy.jpg", "/img/svc-products.jpg"],
  // أسعار الباقات الثلاث لكل خدمة؛ الفارغ يظهر «حسب نطاق المشروع». تُعدَّل من لوحة الإدارة.
  price: [["", "", ""], ["", "", ""], ["", "", ""], ["", "", ""], ["", "", ""], ["", "", ""]],
  works: [
    { title: "حكاية منتج", category: "عطر", image: "/works/work-1.jpg", video: "", pos: "60% 50%" },
    { title: "التفاصيل تصنع الفارق", category: "قلم وسبحة", image: "/works/work-2.jpg", video: "", pos: "45% 50%" },
    { title: "هوية مقهى", category: "هوية بصرية", image: "/works/work-3.jpg", video: "", pos: "55% 50%" },
  ],
  contact: {
    title: "لنبدأ الحديث",
    email: "atharstudio653@gmail.com",
    instagram: "@atharstudio24",
  },
  store: {
    title: "حزم «أثر» الجاهزة للنمو",
    subtitle: "نصوص تسويقية، خطط محتوى، صور وفيديوهات قصيرة مصممة بعناية لتمنح مشروعك حضوراً متكاملاً، وتصل إلى حسابك بعد تأكيد الطلب.",
  },
  footerYear: 2026,
};

export function mergeContent(remote) {
  const d = DEFAULT_CONTENT;
  if (!remote || typeof remote !== "object") return d;
  const list = (r, def) => (Array.isArray(r) && r.length ? r : def);
  return {
    hero: { ...d.hero, ...(remote.hero || {}) },
    about: { ...d.about, ...(remote.about || {}) },
    // نكمل الخدمات الافتراضية الجديدة إن كان المحتوى المحفوظ أقدم منها
    services: (() => { const r = list(remote.services, d.services); return r.length < d.services.length && r.length === 4 ? [...r, ...d.services.slice(r.length)] : r; })(),
    price: Array.isArray(remote.price) && remote.price.length >= 4 ? [...remote.price, ...d.price.slice(remote.price.length)] : d.price,
    // العناوين والتصنيفات من الإدارة، أما الصور والفيديو والموضع فمن الكود حتى لا يخفيها محتوى قديم محفوظ
    works: Array.isArray(remote.works) && remote.works.length
      ? d.works.map((w, i) => ({ ...w, title: remote.works[i]?.title || w.title, category: remote.works[i]?.category || w.category }))
      : d.works,
    contact: { ...d.contact, ...(remote.contact || {}) },
    store: { ...d.store, ...(remote.store || {}) },
    footerYear: remote.footerYear || d.footerYear,
  };
}
