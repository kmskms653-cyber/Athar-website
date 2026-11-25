import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useContent } from "./useContent";
import { ServiceIcon } from "./ServicePage.jsx";
import Store from "./Store.jsx";
import { useReveal } from "./useReveal";

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Work({ w, i }) {
  const [broken, setBroken] = useState(false);
  const [vbroken, setVBroken] = useState(false);
  return (
    <figure className={`work work-${(i % 3) + 1} rv`} style={{ "--d": `${i * 90}ms` }}>
      {w.video && !vbroken ? (
        <video src={w.video} poster={w.image || undefined} muted loop playsInline autoPlay preload="metadata" onError={() => setVBroken(true)} />
      ) : (
        w.image && !broken && <img src={w.image} alt={`${w.title} — ${w.category}`} loading="lazy" style={{ objectPosition: w.pos || "50% 50%" }} onError={() => setBroken(true)} />
      )}
      <figcaption>
        <span>{w.category}</span>
        <strong>{w.title}</strong>
      </figcaption>
    </figure>
  );
}

function ContactForm({ services, pick }) {
  const empty = { name: "", contact: "", service: "", message: "", website: "" };
  const [form, setForm] = useState(empty);
  const [state, setState] = useState({ status: "idle", error: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => { if (pick.v) setForm((f) => ({ ...f, service: pick.v, message: pick.msg || f.message })); }, [pick]);

  async function submit(e) {
    e.preventDefault();
    if (form.website) { setForm(empty); setState({ status: "done", error: "" }); return; } // فخ للروبوتات
    try {
      if (Date.now() - Number(sessionStorage.getItem("athar:last") || 0) < 60000) {
        setState({ status: "error", error: "أرسلت طلباً قبل لحظات، انتظر دقيقة ثم حاول مجدداً." });
        return;
      }
    } catch { /* ignore */ }
    const data = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      message: form.message.trim(),
    };
    if (!data.name || !data.contact || !data.message) {
      setState({ status: "error", error: "فضلاً أكمل الاسم ووسيلة التواصل والرسالة." });
      return;
    }
    setState({ status: "sending", error: "" });
    try {
      const payload = { ...data, status: "new", createdAt: serverTimestamp() };
      if (form.service) payload.service = form.service;
      await addDoc(collection(db, "requests"), payload);
      try { sessionStorage.setItem("athar:last", String(Date.now())); } catch { /* ignore */ }
      setForm(empty);
      setState({ status: "done", error: "" });
    } catch (err) {
      console.error(err);
      const denied = err && err.code === "permission-denied";
      setState({
        status: "error",
        error: denied
          ? "تعذر الإرسال: قواعد Firestore غير منشورة أو لا تسمح بالإرسال."
          : "تعذر إرسال الطلب، تحقق من الاتصال وحاول مجدداً.",
      });
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <input name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />
      <input aria-label="الاسم" placeholder="الاسم" value={form.name} onChange={set("name")} maxLength={100} />
      <input aria-label="البريد أو رقم الجوال" placeholder="البريد أو رقم الجوال" value={form.contact} onChange={set("contact")} maxLength={150} />
      <select aria-label="نوع الخدمة" value={form.service} onChange={set("service")}>
        <option value="">نوع الخدمة (اختياري)</option>
        {services.map((s) => (
          <option key={s.title} value={s.title}>{s.title}</option>
        ))}
      </select>
      <textarea rows={5} aria-label="تفاصيل مشروعك" placeholder="حدّثنا عن مشروعك" value={form.message} onChange={set("message")} maxLength={2000} />
      <button className="btn" disabled={state.status === "sending"}>
        {state.status === "sending" ? "جارٍ الإرسال…" : "إرسال الطلب"}
      </button>
      {state.status === "done" && <p className="ok">وصلنا طلبك، سنتواصل معك قريباً.</p>}
      {state.status === "error" && <p className="err">{state.error}</p>}
    </form>
  );
}

export default function Site() {
  const c = useContent();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useReveal(c);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const [pick] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("athar:order") || "null") || { v: "", n: 0 }; } catch { return { v: "", n: 0 }; }
  });

  useEffect(() => {
    const hashId = window.location.hash.slice(1);
    const target = pick.go || hashId; // يدعم الرابط المباشر مثل /#store القادم من صفحة الحساب
    if (target) setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "instant" }), 200);
    try { sessionStorage.removeItem("athar:order"); } catch { /* ignore */ }
    // eslint-disable-next-line
  }, []);

  const go = (id) => { setMenu(false); scrollToId(id); };

  return (
    <>
      <header className={`nav ${scrolled ? "scrolled" : ""}`}>
        <button className="hb" aria-label="القائمة" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>☰</button>
        <a className="logo" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <img src="/logo.png" alt="أثر" />
          <span>ATHAR STUDIO</span>
        </a>
        <a className="lgn" href="#account" aria-label="حسابي" title="حسابي وتسجيل الدخول">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </a>
        <nav className={`mn ${menu ? "o" : ""}`}>
          <button onClick={() => go("about")}>عن أثر</button>
          <button onClick={() => go("services")}>الخدمات</button>
          <button onClick={() => go("works")}>الأعمال</button>
          <button onClick={() => go("store")}>المتجر</button>
          <button onClick={() => go("contact")}>التواصل</button>
          <button onClick={() => { setMenu(false); window.location.hash = "#cards"; }}>بطاقات الإهداء والدعوة</button>
          <button onClick={() => { setMenu(false); window.location.hash = "#creative"; }}>صانع الهوية</button>
          <button onClick={() => { setMenu(false); window.location.hash = "#studio"; }}>استديو القوالب</button>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="deco" aria-hidden="true"><i /><i /><img src="/logo.png" alt="" /></div>
          <p className="kicker">{c.hero.kicker}</p>
          <h1>
            {c.hero.title}
            <span className="lg"><img src="/logo.png" alt="أثر" /><b>.</b></span>
          </h1>
          <p className="lead">{c.hero.subtitle}</p>
          <div className="cta">
            <button className="btn" onClick={() => go("works")}>{c.hero.cta} &nbsp;←</button>
            <button className="btn ghost" onClick={() => go("about")}>تعرّف على أثر</button>
          </div>
          <div className="hmeta">
            <span>الرياض — المملكة العربية السعودية</span>
            <span>إبداع • هوية • تجربة</span>
          </div>
        </section>

        <section className="section" id="about">
          <h2 className="rv">{c.about.title}</h2>
          <p className="about-text rv" style={{ "--d": "120ms" }}>{c.about.text}</p>
        </section>

        <section className="section alt" id="services">
          <h2 className="rv">الخدمات</h2>
          <div className="grid">
            {c.services.map((s, i) => ({ s, i })).filter(({ s }) => s.visible !== false).map(({ s, i }, n) => (
              <a className="card rv" style={{ "--d": `${n * 90}ms` }} key={i} href={`#service-${i + 1}`} aria-label={s.title}>
                <div className="ct1">
                  <span className="num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ic">{s.iconUrl ? <img className="ic-img" src={s.iconUrl} alt="" loading="lazy" /> : <ServiceIcon i={i % 4} />}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <span className="ar">↖</span>
              </a>
            ))}
          </div>
        </section>

        <section className="section" id="works">
          <h2 className="rv">الأعمال</h2>
          <div className="works">
            {c.works.map((w, i) => <Work key={i} w={w} i={i} />)}
          </div>
        </section>

        <Store title={c.store.title} subtitle={c.store.subtitle} />

        <section className="section" id="contact">
          <h2 className="rv">{c.contact.title}</h2>
          <div className="contact rv" style={{ "--d": "100ms" }}>
            <div className="contact-info">
              <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>
              <a href={`https://instagram.com/${c.contact.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">
                {c.contact.instagram}
              </a>
            </div>
            <ContactForm services={c.services} pick={pick} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© {c.footerYear} أثر — ATHAR STUDIO · لكل حكاية أثر</span>
        <nav className="foot-links">
          <a href="#cards">بطاقات الإهداء والدعوة</a>
          <a href="#creative">صانع الهوية</a>
          <a href="#studio">استديو القوالب</a>
          <a href="#terms">شروط الاستخدام</a>
          <a href="#privacy">سياسة الخصوصية</a>
        </nav>
      </footer>
    </>
  );
}
