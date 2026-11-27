import ServiceRequestsAdmin from "./ServiceRequestsAdmin.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { useSession } from "./AuthContext.jsx";
import { ATHAR_CONFIG, ROLE_LABEL, isSuperEmail } from "./atharConfig";
import { DEFAULT_CONTENT, mergeContent } from "./defaultContent";
import { DET } from "./serviceDetails";
import { BUNDLES } from "./bundles";
import { ORDER_STATUS } from "./orders";
import {
  DRIVE_ACCOUNT,
  DRIVE_FOLDER_LABEL,
  deleteDriveFile,
  getDriveConfig,
  pingDrive,
  saveDriveConfig,
  testAdminKey,
  validateBridgeUrl,
} from "./drive";
import { useFeatures, WM_SERVICES } from "./useFeatures.js";
import Receipt from "./Receipt.jsx";
import DriveReceipt from "./DriveReceipt.jsx";

function FeaturesPanel() {
  const features = useFeatures();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function toggle(key, on) {
    setBusy(true); setMsg("");
    try { await setDoc(doc(db, "site", "features"), { [key]: on }, { merge: true }); setMsg(on ? "تم التفعيل." : "تم الإيقاف."); }
    catch (e) { setMsg("تعذر الحفظ: " + (e.code || e.message)); }
    setBusy(false);
  }
  return (
    <section className="panel">
      <h2>الأقسام الإضافية</h2>
      <p className="muted">الأقسام المخفية لا تظهر للزوار في القائمة أو الصفحة الرئيسية ولا تُفتح بالرابط المباشر، وتبقى متاحة للمدراء للتجربة.</p>
      {[["qr", "قسم QR code (رموز QR وبطاقات الطاولة والستيكرات)"], ["bizAds", "الأعمال والتجارة: قوالب الإعلانات والمنشورات التجارية (30 قالباً)"], ["bizProducts", "الأعمال والتجارة: قوالب العطور والمنتجات (20 قالباً)"], ["bizMenu", "الأعمال والتجارة: قوائم الطعام والأسعار (15 قالباً)"]].map(([k, label]) => (
        <label key={k} className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={!!features[k]} disabled={busy} onChange={(e) => toggle(k, e.target.checked)} />
          <span>{label} — {features[k] ? "ظاهر للزوار" : "مخفي"}</span>
        </label>
      ))}
      <h3 style={{ marginTop: 18 }}>العلامة المائية</h3>
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={features.wm !== false} disabled={busy} onChange={(e) => toggle("wm", e.target.checked)} />
        <span>إظهار علامة أثر المائية على معاينات جميع الخدمات قبل الدفع — {features.wm !== false ? "مفعّلة" : "متوقفة"}</span>
      </label>
      <p className="muted" style={{ marginTop: 10 }}>التحكم لكل خدمة على حدة (يعمل عندما يكون المفتاح العام أعلاه مفعّلاً):</p>
      {WM_SERVICES.map(([k, label]) => (
        <label key={k} className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={features["wm_" + k] !== false} disabled={busy} onChange={(e) => toggle("wm_" + k, e.target.checked)} />
          <span>{label} — {features["wm_" + k] !== false ? "العلامة ظاهرة" : "العلامة متوقفة"}</span>
        </label>
      ))}
      {msg && <p className="ok">{msg}</p>}
    </section>
  );
}

const STATUS = { new: "جديد", in_progress: "قيد المتابعة", completed: "مكتمل" };

function Field({ label, value, onChange, area }) {
  const Tag = area ? "textarea" : "input";
  return (
    <label className="field">
      <span>{label}</span>
      <Tag value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={area ? 3 : undefined} />
    </label>
  );
}

const money = (n) => `${Number(n || 0).toLocaleString("en-US")} ر.س`;
const orderCode = (id) => {
  let h = 0;
  for (let i = 0; i < String(id).length; i += 1) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return `ATH-${h.toString(36).toUpperCase().padStart(5, "0").slice(-5)}`;
};
const when = (ts) => (ts && ts.toDate ? ts.toDate().toLocaleString("ar-SA") : "—");

/* ------------------------------------------------------------------ */
/* الطلبات والإيصالات                                                 */
/* ------------------------------------------------------------------ */

function ReceiptManager({ adminKey }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [receiptFilter, setReceiptFilter] = useState("all");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const qs = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(
      qs,
      (snap) => {
        setError("");
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setUpdatedAt(new Date());
      },
      (e) => setError(e.code === "permission-denied" ? "لا توجد صلاحية قراءة: انشر firestore.rules المحدّثة." : "تعذر تحميل الطلبات.")
    );
  }, []);

  const setStatusOf = (id, value) => updateDoc(doc(db, "orders", id), { status: value }).catch(console.error);

  const stats = useMemo(() => {
    const pending = items.filter((o) => o.status === "pending_review").length;
    const done = items.filter((o) => o.status === "completed").length;
    const revenue = items.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.price || 0), 0);
    const withReceipt = items.filter((o) => o.receiptDriveId || o.receiptPath).length;
    return { pending, done, revenue, withReceipt };
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((o) => {
      if (status !== "all" && (o.status || "pending_review") !== status) return false;
      if (receiptFilter === "with" && !(o.receiptDriveId || o.receiptPath)) return false;
      if (receiptFilter === "without" && (o.receiptDriveId || o.receiptPath)) return false;
      if (receiptFilter === "deleted" && !o.receiptDeletedAt) return false;
      if (!term) return true;
      return [o.title, o.name, o.email, o.senderName, o.id, o.receiptFileName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [items, q, status, receiptFilter]);

  async function removeReceipt(order) {
    setBusy(order.id);
    setFlash("");
    try {
      if (order.receiptDriveId) {
        if (!adminKey) throw new Error("أضف مفتاح الإدارة من تبويب «ربط Drive» أولاً.");
        await deleteDriveFile(order.receiptDriveId, adminKey);
      }
      if (order.receiptPath) {
        try { await deleteObject(storageRef(storage, order.receiptPath)); } catch (e) { console.warn("storage delete:", e.code); }
      }
      await updateDoc(doc(db, "orders", order.id), {
        receiptDriveId: "",
        receiptDriveUrl: "",
        receiptPath: "",
        receiptDeletedAt: serverTimestamp(),
      });
      setFlash("حُذف الإيصال من Drive ومن الطلب. الطلب نفسه باقٍ في السجل.");
    } catch (err) {
      console.error(err);
      setFlash(`تعذر الحذف: ${err.message}`);
    } finally {
      setBusy("");
      setConfirm("");
    }
  }

  return (
    <div className="panel wide">
      <div className="kpis">
        <div className="kpi"><span>إجمالي الطلبات</span><b>{items.length}</b></div>
        <div className="kpi"><span>بانتظار التحقق</span><b>{stats.pending}</b></div>
        <div className="kpi"><span>مكتملة</span><b>{stats.done}</b></div>
        <div className="kpi"><span>إيصالات محفوظة</span><b>{stats.withReceipt}</b></div>
        <div className="kpi"><span>إيراد مؤكد</span><b>{money(stats.revenue)}</b></div>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="ابحث بالاسم، البريد، الحزمة، أو رقم الطلب"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="بحث"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="الحالة">
          <option value="all">كل الحالات</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={receiptFilter} onChange={(e) => setReceiptFilter(e.target.value)} aria-label="الإيصالات">
          <option value="all">كل الإيصالات</option>
          <option value="with">بها إيصال</option>
          <option value="without">بلا إيصال</option>
          <option value="deleted">حُذف إيصالها</option>
        </select>
        <span className="note small">{updatedAt ? `آخر تحديث ${updatedAt.toLocaleTimeString("ar-SA")}` : ""}</span>
      </div>

      {flash && <p className={flash.startsWith("تعذر") ? "err" : "ok"}>{flash}</p>}
      {error && <p className="err">{error}</p>}
      {!error && filtered.length === 0 && <p className="note">لا توجد طلبات مطابقة.</p>}

      {filtered.map((o) => {
        const hasDrive = Boolean(o.receiptDriveId);
        return (
          <article className="req order" key={o.id}>
            <header>
              <div>
                <strong>{o.title || o.bundleId}</strong>
                <small className="oid" title={o.id}>{orderCode(o.id)}</small>
              </div>
              <select value={o.status || "pending_review"} onChange={(e) => setStatusOf(o.id, e.target.value)}>
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </header>

            <div className="order-grid">
              <p className="order-line"><span>العميل</span><b dir="auto">{o.name || "—"}</b></p>
              <p className="order-line"><span>البريد</span><b dir="ltr">{o.email || "—"}</b></p>
              <p className="order-line"><span>المبلغ</span><b>{o.price} {o.currency}</b></p>
              <p className="order-line"><span>المحوِّل</span><b dir="auto">{o.senderName || "—"}</b></p>
              <p className="order-line"><span>التاريخ</span><b>{when(o.createdAt)}</b></p>
            </div>

            {hasDrive && (
              <DriveReceipt
                order={o}
                adminKey={adminKey}
                deletedAt={o.receiptDeletedAt}
                onDelete={() => setConfirm(o.id)}
              />
            )}

            {!hasDrive && o.receiptPath && (
              <div className="rcpt">
                <div className="rcpt-head">
                  <span className="rcpt-ic img" aria-hidden="true">▣</span>
                  <div className="rcpt-meta">
                    <b dir="auto">{o.receiptFileName || "إيصال"}</b>
                    <small>محفوظ في مساحة Firebase (خطة بديلة — لم يُربط Drive وقت الرفع)</small>
                  </div>
                </div>
                <Receipt path={o.receiptPath} label="فتح الإيصال" />
                {confirm === o.id ? (
                  <div className="confirm">
                    <span>تأكيد حذف الإيصال؟</span>
                    <button className="btn sm danger" disabled={busy === o.id} onClick={() => removeReceipt(o)}>نعم، احذف</button>
                    <button className="btn sm ghost" onClick={() => setConfirm("")}>إلغاء</button>
                  </div>
                ) : (
                  <div className="rcpt-actions">
                    <button className="btn sm danger" onClick={() => setConfirm(o.id)}>حذف الإيصال</button>
                  </div>
                )}
              </div>
            )}

            {!hasDrive && !o.receiptPath && (
              <p className="note small">
                {o.receiptDeletedAt ? "حُذف الإيصال يدوياً بعد إنهاء الإجراء." : "لم يُرفع إيصال لهذا الطلب."}
              </p>
            )}

            {confirm === o.id && hasDrive && (
              <div className="confirm">
                <span>سيُحذف الإيصال من Drive نهائياً (إلى المهملات). الطلب يبقى في السجل.</span>
                <button className="btn sm danger" disabled={busy === o.id} onClick={() => removeReceipt(o)}>
                  {busy === o.id ? "جارٍ الحذف…" : "نعم، احذف الإيصال"}
                </button>
                <button className="btn sm ghost" onClick={() => setConfirm("")}>إلغاء</button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ربط Google Drive                                                   */
/* ------------------------------------------------------------------ */

function DriveSetup({ adminKey, setAdminKey }) {
  const cfg = getDriveConfig();
  const [url, setUrl] = useState(cfg.url);
  const [publicKey, setPublicKey] = useState(cfg.publicKey);
  const [key, setKey] = useState(adminKey || cfg.adminKey);
  const [status, setStatus] = useState({ state: "idle", text: "", info: null });
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/apps-script/Code.gs").then((r) => r.text()).then(setCode).catch(() => setCode(""));
  }, []);

  const save = () => {
    const bad = validateBridgeUrl(url);
    if (bad) { setMsg(bad); return; }
    saveDriveConfig({ url, publicKey, adminKey: key });
    setAdminKey(key);
    setMsg("تم حفظ إعدادات الاتصال على هذا الجهاز.");
  };

  async function test() {
    const bad = validateBridgeUrl(url);
    if (bad) { setStatus({ state: "error", text: bad, info: null }); return; }
    setStatus({ state: "loading", text: "جارٍ اختبار الاتصال…", info: null });
    try {
      saveDriveConfig({ url, publicKey, adminKey: key });
      setAdminKey(key);
      const res = await pingDrive(url);
      setStatus({ state: "ok", text: `متصل بحساب ${res.account}`, info: res.folder });
    } catch (err) {
      setStatus({ state: "error", text: err.message, info: null });
    }
  }

  async function testKey() {
    setStatus({ state: "loading", text: "جارٍ التحقق من مفتاح الإدارة…", info: null });
    try {
      saveDriveConfig({ url, publicKey, adminKey: key });
      setAdminKey(key);
      const res = await testAdminKey(key, url);
      setStatus({ state: "ok", text: "مفتاح الإدارة صحيح — يمكنك عرض وتنزيل وحذف الإيصالات.", info: res.folder });
    } catch (err) {
      setStatus({ state: "error", text: err.message, info: null });
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("code");
      setTimeout(() => setCopied(""), 2000);
    } catch { setMsg("تعذر النسخ، استخدم زر التنزيل ثم افتح الملف."); }
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Athar-Receipts-Code.gs";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };

  return (
    <div className="panel wide">
      <h3>ربط الإيصالات بـ Google Drive</h3>
      <p className="note">
        الإيصالات تُحفظ في حساب <b dir="ltr">{DRIVE_ACCOUNT}</b> داخل مجلد <b>{DRIVE_FOLDER_LABEL}</b>.
        الربط يحتاج خطوة واحدة من حساب الأستوديو (مرة واحدة فقط).
      </p>

      <div className={`bridge ${status.state}`}>
        <div>
          <b>{status.state === "ok" ? "الاتصال يعمل" : status.state === "error" ? "الاتصال غير مكتمل" : cfg.url ? "الإعداد محفوظ" : "لم يُربط بعد"}</b>
          <p className="note small">{status.text || (cfg.url ? "اضغط «اختبار الاتصال» للتأكد." : "اتبع الخطوات أدناه ثم الصق الرابط.")}</p>
          {status.info && (
            <p className="note small">
              المجلد: <b>{status.info.name}</b>{" "}
              <a href={status.info.url} target="_blank" rel="noreferrer">فتح المجلد ↗</a>
            </p>
          )}
        </div>
      </div>

      <details className="steps" open>
        <summary>خطوات التركيب (5 دقائق)</summary>
        <ol>
          <li>افتح <a href="https://script.new" target="_blank" rel="noreferrer">script.new</a> وأنت مسجّل بحساب <b dir="ltr">{DRIVE_ACCOUNT}</b>.</li>
          <li>احذف المحتوى الافتراضي، ثم اضغط «نسخ الكود» هنا والصقه في المحرر.</li>
          <li>غيّر <code>ADMIN_KEY</code> أعلى الملف إلى كلمة مرور قوية، واحفظ (Ctrl+S).</li>
          <li>نشر ← نشر كتطبيق ويب: تنفيذ باسم <b>أنا</b>، ومن يمكنه الوصول <b>أي شخص</b>، ثم انشر ووافق على الأذونات.</li>
          <li>انسخ «عنوان تطبيق الويب» (ينتهي بـ <code dir="ltr">/exec</code>) والصقه في الحقل أدناه، ثم اضغط «اختبار الاتصال».</li>
          <li>ضع نفس كلمة المرور في حقل «مفتاح الإدارة» واضغط «اختبار المفتاح» — وبذلك تصبح لوحة الإدارة قادرة على تنزيل الإيصالات وحذفها.</li>
        </ol>
        <p className="note small">
          المجلد يُنشأ تلقائياً عند أول إيصال. لا تحتاج إلى مشاركة المجلد مع أي شخص؛ الوصول يمر عبر الجسر بكلمة المرور.
          عند تغيير <code>PUBLIC_KEY</code> يجب إعادة نشر التطبيق (نشر ← إدارة النشرات ← تعديل ← إصدار جديد).
        </p>
        <div className="code-actions">
          <button className="btn sm" onClick={copyCode} disabled={!code}>{copied === "code" ? "تم النسخ ✓" : "نسخ الكود"}</button>
          <button className="btn sm ghost" onClick={downloadCode} disabled={!code}>تنزيل Code.gs</button>
        </div>
      </details>

      <div className="connect">
        <Field label="رابط تطبيق الويب (Web App URL)" value={url} onChange={setUrl} />
        <div className="two">
          <Field label="مفتاح الرفع العام (PUBLIC_KEY)" value={publicKey} onChange={setPublicKey} />
          <Field label="مفتاح الإدارة (ADMIN_KEY)" value={key} onChange={setKey} />
        </div>
        <p className="note small">
          مفتاح الإدارة يبقى على هذا الجهاز فقط ولا يُحفظ في الموقع أو Firestore؛ يتحقق منه Apps Script عند كل طلب.
        </p>
        <div className="code-actions">
          <button className="btn" onClick={test}>اختبار الاتصال</button>
          <button className="btn ghost" onClick={testKey}>اختبار المفتاح</button>
          <button className="btn ghost" onClick={save}>حفظ</button>
        </div>
        {msg && <p className="note">{msg}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* بقية الأقسام                                                       */
/* ------------------------------------------------------------------ */

function ContentEditor() {
  const [c, setC] = useState(DEFAULT_CONTENT);
  const first = useRef(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "site", "content"),
      (snap) => { if (first.current) { first.current = false; setC(mergeContent(snap.exists() ? snap.data() : null)); } },
      () => { first.current = false; }
    );
    return unsub;
    // eslint-disable-next-line
  }, []);

  const setIn = (section, key) => (v) => setC((s) => ({ ...s, [section]: { ...s[section], [key]: v } }));
  const setItem = (list, i, key) => (v) =>
    setC((s) => ({ ...s, [list]: s[list].map((it, idx) => (idx === i ? { ...it, [key]: v } : it)) }));

  const setPrice = (i, j) => (v) =>
    setC((s) => {
      const price = (s.price || DEFAULT_CONTENT.price).map((r) => [...r]);
      price[i][j] = v;
      return { ...s, price };
    });

  async function save() {
    setMsg("جارٍ الحفظ…");
    try {
      await setDoc(doc(db, "site", "content"), c);
      setMsg("تم الحفظ ✓");
    } catch (e) {
      console.error(e);
      setMsg(e.code === "permission-denied" ? "رُفض الحفظ: انشر firestore.rules وتأكد من بريد المدير." : "تعذر الحفظ.");
    }
  }

  return (
    <div className="panel">
      <h3>الواجهة الرئيسية</h3>
      <Field label="العنوان" value={c.hero.title} onChange={setIn("hero", "title")} />
      <Field label="الوصف" value={c.hero.subtitle} onChange={setIn("hero", "subtitle")} area />
      <Field label="نص الزر" value={c.hero.cta} onChange={setIn("hero", "cta")} />
      <h3>عن أثر</h3>
      <Field label="النص" value={c.about.text} onChange={setIn("about", "text")} area />
      <h3>الخدمات</h3>
      {c.services.map((s, i) => (
        <div className="sub" key={i}>
          <Field label={`خدمة ${i + 1} — العنوان`} value={s.title} onChange={setItem("services", i, "title")} />
          <Field label="الوصف" value={s.text} onChange={setItem("services", i, "text")} area />
        </div>
      ))}
      <h3>الأعمال</h3>
      {c.works.map((w, i) => (
        <div className="sub" key={i}>
          <Field label={`عمل ${i + 1} — العنوان`} value={w.title} onChange={setItem("works", i, "title")} />
          <Field label="التصنيف" value={w.category} onChange={setItem("works", i, "category")} />
        </div>
      ))}
      <h3>أسعار الباقات</h3>
      {c.services.map((s, i) => DET[i] && DET[i].pk.map((k, j) => (
        <Field key={`${i}-${j}`} label={`${s.title} — ${k[0]}`} value={(c.price && c.price[i] && c.price[i][j]) || ""} onChange={setPrice(i, j)} />
      )))}
      <h3>التواصل</h3>
      <Field label="البريد" value={c.contact.email} onChange={setIn("contact", "email")} />
      <Field label="إنستغرام" value={c.contact.instagram} onChange={setIn("contact", "instagram")} />
      <button className="btn" onClick={save}>حفظ التعديلات</button>
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}

function Requests() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => { setError(""); setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); },
      (e) => setError(e.code === "permission-denied" ? "لا توجد صلاحية قراءة: انشر firestore.rules." : "تعذر تحميل الطلبات.")
    );
  }, []);

  const setStatus = (id, status) => updateDoc(doc(db, "requests", id), { status }).catch(console.error);

  return (
    <div className="panel">
      <h3>طلبات العملاء ({items.length})</h3>
      {error && <p className="err">{error}</p>}
      {!error && items.length === 0 && <p className="note">لا توجد طلبات بعد.</p>}
      {items.map((r) => (
        <article className="req" key={r.id}>
          <header>
            <strong>{r.name}</strong>
            <select value={r.status || "new"} onChange={(e) => setStatus(r.id, e.target.value)}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </header>
          <p dir="auto">{r.contact}{r.service ? ` — ${r.service}` : ""}</p>
          <p dir="auto">{r.message}</p>
          <small>{when(r.createdAt)}</small>
        </article>
      ))}
    </div>
  );
}

const toLines = (files) => (Array.isArray(files) ? files.map((f) => `${f.label} | ${f.url}`).join("\n") : "");
const fromLines = (text) =>
  String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf("|");
    return i === -1 ? { label: "تحميل الملفات", url: l } : { label: l.slice(0, i).trim() || "تحميل الملفات", url: l.slice(i + 1).trim() };
  }).filter((f) => /^https?:\/\//i.test(f.url));

function Deliveries() {
  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getDocs(collection(db, "deliveries"))
      .then((snap) => {
        const o = {};
        snap.docs.forEach((d) => { const x = d.data(); o[d.id] = { text: toLines(x.files) || (x.url ? `تحميل الملفات | ${x.url}` : ""), note: x.note || "" }; });
        setVals(o);
      })
      .catch((e) => setMsg(e.code === "permission-denied" ? "لا توجد صلاحية: انشر firestore.rules المحدّثة." : "تعذر التحميل."));
  }, []);

  const set = (id, k) => (v) => setVals((s) => ({ ...s, [id]: { ...(s[id] || {}), [k]: v } }));
  const [folders, setFolders] = useState(null);
  async function makeFolders() {
    setMsg("جارٍ إنشاء المجلدات…");
    try {
      const r = await setupDeliveryFolders(getDriveConfig().adminKey);
      setFolders(r.folders); setMsg("المجلدات جاهزة.");
    } catch (e) { setMsg(e.message || "تعذر الإنشاء؛ تأكد من مفتاح الإدارة في تبويب Drive."); }
  }

  async function save(id) {
    setMsg("جارٍ الحفظ…");
    try {
      const v = vals[id] || {};
      await setDoc(doc(db, "deliveries", id), { files: fromLines(v.text), note: v.note || "" });
      setMsg("تم الحفظ ✓");
    } catch (e) { console.error(e); setMsg("تعذر الحفظ."); }
  }

  return (
    <div className="panel">
      <h3>ملفات تسليم الحزم</h3>
      <div className="sub">
        <p className="note">الطريقة الأساسية: ضع ملفات كل حزمة في مجلدها داخل Drive (Athar / Deliveries / رقم الحزمة)، فتظهر للعميل تلقائياً بعد تأكيد الدفع ويتحقق Drive نفسه من ذلك. الروابط أدناه احتياطية فقط.</p>
        <button className="btn" onClick={makeFolders}>إنشاء مجلدات التسليم وعرض روابطها</button>
        {folders && <ul>{folders.map((f) => <li key={f.bundleId}><a href={f.url} target="_blank" rel="noreferrer">{f.bundleId}</a> — {f.files} ملف</li>)}</ul>}
      </div>
      <p className="note">اكتب كل ملف في سطر بصيغة: اسم الزر | الرابط (Drive أو Notion…). لا يراها إلا العميل الذي اكتمل طلبه.</p>
      {BUNDLES.map((b) => (
        <div className="sub" key={b.id}>
          <Field label={`${b.title} — الملفات`} value={(vals[b.id] && vals[b.id].text) || ""} onChange={set(b.id, "text")} area />
          <Field label="ملاحظة للعميل (اختياري)" value={(vals[b.id] && vals[b.id].note) || ""} onChange={set(b.id, "note")} />
          <button className="btn" onClick={() => save(b.id)}>حفظ</button>
        </div>
      ))}
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* الفريق والصلاحيات                                                  */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function TeamPanel({ currentEmail }) {
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => onSnapshot(
    collection(db, "admins"),
    (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.role === "sub" ? 0 : -1))),
    (e) => setMsg(e.code === "permission-denied" ? "لا توجد صلاحية: انشر firestore.rules المحدّثة." : "تعذر تحميل الفريق.")
  ), []);

  const subs = rows.filter((r) => r.role === "sub");
  const full = subs.length >= ATHAR_CONFIG.maxSubAdmins;

  async function add() {
    setMsg("");
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) { setMsg("أدخل بريداً إلكترونياً صحيحاً."); return; }
    if (isSuperEmail(clean)) { setMsg("هذا بريد المدير العام، ولا يُضاف كمدير مساعد."); return; }
    if (full) { setMsg(`الحد الأقصى ${ATHAR_CONFIG.maxSubAdmins} مديرين مساعدين. أزل أحدهم أولاً.`); return; }
    if (subs.some((r) => r.id === clean)) { setMsg("هذا البريد مدير مساعد بالفعل."); return; }
    setBusy(true);
    try {
      await setDoc(doc(db, "admins", clean), {
        email: clean,
        role: "sub",
        addedAt: serverTimestamp(),
        addedBy: currentEmail || "",
      });
      setEmail("");
      setMsg("أُضيف المدير المساعد ✓ يستطيع الدخول برابط سحري إلى نفس البريد.");
    } catch (e) {
      console.error(e);
      setMsg(e.code === "permission-denied" ? "رُفض الطلب: قواعد Firestore تسمح للمدير العام فقط." : "تعذر الإضافة.");
    } finally { setBusy(false); }
  }

  async function remove(id) {
    setBusy(true);
    try {
      await deleteDoc(doc(db, "admins", id));
      setMsg("أُزيل الحساب ✓");
    } catch (e) {
      console.error(e);
      setMsg("تعذر الإزالة.");
    } finally { setBusy(false); }
  }

  return (
    <div className="panel wide">
      <h3>المديرون والصلاحيات</h3>
      <p className="note">
        المدير العام: <b dir="ltr">{ATHAR_CONFIG.superAdmins.join(" · ")}</b> — يملك كل الصلاحيات.
        المدير المساعد يضيف ويخفي الخدمات والقوالب، ويتابع الطلبات والتسليم فقط، ولا يغيّر الأيقونات ولا الصلاحيات.
      </p>

      <div className="team-list">
        {ATHAR_CONFIG.superAdmins.map((m) => (
          <div className="team-row" key={m}>
            <div><b dir="ltr">{m}</b><small>المدير العام — كل الصلاحيات</small></div>
            <span className="role-pill super">المدير العام</span>
          </div>
        ))}
        {subs.map((r) => (
          <div className="team-row" key={r.id}>
            <div><b dir="ltr">{r.email || r.id}</b><small>أُضيف {when(r.addedAt)}</small></div>
            <span className="role-pill sub">مدير مساعد</span>
            <button className="btn sm danger" disabled={busy} onClick={() => remove(r.id)}>إزالة</button>
          </div>
        ))}
        {subs.length === 0 && <p className="note small">لا يوجد مديرون مساعدون بعد.</p>}
      </div>

      <div className="sub">
        <Field label={`إضافة مدير مساعد (${subs.length}/${ATHAR_CONFIG.maxSubAdmins})`} value={email} onChange={setEmail} />
        <button className="btn" onClick={add} disabled={busy || full}>إضافة مدير مساعد</button>
        {full && <p className="note small">وصلت للحد الأقصى — أزل أحد المديرين لإضافة غيره.</p>}
      </div>
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* سجل الموافقات                                                      */
/* ------------------------------------------------------------------ */

function ConsentsPanel() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => onSnapshot(
    query(collection(db, "consents"), orderBy("acceptedAt", "desc")),
    (snap) => { setError(""); setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); },
    (e) => setError(e.code === "permission-denied" ? "لا توجد صلاحية: سجل الموافقات للمدير العام فقط." : "تعذر تحميل السجل.")
  ), []);

  return (
    <div className="panel wide">
      <h3>سجل الموافقات القانونية ({rows.length})</h3>
      <p className="note">
        يُسجَّل تلقائياً عند كل دخول: البريد، التاريخ، إصدار الشروط وسياسة الخصوصية، ونوع المتصفح.
        السجل للقراءة فقط ولا يُحذف من الواجهة.
      </p>
      {error && <p className="err">{error}</p>}
      {!error && rows.length === 0 && <p className="note">لا توجد موافقات مسجلة بعد.</p>}
      {rows.map((r) => (
        <article className="req" key={r.id}>
          <header>
            <strong dir="ltr">{r.email}</strong>
            <small>{when(r.acceptedAt)}</small>
          </header>
          <p className="note small">
            الشروط: {r.termsVersion || "—"} · الخصوصية: {r.privacyVersion || "—"} · الوسيلة: {r.provider === "google" ? "Google" : "رابط سحري"}
          </p>
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* الخدمات والأيقونات والقوالب                                        */
/* ------------------------------------------------------------------ */

function CatalogPanel({ isSuper }) {
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [first, setFirst] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "site", "content"), (snap) => {
      if (first) { setFirst(false); setC(mergeContent(snap.exists() ? snap.data() : null)); }
    }, (e) => {
      if (first) { setFirst(false); setC(mergeContent(null)); }
      setMsg(e.code === "permission-denied" ? "قراءة المحتوى عامة؛ إن ظهرت هذه الرسالة راجع قواعد Firestore." : "تعذر تحميل المحتوى، عُرضت النسخة الافتراضية.");
    });
    return unsub;
    // eslint-disable-next-line
  }, []);

  const setSvc = (i, key) => (v) => setC((s) => ({ ...s, services: s.services.map((x, j) => (j === i ? { ...x, [key]: v } : x)) }));

  const addService = () => setC((s) => ({
    ...s,
    services: [...s.services, { title: `خدمة ${s.services.length + 1}`, text: "", visible: true, iconUrl: "" }],
  }));

  const removeService = (i) => setC((s) => ({ ...s, services: s.services.filter((_, j) => j !== i) }));

  async function saveServices() {
    setBusy("svc"); setMsg("");
    try {
      if (isSuper) await setDoc(doc(db, "site", "content"), c);
      else await updateDoc(doc(db, "site", "content"), { services: c.services });
      setMsg("تم حفظ الخدمات ✓ وتظهر للزوار فوراً.");
    } catch (e) {
      console.error(e);
      setMsg(e.code === "permission-denied" ? "رُفض الحفظ: راجع firestore.rules وصلاحية حسابك." : "تعذر الحفظ.");
    } finally { setBusy(""); }
  }

  async function uploadIcon(i, file) {
    if (!file) return;
    setBusy(`ic${i}`); setMsg("");
    try {
      const clean = file.name.replace(/[^\w.\-]+/g, "-").slice(-40);
      const path = `site/icons/${Date.now()}-${clean}`;
      const snap = await uploadBytes(storageRef(storage, path), file, { contentType: file.type || "image/png" });
      const url = await getDownloadURL(snap.ref);
      const next = { ...c, services: c.services.map((x, j) => (j === i ? { ...x, iconUrl: url } : x)) };
      setC(next);
      await setDoc(doc(db, "site", "content"), next);
      setMsg("تم رفع الأيقونة وتحديثها ✓");
    } catch (e) {
      console.error(e);
      setMsg(e.code === "storage/unauthorized" ? "رفض التخزين الرفع: انشر storage.rules المحدّثة." : "تعذر رفع الأيقونة.");
    } finally { setBusy(""); }
  }

  if (!c) return <div className="panel wide"><p className="note">جارٍ التحميل…</p></div>;

  return (
    <div className="panel wide">
      <h3>الخدمات والأيقونات</h3>
      <p className="note">
        {isSuper
          ? "المدير العام: تعديل النصوص، إضافة/إخفاء خدمة، رفع أيقونة جديدة، وحفظ فوري لجميع الزوار."
          : "المدير المساعد: إضافة خدمة أو إخفاء/إظهار خدمة حالية. رفع الأيقونات وتعديل المحتوى العام للمدير العام فقط."}
      </p>

      {c.services.map((s, i) => (
        <div className="sub" key={i}>
          <div className="svc-head">
            <span className="svc-ic">
              {s.iconUrl ? <img src={s.iconUrl} alt="" /> : <span className="note small">بدون أيقونة</span>}
            </span>
            <label className="switch">
              <input type="checkbox" checked={s.visible !== false} onChange={(e) => setSvc(i, "visible")(e.target.checked)} />
              <span>{s.visible !== false ? "ظاهرة للزوار" : "مخفية"}</span>
            </label>
          </div>
          <Field label={`خدمة ${i + 1} — العنوان`} value={s.title} onChange={setSvc(i, "title")} />
          <Field label="الوصف" value={s.text} onChange={setSvc(i, "text")} area />
          {isSuper && (
            <div className="code-actions">
              <label className="btn sm ghost upload">
                {busy === `ic${i}` ? "جارٍ الرفع…" : "رفع أيقونة"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden
                  onChange={(e) => { uploadIcon(i, e.target.files && e.target.files[0]); e.target.value = ""; }} />
              </label>
              {s.iconUrl && <button className="btn sm ghost" onClick={() => setSvc(i, "iconUrl")("")}>إزالة الأيقونة</button>}
              <button className="btn sm danger" onClick={() => removeService(i)}>حذف الخدمة</button>
            </div>
          )}
        </div>
      ))}

      <div className="code-actions">
        <button className="btn ghost" onClick={addService}>+ إضافة خدمة</button>
        <button className="btn" onClick={saveServices} disabled={busy === "svc"}>{busy === "svc" ? "جارٍ الحفظ…" : "حفظ الخدمات"}</button>
      </div>
      {msg && <p className="note">{msg}</p>}

      <TemplatesPanel isSuper={isSuper} />
    </div>
  );
}

const TPL_EMPTY = { name: "قالب جديد", bg: "#050402", fg: "#F8F6F2", ac: "#948369", hidden: false };

function TemplatesPanel({ isSuper }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => onSnapshot(
    collection(db, "templates"),
    (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => setMsg(e.code === "permission-denied" ? "تعذر تحميل القوالب." : "")
  ), []);

  async function add() {
    setBusy(true);
    try {
      const id = `tpl-${Date.now()}`;
      await setDoc(doc(db, "templates", id), { ...TPL_EMPTY, order: rows.length + 1, createdAt: serverTimestamp() });
      setMsg("أُضيف قالب جديد ✓");
    } catch (e) { setMsg("تعذر الإضافة."); } finally { setBusy(false); }
  }

  const patch = (id, key, value) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [key]: value } : x)));

  async function save(row) {
    const { id, ...data } = row;
    try {
      await setDoc(doc(db, "templates", id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      setMsg("حُفظ القالب ✓");
    } catch { setMsg("تعذر حفظ القالب."); }
  }

  async function remove(id) {
    try { await deleteDoc(doc(db, "templates", id)); setMsg("حُذف القالب."); } catch { setMsg("تعذر الحذف."); }
  }

  return (
    <div className="sub templates-admin">
      <h3>قوالب الاستديو</h3>
      <p className="note small">القوالب المضافة هنا تظهر بجانب قوالب المنصة الافتراضية. الإخفاء متاح للمدير المساعد، والحذف للمدير العام.</p>
      {rows.map((t) => (
        <div className="tpl-row" key={t.id}>
          <input className="tpl-name" value={t.name || ""} onChange={(e) => patch(t.id, "name", e.target.value)} />
          <input type="color" value={t.bg || "#050402"} onChange={(e) => patch(t.id, "bg", e.target.value)} title="الخلفية" />
          <input type="color" value={t.fg || "#F8F6F2"} onChange={(e) => patch(t.id, "fg", e.target.value)} title="النص" />
          <input type="color" value={t.ac || "#948369"} onChange={(e) => patch(t.id, "ac", e.target.value)} title="اللون المميز" />
          <label className="switch">
            <input type="checkbox" checked={t.hidden !== true} onChange={(e) => { patch(t.id, "hidden", !e.target.checked); save({ ...t, hidden: !e.target.checked }); }} />
            <span>{t.hidden ? "مخفي" : "ظاهر"}</span>
          </label>
          <button className="btn sm" onClick={() => save(t)}>حفظ</button>
          {isSuper && <button className="btn sm danger" onClick={() => remove(t.id)}>حذف</button>}
        </div>
      ))}
      <button className="btn ghost" onClick={add} disabled={busy}>+ إضافة قالب</button>
      {msg && <p className="note small">{msg}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* لوحة الإدارة                                                       */
/* ------------------------------------------------------------------ */

export default function Admin() {
  const { user, role, isAdmin, isSuper, loading, openAuth, signOutUser } = useSession();
  const [tab, setTab] = useState("orders");
  const [adminKey, setAdminKey] = useState(() => getDriveConfig().adminKey);
  const [connected, setConnected] = useState(Boolean(getDriveConfig().url));

  useEffect(() => {
    const on = () => setConnected(Boolean(getDriveConfig().url));
    window.addEventListener("athar:drive-config", on);
    return () => window.removeEventListener("athar:drive-config", on);
  }, []);

  useEffect(() => {
    if (!isSuper && ["content", "team", "consents", "drive", "features"].includes(tab)) setTab("orders");
  }, [isSuper, tab]);

  if (loading) return <div className="fatal"><p>جارٍ التحميل…</p></div>;

  if (!user) {
    return (
      <div className="fatal">
        <h1>لوحة إدارة أثر</h1>
        <p>سجّل الدخول بحساب معتمد. الدخول برابط سحري إلى بريدك أو عبر Google، بعد الموافقة على الشروط.</p>
        <button className="btn" onClick={openAuth}>تسجيل الدخول</button>
        <a className="back" href="#/">← العودة للموقع</a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fatal">
        <h1>لوحة إدارة أثر</h1>
        <p dir="ltr">{user.email}</p>
        <p>هذا الحساب لا يملك صلاحية إدارية. صلاحية الإدارة تُمنح من المدير العام داخل لوحة الإدارة، وتُتحقق منها قواعد الخادم.</p>
        <button className="btn ghost" onClick={signOutUser}>تسجيل الخروج</button>
        <a className="back" href="#/">← العودة للموقع</a>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <strong>لوحة الإدارة</strong>
        <span className={`role-pill ${isSuper ? "super" : "sub"}`}>{ROLE_LABEL[role]}</span>
        <div className="tabs">
          <button className={tab === "orders" ? "tab on" : "tab"} onClick={() => setTab("orders")}>الطلبات والإيصالات</button>
          <button className={tab === "catalog" ? "tab on" : "tab"} onClick={() => setTab("catalog")}>الخدمات والقوالب</button>
          <button className={tab === "svcreq" ? "tab on" : "tab"} onClick={() => setTab("svcreq")}>طلبات الخدمات</button>
          <button className={tab === "requests" ? "tab on" : "tab"} onClick={() => setTab("requests")}>طلبات التواصل</button>
          <button className={tab === "delivery" ? "tab on" : "tab"} onClick={() => setTab("delivery")}>التسليم</button>
          {isSuper && <button className={tab === "content" ? "tab on" : "tab"} onClick={() => setTab("content")}>المحتوى</button>}
          {isSuper && <button className={tab === "features" ? "tab on" : "tab"} onClick={() => setTab("features")}>الأقسام</button>}
          {isSuper && <button className={tab === "team" ? "tab on" : "tab"} onClick={() => setTab("team")}>الفريق</button>}
          {isSuper && <button className={tab === "consents" ? "tab on" : "tab"} onClick={() => setTab("consents")}>الموافقات</button>}
          {isSuper && <button className={tab === "drive" ? "tab on" : "tab"} onClick={() => setTab("drive")}>ربط Drive</button>}
          <a className="tab" href="#creative">صانع الهوية</a>
          <a className="tab" href="#/">الموقع</a>
          <button className="tab" onClick={signOutUser}>خروج</button>
        </div>
      </header>

      {!connected && isSuper && tab === "orders" && (
        <div className="panel wide">
          <div className="banner">
            <div>
              <b>Google Drive غير مربوط بعد</b>
              <p className="note small">الإيصالات الجديدة تُحفظ مؤقتاً في مساحة المنصة. اربط Drive لتصلك في مجلد أثر وتستطيع تنزيلها وحذفها من هنا.</p>
            </div>
            <button className="btn sm" onClick={() => setTab("drive")}>ربط الآن</button>
          </div>
        </div>
      )}

      {tab === "orders" && <ReceiptManager adminKey={adminKey} />}
      {tab === "catalog" && <CatalogPanel isSuper={isSuper} />}
      {tab === "drive" && isSuper && <DriveSetup adminKey={adminKey} setAdminKey={setAdminKey} />}
      {tab === "svcreq" && <ServiceRequestsAdmin />}
      {tab === "requests" && <Requests />}
      {tab === "delivery" && <Deliveries />}
      {tab === "content" && isSuper && <ContentEditor />}
      {tab === "features" && isSuper && <FeaturesPanel />}
      {tab === "team" && isSuper && <TeamPanel currentEmail={user.email} />}
      {tab === "consents" && isSuper && <ConsentsPanel />}
    </div>
  );
}
