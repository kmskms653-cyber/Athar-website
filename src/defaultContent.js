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
    { title: "الهوية البصرية", text: "شعار ونظام بصري متكامل يعبّر عن روح علامتك بدقة وهدوء." },
    { title: "صناعة المحتوى", text: "محتوى مرئي ومكتوب بنبرة متسقة يخدم حضور علامتك." },
    { title: "التصميم الرقمي", text: "واجهات وصفحات هبوط ومواد رقمية بتفاصيل مدروسة." },
    { title: "قوالب السوشيال ميديا", text: "قوالب جاهزة بهويتك تختصر وقت النشر وتحافظ على الاتساق." },
  ],
  works: [
    { title: "هوية مقهى", category: "هوية بصرية", image: "/works/work-1.jpg", video: "" },
    { title: "حملة محتوى", category: "صناعة محتوى", image: "/works/work-2.jpg", video: "" },
    { title: "موقع تعريفي", category: "تصميم رقمي", image: "/works/work-3.jpg", video: "" },
  ],
  contact: {
    title: "لنبدأ الحديث",
    email: "atharstudio653@gmail.com",
    instagram: "@atharstudio24",
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
    services: list(remote.services, d.services),
    works: list(remote.works, d.works),
    contact: { ...d.contact, ...(remote.contact || {}) },
    footerYear: remote.footerYear || d.footerYear,
  };
}
