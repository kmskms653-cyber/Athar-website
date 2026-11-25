// إعدادات منصة أثر المركزية
// لا تُخزَّن صلاحيات الإدارة في localStorage

export const ATHAR_CONFIG = {
  brand: "أثر",

  // المدير العام
  superAdmins: [
    "atharstudio653@gmail.com"
  ],

  // الحد الأقصى للمديرين المساعدين
  maxSubAdmins: 3,

  // إصدارات الشروط والسياسات
  legal: {
    termsVersion: "2026-11-25",
    privacyVersion: "2026-11-25",
    effectiveDate: "25 نوفمبر 2026",
  },

  // جسر الإيصالات والتسليم مع Google Drive
  receiptBridge: {
    url: "https://script.google.com/macros/s/AKfycbxk3QBSZccmYXJnNDEmkr0uzpRrglNf4L--yPuWAfgOM8fjG7ggYY5lsgwgVArfThan/exec",
    publicKey: "athar-upload-2026",
  },

  // مسار القوالب العامة
  templatesUrl: "/content/templates.json",

  // التحقق من صلاحيات الإدارة
  adminCheck: (role) =>
    role === "super" || role === "sub",

  // البريد الرسمي للمنصة
  contactEmail: "atharstudio653@gmail.com",
};

// تسميات الصلاحيات
export const ROLE_LABEL = {
  super: "المدير العام",
  sub: "مدير مساعد",
  user: "عميل",
  guest: "زائر",
};

// التحقق من البريد الإلكتروني للمدير العام
export const isSuperEmail = (email) =>
  ATHAR_CONFIG.superAdmins.includes(
    String(email || "").trim().toLowerCase()
  );