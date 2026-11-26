import React, { useMemo, useRef, useState } from "react";
import { useSession } from "./AuthContext.jsx";
import "./cardmaker.css";

const PALETTES = {
  gold: ["#f7efe1", "#c08a42", "#49301f", "#e6d2b5"],
  rose: ["#fff0ed", "#c98283", "#633b43", "#f4d4d0"],
  sage: ["#eef1e8", "#7e9278", "#344338", "#d4dfcc"],
  navy: ["#edf0f5", "#526987", "#1e2d43", "#cbd5e3"],
  black: ["#242326", "#c7a56b", "#f7f0e5", "#5b5350"],
  lilac: ["#f3eff8", "#9a83b6", "#463953", "#ded3eb"],
  sky: ["#edf7fb", "#6b9db5", "#294454", "#d0e8f1"],
  terracotta: ["#f7eee7", "#b86e4e", "#58372c", "#e7c6b3"]
};

const OCCASIONS = {
  gift: [
    "شكر وتقدير", "عيد ميلاد", "تخرج ونجاح", "تهنئة", "اعتذار",
    "شفاء وسلامة", "مولود جديد", "عيد الفطر", "عيد الأضحى",
    "مودة ومحبة", "مباركة منزل", "ترقية وعمل", "شكر خاص", "دعاء وأمنيات", "بطاقة عامة"
  ],
  invite: [
    "زواج", "خطوبة", "تخرج", "عيد ميلاد", "مولود جديد",
    "عشاء", "مناسبة عائلية", "افتتاح مشروع", "مناسبة رسمية", "حفل تكريم",
    "اجتماع", "سحور رمضاني", "غداء", "احتفال خاص", "دعوة عامة"
  ]
};

const TEMPLATE_NAMES = {
  gift: ["زهور العرفان","ليلة ذهبية","أناقة عاجية","لمسة وردية","غصون السلام","مخمل ملكي","رقة اللؤلؤ","دفء terracotta","بساطة ممتنة","إطار كلاسيكي","حديقة صغيرة","نجوم مضيئة","نقش عربي","شريط فاخر","بطاقة عصرية"],
  invite: ["دعوة ملكية","أغصان ناعمة","ليلة احتفال","أناقة سوداء","زهور الربيع","إطار ذهبي","لمسة تراثية","بياض اللؤلؤ","نجوم المساء","ورود كلاسيكية","دعوة عصرية","قوس أنيق","زخرفة شرقية","بساطة راقية","احتفال دافئ"]
};

const TEMPLATE_PALETTES = [
  "gold","black","rose","sage","navy","lilac","sky","terracotta",
  "gold","rose","sage","navy","black","lilac","terracotta"
];

function makeTemplates(type) {
  return Array.from({ length: 15 }, (_, i) => ({
    id: `${type}-${i + 1}`,
    type,
    name: TEMPLATE_NAMES[type][i],
    palette: TEMPLATE_PALETTES[i],
    layout: i % 5,
    ornament: ["floral","frame","stars","arch","minimal"][i % 5]
  }));
}

const TEMPLATES = [...makeTemplates("gift"), ...makeTemplates("invite")];

const DEFAULT_TEXT = {
  gift: { title: "شكرًا لك", body: "على عطائك وطيب أثرك\nوجودك أجمل ما في المناسبة", from: "مع خالص التقدير", name: "اسم المُهدي", date: "" },
  invite: { title: "دعوة كريمة", body: "يسرّنا دعوتكم لمشاركتنا\nفرحتنا بهذه المناسبة", from: "حضوركم يسعدنا", name: "اسم صاحب الدعوة", date: "اليوم والتاريخ • الوقت • المكان" }
};

function escapeXml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  }[ch]));
}

function textLines(text = "") {
  return String(text).split("\n").slice(0, 5);
}

function buildSvg({ template, text, palette, format, customBg, showOrnament }) {
  const colors = PALETTES[palette] || PALETTES.gold;
  const [bg, accent, ink, soft] = colors;
  const isDark = palette === "black";
  const width = format === "square" ? 1080 : format === "landscape" ? 1400 : 900;
  const height = format === "square" ? 1080 : format === "landscape" ? 900 : 1200;
  const cx = width / 2;
  const bgColor = customBg || bg;
  const titleY = height * 0.39;
  const bodyY = height * 0.52;
  const lineGap = Math.max(48, height * 0.055);
  const body = textLines(text.body).map((line, i) =>
    `<text x="${cx}" y="${bodyY + i * lineGap}" text-anchor="middle" class="body">${escapeXml(line)}</text>`
  ).join("");
  let ornament = "";
  if (showOrnament) {
    if (template.ornament === "floral") {
      ornament = `<g fill="none" stroke="${accent}" stroke-width="5" opacity=".85">
        <path d="M110 210 C210 110 300 150 340 245 C260 230 190 270 160 350"/>
        <path d="M${width-110} ${height-210} C${width-210} ${height-110} ${width-300} ${height-150} ${width-340} ${height-245} C${width-260} ${height-230} ${width-190} ${height-270} ${width-160} ${height-350}"/>
        <circle cx="245" cy="235" r="24"/><circle cx="${width-245}" cy="${height-235}" r="24"/>
      </g>`;
    } else if (template.ornament === "stars") {
      ornament = `<g fill="${accent}" opacity=".8"><path d="M180 190 l18 48 48 18 -48 18 -18 48 -18 -48 -48 -18 48 -18z"/><path d="M${width-180} ${height-190} l18 48 48 18 -48 18 -18 48 -18 -48 -48 -18 48 -18z"/></g>`;
    } else if (template.ornament === "arch") {
      ornament = `<path d="M${cx-250} ${height-160} V${height*.36} A250 250 0 0 1 ${cx+250} ${height*.36} V${height-160}" fill="none" stroke="${accent}" stroke-width="8" opacity=".7"/>`;
    } else if (template.ornament === "frame") {
      ornament = `<rect x="65" y="65" width="${width-130}" height="${height-130}" rx="24" fill="none" stroke="${accent}" stroke-width="7"/><rect x="88" y="88" width="${width-176}" height="${height-176}" rx="18" fill="none" stroke="${accent}" stroke-width="2" opacity=".55"/>`;
    }
  }
  const titleSize = Math.min(width * .09, height * .095);
  const bodySize = Math.min(width * .038, height * .042);
  const footerY = height * .77;
  const date = text.date ? `<text x="${cx}" y="${height*.84}" text-anchor="middle" class="small">${escapeXml(text.date)}</text>` : "";
  const name = text.name ? `<text x="${cx}" y="${footerY}" text-anchor="middle" class="name">${escapeXml(text.name)}</text>` : "";
  const from = text.from ? `<text x="${cx}" y="${height*.89}" text-anchor="middle" class="small">${escapeXml(text.from)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bgColor}"/><stop offset="1" stop-color="${soft}"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>
    <style>
      text{font-family:Tahoma,Arial,sans-serif;direction:rtl;unicode-bidi:plaintext}
      .title{font-size:${titleSize}px;font-weight:700;fill:${ink}}
      .body{font-size:${bodySize}px;fill:${ink}}
      .name{font-size:${bodySize*1.12}px;font-weight:700;fill:${accent}}
      .small{font-size:${bodySize*.72}px;fill:${ink}}
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <rect x="35" y="35" width="${width-70}" height="${height-70}" rx="34" fill="url(#paper)" stroke="${accent}" stroke-width="3"/>
  ${ornament}
  <circle cx="${cx}" cy="${height*.22}" r="7" fill="${accent}"/>
  <path d="M${cx-85} ${height*.22} H${cx-24} M${cx+24} ${height*.22} H${cx+85}" stroke="${accent}" stroke-width="2"/>
  <text x="${cx}" y="${titleY}" text-anchor="middle" class="title">${escapeXml(text.title)}</text>
  ${body}
  ${name}${date}${from}
  </svg>`;
}

const KINDS = [
  { id: "gift", label: "بطاقة إهداء", type: "gift", occ: "بطاقة عامة", text: { title: "هدية لك", body: "هديةٌ صغيرة بحجم محبتي لك\nتمنياتي أن تنال إعجابك", from: "مع كل الحب", name: "اسم المُهدي", date: "" } },
  { id: "thanks", label: "شكر وتقدير", type: "gift", occ: "شكر وتقدير", text: DEFAULT_TEXT.gift },
  { id: "congrats", label: "بطاقة تهنئة", type: "gift", occ: "تهنئة", text: { title: "مبارك لك", body: "نبارك لك هذا الإنجاز الجميل\nودامت لك الأفراح والمسرات", from: "بكل الود", name: "اسم المُهنِّئ", date: "" } },
  { id: "invite", label: "دعوة مناسبة", type: "invite", occ: "دعوة عامة", text: DEFAULT_TEXT.invite },
  { id: "quote", label: "بطاقة اقتباس", type: "gift", occ: "دعاء وأمنيات", text: { title: "اقتباس", body: "اكتب هنا عبارتك أو اقتباسك المفضل\nبما يعبّر عنك", from: "", name: "القائل", date: "" } },
  { id: "custom", label: "بطاقة رقمية مخصصة", type: "gift", occ: "بطاقة عامة", text: { title: "عنوان بطاقتك", body: "صمّمها بالكامل كما تريد\nنصاً وألواناً ومقاساً", from: "", name: "", date: "" } },
];

const OCC_ICONS = ["❀","✦","❖","✿","❦","♡","☾","✧","⌂","★","❂","✺","❁","☆","◇"];

export default function CardMaker() {
  const { requireAuth } = useSession();
  const initial = KINDS.find((k) => window.location.hash === `#cards-${k.id}`) || KINDS[0];
  const [kind, setKind] = useState(initial.id);
  const [type, setType] = useState(initial.type);
  const [occasion, setOccasion] = useState(initial.occ);
  const [templateId, setTemplateId] = useState(`${initial.type}-1`);
  const [palette, setPalette] = useState(initial.type === "gift" ? "gold" : "rose");
  const [format, setFormat] = useState("portrait");
  const [showOrnament, setShowOrnament] = useState(true);
  const [text, setText] = useState(initial.text);
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState(1);
  const [full, setFull] = useState(false);
  const controlsRef = useRef(null);

  const filtered = useMemo(() => TEMPLATES.filter((t) => t.type === type), [type]);
  const template = TEMPLATES.find((t) => t.id === templateId) || filtered[0];
  const colors = PALETTES[palette] || PALETTES.gold;
  const update = (key, value) => { setText((p) => ({ ...p, [key]: value })); setStep((s) => Math.max(s, 2)); };

  function chooseKind(k) {
    setKind(k.id);
    setType(k.type);
    setOccasion(k.occ);
    setTemplateId(`${k.type}-1`);
    setText(k.text);
    setPalette(k.type === "gift" ? "gold" : "rose");
    setStep(1);
    history.replaceState(null, "", `#cards-${k.id}`);
  }
  const kindObj = KINDS.find((k) => k.id === kind) || KINDS[0];

  const svgMarkup = () => buildSvg({ template, text, palette, format, customBg: null, showOrnament });

  function save(blob, ext) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `athar-${type}-${Date.now()}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function downloadSvg() {
    save(new Blob([svgMarkup()], { type: "image/svg+xml;charset=utf-8" }), "svg");
    setNotice("تم تجهيز ملف SVG للتنزيل.");
    setStep(3);
  }

  function downloadPng() {
    const svg = svgMarkup();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const m = svg.match(/width="(\d+)" height="(\d+)"/);
      canvas.width = Number(m?.[1] || 1080);
      canvas.height = Number(m?.[2] || 1200);
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) return setNotice("تعذر إنشاء PNG في هذا المتصفح.");
        save(png, "png");
        setNotice("تم تنزيل البطاقة بصيغة PNG.");
        setStep(3);
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); setNotice("تعذر تصدير الصورة. جرّب SVG."); };
    img.src = url;
  }

  async function share() {
    const text2 = `${text.title} — بطاقة من استديو أثر`;
    try {
      if (navigator.share) await navigator.share({ title: text.title, text: text2, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setNotice("تم نسخ رابط الصفحة."); }
    } catch { /* cancelled */ }
  }

  const previewStyle = {
    "--card-bg": colors[0], "--card-accent": colors[1], "--card-ink": colors[2], "--card-soft": colors[3],
  };
  const stepItems = [["1", "اختر القالب"], ["2", "خصص التصميم"], ["3", "معاينة وتحميل"]];

  return (
    <main className="cm" dir="rtl">
      <header className="cm-top">
        <a className="cm-brand" href="#" title="الصفحة الرئيسية">
          <img src="/logo.png" alt="أثر" />
          <span><b>استديو أثر</b><small>أبدع .. بطريقتك</small></span>
        </a>
        <ol className="cm-steps" aria-label="الخطوات">
          {stepItems.map(([n, label]) => (
            <li key={n} className={Number(n) === step ? "now" : Number(n) < step ? "done" : ""}>
              <i>{Number(n) < step ? "✓" : n}</i><span>{label}</span>
            </li>
          ))}
        </ol>
        <a className="cm-back" href="#studios">← استديوهاتنا</a>
        <div className="cm-title">
          <span className="cm-title-ico">🎁</span>
          <div><h1>استديو الإهداء والبطاقات</h1><p>بطاقات مميزة .. لكل مناسبة</p></div>
        </div>
      </header>

      <div className="cm-grid">
        <aside className="cm-side" ref={controlsRef}>
          <section className="cm-panel">
            <h2>نوع البطاقة</h2>
            <div className="cm-kinds">
              {KINDS.map((k) => <button key={k.id} className={kind === k.id ? "on" : ""} onClick={() => chooseKind(k)}>{k.label}</button>)}
            </div>
            <h2 className="cm-h2b">اختر المناسبة</h2>
            <div className="cm-occ">
              {OCCASIONS[type].slice(0, 7).map((o, i) => (
                <button key={o} className={occasion === o ? "on" : ""} onClick={() => setOccasion(o)}>
                  <i>{OCC_ICONS[i]}</i><span>{o}</span>
                </button>
              ))}
              <select value={occasion} onChange={(e) => setOccasion(e.target.value)} aria-label="كل المناسبات">
                {OCCASIONS[type].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </section>

          <section className="cm-panel">
            <h2>اختر قالباً من التصاميم الجاهزة</h2>
            <div className="cm-tpls">
              {filtered.map((item) => {
                const c = PALETTES[item.palette];
                return (
                  <button key={item.id} className={templateId === item.id ? "on" : ""}
                    onClick={() => { setTemplateId(item.id); setPalette(item.palette); setStep((s) => Math.max(s, 2)); }}>
                    <span className="cm-sw" style={{ "--b": c[0], "--a": c[1], "--i": c[2], "--s": c[3] }}>
                      <em>{item.ornament === "floral" ? "❀" : item.ornament === "stars" ? "✦" : item.ornament === "arch" ? "⌒" : item.ornament === "frame" ? "▧" : "◇"}</em>
                      <b>{type === "gift" ? "شكراً لك" : "دعوة كريمة"}</b>
                    </span>
                    {templateId === item.id && <u className="cm-tick">✓</u>}
                    <small>{item.name}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="cm-panel">
            <h2>خصص التصميم</h2>
            <div className="cm-fields">
              <label>العنوان<input value={text.title} maxLength={45} onChange={(e) => update("title", e.target.value)} /></label>
              <label>النص<textarea rows="3" maxLength={220} value={text.body} onChange={(e) => update("body", e.target.value)} /></label>
              <label>الاسم<input value={text.name} maxLength={55} onChange={(e) => update("name", e.target.value)} /></label>
              <label>التاريخ / الوقت / المكان<input value={text.date} maxLength={90} onChange={(e) => update("date", e.target.value)} /></label>
              <label>عبارة ختامية<input value={text.from} maxLength={70} onChange={(e) => update("from", e.target.value)} /></label>
            </div>
            <div className="cm-row"><span>الألوان</span>
              <div className="cm-pal">
                {Object.entries(PALETTES).map(([key, c]) => (
                  <button key={key} title={key} className={palette === key ? "on" : ""} style={{ background: c[0], borderColor: c[1] }}
                    onClick={() => { setPalette(key); setStep((s) => Math.max(s, 2)); }}><span style={{ background: c[1] }} /></button>
                ))}
              </div>
            </div>
            <div className="cm-row"><span>المقاس</span>
              <div className="cm-seg">
                {[["portrait", "طولي"], ["square", "مربع"], ["landscape", "أفقي"]].map(([v, l]) => (
                  <button key={v} className={format === v ? "on" : ""} onClick={() => setFormat(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="cm-row"><span>الإضافات</span>
              <label className="cm-switch"><input type="checkbox" checked={showOrnament} onChange={(e) => setShowOrnament(e.target.checked)} /><i /> الزخارف</label>
            </div>
          </section>
        </aside>

        <section className={`cm-stage ${full ? "full" : ""}`}>
          <div className="cm-canvas athar-wm">
            <div className="cm-tools">
              <button title="تنزيل" aria-label="تنزيل" onClick={() => requireAuth(downloadPng, { label: "تنزيل PNG" })}>⤓</button>
              <button title="مشاركة" aria-label="مشاركة" onClick={share}>⤴</button>
              <button title="ملء الشاشة" aria-label="ملء الشاشة" onClick={() => setFull((f) => !f)}>{full ? "✕" : "⛶"}</button>
            </div>
            <div className={`am-card-preview ${format}`} style={previewStyle}>
              <div className={`am-card-inner ${template.ornament} ${showOrnament ? "" : "no-ornament"}`}>
                {showOrnament && <span className="am-deco am-deco-top">✦</span>}
                <span className="am-divider">— ◇ —</span>
                <h2>{text.title || "عنوان البطاقة"}</h2>
                <p className="am-body">{text.body}</p>
                {text.name && <strong className="am-name">{text.name}</strong>}
                {text.date && <span className="am-date">{text.date}</span>}
                {text.from && <span className="am-from">{text.from}</span>}
                {showOrnament && <span className="am-deco am-deco-bottom">❧</span>}
              </div>
            </div>
          </div>

          <div className="cm-bar">
            <div className="cm-note"><i>💡</i><div><b>ملاحظة</b><span>يمكنك تعديل النص والألوان وإضافة لمساتك الخاصة</span></div></div>
            <button className="cm-ghost" onClick={() => { setText(kindObj.text); setNotice("تمت إعادة النص الافتراضي."); }}>⟳ إعادة التوليد</button>
          </div>
          <div className="cm-cta">
            <button className="cm-dl" onClick={() => requireAuth(downloadPng, { label: "تنزيل PNG" })}>⤓ تحميل البطاقة</button>
            <button className="cm-ghost" onClick={() => requireAuth(downloadSvg, { label: "تنزيل SVG" })}>تنزيل SVG</button>
            <button className="cm-ghost eye" onClick={() => { setStep(3); setFull(true); }}>◉ معاينة التغييرات</button>
          </div>
          {notice && <p className="cm-msg" role="status">{notice}</p>}
          <p className="cm-hint">المعاينة والتخصيص مجانيان، ويُطلب الدخول عند التنزيل فقط.</p>
        </section>
      </div>
    </main>
  );
}
