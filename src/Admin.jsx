import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { ADMIN_EMAIL, auth, db, googleProvider, storage } from "./firebase";
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
import Receipt from "./Receipt.jsx";
import DriveReceipt from "./DriveReceipt.jsx";

const STATUS = { new: "جديد", in_progress: "قيد المتابعة", completed: "مكتمل" };

function authMessage(err) {
  switch (err && err.code) {
    case "auth/unauthorized-domain":
      return `النطاق ${location.hostname} غير مضاف في Firebase ← Authentication ← Settings ← Authorized domains.`;
    case "auth/operation-not-allowed":
      return "مزوّد Google غير مفعّل في Firebase Authentication.";
    case "auth/popup-blocked":
      return "المتصفح حجب النافذة المنبثقة، اسمح بها وحاول مجدداً.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "أُغلقت نافذة تسجيل الدخول قبل الإكمال.";
    default:
      return "تعذر تسجيل الدخول، حاول مجدداً.";
  }
}

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

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("orders");
  const [adminKey, setAdminKey] = useState(() => getDriveConfig().adminKey);
  const [connected, setConnected] = useState(Boolean(getDriveConfig().url));

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const on = () => setConnected(Boolean(getDriveConfig().url));
    window.addEventListener("athar:drive-config", on);
    return () => window.removeEventListener("athar:drive-config", on);
  }, []);

  const isAdmin = user && user.emailVerified && user.email === ADMIN_EMAIL;

  async function login() {
    setError("");
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (!(res.user.emailVerified && res.user.email === ADMIN_EMAIL)) {
        await signOut(auth);
        setError("هذا الحساب غير مصرح له بدخول لوحة الإدارة.");
      }
    } catch (e) {
      console.error(e);
      setError(authMessage(e));
    }
  }

  if (user === undefined) return <div className="fatal"><p>جارٍ التحميل…</p></div>;

  if (!isAdmin) {
    return (
      <div className="fatal">
        <h1>لوحة إدارة أثر</h1>
        <p>سجّل الدخول بحساب Google المصرح به.</p>
        <button className="btn" onClick={login}>الدخول عبر Google</button>
        {error && <p className="err">{error}</p>}
        {user && !error && <p className="err">هذا الحساب غير مصرح له.</p>}
        <a className="back" href="#/">← العودة للموقع</a>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <strong>لوحة الإدارة</strong>
        <div className="tabs">
          <button className={tab === "orders" ? "tab on" : "tab"} onClick={() => setTab("orders")}>الطلبات والإيصالات</button>
          <button className={tab === "drive" ? "tab on" : "tab"} onClick={() => setTab("drive")}>ربط Drive</button>
          <button className={tab === "requests" ? "tab on" : "tab"} onClick={() => setTab("requests")}>طلبات التواصل</button>
          <button className={tab === "delivery" ? "tab on" : "tab"} onClick={() => setTab("delivery")}>التسليم</button>
          <button className={tab === "content" ? "tab on" : "tab"} onClick={() => setTab("content")}>المحتوى</button>
          <a className="tab" href="#studio">الاستديو</a>
          <a className="tab" href="#/">الموقع</a>
          <button className="tab" onClick={() => signOut(auth)}>خروج</button>
        </div>
      </header>

      {!connected && tab === "orders" && (
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
      {tab === "drive" && <DriveSetup adminKey={adminKey} setAdminKey={setAdminKey} />}
      {tab === "requests" && <Requests />}
      {tab === "delivery" && <Deliveries />}
      {tab === "content" && <ContentEditor />}
    </div>
  );
}
