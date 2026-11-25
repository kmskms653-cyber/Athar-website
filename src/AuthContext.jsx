import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { ATHAR_CONFIG, isSuperEmail } from "./atharConfig";
import AuthModal from "./AuthModal.jsx";

const AuthCtx = createContext(null);
const LS_EMAIL = "athar.emailForSignIn";
const SS_PENDING = "athar.pendingIntent";
const SS_CONSENT = "athar.pendingConsent";

const readJSON = (store, key) => {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function actionCodeSettings() {
  const base = `${window.location.origin}${window.location.pathname}`;
  return { url: base, handleCodeInApp: true };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = جارٍ التحقق، null = زائر
  const [role, setRole] = useState("guest");
  const [consented, setConsented] = useState(false);
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const pendingRef = useRef(null);
  const resumedRef = useRef(false);

  /* ---------- تسجيل الموافقة القانونية ---------- */
  const recordConsent = useCallback(async (u) => {
    const pending = readJSON(localStorage, SS_CONSENT);

    try {
      await setDoc(
        doc(db, "consents", u.uid),
        {
          uid: u.uid,
          email: (u.email || "").toLowerCase(),
          termsVersion: ATHAR_CONFIG.legal.termsVersion,
          privacyVersion: ATHAR_CONFIG.legal.privacyVersion,
          acceptedAt: serverTimestamp(),
          provider: (pending && pending.provider) || "emailLink",
          userAgent: navigator.userAgent.slice(0, 200),
        },
        { merge: true }
      );
      setConsented(true);
    } catch (e) {
      console.warn("consent write:", e && e.code);
      setConsented(true); // لا نمنع الاستخدام بسبب تعذّر السجل؛ القواعد ستوضّح في الإدارة
    } finally {
      try { localStorage.removeItem(SS_CONSENT); } catch { /* ignore */ }
    }
  }, []);

  /* ---------- تحديد الدور من الخادم ---------- */
  const resolveRole = useCallback(async (u) => {
    if (!u) { setRole("guest"); return "guest"; }
    const email = String(u.email || "").toLowerCase();
    if (isSuperEmail(email)) { setRole("super"); return "super"; }
    try {
      const snap = await getDoc(doc(db, "admins", email));
      const r = snap.exists() ? snap.data().role : "user";
      setRole(r === "sub" ? "sub" : "user");
      return r;
    } catch {
      setRole("user");
      return "user";
    }
  }, []);

  /* ---------- استكمال رابط الدخول السحري ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) return;
      const email = (localStorage.getItem(LS_EMAIL) || "").toLowerCase();
      setNotice("");
      if (!email) {
        // فُتح الرابط في جهاز آخر: نطلب البريد لإكمال الدخول
        setModal(true);
        setNeedsEmail(true);
        return;
      }
      try {
        const res = await signInWithEmailLink(auth, email, window.location.href);
        if (!cancelled) {
          await recordConsent(res.user);
          // تنظيف رابط الدخول من شريط العنوان
          window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
        }
      } catch (e) {
        console.error(e);
        setNotice(
          e.code === "auth/invalid-action-code"
            ? "رابط الدخول منتهي أو استُخدم مسبقاً. اطلب رابطاً جديداً."
            : "تعذر إكمال الدخول من الرابط. اطلب رابطاً جديداً."
        );
        setModal(true);
      } finally {
        try { localStorage.removeItem(LS_EMAIL); } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [needsEmail, setNeedsEmail] = useState(false);

  /* ---------- حالة الدخول ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) { setRole("guest"); setConsented(false); return; }
      const r = await resolveRole(u);

      // هل الموافقة الحالية مطابقة لإصدار الشروط؟
      let current = false;
      try {
        const snap = await getDoc(doc(db, "consents", u.uid));
        current = snap.exists()
          && snap.data().termsVersion === ATHAR_CONFIG.legal.termsVersion
          && snap.data().privacyVersion === ATHAR_CONFIG.legal.privacyVersion;
      } catch { current = false; }
      setConsented(current);
      if (!current) setModal(true);
      void r;

      // استكمال الخدمة التي نقر عليها الزائر قبل الدخول
      if (!resumedRef.current) {
        resumedRef.current = true;
        const pending = readJSON(sessionStorage, SS_PENDING);
        if (pending && pending.hash && pending.hash !== window.location.hash) {
          window.location.hash = pending.hash;
        }
        if (pendingRef.current) {
          const fn = pendingRef.current;
          pendingRef.current = null;
          setTimeout(() => { try { fn(); } catch (e) { console.warn(e); } }, 60);
        }
        try { sessionStorage.removeItem(SS_PENDING); } catch { /* ignore */ }
      }
    });
    return unsub;
  }, [resolveRole]);

  /* ---------- إرسال رابط الدخول ---------- */
  const sendMagicLink = useCallback(async (email) => {
    const clean = String(email || "").trim().toLowerCase();
    localStorage.setItem(LS_EMAIL, clean);
    localStorage.setItem(
      SS_CONSENT,
      JSON.stringify({ provider: "emailLink", at: Date.now(), terms: ATHAR_CONFIG.legal.termsVersion })
    );
    await sendSignInLinkToEmail(auth, clean, actionCodeSettings());
    return clean;
  }, []);

  const completeWithEmail = useCallback(async (email) => {
    const clean = String(email || "").trim().toLowerCase();
    const res = await signInWithEmailLink(auth, clean, window.location.href);
    await recordConsent(res.user);
    setNeedsEmail(false);
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    return res.user;
  }, [recordConsent]);

  /* ---------- الدخول عبر Google (بديل) ---------- */
  const googleSignIn = useCallback(async () => {
    localStorage.setItem(SS_CONSENT, JSON.stringify({ provider: "google", at: Date.now(), terms: ATHAR_CONFIG.legal.termsVersion }));
    const res = await signInWithPopup(auth, googleProvider);
    await recordConsent(res.user);
    return res.user;
  }, [recordConsent]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setModal(false);
    setRole("guest");
  }, []);

  /* ---------- بوابة الاستخدام ---------- */
  const requireAuth = useCallback((fn, meta = {}) => {
    if (auth.currentUser) { fn && fn(); return true; }
    pendingRef.current = fn || null;
    try {
      sessionStorage.setItem(
        SS_PENDING,
        JSON.stringify({ hash: meta.hash || window.location.hash, label: meta.label || "", at: Date.now() })
      );
    } catch { /* ignore */ }
    setModal(true);
    return false;
  }, []);

  const value = useMemo(() => ({
    user,
    role,
    loading: user === undefined,
    isAdmin: ATHAR_CONFIG.adminCheck(role),
    isSuper: role === "super",
    consented,
    requireAuth,
    signOutUser,
    notice,
    openAuth: () => setModal(true),
  }), [user, role, consented, requireAuth, signOutUser, notice]);

  return (
    <AuthCtx.Provider value={value}>
      {children}
      <AuthModal
        open={modal || (Boolean(user) && !consented)}
        needsEmail={needsEmail}
        initialEmail={user && user.email ? user.email : localStorage.getItem(LS_EMAIL) || ""}
        notice={notice}
        onClose={() => { setModal(false); setNeedsEmail(false); }}
        onSendLink={sendMagicLink}
        onCompleteEmail={completeWithEmail}
        onGoogle={googleSignIn}
        consentOnly={Boolean(user) && !consented}
        locked={Boolean(user) && !consented}
        onConsentOnly={async () => {
          if (user) await recordConsent(user);
          setModal(false);
        }}
      />
    </AuthCtx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useSession must be used inside AuthProvider");
  return ctx;
}

export { SS_PENDING, SS_CONSENT };
