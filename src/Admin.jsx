import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { ADMIN_EMAIL, auth, db, googleProvider } from "./firebase";
import { DEFAULT_CONTENT, mergeContent } from "./defaultContent";

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

function ContentEditor() {
  const [c, setC] = useState(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "site", "content"),
      (snap) => { if (!loaded) setC(mergeContent(snap.exists() ? snap.data() : null)); setLoaded(true); },
      () => setLoaded(true)
    );
    return unsub;
    // eslint-disable-next-line
  }, []);

  const setIn = (section, key) => (v) => setC((s) => ({ ...s, [section]: { ...s[section], [key]: v } }));
  const setItem = (list, i, key) => (v) =>
    setC((s) => ({ ...s, [list]: s[list].map((it, idx) => (idx === i ? { ...it, [key]: v } : it)) }));

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
          <small>{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString("ar-SA") : ""}</small>
        </article>
      ))}
    </div>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("requests");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

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
        <a className="back" href="#">← العودة للموقع</a>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <strong>لوحة الإدارة</strong>
        <div>
          <button className={tab === "requests" ? "tab on" : "tab"} onClick={() => setTab("requests")}>الطلبات</button>
          <button className={tab === "content" ? "tab on" : "tab"} onClick={() => setTab("content")}>المحتوى</button>
          <a className="tab" href="#studio">الاستديو</a>
          <a className="tab" href="#">الموقع</a>
          <button className="tab" onClick={() => signOut(auth)}>خروج</button>
        </div>
      </header>
      {tab === "requests" ? <Requests /> : <ContentEditor />}
    </div>
  );
}
