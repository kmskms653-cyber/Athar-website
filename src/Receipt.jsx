import { useState } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

// لا نحفظ رابطاً قابلاً للتداول: المسار فقط يُحفظ، والرابط يُولَّد عند الطلب لمن تسمح له قواعد Storage
export default function Receipt({ path, label = "عرض الإيصال" }) {
  const [state, setState] = useState({ loading: false, url: "", error: "" });
  if (!path) return null;
  async function load() {
    setState({ loading: true, url: "", error: "" });
    try {
      const url = await getDownloadURL(ref(storage, path));
      setState({ loading: false, url, error: "" });
    } catch (e) {
      console.error(e);
      setState({ loading: false, url: "", error: "تعذر فتح الإيصال (صلاحية أو ملف غير موجود)." });
    }
  }
  if (state.url) return <a href={state.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "underline" }}>فتح الإيصال ↗</a>;
  return (
    <span>
      <button type="button" className="cp" onClick={load} disabled={state.loading}>{state.loading ? "جارٍ التحميل…" : label}</button>
      {state.error && <small className="err"> {state.error}</small>}
    </span>
  );
}
