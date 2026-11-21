export const defaults = {
  heroLine1: 'لكل حكاية',
  heroLine2: 'أثر.',
  heroCopy: 'نصمم الهويات ونبتكر التجارب ونصنع محتوى يعبّر عنك، ويمنح مشروعك مكاناً يستحقه.',
  aboutLead: 'في أثر، نؤمن أن التصميم ليس مجرد شكل جميل؛ بل فكرة واضحة، وتفاصيل مدروسة، وتجربة تبقى في الذاكرة.',
  aboutMuted: 'نعمل مع المشاريع الطموحة لنمنحها لغة بصرية متماسكة وصوتاً يعبّر عنها بثقة. من أول فكرة، حتى آخر تفصيلة.',
  services: [
    { title: 'الهوية البصرية', desc: 'نبني هويات متكاملة تعبّر عن شخصية مشروعك وتمنحه حضوراً لا يُنسى.' },
    { title: 'صناعة المحتوى', desc: 'نحوّل الأفكار والمنتجات إلى محتوى بصري يحكي قصتك بوضوح.' },
    { title: 'التصميم الرقمي', desc: 'تصاميم وتجارب رقمية تجمع بين الجمال وسهولة الاستخدام.' },
    { title: 'التصميم الإبداعي', desc: 'حلول تصميمية مرنة للحملات والمطبوعات والمواد التسويقية.' }
  ],
  works: [
    { title: 'فنجان أثر', type: 'هوية وتصوير', img: '/works/work-1.jpg', video: '/works/work-1.mp4' },
    { title: 'عطر أثر', type: 'تغليف وتصوير', img: '/works/work-2.jpg' },
    { title: 'سبحة أثر', type: 'نقش وتصوير', img: '/works/work-3.jpg' }
  ],
  worksNote: '* أعمال تجريبية من استوديو أثر توضح تطبيق الهوية على المنتجات، وليست مشاريع عملاء.',
  contactEmail: 'atharstudio653@gmail.com',
  instagram: '@athar.studio'
};

export const mergeContent = (r = {}) => ({
  ...defaults,
  ...r,
  services: defaults.services.map((s, i) => ({ ...s, ...((r.services && r.services[i]) || {}) })),
  works: defaults.works.map((w, i) => ({ ...w, ...((r.works && r.works[i]) || {}) }))
});
