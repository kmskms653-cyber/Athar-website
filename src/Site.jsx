import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useContent } from "./useContent";
import { BUNDLES } from "./bundles";
import "./home.css";
import { useReveal } from "./useReveal";
import { useSession } from "./AuthContext.jsx";
import { useFeatures } from "./useFeatures.js";

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
  const { user, requireAuth } = useSession();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => { if (pick.v) setForm((f) => ({ ...f, service: pick.v, message: pick.msg || f.message })); }, [pick]);

  function submit(e) {
    e.preventDefault();
    if (form.website) { setForm(empty); setState({ status: "done", error: "" }); return; }
    requireAuth(() => send(), { label: "إرسال الطلب" });
  }

  async function send() {
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
      const u = auth.currentUser;
      const payload = { ...data, uid: u.uid, email: (u.email || "").toLowerCase(), status: "new", createdAt: serverTimestamp() };
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
          ? "تعذر الإرسال: سجّل الدخول ووافق على الشروط، أو قواعد Firestore غير منشورة."
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
        {state.status === "sending" ? "جارٍ الإرسال…" : "أرسل طلبك"}
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
  { img: "/img/hero-pen.jpg", title: "من الفكرة إلى أثر لا يُنسى", text: "نصنع الهويات، ونصمم المنتجات، ونحوّل الأفكار إلى أعمال بصرية تحمل شخصيتك.", cta: "اكتشف خدماتنا", to: "studios", cap: "أثر — أفكارك تستحق أن تُرى" },
  { img: "/img/svc-calligraphy.jpg", title: "بصمتك بخطٍّ عربي يشبهك", text: "هوية وتوقيع وبصمة مصممة بعناية لتبقى في ذاكرة من يراها.", cta: "استديو أثر الإبداعي", to: "#creative", cap: "أثر — أفكارك تستحق أن تُرى" },
  { img: "/works/work-2.jpg", title: "تفاصيل صغيرة .. تصنع الفارق", text: "بطاقات وهدايا ومنتجات تحمل هويتك بلمسة فاخرة.", cta: "استديو الإهداء والبطاقات", to: "#cards", cap: "أثر — أفكارك تستحق أن تُرى" },
];

export const STUDIOS = [
  { id: 1, title: "استديو أثر الإبداعي", text: "صناعة الهوية والتوقيع والبصمة بأسلوب يعكس شخصية المستخدم.", img: "/img/svc-calligraphy.jpg", href: "#studio-1",
    items: [["صانع الهوية الشخصية", "#creative-personal", "39 ريال"], ["صانع هوية الشركات", "#creative-corporate", "99 ريال"], ["صانع التوقيع — 15 أسلوباً", "#creative-signature", "19 ريال"], ["صانع البصمة", "#creative-mark", "19 ريال · الأساسية مجاناً مرة"]] },
  { id: 2, title: "استديو الصور والكرتون", text: "تحويل الصور إلى أعمال كرتونية وإبداعات شخصية.", img: "/img/svc-content.jpg", href: "#studio-2",
    items: [["شخصيتك الكرتونية", "#cartoon", "التحويل الفوري مجاني · 3D بـ19 ريال"], ["شخصيتي في مغامرة", "#order-adventure", "69 ريال"], ["صانع الملصقات (Stickers)", "#order-stickers", "12 ملصقاً · 29 ريال"]] },
  { id: 3, title: "استديو الإهداء والبطاقات", text: "تصميم بطاقات شخصية للمناسبات والإهداءات.", img: "/img/svc-creative.jpg", href: "#studio-3",
    items: [["بطاقة إهداء", "#cards-gift", "19 ريال"], ["بطاقة شكر وتقدير", "#cards-thanks", "19 ريال"], ["بطاقة تهنئة", "#cards-congrats", "19 ريال"], ["دعوة مناسبة", "#cards-invite", "19 ريال"], ["بطاقة اقتباس", "#cards-quote", "19 ريال"], ["بطاقة رقمية مخصصة", "#digital-card", "29 ريال"]] },
  { id: 4, title: "استديو الأعمال والتجارة", text: "صور احترافية للمنتجات وعروض بصرية للمشاريع والمتاجر.", img: "/img/svc-products.jpg", href: "#studio-4",
    items: [["مصور المنتجات الذكي", "#order-productPhoto", "35 ريال للصورة"], ["تصميم عروض المنتجات", "#order-productPresentation", "39 ريال"], ["محتوى بصري للمشاريع والمتاجر", "#order-visualContent", "49 ريال"]] },
  { id: 5, title: "استديو القوالب والتصاميم", text: "قوالب قابلة للتخصيص للمنشورات والإعلانات والهويات.", img: "/img/svc-digital.jpg", href: "#studio-5",
    items: [["قوالب المنشورات", "#studio", "9 ريال للقالب"], ["قوالب الإعلانات", "#order-adTemplates", "19 ريال للقالب"], ["قوالب الهوية التجارية", "#order-brandTemplates", "39 ريال"], ["تصميم أسماء الشركات وشعاراتها وبصمتها", "#creative-corporate", "69 ريال"], ["حزم التصاميم الجاهزة", "store", "29 ريال للحزمة"],
      ["قوالب الإعلانات والمنشورات التجارية (30 قالباً)", "#biz-ads", "20 ريال", "bizAds"], ["قوالب العطور والمنتجات (20 قالباً)", "#biz-products", "20 ريال", "bizProducts"], ["قوائم الطعام والأسعار (15 قالباً)", "#biz-menu", "20 ريال", "bizMenu"]] },
  { id: 6, feature: "qr", title: "QR code", text: "رموز QR احترافية بتصميمك وألوانك وشعارك، وبطاقات طاولة وستيكرات جاهزة للطباعة.", img: "/img/svc-digital.jpg", href: "#studio-6",
    items: [["رمز QR لمتجر أو موقع", "#qr-website", "15 ريال"], ["رمز QR لواتساب مباشر", "#qr-whatsapp", "15 ريال"], ["رمز QR لبيانات الاتصال", "#qr-contact", "15 ريال"], ["رمز QR لشبكة واي فاي", "#qr-wifi", "15 ريال"], ["رمز QR لمنيو المطاعم", "#qr-menu", "15 ريال"], ["رمز QR لموقع جغرافي", "#qr-location", "15 ريال"], ["بطاقة طاولة / ستيكر مع الرمز", "#qr-website", "49 ريال"]] },
];

// الأقسام المخفية تظهر فقط بعد تفعيلها من لوحة الإدارة
export const visibleStudios = (features, isAdmin = false) => STUDIOS.filter((s) => !s.feature || features?.[s.feature] || isAdmin);

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
  const features = useFeatures();
  const studios = visibleStudios(features);
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
            <button onClick={() => go("studios")}>استديوهاتنا <i>▾</i></button>
            <div className="hm-sub">
              {studios.map((st) => <a key={st.id} href={st.href || "#studios"} onClick={(e) => { setMenu(false); if (!st.href) { e.preventDefault(); go("studios"); } }}>{st.title}</a>)}
            </div>
          </div>
          <button onClick={() => go("store")}>الباقات المميزة</button>
          <button onClick={() => go("studio-banner")}>القوالب</button>
          <button onClick={() => go("about")}>من نحن</button>
        </nav>
        <div className="hm-actions">
          <a className="hm-link" href="#account">حسابي</a>
          <a className="hm-link" href="#account">ملفاتي</a>
          <a className="hm-order" href="#contact" onClick={(e) => { e.preventDefault(); go("contact"); }}>اطلب تصميمك ✈</a>
          <a className="hm-circ" href="#account" aria-label="حسابي" title="حسابي وتسجيل الدخول">
            <Ico d="M12 4a4 4 0 100 8 4 4 0 000-8z M4 21c0-4 3.6-7 8-7s8 3 8 7" size={18} />
          </a>
        </div>
      </header>

      <section className="hm-hero" id="home" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {SLIDES.map((sl, n) => <div key={sl.img} className={`hm-slide ${n === slide ? "on" : ""}`} style={{ backgroundImage: `url(${sl.img})` }} aria-hidden="true" />)}
        <div className="hm-shade" />
        <div className="hm-copy" key={slide}>
          <h1>{cur.title}</h1>
          <p>{cur.text}</p>
          <button className="hm-btn" onClick={() => go(cur.to)}>{cur.cta} <span>←</span></button>
          <em className="hm-cap">{cur.cap}</em>
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

      <section className="hm-sec" id="studios">
        <h2 className="hm-h rv" id="services">استديوهاتنا</h2>
        <div className="hm-st">
          {studios.map((st, n) => (
            <article className="hm-card hm-studio rv" style={{ "--d": `${n * 70}ms` }} key={st.id}>
              <a className="hm-ph" href={st.href || "#contact"} onClick={(e) => { if (!st.href) { e.preventDefault(); go("contact"); } }} aria-label={st.title} style={{ backgroundImage: `url(${st.img})` }}><b className="hm-num">{st.id}</b></a>
              <div className="hm-cb">
                <h3>{st.title}</h3>
                <p>{st.text}</p>
                <ul className="hm-items">
                  {st.items.filter((it) => !it[3] || features[it[3]]).map(([label, href, price]) => (
                    <li key={label}>
                      {href ? <a href={href.startsWith("#") ? href : `#${href}`} onClick={(e) => { if (!href.startsWith("#")) { e.preventDefault(); go(href); } }}>{label}</a> : <span>{label}<small>قريباً</small></span>}
                      {price && <em className="hm-pr">{price}</em>}
                    </li>
                  ))}
                </ul>
                {st.href ? <a className="hm-pill" href={st.href}>ادخل الاستديو</a> : <button className="hm-pill" onClick={() => go("contact")}>اطلب هذه الخدمة</button>}
              </div>
            </article>
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
          <p>اختر قالبك، خصّصه، واحصل على تصميمك الإبداعي في دقائق.</p>
          <div className="hm-row">
            <a className="hm-out" href="#studio">ابدأ الآن ←</a>
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
            <b>تواصل معنا.. لنصنع معاً أثراً</b>
            <span>اطلب مشروعك الآن، وفريق أثر جاهز لتحقيق رؤيتك بأعلى جودة.</span>
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
          <a href="#refund">سياسة الدفع والاسترجاع</a>
          <a href="#privacy">سياسة الخصوصية</a>
        </nav>
        <span>© {c.footerYear} أثر — جميع الحقوق محفوظة</span>
      </footer>
    </div>
  );
}
