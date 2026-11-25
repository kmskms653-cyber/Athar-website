import { useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { useSession } from "./AuthContext.jsx";

const MODES = [
  { id: "identity", label: "الهوية" },
  { id: "signature", label: "التوقيع" },
  { id: "mark", label: "البصمة" },
];

const STYLES = [
  { id: "heritage", label: "تراثي عربي" },
  { id: "minimal", label: "حديث وبسيط" },
  { id: "luxury", label: "فاخر" },
  { id: "geometric", label: "هندسي" },
  { id: "organic", label: "عضوي وانسيابي" },
];

const PALETTES = [
  { ink: "#1C1A19", paper: "#F5F2EB", label: "فحمي وعاجي" },
  { ink: "#76543A", paper: "#F3E6D2", label: "بني وكرافت" },
  { ink: "#9B7842", paper: "#FBF4E5", label: "ذهبي وعاجي" },
  { ink: "#263E39", paper: "#E9EEE7", label: "أخضر هادئ" },
  { ink: "#34465C", paper: "#EDF0F4", label: "أزرق ليلي" },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* محرّك التوليد: قواعد هندسية محلية، لا نموذج ذكاء اصطناعي */
function emblem({ mode, ink, style, variant, name }) {
  const v = Number(variant) || 1;
  const stroke = ink;
  if (mode === "signature") {
    const text = esc(name || "أثر");
    const font = style === "heritage" ? "serif" : "sans-serif";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180"><path d="M35 125 Q110 ${35 + v * 5} 175 105 T315 95 Q365 70 405 112 T560 75" fill="none" stroke="${stroke}" stroke-width="${v + 2}" stroke-linecap="round"/><text x="300" y="112" text-anchor="middle" font-family="${font},Tahoma,Arial" font-size="${v === 1 ? 78 : 68}" font-style="italic" fill="${stroke}">${text}</text><path d="M105 145 Q290 170 500 138" fill="none" stroke="${stroke}" stroke-width="2" opacity=".65"/></svg>`;
  }
  if (mode === "mark") {
    let paths = "";
    for (let i = 0; i < 9; i += 1) {
      const r = 22 + i * 8;
      const y = 90;
      paths += `<path d="M ${300 - r} ${y} C ${300 - r * 1.15} ${y - r * 1.8}, ${300 + r * 0.7} ${y - r * 1.8}, ${300 + r} ${y} C ${300 + r * 1.1} ${y + r * 1.7}, ${300 - r * 0.7} ${y + r * 1.7}, ${300 - r} ${y}" />`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180"><g fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round">${paths}</g><circle cx="300" cy="90" r="5" fill="${stroke}"/></svg>`;
  }
  let core = "";
  if (style === "geometric" || v === 4) {
    core = `<path d="M300 22 L410 90 L300 158 L190 90 Z"/><path d="M300 42 L378 90 L300 138 L222 90 Z"/><circle cx="300" cy="90" r="19"/>`;
  } else if (style === "organic") {
    core = `<path d="M300 22 C390 20 430 92 360 145 C290 195 190 130 220 70 C240 30 275 20 300 22Z"/><path d="M260 105 Q300 35 340 105 Q300 145 260 105Z"/>`;
  } else if (style === "minimal") {
    core = `<circle cx="300" cy="90" r="65"/><path d="M260 90 H340 M300 50 V130"/>`;
  } else {
    core = `<path d="M300 18 L390 52 L376 130 L300 162 L224 130 L210 52 Z"/><path d="M300 40 L355 65 L345 116 L300 140 L255 116 L245 65 Z"/><path d="M300 57 L300 123 M268 90 H332"/>`;
  }
  const ornaments = v === 2
    ? '<circle cx="300" cy="90" r="78" stroke-dasharray="3 8"/>'
    : v === 3 ? '<path d="M300 8 V172 M210 90 H390"/>' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180"><g fill="none" stroke="${stroke}" stroke-width="${style === "minimal" ? 4 : 3}" stroke-linejoin="round">${ornaments}${core}</g><circle cx="300" cy="90" r="4" fill="${stroke}"/></svg>`;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function CreativeStudio() {
  const { user, requireAuth } = useSession();
  const [mode, setMode] = useState("identity");
  const [name, setName] = useState("أثر");
  const [subtitle, setSubtitle] = useState("فخامة الإبداع العربي");
  const [style, setStyle] = useState("heritage");
  const [variant, setVariant] = useState("1");
  const [palette, setPalette] = useState(PALETTES[0]);
  const [projects, setProjects] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const stage = useRef(null);

  const svg = useMemo(
    () => emblem({ mode, ink: palette.ink, style, variant, name: name.trim() || "أثر" }),
    [mode, palette, style, variant, name]
  );

  const title = MODES.find((m) => m.id === mode)?.label || "الهوية";

  useEffect(() => {
    if (!user) { setProjects([]); return undefined; }
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "creativeProjects"), where("uid", "==", user.uid)));
        if (!alive) return;
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setProjects(list);
      } catch (e) {
        console.warn("projects:", e.code);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const svgFile = () => {
    const node = stage.current && stage.current.querySelector("svg");
    if (!node) return "";
    const clone = node.cloneNode(true);
    clone.setAttribute("width", "1200");
    clone.setAttribute("height", "360");
    return new XMLSerializer().serializeToString(clone);
  };

  const exportSvg = () => {
    const data = svgFile();
    if (!data) return;
    download(new Blob([data], { type: "image/svg+xml;charset=utf-8" }), `athar-${mode}.svg`);
    setMsg("تم تنزيل SVG ✓");
  };

  const exportPng = () => {
    const data = svgFile();
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 360;
      const x = c.getContext("2d");
      x.fillStyle = palette.paper;
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, 1200, 360);
      c.toBlob((b) => { download(b, `athar-${mode}.png`); setMsg("تم تنزيل PNG ✓"); });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { setMsg("تعذر توليد PNG في هذا المتصفح، استخدم SVG."); URL.revokeObjectURL(url); };
    img.src = url;
  };

  async function save() {
    if (!user) return;
    setBusy(true);
    setMsg("");
    try {
      const id = `${user.uid}_${Date.now()}`;
      const payload = { uid: user.uid, name: name.trim(), subtitle: subtitle.trim(), style, variant, mode, ink: palette.ink, paper: palette.paper, createdAt: serverTimestamp() };
      await setDoc(doc(db, "creativeProjects", id), payload);
      setProjects((p) => [{ id, ...payload, createdAt: { seconds: Math.floor(Date.now() / 1000) } }, ...p]);
      setMsg("تم حفظ المشروع في حسابك ✓");
    } catch (e) {
      console.error(e);
      setMsg(e.code === "permission-denied" ? "تعذر الحفظ: راجع قواعد Firestore." : "تعذر حفظ المشروع.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await deleteDoc(doc(db, "creativeProjects", id));
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch { setMsg("تعذر الحذف."); }
  }

  const restore = (p) => {
    setMode(p.mode || "identity");
    setName(p.name || "أثر");
    setSubtitle(p.subtitle || "");
    setStyle(p.style || "heritage");
    setVariant(p.variant || "1");
    setPalette({ ink: p.ink || PALETTES[0].ink, paper: p.paper || PALETTES[0].paper });
    setMsg("تم استعادة المشروع");
  };

  return (
    <main className="cs">
      <header className="cs-top">
        <a className="cs-back" href="#studio">← استديو القوالب</a>
        <span className="cs-badge">صانع الهوية والبصمة والتوقيع</span>
        <a className="cs-back" href="#/">الموقع</a>
      </header>

      <section className="cs-intro">
        <h1>اصنع بصمتك الخاصة</h1>
        <p>حوّل الاسم والفكرة إلى علامة بصرية قابلة للتعديل والتصدير. التوليد يعمل بقواعد تصميم محلية داخل متصفحك، والمعاينة مجانية للجميع دون تسجيل.</p>
      </section>

      <div className="cs-layout">
        <section className="cs-panel">
          <div className="cs-tabs" role="tablist">
            {MODES.map((m) => (
              <button key={m.id} role="tab" aria-selected={mode === m.id} className={`cs-tab ${mode === m.id ? "on" : ""}`} onClick={() => setMode(m.id)}>{m.label}</button>
            ))}
          </div>

          <label className="cs-field"><span>الاسم أو العبارة</span>
            <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="cs-field"><span>وصف مختصر / النشاط</span>
            <input value={subtitle} maxLength={60} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          <label className="cs-field"><span>الطابع البصري</span>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>

          <span className="cs-label">لوحة الألوان</span>
          <div className="cs-colors">
            {PALETTES.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`cs-sw ${palette.ink === p.ink ? "on" : ""}`}
                style={{ background: p.ink }}
                aria-label={p.label}
                title={p.label}
                onClick={() => setPalette(p)}
              />
            ))}
          </div>

          <label className="cs-field"><span>التكوين</span>
            <select value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value="1">التكوين الأول</option>
              <option value="2">التكوين الثاني</option>
              <option value="3">التكوين الثالث</option>
              <option value="4">التكوين الرابع</option>
            </select>
          </label>

          <p className="cs-hint">
            {mode === "identity" && "شعار رمزي مع اسم النشاط وتكوينات قابلة للتبديل."}
            {mode === "signature" && "تكوين توقيع زخرفي تجريبي بالاسم، وليس توقيعاً إلكترونياً موثّقاً."}
            {mode === "mark" && "نمط بصري تجريدي متكرر يمكن استخدامه كبصمة زخرفية."}
          </p>

          <div className="cs-actions">
            <button className="cs-btn primary" onClick={() => setVariant((v) => String((Number(v) % 4) + 1))}>اقتراح آخر</button>
            <button className="cs-btn ghost" onClick={() => requireAuth(exportSvg, { label: "تنزيل SVG" })} disabled={busy}>تنزيل SVG</button>
            <button className="cs-btn ghost" onClick={() => requireAuth(exportPng, { label: "تنزيل PNG" })} disabled={busy}>تنزيل PNG</button>
            <button className="cs-btn ghost" onClick={() => requireAuth(save, { label: "حفظ المشروع" })} disabled={busy}>
              {busy ? "جارٍ الحفظ…" : "حفظ المشروع"}
            </button>
          </div>
          {msg && <p className="cs-msg">{msg}</p>}
          {!user && <p className="cs-hint">التنزيل والحفظ يُطلبان الدخول فقط عند الاستخدام الفعلي. المعاينة مجانية.</p>}

          <div className="cs-saved">
            <h3>مشاريعي المحفوظة{user ? ` (${projects.length})` : ""}</h3>
            {!user && <p className="cs-hint">سجّل الدخول لتحفظ مشاريعك في حسابك وتستعيدها من أي جهاز.</p>}
            {user && projects.length === 0 && <p className="cs-hint">لا توجد مشاريع بعد.</p>}
            <div className="cs-chips">
              {projects.map((p) => (
                <span className="cs-chip" key={p.id}>
                  <button type="button" onClick={() => restore(p)}>{p.name || "بدون اسم"} · {MODES.find((m) => m.id === p.mode)?.label || "هوية"}</button>
                  <button type="button" className="cs-del" aria-label="حذف" onClick={() => remove(p.id)}>×</button>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="cs-preview">
          <div className="cs-preview-head">
            <h2>معاينة {title}</h2>
            <span className="cs-live">معاينة مباشرة</span>
          </div>
          <div className="cs-stage">
            <div className={`cs-art ${mode === "signature" ? "signature" : ""}`} style={{ background: palette.paper, color: palette.ink }} ref={stage}>
              <div className="cs-svg" dangerouslySetInnerHTML={{ __html: svg }} />
              {mode !== "mark" && <div className="cs-name">{name.trim() || "أثر"}</div>}
              {mode === "identity" && subtitle.trim() && <div className="cs-sub">{subtitle}</div>}
            </div>
          </div>
          <p className="cs-note">
            النتائج مقترحات أولية بقواعد تصميم وليست ضماناً لتفرد العلامة قانونياً. افحص الخطوط وحقوق استخدامها قبل الاعتماد التجاري.
          </p>
        </section>
      </div>
    </main>
  );
}
