import { useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { useSession } from "./AuthContext.jsx";

import { LAYOUTS, MODES, PALETTES, SIGNATURES, STYLES, build, fontsHref, svgWithFonts } from "./creativeEngine.js";

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
  const [mode, setMode] = useState(() => { const m = /^#creative-(personal|corporate|signature|mark)$/.exec(window.location.hash); return m ? m[1] : "mark"; });
  const [name, setName] = useState("أثر");
  const [subtitle, setSubtitle] = useState("فخامة الإبداع العربي");
  const [style, setStyle] = useState("heritage");
  const [variant, setVariant] = useState("1");
  const [sig, setSig] = useState(1);
  const [palette, setPalette] = useState(PALETTES[0]);
  const [projects, setProjects] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const stage = useRef(null);

  const built = useMemo(
    () => build({ mode, palette, style, layout: variant, name, tag: subtitle, sig }),
    [mode, palette, style, variant, name, subtitle, sig]
  );
  const svg = built.svg;

  useEffect(() => {
    if (document.getElementById("cs-fonts")) return;
    const l = document.createElement("link");
    l.id = "cs-fonts"; l.rel = "stylesheet"; l.href = fontsHref();
    document.head.appendChild(l);
  }, []);

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

  const exportSvg = async () => {
    setMsg("جارٍ تجهيز الملف…");
    const data = await svgWithFonts(built.svg);
    download(new Blob([data], { type: "image/svg+xml;charset=utf-8" }), `athar-${mode}.svg`);
    setMsg("تم تنزيل SVG بالخطوط المضمّنة.");
  };

  const exportPng = async () => {
    setMsg("جارٍ تجهيز الصورة…");
    const data = await svgWithFonts(built.svg);
    const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = built.w * 2;
      c.height = built.h * 2;
      const x = c.getContext("2d");
      x.fillStyle = palette.paper;
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => { download(b, `athar-${mode}.png`); setMsg("تم تنزيل PNG."); });
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
      const payload = { uid: user.uid, name: name.trim(), subtitle: subtitle.trim(), style, variant, sig, mode, ink: palette.ink, paper: palette.paper, accent: palette.accent || "", createdAt: serverTimestamp() };
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
    setMode(p.mode === "identity" ? "personal" : (p.mode || "personal"));
    setName(p.name || "أثر");
    setSubtitle(p.subtitle || "");
    setStyle(p.style || "heritage");
    setVariant(p.variant || "1");
    setSig(p.sig || 1);
    setPalette(PALETTES.find((q) => q.ink === p.ink && q.paper === p.paper) || { ink: p.ink || PALETTES[0].ink, paper: p.paper || PALETTES[0].paper, accent: p.accent || PALETTES[0].accent });
    setMsg("تم استعادة المشروع");
  };

  return (
    <main className="cs">
      <header className="cs-top">
        <a className="cs-back" href="#studio">← استديو القوالب</a>
        <span className="cs-badge">صانع الهوية الشخصية وهوية الشركات والتوقيع والبصمة</span>
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
              <button key={m.id} role="tab" aria-selected={mode === m.id} className={`cs-tab ${mode === m.id ? "on" : ""}`} onClick={() => (m.id === "mark" ? setMode(m.id) : (window.location.hash = "#creative-" + m.id))}>{m.label}</button>
            ))}
          </div>

          <label className="cs-field"><span>{mode === "corporate" ? "اسم الشركة أو النشاط" : mode === "personal" ? "اسمك" : "الاسم"}</span>
            <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="cs-field"><span>{mode === "corporate" ? "الشعار اللفظي / مجال العمل" : "المسمّى أو المهنة"}</span>
            <input value={subtitle} maxLength={60} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          {(mode === "personal" || mode === "corporate") && (
            <label className="cs-field"><span>الطابع البصري</span>
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          )}
          {mode === "signature" && (
            <label className="cs-field"><span>أسلوب التوقيع (15 أسلوباً)</span>
              <select value={sig} onChange={(e) => setSig(Number(e.target.value))}>
                {SIGNATURES.map((x) => <option key={x.id} value={x.id}>{x.id}. {x.label}</option>)}
              </select>
            </label>
          )}

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

          {(mode === "personal" || mode === "corporate") && (
            <label className="cs-field"><span>التكوين</span>
              <select value={variant} onChange={(e) => setVariant(e.target.value)}>
                {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </label>
          )}

          <p className="cs-hint">
            {mode === "personal" && "لوحة هوية شخصية: شعار حرفي باسمك، بطاقة تعريف، ألوان وخطوط."}
            {mode === "corporate" && "لوحة هوية شركة: شعار باسم النشاط، بطاقة أعمال، ورقة مراسلات، ألوان وخطوط."}
            {mode === "signature" && "تكوين توقيع زخرفي تجريبي بالاسم، وليس توقيعاً إلكترونياً موثّقاً."}
            {mode === "mark" && "نمط بصري تجريدي متكرر يمكن استخدامه كبصمة زخرفية."}
          </p>

          <div className="cs-actions">
            <button className="cs-btn primary" onClick={() => (mode === "signature" ? setSig((v) => (v % 15) + 1) : setVariant((v) => String((Number(v) % 4) + 1)))}>اقتراح آخر</button>
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
            <div className={`cs-art ${mode}`} style={{ background: palette.paper, color: palette.ink }} ref={stage}>
              <div className="cs-svg" dangerouslySetInnerHTML={{ __html: svg }} />
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
