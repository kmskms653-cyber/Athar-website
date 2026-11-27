import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// أقسام مخفية تُفعَّل من لوحة الإدارة (الوثيقة العامة site/features). الافتراضي: مخفية.
export const FEATURE_DEFAULTS = { qr: false, bizAds: false, bizProducts: false, bizMenu: false, wm: true };

// خدمات المعاينة التي يمكن التحكم بعلامتها المائية على حدة (المفتاح المخزَّن: wm_<key>)
export const WM_SERVICES = [
  ["cards", "صانع البطاقات (إهداء، شكر، تهنئة، دعوة، اقتباس)"],
  ["digitalCard", "البطاقة الرقمية المخصصة"],
  ["signature", "صانع التوقيع"],
  ["personal", "صانع الهوية الشخصية"],
  ["corporate", "صانع هوية الشركات"],
  ["creative", "استوديو الهوية والبصمة"],
  ["cartoon", "الشخصية الكرتونية"],
  ["studio", "قوالب المنشورات"],
  ["qr", "رموز QR"],
  ["bizAds", "قوالب الإعلانات والمنشورات التجارية"],
  ["bizProducts", "قوالب العطور والمنتجات"],
  ["bizMenu", "قوائم الطعام والأسعار"],
];

export function wmKey(hash) {
  if (hash === "#studio") return "studio";
  if (hash === "#cartoon") return "cartoon";
  if (hash === "#creative-signature") return "signature";
  if (hash === "#creative-personal") return "personal";
  if (hash === "#creative-corporate") return "corporate";
  if (hash === "#digital-card" || hash === "#cards-custom") return "digitalCard";
  if (/^#cards(-[a-z]+)?$/.test(hash)) return "cards";
  if (/^#creative(-mark)?$/.test(hash)) return "creative";
  const b = /^#biz-(ads|products|menu)$/.exec(hash);
  if (b) return { ads: "bizAds", products: "bizProducts", menu: "bizMenu" }[b[1]];
  if (/^#qr/.test(hash)) return "qr";
  return "";
}

export function useFeatures() {
  const [f, setF] = useState(FEATURE_DEFAULTS);
  useEffect(() => onSnapshot(
    doc(db, "site", "features"),
    (snap) => setF({ ...FEATURE_DEFAULTS, ...(snap.exists() ? snap.data() : {}) }),
    () => setF(FEATURE_DEFAULTS)
  ), []);
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => {
      const k = wmKey(window.location.hash);
      const off = f.wm === false || (k && f["wm_" + k] === false);
      if (off) el.setAttribute("data-wm-off", "1"); else el.removeAttribute("data-wm-off");
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [f]);
  return f;
}
