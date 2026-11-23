import { useState } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";
import { PAYMENT } from "./payment";
import { createOrder } from "./orders";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function BankTransfer({ bundle, user, onClose, onDone }) {
  const [copied, setCopied] = useState("");
  const [file, setFile] = useState(null);
  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); } catch { setError("تعذر النسخ، انسخ الرقم يدوياً."); }
  };

  const pick = (e) => {
    setError("");
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!ALLOWED.includes(f.type)) { setFile(null); e.target.value = ""; setError("يرجى رفع صورة (JPG, PNG, WEBP) أو ملف PDF فقط."); return; }
    if (f.size > 10 * 1024 * 1024) { setFile(null); e.target.value = ""; setError("حجم الملف يتجاوز 10 ميجابايت، اختر ملفاً أصغر."); return; }
    setFile(f);
  };

  async function submit(e) {
    e.preventDefault();
    if (!file) { setError("يرجى إرفاق صورة أو ملف إيصال التحويل أولاً."); return; }
    setBusy(true); setError("");
    let receiptPath = "";
    let receiptFailed = false;
    try {
      const safe = `${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const r = ref(storage, `receipts/${user.uid}/${safe}`);
      await uploadBytes(r, file, { contentType: file.type });
      receiptPath = r.fullPath;
    } catch (err) {
      console.warn("Receipt upload failed:", err.code || err.message);
      receiptFailed = true; // نكمل الطلب ونطلب من العميل إرسال الإيصال بالبريد
    }
    try {
      const res = await createOrder(user, bundle, { senderName: sender.trim() || user.displayName || "", receiptPath, receiptFileName: file.name });
      onDone({ ...res, receiptFailed });
    } catch (err) {
      console.error(err);
      setError(err.code === "permission-denied" ? "تعذر حفظ الطلب: قواعد Firestore غير منشورة." : "حدث خطأ أثناء إرسال الطلب، حاول مرة أخرى.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mdl" role="dialog" aria-modal="true">
      <div className="mdl-box">
        <button type="button" className="mdl-x" onClick={onClose} aria-label="إغلاق">×</button>
        <span className="pill">الدفع عبر التحويل</span>
        <h3>{bundle.title}</h3>
        <p className="note">المبلغ المطلوب تحويله: <b className="gold">{bundle.price} {bundle.currency}</b></p>

        <div className="bank">
          <div className="bank-row"><span>وسيلة التحويل</span><b>{PAYMENT.bankName}</b></div>
          <div className="bank-row">
            <span>اسم المستفيد</span>
            <b>{PAYMENT.accountHolder}</b>
            <button type="button" className="cp" onClick={() => copy(PAYMENT.accountHolder, "name")}>{copied === "name" ? "تم ✓" : "نسخ"}</button>
          </div>
          <div className="bank-iban">
            <span>رقم الآيبان (IBAN)</span>
            <div><code dir="ltr">{PAYMENT.iban}</code><button type="button" className="cp on" onClick={() => copy(PAYMENT.iban, "iban")}>{copied === "iban" ? "تم النسخ ✓" : "نسخ"}</button></div>
          </div>
        </div>

        <form onSubmit={submit}>
          <label className="field"><span>اسم المحوِّل (اختياري لتسريع المطابقة)</span>
            <input value={sender} onChange={(e) => setSender(e.target.value)} maxLength={100} placeholder="مثال: محمد عبدالله" /></label>

          <label className={`drop ${file ? "has" : ""}`} htmlFor="rcpt">
            {file ? (
              <span><b>{file.name}</b><br /><small>{(file.size / 1048576).toFixed(2)} MB — اضغط لتغيير الملف</small></span>
            ) : (
              <span><b>اضغط لاختيار صورة أو ملف الإيصال *</b><br /><small>JPG, PNG, WEBP, PDF (حتى 10MB)</small></span>
            )}
            <input id="rcpt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pick} hidden />
          </label>

          {error && <p className="err">{error}</p>}
          <p className="note">بعد إرسال الإيصال يظهر الطلب في حسابك، وتُفعّل روابط التحميل فور تأكيد وصول الحوالة.</p>
          <button className="btn bd-buy" disabled={busy}>{busy ? "جارٍ رفع الإيصال وتأكيد الطلب…" : "إرسال الإيصال وتأكيد الطلب"}</button>
        </form>
      </div>
    </div>
  );
}
