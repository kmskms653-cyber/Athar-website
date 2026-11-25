import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getDriveConfig, requestFolderUrl } from "./drive";
import { REQUEST_STATUS } from "./serviceCatalog";

const when = (ts) => (ts?.toDate ? ts.toDate().toLocaleString("ar-SA") : "—");

export default function ServiceRequestsAdmin() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [links, setLinks] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => onSnapshot(query(collection(db, "serviceRequests"), orderBy("createdAt", "desc")),
    (snap) => { setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setError(""); },
    () => setError("تعذر تحميل الطلبات. انشر قواعد Firestore المحدّثة.")), []);

  async function setStatus(r, status) {
    setBusy(r.id); setError("");
    try {
      const patch = { status };
      if (status === "completed") patch.completedAt = serverTimestamp();
      await updateDoc(doc(db, "serviceRequests", r.id), patch);
    } catch { setError("تعذر حفظ الحالة. تحقق من صلاحيات الإدارة وقواعد Firestore."); }
    finally { setBusy(""); }
  }

  async function folder(r) {
    setBusy(r.id); setError("");
    try {
      const res = await requestFolderUrl(r.id, getDriveConfig().adminKey);
      setLinks((l) => ({ ...l, [r.id]: res.url }));
    } catch (e) { setError(e.message || "تعذر إنشاء المجلد؛ تأكد من مفتاح الإدارة في تبويب Drive."); }
    finally { setBusy(""); }
  }

  const list = rows.filter((r) => filter === "all" || r.status === filter);
  return (
    <div className="panel wide">
      <h3>طلبات الخدمات</h3>
      <p className="note">الخطوات: تحقق من الحوالة ← «قيد التجهيز» ← ضع الملف النهائي في مجلد الطلب على Drive ← «مكتمل». لا يستلم العميل شيئاً قبل «مكتمل».</p>
      <label className="field"><span>تصفية</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">الكل ({rows.length})</option>
          {Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v} ({rows.filter((r) => r.status === k).length})</option>)}
        </select></label>
      {error && <p className="err">{error}</p>}
      {!list.length && !error && <p className="note">لا توجد طلبات.</p>}
      {list.map((r) => (
        <article className="req" key={r.id}>
          <header><b>{r.title} — {r.name || "عميل"}</b><span className="st">{REQUEST_STATUS[r.status] || r.status}</span></header>
          <p>البريد: <b dir="ltr">{r.email}</b></p>
          <p>المبلغ: {r.price} {r.currency}{r.quantity > 1 ? ` (${r.quantity} صور)` : ""} — المحوّل: {r.senderName || "—"} — {when(r.createdAt)}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>الوصف: {r.description}</p>
          <p>
            {(r.photos || []).map((p, i) => <span key={p.id}><a href={p.url || `https://drive.google.com/file/d/${p.id}/view`} target="_blank" rel="noreferrer">صورة {i + 1}</a>{" · "}</span>)}
            <a href={r.receiptDriveUrl || `https://drive.google.com/file/d/${r.receiptDriveId}/view`} target="_blank" rel="noreferrer">إيصال التحويل</a>
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" disabled={busy === r.id} onClick={() => setStatus(r, "preparing")}>تأكيد الدفع وبدء التجهيز</button>
            <button className="btn sm" disabled={busy === r.id} onClick={() => folder(r)}>مجلد تسليم الطلب</button>
            <button className="btn sm" disabled={busy === r.id} onClick={() => setStatus(r, "completed")}>مكتمل</button>
            <button className="btn ghost sm" disabled={busy === r.id} onClick={() => setStatus(r, "rejected")}>رفض</button>
          </div>
          {links[r.id] && <p><a href={links[r.id]} target="_blank" rel="noreferrer">فتح مجلد التسليم في Drive</a> — ضع فيه الملف النهائي ثم اضغط «مكتمل».</p>}
          <small>معرّف الطلب: {r.id}</small>
        </article>
      ))}
    </div>
  );
}
