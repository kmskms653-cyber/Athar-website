import { useEffect, useRef, useState } from "react";
import { PRIVACY, REFUND, TERMS } from "./legalText";
import { ATHAR_CONFIG } from "./atharConfig";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function friendly(err) {
  switch (err && err.code) {
    case "auth/invalid-email":
      return "صيغة البريد غير صحيحة.";
    case "auth/unauthorized-continue-uri":
      return `النطاق ${location.hostname} غير مضاف في Firebase ← Authentication ← Settings ← Authorized domains.`;
    case "auth/operation-not-allowed":
      return "تسجيل الدخول بالبريد غير مفعّل. فعّل Email link في Firebase Authentication، أو استخدم الدخول عبر Google.";
    case "auth/too-many-requests":
      return "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.";
    case "auth/quota-exceeded":
      return "تم تجاوز حد إرسال الرسائل اليوم. جرّب لاحقاً أو استخدم Google.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "أُغلقت نافذة Google قبل إكمال الدخول.";
    case "auth/popup-blocked":
      return "المتصفح حجب نافذة Google، اسمح بها وحاول مجدداً.";
    default:
      return "تعذر إكمال العملية. حاول مرة أخرى.";
  }
}

export default function AuthModal({
  open,
  onClose,
  initialEmail = "",
  notice = "",
  needsEmail = false,
  consentOnly = false,
  locked = false,
  onSendLink,
  onCompleteEmail,
  onGoogle,
  onConsentOnly,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [legal, setLegal] = useState(null); // 'terms' | 'privacy'
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || "");
      setErr("");
      setSent(false);
      setLegal(null);
      setTerms(false);
      setPrivacy(false);
    }
  }, [open, initialEmail]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    timer.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer.current);
  }, [cooldown]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (legal) setLegal(null);
      else if (!locked) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, legal, onClose, locked]);

  if (!open) return null;

  const validEmail = EMAIL_RE.test(email.trim());
  const canSubmit = validEmail && terms && privacy && !busy;

  async function send() {
    setErr("");
    setBusy(true);
    try {
      await onSendLink(email.trim());
      setSent(true);
      setCooldown(30);
    } catch (e) {
      console.error(e);
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setErr("");
    setBusy(true);
    try {
      await onCompleteEmail(email.trim());
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr("");
    setBusy(true);
    try {
      await onGoogle();
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function consentOnlySubmit() {
    setBusy(true);
    try {
      await onConsentOnly();
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  const submit = consentOnly
    ? consentOnlySubmit
    : needsEmail
      ? complete
      : sent
        ? send
        : send;

  return (
    <div className="am-ov" role="dialog" aria-modal="true" aria-label="تسجيل الدخول والموافقة" onMouseDown={(e) => { if (e.target === e.currentTarget && !locked) onClose(); }}>
      <div className="am-card">
        {!locked && <button className="am-x" onClick={onClose} aria-label="إغلاق">×</button>}

        {legal ? (
          <LegalSheet kind={legal} onBack={() => setLegal(null)} />
        ) : sent ? (
          <div className="am-sent">
            <span className="am-ic">✉</span>
            <h2>أرسلنا رابط الدخول</h2>
            <p className="am-lead">
              أرسلنا رسالة «تأكيد الدخول» إلى <b dir="ltr">{email}</b>. افتح بريدك واضغط الرابط للعودة مسجلاً.
            </p>
            <p className="am-hint">لم تجدها؟ تحقّق من مجلد البريد المهمل (Spam) أو «كل الرسائل».</p>
            <div className="am-row">
              <button className="am-btn ghost" disabled={cooldown > 0 || busy} onClick={send}>
                {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ثانية` : "إعادة إرسال الرابط"}
              </button>
              <button className="am-btn link" onClick={() => setSent(false)}>تغيير البريد</button>
            </div>
            <p className="am-fine">الرابط صالح لفترة محدودة ولمرة واحدة. إن فتحته في متصفح آخر فارجع إلى هذه الصفحة لبريدك.</p>
          </div>
        ) : (
          <>
            <header className="am-head">
              <span className="am-brand">أثر<span>ATHAR STUDIO</span></span>
              <h2>{consentOnly ? "تحديث الموافقة" : "مرحباً بك في أثر"}</h2>
              <p className="am-lead">
                {consentOnly
                  ? "حدّثنا الشروط والسياسات. للمتابعة، يرجى الاطلاع عليها والموافقة."
                  : "للمتابعة، يرجى الاطلاع على الشروط والسياسات والموافقة عليها"}
              </p>
            </header>

            {notice && <p className="am-err">{notice}</p>}

            {!consentOnly && (
              <>
                <label className="am-field">
                  <span>البريد الإلكتروني</span>
                  <input
                    type="email"
                    dir="ltr"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                  />
                </label>
                {email.trim() && !validEmail && <p className="am-err sm">تأكد من صيغة البريد الإلكتروني.</p>}
              </>
            )}

            {consentOnly && (
              <p className="am-account" dir="ltr">{initialEmail}</p>
            )}

            <div className="am-consents">
              <label className={`am-check ${terms ? "on" : ""}`}>
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                <span>أوافق على <button type="button" className="am-link" onClick={() => setLegal("terms")}>شروط الاستخدام</button></span>
              </label>
              <label className={`am-check ${privacy ? "on" : ""}`}>
                <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
                <span>أوافق على <button type="button" className="am-link" onClick={() => setLegal("privacy")}>سياسة الخصوصية</button></span>
              </label>
            </div>

            {err && <p className="am-err">{err}</p>}

            <button
              className="am-btn primary"
              disabled={consentOnly ? !(terms && privacy) || busy : !canSubmit}
              onClick={submit}
            >
              {busy ? "جارٍ التنفيذ…" : consentOnly ? "تأكيد الموافقة والمتابعة" : needsEmail ? "إكمال الدخول" : "تسجيل الدخول"}
            </button>

            {!consentOnly && !needsEmail && (
              <>
                <div className="am-or"><span>أو</span></div>
                <button className="am-btn ghost" onClick={google} disabled={!(terms && privacy) || busy}>
                  الدخول بحساب Google
                </button>
                <p className="am-fine">
                  الدخول بدون كلمة مرور. نرسل رابطاً إلى بريدك، ولا نحفظ كلمات مرور.
                  الشروط إصدار {ATHAR_CONFIG.legal.termsVersion}.
                </p>
              </>
            )}
            {needsEmail && <p className="am-fine">أنت تكمل دخولاً بدأ من جهاز آخر — أدخل البريد نفسه الذي طلبت الرابط عليه.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function LegalSheet({ kind, onBack }) {
  const doc = kind === "privacy" ? PRIVACY : kind === "refund" ? REFUND : TERMS;
  return (
    <div className="am-legal">
      <div className="am-legal-head">
        <button className="am-btn link" onClick={onBack}>← رجوع</button>
        <span className="am-ver">إصدار {doc.version} · ساري {doc.effective}</span>
      </div>
      <h2>{doc.title}</h2>
      <p className="am-lead">{doc.intro}</p>
      <div className="am-legal-body">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h3>{s.h}</h3>
            <ul>{s.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export { LegalSheet };
