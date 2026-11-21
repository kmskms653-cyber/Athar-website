import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

const TEMPLATES = [
  { id: "t1", name: "فحم وذهب", bg: "#050402", fg: "#F8F6F2", ac: "#948369", align: "center", frame: true },
  { id: "t2", name: "ليل بني", bg: "#0c0906", fg: "#F8F6F2", ac: "#948369", align: "start", frame: false },
  { id: "t3", name: "بني عميق", bg: "#533B19", fg: "#F8F6F2", ac: "#D9CBB0", align: "center", frame: true },
  { id: "t4", name: "عاج هادئ", bg: "#F8F6F2", fg: "#050402", ac: "#533B19", align: "center", frame: true },
  { id: "t5", name: "رمادي دافئ", bg: "#1a1612", fg: "#F8F6F2", ac: "#948369", align: "start", frame: true },
  { id: "t6", name: "عاج بإطار", bg: "#EFE9DF", fg: "#050402", ac: "#948369", align: "start", frame: true },
  { id: "t7", name: "ذهب خافت", bg: "#948369", fg: "#050402", ac: "#050402", align: "center", frame: false },
  { id: "t8", name: "بني وعاج", bg: "#2a1f12", fg: "#F8F6F2", ac: "#C2B08C", align: "start", frame: false },
];

/* ---------- IndexedDB (تخزين التصاميم والإعدادات على هذا الجهاز) ---------- */
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("no-idb"));
    const req = indexedDB.open("athar-studio", 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("designs")) d.createObjectStore("designs", { keyPath: "id" });
      if (!d.objectStoreNames.contains("settings")) d.createObjectStore("settings", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(store, mode, fn) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => { d.close(); resolve(r && r.result); };
    t.onerror = () => { d.close(); reject(t.error); };
    t.onabort = () => { d.close(); reject(t.error); };
  });
}
const dbAll = (s) => tx(s, "readonly", (o) => o.getAll());
const dbPut = (s, v) => tx(s, "readwrite", (o) => o.put(v));
const dbDel = (s, k) => tx(s, "readwrite", (o) => o.delete(k));

export default function Studio() {
  const [tplId, setTplId] = useState("t1");
  const [title, setTitle] = useState("نصنع أثراً يبقى");
  const [subtitle, setSubtitle] = useState("استوديو إبداعي للهويات البصرية");
  const [handle, setHandle] = useState("@atharstudio24");
  const [saved, setSaved] = useState([]);
  const [msg, setMsg] = useState("");
  const ref = useRef(null);
  const tpl = TEMPLATES.find((t) => t.id === tplId) || TEMPLATES[0];

  useEffect(() => {
    (async () => {
      try {
        setSaved((await dbAll("designs")).sort((a, b) => b.at - a.at));
        const s = (await dbAll("settings")).find((x) => x.key === "handle");
        if (s) setHandle(s.value);
      } catch { /* التخزين المحلي غير متاح؛ الاستديو يعمل بدونه */ }
    })();
  }, []);

  async function exportPng() {
    if (!ref.current) return;
    setMsg("جارٍ التصدير…");
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      // المعاينة 360px × 3 = 1080px
      const canvas = await html2canvas(ref.current, { scale: 3, backgroundColor: tpl.bg, useCORS: true });
      const a = document.createElement("a");
      a.download = `athar-${tpl.id}.png`;
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMsg("تم التصدير 1080×1080 ✓");
    } catch (e) {
      console.error(e);
      setMsg("تعذر التصدير، جرّب متصفحاً أحدث.");
    }
  }

  async function save() {
    const d = { id: `d${Date.now()}`, at: Date.now(), tplId, title, subtitle, handle };
    try {
      await dbPut("designs", d);
      await dbPut("settings", { key: "handle", value: handle });
      setSaved((s) => [d, ...s]);
      setMsg("تم الحفظ على هذا الجهاز ✓");
    } catch {
      setMsg("التخزين المحلي غير متاح في هذا المتصفح.");
    }
  }

  async function remove(id) {
    try { await dbDel("designs", id); } catch { /* ignore */ }
    setSaved((s) => s.filter((d) => d.id !== id));
  }

  function load(d) {
    setTplId(d.tplId); setTitle(d.title); setSubtitle(d.subtitle); setHandle(d.handle);
  }

  return (
    <div className="studio">
      <header className="admin-bar">
        <strong>استديو القوالب</strong>
        <div><a className="tab" href="#">← الموقع</a></div>
      </header>

      <div className="studio-body">
        <div className="studio-preview">
          <div
            ref={ref}
            className={`tpl ${tpl.align} ${tpl.frame ? "framed" : ""}`}
            style={{ background: tpl.bg, color: tpl.fg, "--ac": tpl.ac }}
          >
            {tpl.frame && <div className="tpl-frame" />}
            <div className="tpl-body">
              <img className="tpl-logo" src="/logo.png" alt="" />
              <i className="tpl-line" />
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <div className="tpl-handle">{handle}</div>
          </div>
        </div>

        <div className="studio-controls panel">
          <label className="field"><span>العنوان</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} /></label>
          <label className="field"><span>النص الفرعي</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={90} /></label>
          <label className="field"><span>الحساب</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={40} dir="ltr" /></label>

          <div className="tpl-list">
            {TEMPLATES.map((t) => (
              <button key={t.id} className={t.id === tplId ? "swatch on" : "swatch"} onClick={() => setTplId(t.id)}
                style={{ background: t.bg, color: t.fg, borderColor: t.ac }} title={t.name}>
                {t.name}
              </button>
            ))}
          </div>

          <div className="row">
            <button className="btn" onClick={exportPng}>تصدير PNG</button>
            <button className="btn ghost" onClick={save}>حفظ التصميم</button>
          </div>
          {msg && <p className="note">{msg}</p>}

          {saved.length > 0 && (
            <>
              <h3>تصاميمي المحفوظة</h3>
              {saved.map((d) => (
                <div className="saved" key={d.id}>
                  <button onClick={() => load(d)}>{d.title}</button>
                  <button className="x" onClick={() => remove(d.id)} aria-label="حذف">×</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
