import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { deliveryFile, deliveryList, driveReady, formatBytes } from "./drive";
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
  const [state, setState] = useState({ loading: true, files: [], links: [], note: "", error: "" });
  const [busyId, setBusyId] = useState("");
  const [dlErr, setDlErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      let files = [];
      let driveErr = "";
      // 1) ملفات Drive الأساسية (يتحقق الجسر من الدفع بنفسه)
      if (driveReady()) {
        try {
          const token = await auth.currentUser.getIdToken();
          files = (await deliveryList(token, order.bundleId)).files || [];
        } catch (e) { driveErr = e.message || ""; }
      }
      // 2) روابط احتياطية يضعها المدير في Firestore
      let links = [];
      let note = "";
      try {
        const snap = await getDoc(doc(db, "deliveries", order.bundleId));
        const d = snap.exists() ? snap.data() : {};
        links = Array.isArray(d.files) && d.files.length ? d.files : d.url ? [{ label: "تحميل / فتح الملفات", url: d.url }] : [];
        note = d.note || "";
      } catch { /* ignore */ }
      if (!alive) return;
      setState({
        loading: false, files, links, note,
        error: files.length || links.length ? "" : (driveErr || "ملفات الحزمة لم تُرفع بعد، سنوافيك بها قريباً."),
      });
    })();
    return () => { alive = false; };
  }, [order.bundleId]);

  async function get(f) {
    setDlErr(""); setBusyId(f.id);
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await deliveryFile(token, order.bundleId, f.id);
      if (r.mode === "share") { window.open(r.url, "_blank", "noopener"); }
      else {
        const url = URL.createObjectURL(r.blob);
        const a = document.createElement("a");
        a.href = url; a.download = r.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (e) { setDlErr(e.message || "تعذر تنزيل الملف."); }
    finally { setBusyId(""); }
  }

  if (state.loading) return <p className="note">جارٍ تحميل الملفات…</p>;
  return (
    <div className="deliv">
      <div className="files">
        {state.files.map((f) => (
          <button className="btn" key={f.id} onClick={() => get(f)} disabled={busyId === f.id}>
            {busyId === f.id ? "جارٍ التحضير…" : `${f.name} (${formatBytes(f.size)})`}
          </button>
        ))}
        {state.links.map((f) => <a className="btn" key={f.url} href={f.url} target="_blank" rel="noreferrer">{f.label}</a>)}
      </div>
      {state.note && <p className="note">{state.note}</p>}
      {dlErr && <p className="err">{dlErr}</p>}
      {state.error && <p className="err">{state.error}</p>}
    </div>
  );
}

export default function Account() {
  const { user, isAdmin, openAuth, signOutUser, loading, consented } = useSession();
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

  if (!user || !consented) {
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
                  <h4>استلمنا إيصالك — الحوالة قيد التحقق</h4>
                  <p>سيتم تفعيل أزرار تحميل جميع ملفات الحزمة هنا تلقائياً فور تأكيد وصول الحوالة لحساب urPay.</p>
                </div>
                {o.receiptDriveId || o.receiptPath ? (
                  <span className="rcpt-ok">✓ الإيصال محفوظ لدى الأستوديو</span>
                ) : (
                  <span className="rcpt-missing">لم يُرفع إيصال — أرسله إلى atharstudio653@gmail.com</span>
                )}
              </div>
            )}

            {o.status === "completed" && (
              <p className="rcpt-ok" style={{ margin: "6px 0" }}>✓ تم تأكيد استلام الحوالة — ملفاتك جاهزة. <a href="#refund">سياسة الاسترجاع</a></p>
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
