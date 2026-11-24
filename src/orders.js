import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// رقم الطلب ثابت (uid_bundleId) ليعتمد عليه قفل التسليم في firestore.rules
export const orderIdFor = (uid, bundleId) => `${uid}_${bundleId}`;

export async function createOrder(user, bundle, extra = {}) {
  const ref = doc(db, "orders", orderIdFor(user.uid, bundle.id));
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
    // الإيصال: Drive أولاً، ثم مساحة Firebase كخطة بديلة
    receiptPath: extra.receiptPath || "",
    receiptFileName: (extra.receiptFileName || "").slice(0, 200),
    receiptDriveId: extra.receiptDriveId || "",
    receiptDriveUrl: extra.receiptDriveUrl || "",
    receiptMime: extra.receiptMime || "",
    receiptSize: Number(extra.receiptSize) || 0,
    receiptDeletedAt: null,
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

export function receiptSource(order) {
  if (!order) return "none";
  if (order.receiptDriveId) return "drive";
  if (order.receiptPath) return "storage";
  return "none";
}

export function receiptName(order) {
  return (order && (order.receiptFileName || order.receiptName)) || "إيصال";
}
