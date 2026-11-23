import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// رقم الطلب ثابت (uid_bundleId) ليعتمد عليه قفل التسليم في firestore.rules
export async function createOrder(user, bundle, extra = {}) {
  const ref = doc(db, "orders", `${user.uid}_${bundle.id}`);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().status !== "rejected") return { exists: true };
  await setDoc(ref, {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || "",
    bundleId: bundle.id,
    title: bundle.title,
    price: bundle.price,
    currency: bundle.currency,
    paymentMethod: "urPay Transfer",
    senderName: (extra.senderName || "").slice(0, 100),
    receiptPath: extra.receiptPath || "",
    receiptFileName: (extra.receiptFileName || "").slice(0, 200),
    status: "pending_review",
    createdAt: serverTimestamp(),
  });
  return { ok: true };
}

export const ORDER_STATUS = {
  pending_review: "قيد التحقق من الحوالة",
  completed: "مكتمل — الملفات متاحة",
  rejected: "مرفوض",
};
