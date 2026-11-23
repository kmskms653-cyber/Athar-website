import { BUNDLES } from "./bundles";
import { useAuth } from "./useAuth";

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function Store({ title, subtitle }) {
  const user = useAuth();

  const buy = (bundle) => {
    try { sessionStorage.setItem("athar:buy", bundle.id); } catch { /* ignore */ }
    window.location.hash = "#account";
  };

  return (
    <section className="section alt" id="store">
      <span className="pill rv">{title}</span>
      <h2 className="rv tagh">لكلِّ منتجٍ حكاية،<br /><em>ولكلِّ حكايةٍ أثر</em></h2>
      <p className="store-sub rv">{subtitle}</p>
      <div className="store-grid">
        {BUNDLES.map((b, i) => (
          <article className={`bd rv ${b.popular ? "pop" : ""}`} style={{ "--d": `${i * 90}ms` }} key={b.id}>
            <div>
              <span className="bd-badge">{b.badge}</span>
              <h3>{b.title}</h3>
              <p className="bd-tag">{b.tagline}</p>
              <div className="bd-price"><b>{b.price}</b><span>{b.currency}</span></div>
              <ul>
                {b.deliverables.map((d) => (
                  <li key={d}><Check /><span>{d}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="bd-fmt">{b.formats.map((f) => <span key={f}>{f}</span>)}</div>
              <a className="bd-more" href={`#bundle-${b.id}`}>التفاصيل ما ستستلمه</a>
              <button type="button" className="btn bd-buy" disabled={user === undefined} onClick={() => buy(b)}>
                {user ? "اطلب الحزمة" : "سجّل الدخول للشراء"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
