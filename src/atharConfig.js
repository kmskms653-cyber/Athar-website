// إعدادات منصة أثر المركزية — لا تُخزَّن أي صلاحية في localStorage؛
// المدير العام يُحدَّد من هذه القائمة، والمديرون المساعدون من مجموعة admins في Firestore
// (وقواعد الأمان تتحقق من البريد الموثّق من جهة الخادم).

export const ATHAR_CONFIG = {
  brand: "أثر",
  // المدير العام (صلاحيات كاملة)
  superAdmins: ["atharstudio653@gmail.com"],
  // حد المديرين المساعدين
  maxSubAdmins: 3,
  // إصدارات الشروط والسياسات — تُحفظ مع كل موافقة
  legal: {
    termsVersion: "2026-11-25",
    privacyVersion: "2026-11-25",
    effectiveDate: "25 نوفمبر 2026",
  },
  // جسر الإيصالات والتسليم مع Google Drive (بدون ADMIN_KEY لحماية لوحة الإدارة)
  receiptBridge: {
    url: "https://script.google.com/macros/s/AKfycbxk3QBSZccmYXJnNDEmkr0uzpRrglNf4L--yPuWAfgOM8fjG7ggYY5lsgwgVArfThan/exec
",
    publicKey: "athar-upload-2026",
  },
  // مسار القوالب العامة (قراءة للزوار) — يُستخدم كنسخة احتياطية إن تعذّر Firestore
  templatesUrl: "/content/templates.json",
  // فحص الإدارة الموحّد: super أو sub فقط
  adminCheck: (role) => role === "super" || role === "sub",
  contactEmail: "atharstudio653@gmail.com",
};

export const ROLE_LABEL = {
  super: "المدير العام",
  sub: "مدير مساعد",
  user: "عميل",
  guest: "زائر",
};

export const isSuperEmail = (email) =>
  ATHAR_CONFIG.superAdmins.includes(String(email || "").toLowerCase());
