/* ATHAR VISUAL CONFIG — إعدادات المظهر فقط. للتعطيل الفوري: enabled: false
   أي مسار فارغ ("") يُتجاهل ولا يغيّر شيئاً. */
window.ATHAR_VISUAL_CONFIG = {
  enabled: true,

  assets: {
    logo: "",
    heroImage: "/assets/athar/hero.jpg",
    heroVideo: "",
    studioImages: {
      video: "/assets/athar/video.jpg",
      identity: "/assets/athar/identity.jpg",
      ads: "/assets/athar/ads.jpg",
      templates: "/assets/athar/templates.jpg"
    },
    // أي بطاقة استديو تأخذ أي صورة (بحسب رابط الاستديو في الصفحة الرئيسية)
    studioTargets: {
      identity: '.hm-studio .hm-ph[href="#studio-1"]',
      video: '.hm-studio .hm-ph[href="#studio-2"]',
      ads: '.hm-studio .hm-ph[href="#studio-4"]',
      templates: '.hm-studio .hm-ph[href="#studio-5"]'
    },
    portfolio: [
      "/assets/athar/portfolio-01.jpg",
      "/assets/athar/portfolio-02.jpg",
      "/assets/athar/portfolio-03.jpg"
    ],
    icons: { menu: "", account: "", video: "", identity: "", design: "", templates: "", arrow: "" }
  },

  colors: {
    background: "#08050F", purpleDark: "#150826", purple: "#2C104A", purpleGlow: "#6B21A8",
    gold: "#E5B35D", goldLight: "#FFE6A8", text: "#FFFFFF", textSecondary: "#EDE4FA"
  },
  typography: { arabic: "Tajawal", heading: "Aref Ruqaa", english: "Montserrat" },
  effects: { glow: true, animations: true, cardHover: true, backgroundGradient: true }
};
