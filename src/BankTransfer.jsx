import { useState } from "react";
import { PAYMENT } from "./payment";
import { createOrder, orderIdFor } from "./orders";
import { DRIVE_FOLDER_LABEL, driveReady, formatBytes, uploadReceipt } from "./drive";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX = 10 * 1024 * 1024;

export default function BankTransfer({ bundle, user, onClose, onDone }) {
  const [copied, setCopied] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [agree, setAgree] = useState(false);

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); } catch { setError("تعذر النسخ، انسخ الرقم يدوياً."); }
  };

  const pick = (e) => {
    setError("");
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!ALLOWED.includes(f.type)) { setFile(null); e.target.value = ""; setError("يرجى رفع صورة (JPG, PNG, WEBP) أو ملف PDF فقط."); return; }
    if (f.size > MAX) { setFile(null); e.target.value = ""; setError("حجم الملف يتجاوز 10 ميجابايت، اختر ملفاً أصغر."); return; }
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : "");
  };

  async function submit(e) {
    e.preventDefault();
    if (!agree) { setError("يرجى الموافقة على سياسة الدفع والاسترجاع أولاً."); return; }
    if (!file) { setError("يرجى إرفاق صورة أو ملف إيصال التحويل أولاً."); return; }
    setBusy(true); setError(""); setProgress(0);

    const orderId = orderIdFor(user.uid, bundle.id);
    const receiptPath = "";
    let receiptFileName = file.name;
    let drive = { fileId: "", url: "", mimeType: file.type, size: file.size };

    // الإيصال يُحفظ في Google Drive فقط (Athar / Customer Receipts)
    if (!driveReady()) {
      setError("خدمة حفظ الإيصالات غير مهيأة حالياً. تواصل معنا على atharstudio653@gmail.com.");
      setBusy(false);
      return;
    }
    setStage(`جارٍ رفع الإيصال إلى ${DRIVE_FOLDER_LABEL}`);
    try {
      drive = await uploadReceipt(file, { orderId }, setProgress);
      receiptFileName = drive.name || file.name;
    } catch (err) {
      console.warn("Drive upload failed:", err);
      setError(`تعذر رفع الإيصال (${err.message}). لم يُنشأ الطلب؛ حاول مرة أخرى أو راسلنا.`);
      setBusy(false);
      setStage("");
      return;
    }
    if (!drive.fileId) {
      setError("لم يؤكد Drive حفظ الإيصال. لم يُنشأ الطلب؛ حاول مرة أخرى.");
      setBusy(false);
      setStage("");
      return;
    }

    // 3) تسجيل الطلب
    setStage("جارٍ تأكيد الطلب");
    try {
      const res = await createOrder(user, bundle, {
        senderName: sender.trim() || user.displayName || "",
        receiptPath,
        receiptFileName,
        receiptDriveId: drive.fileId,
        receiptDriveUrl: drive.url,
        receiptMime: drive.mimeType,
        receiptSize: drive.size,
      });
      onDone({ ...res, receiptFailed: false, via: "drive" });
    } catch (err) {
      console.error(err);
      setError(err.code === "permission-denied" ? "تعذر حفظ الطلب: قواعد Firestore غير منشورة." : "حدث خطأ أثناء إرسال الطلب، حاول مرة أخرى.");
      setBusy(false);
      setStage("");
    }
  }

  return (
    <div className="mdl" role="dialog" aria-modal="true">
      <div className="mdl-box">
        <button type="button" className="mdl-x" onClick={onClose} aria-label="إغلاق" disabled={busy}>×</button>
        <span className="pill">الدفع عبر التحويل</span>
        <h3>{bundle.title}</h3>
        <p className="note">المبلغ المطلوب تحويله: <b className="gold">{bundle.price} {bundle.currency}</b></p>

        <ol className="note" style={{ paddingInlineStart: 20, lineHeight: 1.9 }}>
          <li>حوّل المبلغ أعلاه إلى الحساب التالي.</li>
          <li>ارفع صورة أو PDF للإيصال من هنا.</li>
          <li>نتحقق من وصول الحوالة، وتظهر حالة طلبك «قيد التحقق» في حسابك.</li>
          <li>عند تأكيد الدفع تظهر ملفاتك للتنزيل. لا تُسلَّم الملفات قبل ذلك.</li>
        </ol>

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
            <input value={sender} onChange={(e) => setSender(e.target.value)} maxLength={100} placeholder="مثال: محمد عبدالله" disabled={busy} /></label>

          <label className={`drop ${file ? "has" : ""}`} htmlFor="rcpt">
            {preview ? (
              <span className="drop-prev">
                <img src={preview} alt="معاينة الإيصال" />
                <span><b>{file.name}</b><br /><small>{formatBytes(file.size)} — اضغط لتغيير الملف</small></span>
              </span>
            ) : file ? (
              <span><b>{file.name}</b><br /><small>{formatBytes(file.size)} — اضغط لتغيير الملف</small></span>
            ) : (
              <span><b>اضغط لاختيار صورة أو ملف الإيصال *</b><br /><small>JPG, PNG, WEBP, PDF (حتى 10MB)</small></span>
            )}
            <input id="rcpt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pick} hidden disabled={busy} />
          </label>

          {busy && (
            <div className="prog" role="status" aria-live="polite">
              <div className="prog-bar"><i style={{ width: `${progress}%` }} /></div>
              <small>{stage}{progress > 0 && progress < 100 ? ` — ${progress}%` : ""}</small>
            </div>
          )}

          {error && <p className="err" dir="auto">{error}</p>}
          <p className="note">
            يُحفظ الإيصال في مجلد <b>{DRIVE_FOLDER_LABEL}</b> الخاص بأثر على Google Drive، ويظهر في لوحة الإدارة للمراجعة.{" "}
            تظهر ملفات الحزمة في حسابك فور تأكيد الحوالة.
          </p>
          <label className="note" style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={busy} style={{ marginTop: 5 }} />
            <span>اطلعت على <a href="#refund" target="_blank" rel="noreferrer">سياسة الدفع والاسترجاع</a> وأوافق عليها.</span>
          </label>
          <button className="btn bd-buy" disabled={busy || !agree}>{busy ? "جارٍ الإرسال…" : "إرسال الإيصال وتأكيد الطلب"}</button>
        </form>
      </div>
    </div>
  );
}
