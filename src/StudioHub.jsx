import { useEffect } from "react";
import { STUDIOS } from "./Site.jsx";
import "./hub.css";

export default function StudioHub({ id }) {
  const st = STUDIOS.find((x) => x.id === id);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [id]);
  if (!st) return null;
  return (
    <main className="hub" dir="rtl">
      <header className="hub-top">
        <a href="#/" className="hub-back">← الرئيسية</a>
        <img src="/logo.png" alt="أثر" />
        <span className="hub-badge">الاستديو {id} من 5</span>
      </header>
      <section className="hub-hero" style={{ backgroundImage: `linear-gradient(180deg,#0b0806aa,#0b0806f0),url(${st.img})` }}>
        <h1>{st.title}</h1>
        <p>{st.text}</p>
      </section>
      <section className="hub-grid">
        {st.items.map(([label, href, price], n) => {
          const link = href ? (href.startsWith("#") ? href : `#${href}`) : "#contact";
          return (
            <a key={label} className={`hub-tile ${href ? "" : "soon"}`} href={link}>
              <span className="hub-img" style={{ backgroundImage: `url(${st.img})`, backgroundPosition: `${(n * 23) % 100}% ${(n * 37) % 100}%` }}><b>{n + 1}</b></span>
              <strong>{label}</strong>
              {price && <em>{price}</em>}
              <small>{href ? "افتح الأداة" : "قريباً — اطلبها الآن"}</small>
            </a>
          );
        })}
      </section>
      <nav className="hub-others">
        {STUDIOS.filter((x) => x.id !== id).map((x) => <a key={x.id} href={`#studio-${x.id}`}>{x.title}</a>)}
      </nav>
    </main>
  );
}
