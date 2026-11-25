import { useEffect } from "react";
import { useContent } from "./useContent";
import { DET, ICON_PATHS } from "./serviceDetails";
import { useSession } from "./AuthContext.jsx";

export function ServiceIcon({ i, size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[i].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

function Media({ m, title }) {
  if (m.type === "video") return <video src={m.src} muted loop playsInline autoPlay preload="metadata" />;
  return <img src={m.src} alt={m.title || title} loading="lazy" style={{ objectPosition: m.pos || "50% 50%" }} />;
}

export default function ServicePage({ index }) {
  const { requireAuth } = useSession();
  const c = useContent();
  const S = c.services[index];
  const D = DET[index];

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [index]);

  const price = (j) => (c.price && c.price[index] && c.price[index][j]) || "حسب نطاق المشروع";

  const order = (j) => {
    const msg = j == null
      ? `أرغب بطلب خدمة: ${S.title}\n`
      : `أرغب بطلب: ${S.title} — باقة ${D.pk[j][0]} (${price(j)})\n`;
    try { sessionStorage.setItem("athar:order", JSON.stringify({ v: S.title, msg, go: "contact", n: Date.now() })); } catch { /* ignore */ }
    requireAuth(() => { window.location.hash = ""; }, { hash: "", label: `طلب ${S.title}` });
  };

  const back = () => {
    try { sessionStorage.setItem("athar:order", JSON.stringify({ v: "", msg: "", go: "services", n: Date.now() })); } catch { /* ignore */ }
    window.location.hash = "";
  };

  const media = D.media.length ? D.media : [null, null, null];

  return (
    <>
      <header className="admin-bar">
        <button className="tab" onClick={back}>← الخدمات</button>
        <a className="logo" href="#"><img src="/logo.png" alt="أثر" style={{ height: 38 }} /></a>
      </header>
      <main className="sv">
        <div className="svh">
          <span className="ic"><ServiceIcon i={index} /></span>
          <small>{String(index + 1).padStart(2, "0")}</small>
          <h1>{S.title}</h1>
          <p className="l">{S.text}</p>
          <p className="lg2">{D.long}</p>
          <button className="btn" onClick={() => order(null)}>اطلب هذه الخدمة</button>
        </div>

        <h2>نماذج من أعمالنا</h2>
        <div className="gal">
          {media.map((m, n) => (
            <figure className={`work work-${(n % 3) + 1}`} key={n}>
              {m ? <Media m={m} title={S.title} /> : null}
              <figcaption><span>{m && m.title ? m.title.split(" — ")[1] || S.title : S.title}</span><strong>{m ? (m.title ? m.title.split(" — ")[0] : "") : `نموذج ${n + 1}`}</strong></figcaption>
            </figure>
          ))}
        </div>

        <h2>ما تشمله الخدمة</h2>
        <ul className="inc">{D.inc.map((t) => <li key={t}>{t}</li>)}</ul>

        <h2>الباقات والأسعار</h2>
        <div className="pk">
          {D.pk.map((k, j) => (
            <div className="pkc" key={k[0]}>
              <h3>{k[0]}</h3>
              <p>{k[1]}</p>
              <div className="pr">{price(j)}</div>
              <button className="btn" onClick={() => order(j)}>اطلب هذه الباقة</button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
