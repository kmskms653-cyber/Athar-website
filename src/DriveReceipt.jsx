import { useEffect, useRef, useState } from "react";
import { downloadDriveFile, formatBytes, saveBlobToDevice } from "./drive";

function extFor(mime, name) {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(String(name || ""));
  if (fromName) return fromName[1].toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * إيصال محفوظ في Google Drive: معاينة، تنزيل إلى الهاتف، وحذف (من الأب).
 * التنزيل يمر عبر الجسر حتى لو كان المتصفح مسجّلاً بحساب Google آخر.
 */
export default function DriveReceipt({ order, adminKey, onDelete, deletedAt }) {
  const [state, setState] = useState({ loading: false, error: "", blob: null, url: "", mime: "" });
  const urlRef = useRef("");

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  if (!order.receiptDriveId) {
    if (deletedAt) return <p className="note small">حُذف الإيصال من Drive بتاريخ {deletedAt.toDate ? deletedAt.toDate().toLocaleString("ar-SA") : String(deletedAt)}.</p>;
    return null;
  }

  const name = order.receiptFileName || order.receiptName || "إيصال";
  const mime = order.receiptMime || "";
  const isImage = mime.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(name);

  async function load() {
    if (!adminKey) { setState((s) => ({ ...s, error: "أضف مفتاح الإدارة من تبويب «ربط Drive» أولاً." })); return; }
    setState({ loading: true, error: "", blob: null, url: "", mime: "" });
    try {
      const res = await downloadDriveFile(order.receiptDriveId, adminKey);
      const url = URL.createObjectURL(res.blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setState({ loading: false, error: "", blob: res.blob, url, mime: res.mimeType || mime });
      if (res.mimeType === "application/pdf") window.open(url, "_blank", "noopener");
    } catch (err) {
      setState({ loading: false, error: err.message, blob: null, url: "", mime: "" });
    }
  }

  async function download() {
    if (state.blob) {
      saveBlobToDevice(state.blob, `${order.title || "إيصال"} - ${name}`);
      return;
    }
    if (!adminKey) { setState((s) => ({ ...s, error: "أضف مفتاح الإدارة من تبويب «ربط Drive» أولاً." })); return; }
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await downloadDriveFile(order.receiptDriveId, adminKey);
      saveBlobToDevice(res.blob, `${order.title || "إيصال"} - ${res.name || name}`);
      const url = URL.createObjectURL(res.blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setState({ loading: false, error: "", blob: res.blob, url, mime: res.mimeType || mime });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }

  return (
    <div className="rcpt">
      <div className="rcpt-head">
        <span className={`rcpt-ic ${isImage ? "img" : "pdf"}`} aria-hidden="true">{isImage ? "▣" : "PDF"}</span>
        <div className="rcpt-meta">
          <b dir="auto">{name}</b>
          <small>
            {formatBytes(order.receiptSize)} · Drive
            {order.receiptDriveUrl && (
              <> · <a href={order.receiptDriveUrl} target="_blank" rel="noreferrer">فتح في Drive ↗</a></>
            )}
          </small>
        </div>
      </div>

      {state.url && isImage && (
        <a href={state.url} target="_blank" rel="noreferrer" className="rcpt-thumb">
          <img src={state.url} alt={`إيصال ${order.title || ""}`} />
        </a>
      )}

      <div className="rcpt-actions">
        <button type="button" className="btn sm" onClick={load} disabled={state.loading}>
          {state.loading ? "جارٍ الجلب…" : isImage ? "معاينة" : "عرض الملف"}
        </button>
        <button type="button" className="btn sm ghost" onClick={download} disabled={state.loading}>تنزيل على الجهاز</button>
        <button type="button" className="btn sm danger" onClick={onDelete} disabled={state.loading}>حذف الإيصال</button>
      </div>

      {state.error && <p className="err small" dir="auto">{state.error}</p>}
    </div>
  );
}
