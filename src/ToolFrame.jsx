import { useEffect } from "react";
import { useSession } from "./AuthContext.jsx";

const TOOLS = {
  signature: { title: "صانع التوقيع — 15 أسلوباً", src: "/tools/signature.html" },
  personal: { title: "صانع الهوية والشعار — شخصي", src: "/tools/identity.html?entity=personal" },
  corporate: { title: "صانع الهوية والشعار — شركات", src: "/tools/identity.html?entity=corporate" },
  card: { title: "صانع البطاقة الرقمية", src: "/tools/digital-card.html" },
};

export default function ToolFrame({ tool }) {
  const { requireAuth } = useSession();
  const t = TOOLS[tool];
  useEffect(() => {
    window.__atharRequireAuth = requireAuth;
    return () => { if (window.__atharRequireAuth === requireAuth) delete window.__atharRequireAuth; };
  }, [requireAuth]);
  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#121110" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", background: "#1C1A19", borderBottom: "1px solid #3a3530", color: "#F4EFE6", fontFamily: "Cairo, sans-serif" }}>
        <a href="#" style={{ color: "#B88928", textDecoration: "none", fontWeight: 700 }}>← الرئيسية</a>
        <strong style={{ fontSize: 15 }}>{t.title}</strong>
        <span style={{ marginInlineStart: "auto", fontSize: 12, opacity: 0.7 }}>التصفح مجاني، والتنزيل يتطلب تسجيل الدخول</span>
      </div>
      <iframe key={tool} title={t.title} src={t.src} style={{ flex: 1, border: 0, width: "100%" }} />
    </div>
  );
}
