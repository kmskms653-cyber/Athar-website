import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { deliveryFile, deliveryList, driveReady, formatBytes } from "./drive";
import { REQUEST_STATUS } from "./serviceCatalog";

function RequestFiles({ r }) {
  const [files, setFiles] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!driveReady()) { setFiles([]); return; }
      try {
        const t = await auth.currentUser.getIdToken();
        const res = await deliveryList(t, "", r.id);
        if (alive) setFiles(res.files || []);
      } catch (e) { if (alive) { setFiles([]); setErr(e.message || ""); } }
    })();
    return () => { alive = false; };
  }, [r.id]);

  async function get(f) {
    setErr(""); setBusy(f.id);
    try {
      const t = await auth.currentUser.getIdToken();
      const x = await deliveryFile(t, "", f.id, r.id);
      if (x.mode === "share") window.open(x.url, "_blank", "noopener");
      else {
        const url = URL.createObjectURL(x.blob);
        const a = document.createElement("a"); a.href = url; a.download = x.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (e) { setErr(e.message || "تعذر تنزيل الملف."); } finally { setBusy(""); }
  }

  return (
    <div className="deliv">
      <div className="files">
        {(files || []).map((f) => <button className="btn" key={f.id} disabled={busy === f.id} onClick={() => get(f)}>{busy === f.id ? "جارٍ التحضير…" : `${f.name} (${formatBytes(f.size)})`}</button>)}
        {r.deliveryUrl && <a className="btn" href={r.deliveryUrl} target="_blank" rel="noreferrer">استلام الملف</a>}
      </div>
      {files && !files.length && !r.deliveryUrl && !err && <p className="note">جارٍ رفع ملفاتك، ستظهر هنا قريباً.</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

export default function MyRequests({ user }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const q = query(collection(db, "serviceRequests"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRows(list); setError("");
    }, () => setError("تعذر تحميل طلبات الخدمات حالياً."));
  }, [user.uid]);

  if (!rows.length && !error) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <h3>طلبات الخدمات</h3>
      {error && <p className="err">{error}</p>}
      {rows.map((r) => (
        <article className="req" key={r.id}>
          <header><strong>{r.title}</strong><span className={`st st-${r.status}`}>{REQUEST_STATUS[r.status] || r.status}</span></header>
          <p>{r.price} {r.currency}</p>
          <small>رقم الطلب: {r.id}</small>
          {r.status === "pending_review" && <p className="note">استلمنا طلبك وإيصالك. نتحقق من وصول الحوالة، ثم يبدأ التجهيز.</p>}
          {r.status === "preparing" && <p className="note">تم تأكيد استلام الحوالة، ويجهّز فريق أثر طلبك الآن.</p>}
          {r.status === "rejected" && <p className="err">تعذر اعتماد الطلب أو الحوالة. راسلنا على atharstudio653@gmail.com ذاكراً رقم الطلب. <a href="#refund">سياسة الاسترجاع</a></p>}
          {r.status === "completed" && <RequestFiles r={r} />}
        </article>
      ))}
    </div>
  );
}
