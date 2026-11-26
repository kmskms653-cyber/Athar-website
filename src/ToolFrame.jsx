import { useEffect } from "react";
import { useSession } from "./AuthContext.jsx";
import { useFeatures } from "./useFeatures.js";

const TOOLS = {
  signature: { title: "صانع التوقيع — 15 أسلوباً", src: "/tools/signature.html" },
  personal: { title: "صانع الهوية والشعار — شخصي", src: "/tools/identity.html?entity=personal" },
  corporate: { title: "صانع الهوية والشعار — شركات", src: "/tools/identity.html?entity=corporate" },
  qr: { feature: "qr", title: "QR code — تصميم رمز QR وبطاقات العرض", src: "/tools/qr.html" },
  biz: { title: "قوالب الأعمال والتجارة", src: "/tools/biz.html" },
  card: { title: "صانع البطاقة الرقمية", src: "/tools/digital-card.html" },
};

const BIZ_FEATURE = { ads: "bizAds", products: "bizProducts", menu: "bizMenu" };

export default function ToolFrame({ tool, type = "" }) {
  const { requireAuth, isAdmin } = useSession();
  const features = useFeatures();
  const t = TOOLS[tool];
  useEffect(() => {
    window.__atharRequireAuth = requireAuth;
    return () => { if (window.__atharRequireAuth === requireAuth) delete window.__atharRequireAuth; };
  }, [requireAuth]);
  const feat = tool === "biz" ? BIZ_FEATURE[type] : t.feature;
  if (feat && !features[feat] && !isAdmin) return <div className="fatal"><p>هذا القسم غير متاح حالياً.</p><a className="back" href="#/">← الموقع</a></div>;
  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#121110" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", background: "#1C1A19", borderBottom: "1px solid #3a3530", color: "#F4EFE6", fontFamily: "Cairo, sans-serif" }}>
        <a href="#" style={{ color: "#B88928", textDecoration: "none", fontWeight: 700 }}>← الرئيسية</a>
        <strong style={{ fontSize: 15 }}>{t.title}</strong>
        <span style={{ marginInlineStart: "auto", fontSize: 12, opacity: 0.7 }}>التصفح مجاني، والتنزيل يتطلب تسجيل الدخول</span>
      </div>
      <iframe key={tool} title={t.title} src={type ? `${t.src}?${tool === "biz" ? "kind" : "type"}=${type}` : t.src} style={{ flex: 1, border: 0, width: "100%" }} />
    </div>
  );
}
