import { useEffect } from "react";
import { BUNDLES, DELIVERY_NOTE } from "./bundles";
import { BUNDLE_DETAILS } from "./bundleDetails";
import { useSession } from "./AuthContext.jsx";

export default function BundlePage({ id }) {
  const { requireAuth } = useSession();
  const b = BUNDLES.find((x) => x.id === id);
  const d = BUNDLE_DETAILS[id];
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [id]);
  if (!b || !d) { window.location.hash = ""; return null; }

  const order = () => {
    try { sessionStorage.setItem("athar:buy", b.id); } catch { /* ignore */ }
    requireAuth(() => { window.location.hash = "#account"; },
      { hash: "#account", label: `طلب ${b.title}` });
  };
  const back = () => {
    try { sessionStorage.setItem("athar:order", JSON.stringify({ v: "", msg: "", go: "store", n: Date.now() })); } catch { /* ignore */ }
    window.location.hash = "";
  };

  return (
    <>
      <header className="admin-bar">
        <button className="tab" onClick={back}>← المتجر</button>
        <a className="logo" href="#"><img src="/logo.png" alt="أثر" style={{ height: 38 }} /></a>
      </header>
      <main className="sv">
        <div className="svh">
          <span className="bd-badge">{b.badge}</span>
          <h1>{b.title}</h1>
          <p className="l">{d.headline}</p>
          <p className="lg2">{d.long}</p>
          <div className="bd-price big"><b>{b.price}</b><span>{b.currency}</span></div>
          <button className="btn" onClick={order}>اطلب الحزمة</button>
        </div>

        <h2>ماذا ستستلم بعد تأكيد الطلب؟</h2>
        <ul className="inc">{d.receive.map((t) => <li key={t}>{t}</li>)}</ul>

        {d.why && (<><h2>لماذا يختارها أغلب عملائنا؟</h2><p className="lg2">{d.why}</p></>)}

        <h2>مناسبة لـ</h2>
        <p className="lg2">{d.fit}</p>

        <h2>طريقة الاستلام</h2>
        <p className="lg2">حوّل المبلغ ثم ارفع الإيصال من صفحة حسابك. {DELIVERY_NOTE}</p>
        <div className="bd-fmt">{b.formats.map((f) => <span key={f}>{f}</span>)}</div>
      </main>
    </>
  );
}
