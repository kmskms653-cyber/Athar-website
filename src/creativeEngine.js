/* محرّك صانع الهوية: توليد SVG محلي. الاسم والنص داخل الـSVG نفسه ليظهر في التصدير. */

export const MODES = [
  { id: "personal", label: "هوية شخصية" },
  { id: "corporate", label: "هوية شركة" },
  { id: "signature", label: "توقيع" },
  { id: "mark", label: "بصمة" },
];

export const STYLES = [
  { id: "heritage", label: "تراثي عربي" },
  { id: "minimal", label: "حديث وبسيط" },
  { id: "luxury", label: "فاخر" },
  { id: "geometric", label: "هندسي" },
  { id: "organic", label: "عضوي وانسيابي" },
];

export const LAYOUTS = [
  { id: "1", label: "أفقي: رمز بجانب الاسم" },
  { id: "2", label: "عمودي: رمز فوق الاسم" },
  { id: "3", label: "شارة داخل إطار" },
  { id: "4", label: "شعار نصي فقط" },
];

export const PALETTES = [
  { ink: "#1C1A19", paper: "#F5F2EB", accent: "#9B7842", label: "فحمي وعاجي" },
  { ink: "#76543A", paper: "#F3E6D2", accent: "#B98B4E", label: "بني وكرافت" },
  { ink: "#9B7842", paper: "#FBF4E5", accent: "#3A2A18", label: "ذهبي وعاجي" },
  { ink: "#263E39", paper: "#E9EEE7", accent: "#B08A4A", label: "أخضر هادئ" },
  { ink: "#34465C", paper: "#EDF0F4", accent: "#C09A5B", label: "أزرق ليلي" },
];

/* 15 أسلوب توقيع */
export const SIGNATURES = [
  { id: 1, label: "رقعة أنيق", font: "Aref Ruqaa", w: 700, tilt: -5, line: "swash" },
  { id: 2, label: "نسخ كلاسيكي", font: "Amiri", w: 400, tilt: 0, line: "under", italic: true },
  { id: 3, label: "كوفي هندسي", font: "Reem Kufi", w: 600, tilt: 0, line: "bar" },
  { id: 4, label: "ثلث فخم", font: "Scheherazade New", w: 700, tilt: 0, line: "swash" },
  { id: 5, label: "فارسي منساب", font: "Lateef", w: 600, tilt: -4, line: "wave" },
  { id: 6, label: "ديواني خفيف", font: "Mirza", w: 600, tilt: -7, line: "under" },
  { id: 7, label: "مخطوطة مائلة", font: "Katibeh", w: 400, tilt: -9, line: "wave" },
  { id: 8, label: "عصري بسيط", font: "Cairo", w: 500, tilt: 0, line: "none" },
  { id: 9, label: "عريض جريء", font: "Lalezar", w: 400, tilt: 0, line: "bar" },
  { id: 10, label: "رسمي رصين", font: "Markazi Text", w: 700, tilt: 0, line: "double" },
  { id: 11, label: "ظل مزدوج", font: "El Messiri", w: 700, tilt: 0, line: "none", shadow: true },
  { id: 12, label: "خط سريع", font: "Harmattan", w: 700, tilt: -10, line: "swash" },
  { id: 13, label: "تاج وخط", font: "Aref Ruqaa", w: 400, tilt: 0, line: "crown" },
  { id: 14, label: "ختم مؤطر", font: "Noto Naskh Arabic", w: 700, tilt: 0, line: "frame" },
  { id: 15, label: "نقطة ختامية", font: "Jomhuria", w: 400, tilt: -3, line: "dot" },
];

export const FONT_FAMILIES = [...new Set([...SIGNATURES.map((s) => s.font), "Tajawal"])];

export const fontsHref = () =>
  "https://fonts.googleapis.com/css2?" +
  FONT_FAMILIES.map((f) => `family=${f.replace(/ /g, "+")}`).join("&") +
  "&display=swap";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const seedOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 100003, 7);

function monogram({ ink, accent, style, letter, cx, cy, r }) {
  const L = esc(letter);
  const txt = `<text x="${cx}" y="${cy + r * 0.34}" text-anchor="middle" font-family="Aref Ruqaa, Amiri, serif" font-weight="700" font-size="${r * 1.05}" fill="${ink}">${L}</text>`;
  let shape = "";
  if (style === "heritage") {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
      const rr = i % 2 ? r * 0.82 : r;
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    shape = `<polygon points="${pts.join(" ")}" fill="none" stroke="${ink}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="none" stroke="${accent}" stroke-width="2"/>`;
  } else if (style === "minimal") {
    shape = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink}" stroke-width="4"/>`;
  } else if (style === "luxury") {
    shape = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r * 0.88}" fill="none" stroke="${accent}" stroke-width="1.5"/><path d="M${cx - r * 0.3} ${cy - r * 1.12} L${cx} ${cy - r * 1.3} L${cx + r * 0.3} ${cy - r * 1.12}" fill="none" stroke="${accent}" stroke-width="2.5"/>`;
  } else if (style === "geometric") {
    shape = `<rect x="${cx - r * 0.78}" y="${cy - r * 0.78}" width="${r * 1.56}" height="${r * 1.56}" fill="none" stroke="${ink}" stroke-width="3.5"/><rect x="${cx - r * 0.78}" y="${cy - r * 0.78}" width="${r * 1.56}" height="${r * 1.56}" transform="rotate(45 ${cx} ${cy})" fill="none" stroke="${accent}" stroke-width="2.5"/>`;
  } else {
    shape = `<path d="M${cx - r} ${cy} C${cx - r} ${cy - r * 1.1} ${cx + r * 0.2} ${cy - r * 1.2} ${cx + r} ${cy - r * 0.2} C${cx + r * 1.1} ${cy + r * 0.9} ${cx - r * 0.1} ${cy + r * 1.15} ${cx - r} ${cy}Z" fill="none" stroke="${ink}" stroke-width="3.5"/><path d="M${cx - r * 0.7} ${cy + r * 0.2} C${cx - r * 0.3} ${cy - r * 0.8} ${cx + r * 0.5} ${cy - r * 0.7} ${cx + r * 0.8} ${cy}" fill="none" stroke="${accent}" stroke-width="2"/>`;
  }
  return shape + txt;
}

function lockup({ ink, accent, style, layout, name, tag, letter, corporate }) {
  const nm = esc(name);
  const tg = esc(tag);
  const nameFont = `font-family="Aref Ruqaa, Amiri, serif" font-weight="700" fill="${ink}"`;
  const tagFont = `font-family="Tajawal, sans-serif" fill="${ink}" opacity=".75"`;
  const size = nm.length > 14 ? 40 : nm.length > 9 ? 52 : 64;
  if (layout === "1") {
    return `${monogram({ ink, accent, style, letter, cx: 780, cy: 190, r: 70 })}
<text x="690" y="${tg ? 186 : 204}" text-anchor="end" font-size="${size}" ${nameFont}>${nm}</text>
${tg ? `<text x="690" y="226" text-anchor="end" font-size="22" letter-spacing="1.5" ${tagFont}>${tg}</text>` : ""}`;
  }
  if (layout === "2") {
    return `${monogram({ ink, accent, style, letter, cx: 600, cy: 120, r: 64 })}
<text x="600" y="244" text-anchor="middle" font-size="${size}" ${nameFont}>${nm}</text>
${tg ? `<text x="600" y="282" text-anchor="middle" font-size="22" letter-spacing="1.5" ${tagFont}>${tg}</text>` : ""}`;
  }
  if (layout === "3") {
    return `<rect x="430" y="40" width="340" height="270" rx="${style === "geometric" ? 4 : 28}" fill="none" stroke="${ink}" stroke-width="3"/><rect x="442" y="52" width="316" height="246" rx="${style === "geometric" ? 2 : 20}" fill="none" stroke="${accent}" stroke-width="1.5"/>
${monogram({ ink, accent, style, letter, cx: 600, cy: 130, r: 50 })}
<text x="600" y="240" text-anchor="middle" font-size="${Math.min(size, 46)}" ${nameFont}>${nm}</text>
${tg ? `<text x="600" y="274" text-anchor="middle" font-size="18" letter-spacing="1.5" ${tagFont}>${tg}</text>` : ""}`;
  }
  return `<text x="600" y="190" text-anchor="middle" font-size="${size + 14}" ${nameFont}>${nm}</text>
<path d="M${corporate ? 380 : 440} 214 H${corporate ? 820 : 760}" stroke="${accent}" stroke-width="3"/>
${tg ? `<text x="600" y="254" text-anchor="middle" font-size="22" letter-spacing="1.5" ${tagFont}>${tg}</text>` : ""}`;
}

function identityBoard(o) {
  const { ink, paper, accent, name, tag, corporate } = o;
  const letter = [...name.trim()][0] || "أ";
  const kind = corporate ? "هوية الشركة" : "الهوية الشخصية";
  const swatches = [ink, accent, paper].map((c, i) => `<rect x="${960 - i * 90}" y="528" width="70" height="70" rx="10" fill="${c}" stroke="${ink}" stroke-opacity=".25"/><text x="${995 - i * 90}" y="620" text-anchor="middle" font-size="12" font-family="Tajawal, sans-serif" fill="${ink}" opacity=".7" direction="ltr">${c.toUpperCase()}</text>`).join("");
  const card = `<g><rect x="90" y="470" width="360" height="190" rx="12" fill="${paper}" stroke="${ink}" stroke-width="2"/>
<rect x="90" y="470" width="12" height="190" rx="4" fill="${accent}"/>
${monogram({ ink, accent, style: o.style, letter, cx: 390, cy: 530, r: 30 })}
<text x="430" y="610" text-anchor="end" font-size="26" font-family="Aref Ruqaa, Amiri, serif" font-weight="700" fill="${ink}">${esc(name)}</text>
<text x="430" y="638" text-anchor="end" font-size="14" font-family="Tajawal, sans-serif" fill="${ink}" opacity=".75">${esc(tag)}</text></g>`;
  const extra = corporate
    ? `<g><rect x="500" y="470" width="150" height="190" rx="6" fill="#fff" stroke="${ink}" stroke-opacity=".5"/><rect x="516" y="486" width="118" height="6" fill="${accent}"/><path d="M516 510H634M516 524H620M516 538H634M516 552H600" stroke="${ink}" stroke-opacity=".25" stroke-width="3"/><text x="634" y="640" text-anchor="end" font-size="10" font-family="Tajawal, sans-serif" fill="${ink}" opacity=".6">${esc(name)}</text></g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="1200" height="700"><rect width="1200" height="700" fill="${paper}"/>
<rect x="24" y="24" width="1152" height="652" rx="18" fill="none" stroke="${ink}" stroke-opacity=".25"/>
<text x="1160" y="62" text-anchor="end" font-size="15" letter-spacing="2" font-family="Tajawal, sans-serif" fill="${accent}">${kind} · أثر</text>
${lockup({ ...o, letter })}
<path d="M90 400H1110" stroke="${ink}" stroke-opacity=".2"/>
${card}${extra}
<text x="1110" y="500" text-anchor="end" font-size="16" font-family="Tajawal, sans-serif" fill="${ink}">لوحة الألوان</text>
${swatches}
<text x="1110" y="662" text-anchor="end" font-size="14" font-family="Tajawal, sans-serif" fill="${ink}" opacity=".7">الخطوط: Aref Ruqaa للعناوين · Tajawal للنص</text></svg>`;
}

function signatureSvg({ ink, name, sig }) {
  const s = SIGNATURES.find((x) => x.id === Number(sig)) || SIGNATURES[0];
  const t = esc(name);
  const size = t.length > 14 ? 74 : t.length > 9 ? 100 : 130;
  const fs = s.font === "Jomhuria" ? size * 1.7 : s.font === "Katibeh" ? size * 1.1 : size;
  const cx = 600, cy = 190;
  const shadow = s.shadow ? `<text x="${cx + 5}" y="${cy + 6}" text-anchor="middle" font-family="${s.font}, serif" font-weight="${s.w}" font-size="${fs}" fill="${ink}" opacity=".25">${t}</text>` : "";
  const text = `<g transform="rotate(${s.tilt} ${cx} ${cy})">${shadow}<text x="${cx}" y="${cy}" text-anchor="middle" font-family="${s.font}, serif" font-weight="${s.w}" ${s.italic ? 'font-style="italic"' : ""} font-size="${fs}" fill="${ink}">${t}</text></g>`;
  const L = {
    swash: `<path d="M240 250 C420 300 700 215 960 240" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
    under: `<path d="M300 252 H900" stroke="${ink}" stroke-width="3"/>`,
    bar: `<rect x="380" y="250" width="440" height="8" fill="${ink}"/>`,
    wave: `<path d="M260 255 q50 -30 100 0 t100 0 t100 0 t100 0 t100 0 t100 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    double: `<path d="M300 246 H900 M300 260 H900" stroke="${ink}" stroke-width="2"/>`,
    crown: `<path d="M540 80 l30 30 l30 -40 l30 40 l30 -30 v40 H540Z" fill="none" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M300 262 H900" stroke="${ink}" stroke-width="3"/>`,
    frame: `<rect x="190" y="70" width="820" height="230" rx="26" fill="none" stroke="${ink}" stroke-width="4"/><rect x="204" y="84" width="792" height="202" rx="18" fill="none" stroke="${ink}" stroke-width="1.5"/>`,
    dot: `<circle cx="940" cy="${cy}" r="9" fill="${ink}"/><path d="M260 255 C500 240 700 270 940 238" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    none: "",
  }[s.line];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 360" width="1200" height="360">${text}${L}</svg>`;
}

function markSvg({ ink, accent, name }) {
  const seed = seedOf(name);
  const rings = 9 + (seed % 5);
  let g = "";
  for (let i = 1; i <= rings; i++) {
    const r = 22 + i * 24;
    const start = ((seed * i) % 70) + 10;
    const len = 190 + ((seed >> (i % 5)) % 130);
    const circ = 2 * Math.PI * r;
    g += `<circle cx="300" cy="300" r="${r}" fill="none" stroke="${i % 4 === 0 ? accent : ink}" stroke-width="${i % 3 === 0 ? 5 : 3}" stroke-linecap="round" stroke-dasharray="${((len / 360) * circ).toFixed(1)} ${((1 - len / 360) * circ).toFixed(1)}" transform="rotate(${start + i * (seed % 23)} 300 300)"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" width="800" height="853">${g}<text x="300" y="625" text-anchor="middle" font-family="Aref Ruqaa, Amiri, serif" font-weight="700" font-size="30" fill="${ink}">${esc(name)}</text></svg>`;
}

export function build({ mode, palette, style, layout, name, tag, sig }) {
  const nm = name.trim() || "أثر";
  const o = { ink: palette.ink, paper: palette.paper, accent: palette.accent, style, layout, name: nm, tag: tag.trim() };
  if (mode === "signature") return { svg: signatureSvg({ ...o, sig }), w: 1200, h: 360 };
  if (mode === "mark") return { svg: markSvg(o), w: 800, h: 853 };
  return { svg: identityBoard({ ...o, corporate: mode === "corporate" }), w: 1200, h: 700 };
}

/* تضمين الخطوط داخل الملف المصدَّر ليظهر الاسم بشكله الصحيح في أي جهاز */
const toDataUrl = (blob) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(blob); });
let cssCache = null;
export async function embeddedFontCss() {
  if (cssCache) return cssCache;
  const css = await (await fetch(fontsHref())).text();
  const keep = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m0;
  while ((m0 = re.exec(css))) if (m0[1] === "arabic" || m0[1] === "latin") keep.push(m0[2]);
  const out = [];
  for (const b of keep) {
    const m = b.match(/url\((https:[^)]+)\)/);
    if (!m) continue;
    const blob = await (await fetch(m[1])).blob();
    out.push(b.replace(m[1], await toDataUrl(blob)));
  }
  cssCache = out.join("\n");
  return cssCache;
}

export async function svgWithFonts(svg) {
  try {
    const css = await embeddedFontCss();
    return svg.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`);
  } catch {
    return svg;
  }
}
