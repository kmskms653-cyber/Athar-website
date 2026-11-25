import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useContent } from "./useContent";
import { BUNDLES } from "./bundles";
import "./home.css";
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

const BUNDLE_IMG = {
  "starter-bundle": "/img/pkg-start.jpg",
  "ads-bundle": "/img/svc-digital.jpg",
  "reels-bundle": "/img/svc-content.jpg",
  "athar-complete-bundle": "/img/svc-identity.jpg",
};

const SLIDES = [
  { img: "/img/hero-pen.jpg", title: "من الفكرة إلى أثر لا يُنسى", text: "نصنع الهويات، ونصمم المنتجات، ونحوّل الأفكار إلى أعمال فنية تحمل شخصيتك.", cta: "اكتشف خدماتنا", to: "services" },
  { img: "/img/svc-calligraphy.jpg", title: "بصمتك بخطٍّ عربي يشبهك", text: "لوحات وتوقيعات وبصمات مصممة بعناية لتبقى في ذاكرة من يراها.", cta: "البصمة والهوية", to: "#service-5" },
  { img: "/works/work-2.jpg", title: "تفاصيل صغيرة .. تصنع الفارق", text: "منتجات وهدايا تحمل هويتك بلمسة فاخرة من القلم إلى العطر.", cta: "تصفّح الأعمال", to: "works" },
];

const FEATURES = [
  ["جودة عالية", "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5"],
  ["إنجاز سريع", "M13 2L4 14h7l-1 8 9-12h-7z"],
  ["دعم مستمر", "M4 13v-1a8 8 0 0116 0v1 M4 13h3v5H5a1 1 0 01-1-1z M20 13h-3v5h2a1 1 0 001-1z"],
];

const Ico = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split(" M").map((p, i) => <path key={i} d={(i ? "M" : "") + p} />)}
  </svg>
);

export default function Site() {
  const c = useContent();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useReveal(c);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, [paused]);
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

  const go = (id) => {
    setMenu(false);
    if (id.startsWith("#")) window.location.hash = id; else scrollToId(id);
  };
  const order = c.serviceOrder && c.services.length === c.serviceOrder.length ? c.serviceOrder : c.services.map((_, i) => i);
  const sv = order.map((i) => ({ s: c.services[i], i })).filter(({ s }) => s && s.visible !== false);
  const fromPrice = (i) => {
    const vals = ((c.price && c.price[i]) || []).map((v) => Number(v)).filter((n) => n > 0);
    return vals.length ? `من ${Math.min(...vals)} ريال` : "اطلب عرض سعر";
  };
  const cur = SLIDES[slide];

  return (
    <div className="hm" dir="rtl">
      <header className={`hm-nav ${scrolled ? "scrolled" : ""}`}>
        <a className="hm-logo" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <img src="/logo.png" alt="أثر" /><small>ATHAR STUDIO</small>
        </a>
        <button className="hm-burger" aria-label="القائمة" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>☰</button>
        <nav className={`hm-menu ${menu ? "o" : ""}`}>
          <button className="on" onClick={() => go("home")}>الرئيسية</button>
          <div className="hm-dd">
            <button onClick={() => go("services")}>خدماتنا <i>▾</i></button>
            <div className="hm-sub">
              {sv.map(({ s, i }) => <a key={i} href={`#service-${i + 1}`} onClick={() => setMenu(false)}>{s.title}</a>)}
            </div>
          </div>
          <button onClick={() => go("store")}>الباقات</button>
          <button onClick={() => go("works")}>أعمالنا</button>
          <button onClick={() => go("about")}>من نحن</button>
          <div className="hm-dd">
            <button onClick={() => go("studio-banner")}>الاستديو <i>▾</i></button>
            <div className="hm-sub">
              <a href="#studio" onClick={() => setMenu(false)}>استديو القوالب</a>
              <a href="#cards" onClick={() => setMenu(false)}>بطاقات الإهداء والدعوة</a>
              <a href="#creative" onClick={() => setMenu(false)}>صانع الهوية والتوقيع</a>
            </div>
          </div>
        </nav>
        <div className="hm-actions">
          <a className="hm-order" href="#contact" onClick={(e) => { e.preventDefault(); go("contact"); }}>اطلب مشروعك ✈</a>
          <a className="hm-circ" href="#account" aria-label="حسابي" title="حسابي وتسجيل الدخول">
            <Ico d="M12 4a4 4 0 100 8 4 4 0 000-8z M4 21c0-4 3.6-7 8-7s8 3 8 7" size={18} />
          </a>
        </div>
      </header>

      <section className="hm-hero" id="home" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {SLIDES.map((sl, n) => <div key={sl.img} className={`hm-slide ${n === slide ? "on" : ""}`} style={{ backgroundImage: `url(${sl.img})` }} aria-hidden="true" />)}
        <div className="hm-shade" />
        <div className="hm-copy" key={slide}>
          <h1>{slide === 0 ? c.hero.slogan || cur.title : cur.title}</h1>
          <p>{cur.text}</p>
          <button className="hm-btn" onClick={() => go(cur.to)}>{cur.cta} <span>←</span></button>
          <ul className="hm-feat">
            {FEATURES.map(([t, d]) => <li key={t}><Ico d={d} /><span>{t}</span></li>)}
          </ul>
        </div>
        <div className="hm-ctrl">
          <button aria-label="السابق" onClick={() => setSlide((slide + SLIDES.length - 1) % SLIDES.length)}>›</button>
          <button aria-label="التالي" onClick={() => setSlide((slide + 1) % SLIDES.length)}>‹</button>
          <div className="hm-dots">{SLIDES.map((_, n) => <i key={n} className={n === slide ? "on" : ""} onClick={() => setSlide(n)} />)}</div>
        </div>
      </section>

      <section className="hm-sec" id="services">
        <h2 className="hm-h rv">خدماتنا الإبداعية</h2>
        <div className="hm-svc">
          {sv.map(({ s, i }, n) => (
            <a className="hm-card rv" style={{ "--d": `${n * 70}ms` }} key={i} href={`#service-${i + 1}`} aria-label={s.title}>
              <div className="hm-ph" style={{ backgroundImage: `url(${s.iconUrl || c.serviceImages?.[i] || ""})` }} />
              <div className="hm-cb">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <span className="hm-pill">{fromPrice(i)}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="hm-sec" id="store">
        <h2 className="hm-h rv">باقات أثر المميزة</h2>
        <div className="hm-pk">
          {BUNDLES.map((b, n) => (
            <a className="hm-pkg rv" style={{ "--d": `${n * 70}ms` }} key={b.id} href={`#bundle-${b.id}`}>
              <div className="hm-pi" style={{ backgroundImage: `url(${BUNDLE_IMG[b.id] || "/img/svc-identity.jpg"})` }} />
              <div className="hm-pt">
                <h3>{b.title}</h3>
                <p>{b.tagline}</p>
                <span className="hm-pill">🛒 {b.price} ريال</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="hm-banner rv" id="studio-banner" style={{ backgroundImage: "linear-gradient(90deg,#120b08 8%,#120b08c9 45%,#120b0866),url(/works/work-2.jpg)" }}>
        <div>
          <h2>استديو القوالب الإبداعي</h2>
          <p>صمّم بنفسك، خصص قوالبنا الجاهزة، واحصل على تصاميم احترافية في دقائق.</p>
          <div className="hm-row">
            <a className="hm-out" href="#studio">ادخل الاستديو ←</a>
            <a className="hm-out" href="#cards">بطاقات الإهداء والدعوة</a>
            <a className="hm-out" href="#creative">صانع الهوية والتوقيع</a>
          </div>
        </div>
      </section>

      <section className="hm-sec" id="works">
        <h2 className="hm-h rv">أعمالنا</h2>
        <div className="works">
          {c.works.map((w, i) => <Work key={i} w={w} i={i} />)}
        </div>
      </section>

      <section className="hm-sec hm-about" id="about">
        <div className="hm-av rv" style={{ backgroundImage: "url(/img/svc-content.jpg)" }} />
        <div className="rv" style={{ "--d": "100ms" }}>
          <h2 className="hm-h left">{c.about.title}</h2>
          <p>{c.about.text}</p>
        </div>
      </section>

      <section className="hm-sec" id="contact">
        <div className="hm-cta rv">
          <div className="hm-ctxt">
            <b>اطلب مشروعك الآن</b>
            <span>فريق أثر جاهز لتحقيق رؤيتك بأعلى جودة.</span>
            <div className="hm-soc">
              <a href={`https://instagram.com/${c.contact.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" aria-label="إنستغرام">IG</a>
              <a href={`mailto:${c.contact.email}`} aria-label="البريد">@</a>
            </div>
            <small>{c.contact.email} · {c.contact.instagram}</small>
          </div>
          <ContactForm services={c.services} pick={pick} />
        </div>
      </section>

      <footer className="hm-foot">
        <span className="hm-fl"><img src="/logo.png" alt="أثر" /></span>
        <nav>
          <a href="#terms">الشروط والأحكام</a>
          <a href="#privacy">سياسة الخصوصية</a>
          <a href="#cards">بطاقات الإهداء</a>
          <a href="#studio">استديو القوالب</a>
        </nav>
        <span>© {c.footerYear} أثر — جميع الحقوق محفوظة</span>
      </footer>
    </div>
  );
}
