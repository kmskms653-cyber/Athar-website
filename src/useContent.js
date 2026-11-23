import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_CONTENT, mergeContent } from "./defaultContent";

export function useContent() {
  const [c, setC] = useState(DEFAULT_CONTENT);
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "site", "content"),
      (snap) => setC(mergeContent(snap.exists() ? snap.data() : null)),
      (err) => { console.warn("Using default content:", err.code); setC(DEFAULT_CONTENT); }
    );
    return unsub;
  }, []);
  return c;
}
