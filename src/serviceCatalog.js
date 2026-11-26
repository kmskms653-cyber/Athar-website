// الخدمات المنفّذة حسب الطلب: العميل يرفع صوره ويكتب وصفه ويدفع، ثم يجهّز فريق أثر الطلب.
// الأسعار هنا يجب أن تطابق دالة servicePrice في firestore.rules.
export const SERVICES = {
  cartoon3d: {
    title: "شخصيتك الكرتونية 3D", price: 19, minPhotos: 1, maxPhotos: 3,
    intro: "ارفع صورتك ويجهّز لك فريق أثر شخصية كرتونية بأسلوب 3D.",
    placeholder: "اكتب ما تريده: ملامح مهمة، ملابس، ألوان، خلفية، أو أي تفاصيل.",
    delivery: "صورة الشخصية النهائية عالية الدقة (PNG)",
    img: "/img/svc-content.jpg", studio: 2,
  },
  adventure: {
    title: "شخصيتي في مغامرة", price: 69, minPhotos: 1, maxPhotos: 4,
    intro: "نضع شخصيتك في مشهد مغامرة مصوَّر حسب فكرتك.",
    placeholder: "صف المغامرة والمكان والأجواء التي تريدها (مثال: رحلة في الصحراء وقت الغروب).",
    delivery: "مشهد مصوَّر بدقة عالية",
    img: "/img/svc-content.jpg", studio: 2,
  },
  stickers: {
    title: "صانع الملصقات (Stickers)", price: 29, minPhotos: 1, maxPhotos: 4,
    intro: "حوّل صورتك أو فكرتك إلى مجموعة من 12 ملصقاً جاهزة للاستخدام في المحادثات.",
    placeholder: "اكتب التعبيرات أو العبارات المطلوبة على الملصقات والأسلوب الذي تفضله.",
    delivery: "12 ملصقاً بخلفية شفافة (PNG)",
    img: "/img/svc-creative.jpg", studio: 2,
  },
  productPhoto: {
    title: "مصور المنتجات الذكي", price: 35, minPhotos: 1, maxPhotos: 6,
    intro: "ارفع صور منتجك ونجهّزها بخلفية وإضاءة احترافية. السعر لكل صورة.",
    placeholder: "اكتب اسم المنتج، الخلفية المطلوبة، الألوان، وأي ملاحظات على الصور.",
    delivery: "صور منتج احترافية جاهزة للنشر",
    img: "/img/svc-products.jpg", studio: 4, perPhoto: true,
  },
  productPresentation: {
    title: "تصميم عروض المنتجات", price: 39, minPhotos: 1, maxPhotos: 6,
    intro: "عرض بصري أنيق يقدّم منتجاتك بشكل احترافي.",
    placeholder: "اكتب أسماء المنتجات وأسعارها ومزاياها، والهوية والألوان إن وجدت.",
    delivery: "عرض منتجات بصيغة صور/PDF",
    img: "/img/svc-products.jpg", studio: 4,
  },
  visualContent: {
    title: "محتوى بصري للمشاريع والمتاجر", price: 49, minPhotos: 0, maxPhotos: 6,
    intro: "تصاميم محتوى بصري لمشروعك أو متجرك لحساباتك ومنصاتك.",
    placeholder: "اكتب نشاط مشروعك، المنصات المطلوبة، الجمهور المستهدف، والأفكار التي تريدها.",
    delivery: "حزمة تصاميم محتوى بصري",
    img: "/img/svc-digital.jpg", studio: 4,
  },
  adTemplates: {
    title: "قوالب الإعلانات", price: 19, minPhotos: 0, maxPhotos: 4,
    intro: "قالب إعلاني مخصص لمنتجك أو خدمتك. السعر لكل قالب.",
    placeholder: "اكتب نص الإعلان، العرض، المقاس والمنصة المطلوبة.",
    delivery: "قالب إعلاني قابل للتعديل",
    img: "/img/svc-digital.jpg", studio: 5,
  },
  brandTemplates: {
    title: "قوالب الهوية التجارية", price: 39, minPhotos: 0, maxPhotos: 4,
    intro: "قوالب هوية تجارية (بطاقات، ترويسة، أغلفة) بحسب نشاطك.",
    placeholder: "اكتب اسم النشاط وشعاره وألوانه، والقوالب المطلوبة.",
    delivery: "قوالب هوية تجارية جاهزة",
    img: "/img/svc-digital.jpg", studio: 5,
  },
  qrSingle: {
    title: "رمز QR مخصص — كود واحد", price: 15, minPhotos: 0, maxPhotos: 1, feature: "qr",
    intro: "نجهّز لك رمز QR بتصميمك (PNG وSVG عالي الدقة). أرفق شعارك إن رغبت بوضعه في منتصف الرمز.",
    placeholder: "تفاصيل الرمز تُملأ تلقائياً من صفحة التصميم، ويمكنك إضافة ملاحظاتك.",
    delivery: "رمز QR بصيغتي PNG وSVG بدون علامة مائية",
    img: "/img/svc-digital.jpg", studio: 6,
  },
  qrTriple: {
    title: "رمز QR مخصص — باقة 3 أكواد", price: 39, minPhotos: 0, maxPhotos: 1, feature: "qr",
    intro: "ثلاثة رموز QR (مثلاً منيو وواي فاي وموقع) بنفس هويتك البصرية.",
    placeholder: "اكتب في الملاحظات محتوى الرمزين الإضافيين.",
    delivery: "3 رموز QR بصيغتي PNG وSVG بدون علامة مائية",
    img: "/img/svc-digital.jpg", studio: 6,
  },
  qrPrint: {
    title: "رمز QR + بطاقة طاولة / ستيكر", price: 49, minPhotos: 0, maxPhotos: 1, feature: "qr",
    intro: "رمز QR مع تصميم بطاقة طاولة أو ستيكر جاهز للطباعة.",
    placeholder: "اكتب في الملاحظات المقاس المطلوب وتفاصيل الطباعة.",
    delivery: "رمز QR وبطاقة/ستيكر جاهزة للطباعة (PNG وPDF)",
    img: "/img/svc-digital.jpg", studio: 6,
  },
};

export const REQUEST_STATUS = {
  pending_review: "بانتظار التحقق من الحوالة",
  preparing: "تم تأكيد الدفع — قيد التجهيز",
  completed: "جاهز — تم التسليم",
  rejected: "مرفوض — يحتاج إلى مراجعة",
};
