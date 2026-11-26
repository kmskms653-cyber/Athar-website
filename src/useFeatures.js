import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// أقسام مخفية تُفعَّل من لوحة الإدارة (الوثيقة العامة site/features). الافتراضي: مخفية.
export const FEATURE_DEFAULTS = { qr: false };

export function useFeatures() {
  const [f, setF] = useState(FEATURE_DEFAULTS);
  useEffect(() => onSnapshot(
    doc(db, "site", "features"),
    (snap) => setF({ ...FEATURE_DEFAULTS, ...(snap.exists() ? snap.data() : {}) }),
    () => setF(FEATURE_DEFAULTS)
  ), []);
  return f;
}
