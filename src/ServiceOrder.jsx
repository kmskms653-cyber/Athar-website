import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useSession } from "./AuthContext.jsx";
import { PAYMENT } from "./payment";
import { SERVICES } from "./serviceCatalog";
import { useFeatures } from "./useFeatures.js";
import { DRIVE_FOLDER_LABEL, driveReady, formatBytes, notifyNewRequest, uploadReceipt } from "./drive";

const IMG = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMG = 12 * 1024 * 1024;

export default function ServiceOrder({ keyName }) {
  const svc = SERVICES[keyName];
  const { user, consented, openAuth, loading, isAdmin } = useSession();
  const features = useFeatures();
  const [photos, setPhotos] = useState([]);
  const [desc, setDesc] = useState(() => {
    const dk = /^qr/.test(keyName) ? "athar-qr-draft" : /^biz/.test(keyName) ? "athar-biz-draft" : "";
    if (!dk) return "";
    try { const d = JSON.parse(sessionStorage.getItem(dk) || "null"); return d && d.key === keyName ? d.desc : ""; } catch { return ""; }
  });
  const [sender, setSender] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [own, setOwn] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [keyName]);
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  if (!svc) return <div className="fatal"><p>الخدمة غير موجودة.</p><a className="back" href="#/">← الموقع</a></div>;
  if (svc.feature && !features[svc.feature] && !isAdmin) return <div className="fatal"><p>هذه الخدمة غير متاحة حالياً.</p><a className="back" href="#/">← الموقع</a></div>;
  const qty = svc.perPhoto ? Math.max(1, photos.length) : 1;
  const total = svc.price * qty;

  const addPhotos = (e) => {
    setError("");
    const list = [...(e.target.files || [])];
    e.target.value = "";
    const next = [...photos];
    for (const f of list) {
      if (!IMG.includes(f.type)) { setError("الصور المقبولة: JPG أو PNG أو WEBP."); continue; }
      if (f.size > MAX_IMG) { setError("حجم الصورة يجب ألا يتجاوز 12 ميجابايت."); continue; }
      if (next.length >= svc.maxPhotos) { setError(`الحد الأقصى ${svc.maxPhotos} صور لهذه الخدمة.`); break; }
      next.push(f);
    }
    setPhotos(next);
  };

  const copy = async (text, k) => {
    try { await navigator.clipboard.writeText(text); setCopied(k); setTimeout(() => setCopied(""), 1800); } catch { setError("تعذر النسخ، انسخ الرقم يدوياً."); }
  };

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (photos.length < svc.minPhotos) { setError(`أرفق ${svc.minPhotos === 1 ? "صورة واحدة على الأقل" : `${svc.minPhotos} صور على الأقل`}.`); return; }
    if (desc.trim().length < 10) { setError("اكتب وصفاً لطلبك (10 أحرف على الأقل)."); return; }
    if (!receipt) { setError("أرفق إيصال التحويل."); return; }
    if (!own || !agree) { setError("أكّد ملكية الصور وموافقتك على سياسة الدفع والاسترجاع."); return; }
    if (!driveReady()) { setError("رفع الملفات غير متاح حالياً. راسلنا على atharstudio653@gmail.com."); return; }
    setBusy(true);
    try {
      const tag = `${user.uid.slice(0, 8)}-${Date.now()}`;
      const uploaded = [];
      for (let i = 0; i < photos.length; i++) {
        setStage(`جارٍ رفع الصورة ${i + 1} من ${photos.length}…`);
        const d = await uploadReceipt(photos[i], { orderId: `${keyName}-${tag}-${i + 1}`, kind: "photo" });
        if (!d.fileId) throw new Error("لم يؤكد Drive حفظ الصورة.");
        uploaded.push({ id: d.fileId, url: d.url || "", name: (photos[i].name || "").slice(0, 120) });
      }
      setStage("جارٍ حفظ إيصال الدفع…");
      const r = await uploadReceipt(receipt, { orderId: `${keyName}-${tag}` });
      if (!r.fileId) throw new Error("لم يؤكد Drive حفظ الإيصال.");
      setStage("جارٍ تسجيل طلبك…");
      const ref = await addDoc(collection(db, "serviceRequests"), {
        uid: user.uid,
        email: (user.email || "").toLowerCase(),
        name: (user.displayName || "").slice(0, 100),
        service: keyName,
        title: svc.title,
        quantity: qty,
        price: total,
        currency: "ر.س",
        status: "pending_review",
        description: desc.trim().slice(0, 1500),
        photos: uploaded,
        receiptDriveId: r.fileId,
        receiptDriveUrl: r.url || "",
        receiptFileName: (r.name || receipt.name).slice(0, 180),
        senderName: sender.trim().slice(0, 100),
        ownershipConfirmed: true,
        policyAccepted: true,
        createdAt: serverTimestamp(),
      });
      notifyNewRequest({ requestId: ref.id, title: svc.title, price: total, email: user.email });
      setDone(ref.id);
    } catch (err) {
      console.error(err);
      setError(err.code === "permission-denied"
        ? "رُفض تسجيل الطلب. تأكد من تسجيل الدخول والموافقة على الشروط، وأن قواعد Firestore منشورة."
        : `تعذر إرسال الطلب: ${err.message || "حاول مرة أخرى."} لم يُسجَّل شيء.`);
    } finally { setBusy(false); setStage(""); }
  }

  if (done) {
    return (
      <main className="sv" dir="rtl">
        <section className="svh">
          <span className="pill">تم استلام طلبك</span>
          <h1>شكراً لك</h1>
          <p className="l">وصلنا طلبك وإيصال الحوالة. حالته الآن «بانتظار التحقق من الحوالة». بعد تأكيد وصولها يبدأ فريق أثر بتجهيز طلبك، وتستلمه من صفحة حسابك.</p>
          <p className="note">رقم الطلب: <b dir="ltr">{done}</b></p>
          <p><a className="btn" href="#account">متابعة طلباتي</a> <a className="btn ghost" href="#/">الرئيسية</a></p>
        </section>
      </main>
    );
  }

  return (
    <main className="sv" dir="rtl">
      <header className="admin-bar">
        <a className="tab" href={`#studio-${svc.studio}`}>← الاستديو</a>
        <a className="logo" href="#/"><img src="/logo.png" alt="أثر" style={{ height: 38 }} /></a>
      </header>
      <section className="svh">
        <span className="pill">خدمة حسب الطلب</span>
        <h1>{svc.title}</h1>
        <p className="l">{svc.intro}</p>
        <p className="note">السعر: <b className="gold">{svc.price} ر.س{svc.perPhoto ? " للصورة" : ""}</b> — التسليم: {svc.delivery}</p>
        <ol className="note" style={{ paddingInlineStart: 20, lineHeight: 1.9 }}>
          <li>ارفع صورك واكتب وصف طلبك.</li>
          <li>حوّل المبلغ وارفع إيصال التحويل.</li>
          <li>نتحقق من الحوالة ثم يجهّز فريق أثر طلبك.</li>
          <li>تستلم المنتج النهائي من صفحة حسابك عند اكتماله.</li>
        </ol>
      </section>

      {loading ? <p className="note">جارٍ التحميل…</p> : !user || !consented ? (
        <div className="req">
          <p>سجّل الدخول ووافق على الشروط وسياسة الخصوصية لتقديم الطلب. التصفح مفتوح للجميع.</p>
          <button className="btn" onClick={openAuth}>تسجيل الدخول للمتابعة</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label className="field"><span>صورك {svc.minPhotos ? "(مطلوبة)" : "(اختيارية)"} — حتى {svc.maxPhotos} صور، JPG / PNG / WEBP</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} disabled={busy} />
          </label>
          {previews.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {previews.map((u, i) => (
                <span key={u} style={{ position: "relative" }}>
                  <img src={u} alt={`صورة ${i + 1}`} style={{ width: 88, height: 88, objectFit: "cover", border: "1px solid var(--line)" }} />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} disabled={busy} aria-label="حذف" style={{ position: "absolute", top: 0, left: 0, background: "#000a", color: "#fff", border: 0, cursor: "pointer" }}>×</button>
                </span>
              ))}
            </div>
          )}
          <label className="field"><span>وصف طلبك</span>
            <textarea rows={5} value={desc} maxLength={1500} onChange={(e) => setDesc(e.target.value)} placeholder={svc.placeholder} disabled={busy} />
          </label>

          <p className="note">المبلغ المطلوب تحويله: <b className="gold">{total} ر.س</b>{svc.perPhoto ? ` (${qty} × ${svc.price})` : ""}</p>
          <div className="bank">
            <div className="bank-row"><span>وسيلة التحويل</span><b>{PAYMENT.bankName}</b></div>
            <div className="bank-row"><span>اسم المستفيد</span><b>{PAYMENT.accountHolder}</b>
              <button type="button" className="cp" onClick={() => copy(PAYMENT.accountHolder, "n")}>{copied === "n" ? "تم ✓" : "نسخ"}</button></div>
            <div className="bank-iban"><span>رقم الآيبان (IBAN)</span>
              <div><code dir="ltr">{PAYMENT.iban}</code><button type="button" className="cp on" onClick={() => copy(PAYMENT.iban, "i")}>{copied === "i" ? "تم النسخ ✓" : "نسخ"}</button></div></div>
          </div>

          <label className="field"><span>اسم المحوِّل (اختياري)</span>
            <input value={sender} onChange={(e) => setSender(e.target.value)} maxLength={100} disabled={busy} /></label>
          <label className="field"><span>إيصال التحويل (صورة أو PDF — حتى 10MB)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] || null)} disabled={busy} />
            {receipt && <small>{receipt.name} — {formatBytes(receipt.size)}</small>}</label>

          <label className="note" style={{ display: "flex", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} disabled={busy} style={{ marginTop: 5 }} />
            <span>أؤكد أنني أملك الصور أو لدي إذن باستخدامها، وأوافق على إرسالها إلى فريق أثر.</span></label>
          <label className="note" style={{ display: "flex", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={busy} style={{ marginTop: 5 }} />
            <span>اطلعت على <a href="#refund" target="_blank" rel="noreferrer">سياسة الدفع والاسترجاع</a> وأوافق عليها.</span></label>

          {stage && <p className="note" role="status">{stage}</p>}
          {error && <p className="err" role="alert">{error}</p>}
          <p className="note small">تُحفظ صورك وإيصالك في Google Drive الخاص بأثر ({DRIVE_FOLDER_LABEL})، ولا يراها غير فريق أثر. لا يبدأ التنفيذ قبل تأكيد وصول الحوالة.</p>
          <button className="btn bd-buy" disabled={busy || !own || !agree}>{busy ? "جارٍ الإرسال…" : "إرسال الطلب وإيصال الدفع"}</button>
        </form>
      )}
    </main>
  );
}
