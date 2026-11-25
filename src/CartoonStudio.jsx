import { useEffect, useRef, useState } from "react";
import "./cartoon.css";
import { useSession } from "./AuthContext.jsx";

const MAX_PHOTO = 12 * 1024 * 1024;
const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp"];

function makeCartoon(source, style = "classic") {
  const max = 1500;
  const scale = Math.min(1, max / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const levels = style === "soft" ? 7 : style === "bold" ? 4 : 6;
  const step = 255 / (levels - 1);
  const lum = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    const saturation = style === "soft" ? 1.12 : style === "bold" ? 1.32 : 1.2;
    const avg = (r + g + b) / 3;
    d[i] = Math.max(0, Math.min(255, Math.round((avg + (r - avg) * saturation) / step) * step));
    d[i + 1] = Math.max(0, Math.min(255, Math.round((avg + (g - avg) * saturation) / step) * step));
    d[i + 2] = Math.max(0, Math.min(255, Math.round((avg + (b - avg) * saturation) / step) * step));
  }
  const threshold = style === "soft" ? 58 : style === "bold" ? 34 : 45;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const edge = Math.abs(lum[p] - lum[p + 1]) +
        Math.abs(lum[p] - lum[p + w]) +
        Math.abs(lum[p] - lum[p - 1]) +
        Math.abs(lum[p] - lum[p - w]);
      if (edge > threshold) {
        const i = p * 4;
        const strength = style === "soft" ? 0.22 : style === "bold" ? 0.62 : 0.42;
        d[i] *= 1 - strength; d[i + 1] *= 1 - strength; d[i + 2] *= 1 - strength;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function saveCanvas(canvas) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "athar-cartoon.png"; a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export default function CartoonStudio() {
  const canvasRef = useRef(null);
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [style, setStyle] = useState("classic");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  async function chooseImage(e) {
    const f = e.target.files?.[0];
    setError(""); setReady(false); setFile(null);
    if (!f) return;
    if (!ALLOWED_IMAGES.includes(f.type)) { setError("اختر صورة JPG أو PNG أو WEBP."); e.target.value = ""; return; }
    if (f.size > MAX_PHOTO) { setError("حجم الصورة يجب ألا يتجاوز 12 ميجابايت."); e.target.value = ""; return; }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setFile(f); setSourceUrl(URL.createObjectURL(f));
  }

  async function convert() {
    if (!file) { setError("ارفع صورتك أولاً."); return; }
    setBusy(true); setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = makeCartoon(bitmap, style);
      bitmap.close?.();
      const target = canvasRef.current;
      target.width = canvas.width; target.height = canvas.height;
      target.getContext("2d").drawImage(canvas, 0, 0);
      setReady(true);
    } catch (e) {
      console.error(e); setError("تعذر تحويل الصورة على هذا الجهاز. جرّب صورة أخرى.");
    } finally { setBusy(false); }
  }

  return (
    <main className="sv cartoon-page" dir="rtl">
      <header className="admin-bar">
        <a className="tab" href="#studio-2">← استديو الصور والكرتون</a>
        <a className="logo" href="#"><img src="/logo.png" alt="أثر" style={{height:38}} /></a>
      </header>
      <section className="svh">
        <span className="pill">استديو الصور والكرتون</span>
        <h1>حوّل صورتك إلى كرتون</h1>
        <p className="l">تأثير كرتوني فوري داخل جهازك، دون إرسال الصورة إلى محرك ذكاء اصطناعي.</p>
      </section>

      <section className="cartoon-workspace">
        <div className="cartoon-controls">
          <label className="field"><span>اختر صورتك (JPG / PNG / WEBP — حتى 12MB)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} />
          </label>
          {sourceUrl && <img className="cartoon-source" src={sourceUrl} alt="الصورة الأصلية" />}
          <label className="field"><span>أسلوب التأثير</span>
            <select value={style} onChange={(e) => { setStyle(e.target.value); setReady(false); }}>
              <option value="classic">كرتوني كلاسيكي</option>
              <option value="soft">كرتوني ناعم</option>
              <option value="bold">كرتوني واضح</option>
            </select>
          </label>
          <button className="btn" onClick={convert} disabled={!file || busy}>{busy ? "جارٍ التحويل…" : "حوّل إلى كرتون"}</button>
          <p className="note small">المعالجة محلية في المتصفح؛ لا تُرفع صورتك عند استخدام التحويل الفوري.</p>
        </div>
        <div className="cartoon-result">
          {ready ? <canvas ref={canvasRef} aria-label="الصورة بعد التحويل" /> :
            <div className="cartoon-empty">ستظهر النتيجة هنا بعد التحويل</div>}
          {ready && <button className="btn" onClick={() => saveCanvas(canvasRef.current)}>تنزيل الصورة</button>}
        </div>
      </section>
      {error && <p className="err" role="alert">{error}</p>}

      <section className="cartoon-3d">
        <span className="pill">خدمة تنفيذ حسب الطلب</span>
        <h2>تريدها شخصية كرتونية 3D؟</h2>
        <p>أرسل صورتك واكتب وصفك وأرفق إيصال التحويل. يراجع فريق أثر الطلب، ثم يجهّز الشخصية ويسلّمها لك في حسابك بعد اكتمالها.</p>
        <strong className="cartoon-price">19 ريال</strong>
        <a className="btn" href="#order-cartoon3d">اطلب تحويل 3D</a>
        <p className="note small">هذه خدمة تجهيز يدوي وليست تحويلاً فورياً. يبدأ التنفيذ بعد التحقق من الدفع. تتابع حالة طلبك من <a href="#account">صفحة حسابك</a>.</p>
      </section>
    </main>
  );
}
