import { useEffect, useState } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_CONTENT, mergeContent } from "./defaultContent";

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Work({ w, i }) {
  const [broken, setBroken] = useState(false);
  const [vbroken, setVBroken] = useState(false);
  return (
    <figure className={`work work-${(i % 3) + 1}`}>
      {w.video && !vbroken ? (
        <video src={w.video} poster={w.image || undefined} muted loop playsInline autoPlay preload="metadata" onError={() => setVBroken(true)} />
      ) : (
        w.image && !broken && <img src={w.image} alt={w.title} loading="lazy" onError={() => setBroken(true)} />
      )}
      <figcaption>
        <span>{w.category}</span>
        <strong>{w.title}</strong>
      </figcaption>
    </figure>
  );
}

function ContactForm({ services }) {
  const empty = { name: "", contact: "", service: "", message: "" };
  const [form, setForm] = useState(empty);
  const [state, setState] = useState({ status: "idle", error: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
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
      <input placeholder="الاسم" value={form.name} onChange={set("name")} maxLength={100} />
      <input placeholder="البريد أو رقم الجوال" value={form.contact} onChange={set("contact")} maxLength={150} />
      <select value={form.service} onChange={set("service")}>
        <option value="">نوع الخدمة (اختياري)</option>
        {services.map((s) => (
          <option key={s.title} value={s.title}>{s.title}</option>
        ))}
      </select>
      <textarea rows={5} placeholder="حدّثنا عن مشروعك" value={form.message} onChange={set("message")} maxLength={2000} />
      <button className="btn" disabled={state.status === "sending"}>
        {state.status === "sending" ? "جارٍ الإرسال…" : "إرسال الطلب"}
      </button>
      {state.status === "done" && <p className="ok">وصلنا طلبك، سنتواصل معك قريباً.</p>}
      {state.status === "error" && <p className="err">{state.error}</p>}
    </form>
  );
}

export default function Site() {
  const [c, setC] = useState(DEFAULT_CONTENT);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "site", "content"),
      (snap) => setC(mergeContent(snap.exists() ? snap.data() : null)),
      (err) => { console.warn("Using default content:", err.code); setC(DEFAULT_CONTENT); }
    );
    return unsub;
  }, []);

  const go = (id) => { setMenu(false); scrollToId(id); };

  return (
    <>
      <header className="nav">
        <button className="hb" aria-label="القائمة" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>☰</button>
        <a className="logo" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <img src="/logo.png" alt="أثر" />
          <span>ATHAR STUDIO</span>
        </a>
        <nav className={`mn ${menu ? "o" : ""}`}>
          <button onClick={() => go("about")}>عن أثر</button>
          <button onClick={() => go("services")}>الخدمات</button>
          <button onClick={() => go("works")}>الأعمال</button>
          <button onClick={() => go("contact")}>التواصل</button>
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
          <h2>{c.about.title}</h2>
          <p className="about-text">{c.about.text}</p>
        </section>

        <section className="section alt" id="services">
          <h2>الخدمات</h2>
          <div className="grid">
            {c.services.map((s, i) => (
              <article className="card" key={i}>
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="works">
          <h2>الأعمال</h2>
          <div className="works">
            {c.works.map((w, i) => <Work key={i} w={w} i={i} />)}
          </div>
        </section>

        <section className="section alt" id="contact">
          <h2>{c.contact.title}</h2>
          <div className="contact">
            <div className="contact-info">
              <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>
              <a href={`https://instagram.com/${c.contact.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">
                {c.contact.instagram}
              </a>
            </div>
            <ContactForm services={c.services} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© {c.footerYear} أثر — ATHAR STUDIO · لكل حكاية أثر</span>
        <a href="#studio">استديو القوالب</a>
      </footer>
    </>
  );
}
