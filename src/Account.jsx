import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useSession } from "./AuthContext.jsx";
import { BUNDLES } from "./bundles";
import { ORDER_STATUS } from "./orders";
import BankTransfer from "./BankTransfer.jsx";

// Google يمنع تسجيل الدخول داخل متصفحات التطبيقات (إنستغرام وسناب وتيك توك...)
const IN_APP = /Instagram|FBAN|FBAV|Snapchat|TikTok|musical_ly|Line\//i.test(typeof navigator !== "undefined" ? navigator.userAgent : "");

function readIntent() {
  try { return BUNDLES.find((b) => b.id === sessionStorage.getItem("athar:buy")) || null; } catch { return null; }
}
const clearIntent = () => { try { sessionStorage.removeItem("athar:buy"); } catch { /* ignore */ } };

// ملفات الحزمة بعد اكتمال الطلب: files = [{label, url}]
function Delivery({ order }) {
  const [state, setState] = useState({ loading: true, files: [], note: "", error: "" });
  useEffect(() => {
    let alive = true;
    getDoc(doc(db, "deliveries", order.bundleId))
      .then((snap) => {
        if (!alive) return;
        const d = snap.exists() ? snap.data() : {};
        const files = Array.isArray(d.files) && d.files.length ? d.files : d.url ? [{ label: "تحميل / فتح الملفات", url: d.url }] : [];
        setState({ loading: false, files, note: d.note || "", error: files.length ? "" : "روابط الحزمة لم تُرفع بعد، سنوافيك بها قريباً." });
      })
      .catch((e) => { console.error(e); if (alive) setState({ loading: false, files: [], note: "", error: "تعذر جلب الروابط، حاول لاحقاً." }); });
    return () => { alive = false; };
  }, [order.bundleId]);

  if (state.loading) return <p className="note">جارٍ تحميل الملفات…</p>;
  return (
    <div className="deliv">
      <div className="files">
        {state.files.map((f) => <a className="btn" key={f.url} href={f.url} target="_blank" rel="noreferrer">{f.label}</a>)}
      </div>
      {state.note && <p className="note">{state.note}</p>}
      {state.error && <p className="err">{state.error}</p>}
    </div>
  );
}

export default function Account() {
  const { user, isAdmin, openAuth, signOutUser, loading } = useSession();
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [intent, setIntent] = useState(readIntent);
  const [msg, setMsg] = useState({ cls: "ok", text: "" });

  useEffect(() => {
    if (!user) { setOrders([]); return undefined; }
    const q = query(collection(db, "orders"), where("uid", "==", user.uid));
    return onSnapshot(
      q,
      (snap) => {
        setOrdersError("");
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setOrders(list);
      },
      (e) => setOrdersError(e.code === "permission-denied" ? "لا توجد صلاحية: انشر firestore.rules المحدّثة." : "تعذر تحميل الطلبات.")
    );
  }, [user]);

  function login() {
    setError("");
    openAuth();
  }

  function done(res) {
    clearIntent(); setIntent(null);
    if (res.exists) setMsg({ cls: "note", text: "لديك طلب سابق لهذه الحزمة، تجده أدناه." });
    else if (res.receiptFailed) setMsg({ cls: "err", text: "سُجّل طلبك، لكن تعذر رفع الإيصال. أرسله إلى atharstudio653@gmail.com ليُطابَق مع طلبك." });
    else if (res.via === "drive") setMsg({ cls: "ok", text: "وصل إيصالك إلى مجلد أثر في Google Drive. سنتحقق من الحوالة وتُفعَّل ملفاتك هنا فور تأكيدها." });
    else setMsg({ cls: "ok", text: "تم استلام إيصالك وحفظه لدى الأستوديو. سنتحقق من الحوالة وتُفعَّل ملفاتك هنا فور تأكيدها." });
  }

  function cancelIntent() { clearIntent(); setIntent(null); }

  function resend(order) {
    const b = BUNDLES.find((x) => x.id === order.bundleId);
    if (!b) return;
    try { sessionStorage.setItem("athar:buy", b.id); } catch { /* ignore */ }
    setIntent(b);
  }

  if (loading) return <div className="fatal"><p>جارٍ التحميل…</p></div>;

  if (!user) {
    return (
      <div className="fatal">
        <img src="/logo.png" alt="أثر" style={{ height: 72 }} />
        <h1>حسابي</h1>
        <p>سجّل الدخول لشراء الحزم الرقمية واستلام ملفاتك.</p>
        {intent && <p className="note">الحزمة المختارة: {intent.title} — {intent.price} {intent.currency}</p>}
        {IN_APP && (
          <p className="note small">داخل متصفح التطبيقات (إنستغرام/سناب/تيك توك) استخدم الدخول برابط البريد، فهو يعمل هنا. إن تعذّر، انسخ الرابط وافتحه في Safari أو Chrome.
            {" "}<button type="button" className="cp" onClick={() => navigator.clipboard && navigator.clipboard.writeText(location.href)}>نسخ الرابط</button></p>
        )}
        <button className="btn" onClick={login}>تسجيل الدخول</button>
        {error && <p className="err">{error}</p>}
        <a className="back" href="#">← العودة للموقع</a>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <strong>حسابي</strong>
        <div>
          {isAdmin && <a className="tab" href="#admin">لوحة الإدارة</a>}
          <a className="tab" href="#">الموقع</a>
          <button className="tab" onClick={signOutUser}>خروج</button>
        </div>
      </header>

      <div className="panel">
        <p className="note">{user.displayName || user.email}</p>
        {msg.text && <p className={msg.cls}>{msg.text}</p>}

        <h3>مشترياتي</h3>
        {ordersError && <p className="err">{ordersError}</p>}
        {!ordersError && orders.length === 0 && <p className="note">لا توجد طلبات بعد. تصفّح <a href="#store" style={{ color: "var(--gold)" }}>المتجر</a>.</p>}
        {orders.map((o) => (
          <article className="req" key={o.id}>
            <header>
              <strong>{o.title}</strong>
              <span className={`st st-${o.status}`}>{ORDER_STATUS[o.status] || o.status}</span>
            </header>
            <p>{o.price} {o.currency}</p>

            {o.status === "pending_review" && (
              <div className="amber">
                <div>
                  <h4>تم استلام إيصال التحويل — جارٍ التحقق</h4>
                  <p>سيتم تفعيل أزرار تحميل جميع ملفات الحزمة هنا تلقائياً فور تأكيد وصول الحوالة لحساب urPay.</p>
                </div>
                {o.receiptDriveId || o.receiptPath ? (
                  <span className="rcpt-ok">✓ الإيصال محفوظ لدى الأستوديو</span>
                ) : (
                  <span className="rcpt-missing">لم يُرفع إيصال — أرسله إلى atharstudio653@gmail.com</span>
                )}
              </div>
            )}

            {o.status === "completed" && <Delivery order={o} />}

            {o.status === "rejected" && (
              <div className="amber bad">
                <div>
                  <h4>تعذر اعتماد الحوالة</h4>
                  <p>لم نتمكن من مطابقة الحوالة. يمكنك إعادة إرسال إيصال صحيح.</p>
                </div>
                <button className="btn" onClick={() => resend(o)}>إعادة إرسال الإيصال</button>
              </div>
            )}
          </article>
        ))}
      </div>

      {intent && <BankTransfer bundle={intent} user={user} onClose={cancelIntent} onDone={done} />}
    </div>
  );
}
