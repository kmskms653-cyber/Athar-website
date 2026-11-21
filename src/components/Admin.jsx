import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, provider, ADMIN_EMAIL } from './firebase';
import { defaults, mergeContent } from './content';

export default function Admin({ content, onSaved }) {
  const [user, setUser] = useState(undefined);
  const [draft, setDraft] = useState(content);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [requestsError, setRequestsError] = useState('');
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { setDraft(content); }, [content]);

  const isAdmin = !!user && user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.emailVerified;

  const login = async () => {
    setError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
        try { await signInWithRedirect(auth, provider); } catch (e2) { setError(e2.code || String(e2)); }
      } else if (e.code !== 'auth/popup-closed-by-user') {
        setError(e.code === 'auth/unauthorized-domain'
          ? 'هذا النطاق غير مضاف في Firebase (Authentication ← Settings ← Authorized domains).'
          : (e.code || String(e)));
      }
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true); setRequestsError('');
    try {
      const snap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc')));
      setRequests(snap.docs.map(item => ({ id: item.id, ...item.data() })));
    } catch (e) {
      setRequestsError(e.code === 'permission-denied' ? 'لا توجد صلاحية لقراءة الطلبات. تحقق من نشر قواعد Firestore.' : 'تعذر تحميل الطلبات. تحقق من إعدادات Firebase والاتصال.');
    } finally { setLoadingRequests(false); }
  };
  useEffect(() => { if (isAdmin) loadRequests(); }, [isAdmin]);

  const changeRequestStatus = async (requestId, status) => {
    try {
      await updateDoc(doc(db, 'requests', requestId), { status, reviewedAt: serverTimestamp() });
      setRequests(items => items.map(item => item.id === requestId ? { ...item, status } : item));
    } catch (e) { setRequestsError('تعذر تحديث حالة الطلب.'); }
  };

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const setIn = (k, i, f, v) => setDraft(d => ({ ...d, [k]: d[k].map((x, j) => (j === i ? { ...x, [f]: v } : x)) }));

  const save = async () => {
    setStatus('جارٍ الحفظ...'); setError('');
    try {
      await setDoc(doc(db, 'site', 'content'), { ...draft, updatedAt: serverTimestamp() });
      onSaved(mergeContent(draft));
      setStatus('تم الحفظ ✓ التغييرات ظاهرة الآن في الموقع');
    } catch (e) {
      setStatus('');
      setError(e.code === 'permission-denied' ? 'لا تملك صلاحية الحفظ. تأكد من نشر قواعد Firestore ومن دخولك بالبريد المخوّل.' : (e.code || String(e)));
    }
  };

  const reset = async () => {
    if (!window.confirm('استعادة النصوص الافتراضية وحذف كل تعديلاتك؟')) return;
    setStatus('جارٍ الاستعادة...'); setError('');
    try {
      await deleteDoc(doc(db, 'site', 'content'));
      setDraft(defaults); onSaved(defaults);
      setStatus('تمت الاستعادة ✓');
    } catch (e) { setStatus(''); setError(e.code || String(e)); }
  };

  if (user === undefined) return <div className="admin-page"><p>جارٍ التحميل...</p></div>;

  if (!user) return (
    <div className="admin-page">
      <div className="admin-card" style={{ maxWidth: 440, margin: '60px auto' }}>
        <h3>لوحة تحكم أثر</h3>
        <p>سجّل الدخول بحساب المدير لتعديل محتوى الموقع.</p>
        <button className="admin-btn" onClick={login}>الدخول بحساب Google</button>
        {error && <p className="admin-err">{error}</p>}
        <p><a href="#home">← العودة للموقع</a></p>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="admin-page">
      <div className="admin-card" style={{ maxWidth: 440, margin: '60px auto' }}>
        <h3>الحساب غير مخوّل</h3>
        <p>الحساب ({user.email}) لا يملك صلاحية التعديل.</p>
        <button className="admin-btn ghost" onClick={() => signOut(auth)}>تسجيل الخروج</button>
        <p><a href="#home">← العودة للموقع</a></p>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="admin-bar">
        <b>لوحة التحكم — {user.email}</b>
        <span><a href="#home">عرض الموقع</a> · <a href="#studio">استديو القوالب</a> · <button className="admin-btn ghost" onClick={() => signOut(auth)}>خروج</button></span>
      </div>

      <div className="admin-card"><h3>الواجهة الرئيسية</h3>
        <div className="admin-row">
          <label>السطر الأول<input value={draft.heroLine1} onChange={e => set('heroLine1', e.target.value)} /></label>
          <label>السطر الثاني (بخط مميز)<input value={draft.heroLine2} onChange={e => set('heroLine2', e.target.value)} /></label>
        </div>
        <label>الوصف<textarea rows="3" value={draft.heroCopy} onChange={e => set('heroCopy', e.target.value)} /></label>
      </div>

      <div className="admin-card"><h3>من نحن</h3>
        <label>الفقرة الأولى<textarea rows="3" value={draft.aboutLead} onChange={e => set('aboutLead', e.target.value)} /></label>
        <label>الفقرة الثانية<textarea rows="3" value={draft.aboutMuted} onChange={e => set('aboutMuted', e.target.value)} /></label>
      </div>

      {draft.services.map((s, i) => (
        <div className="admin-card" key={i}><h3>الخدمة {i + 1}</h3>
          <label>العنوان<input value={s.title} onChange={e => setIn('services', i, 'title', e.target.value)} /></label>
          <label>الوصف<textarea rows="2" value={s.desc} onChange={e => setIn('services', i, 'desc', e.target.value)} /></label>
        </div>
      ))}

      {draft.works.map((w, i) => (
        <div className="admin-card" key={i}><h3>العمل {i + 1}</h3>
          <div className="admin-row">
            <label>العنوان<input value={w.title} onChange={e => setIn('works', i, 'title', e.target.value)} /></label>
            <label>النوع<input value={w.type} onChange={e => setIn('works', i, 'type', e.target.value)} /></label>
          </div>
        </div>
      ))}
      <div className="admin-card"><h3>ملاحظة الأعمال</h3>
        <label>النص (اتركه فارغاً لإخفاء الملاحظة)<textarea rows="2" value={draft.worksNote} onChange={e => set('worksNote', e.target.value)} /></label>
      </div>

      <div className="admin-card"><h3>التواصل</h3>
        <div className="admin-row">
          <label>البريد<input type="email" value={draft.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></label>
          <label>حساب إنستغرام<input value={draft.instagram} onChange={e => set('instagram', e.target.value)} /></label>
        </div>
      </div>

      <div className="admin-card requests-card">
        <div className="requests-heading"><h3>طلبات العملاء</h3><button className="admin-btn ghost" onClick={loadRequests} disabled={loadingRequests}>{loadingRequests ? 'جارٍ التحديث...' : 'تحديث الطلبات'}</button></div>
        {requestsError && <p className="admin-err" role="alert">{requestsError}</p>}
        {!requestsError && !requests.length && !loadingRequests && <p>لا توجد طلبات حتى الآن.</p>}
        {requests.map(item => <article className="request-item" key={item.id}>
          <div className="request-meta"><b>{item.name || 'بدون اسم'}</b><span>{item.email}</span><span>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('ar-SA') : 'وقت الاستلام غير متاح'}</span></div>
          <p><b>الخدمة:</b> {item.service || 'غير محددة'}</p>
          <p className="request-message">{item.message || 'لا توجد تفاصيل إضافية.'}</p>
          <label className="request-status">حالة الطلب<select value={item.status || 'new'} onChange={e => changeRequestStatus(item.id, e.target.value)}><option value="new">جديد</option><option value="in_progress">قيد المتابعة</option><option value="completed">مكتمل</option></select></label>
        </article>)}
      </div>

      <div className="admin-save">
        <button className="admin-btn" onClick={save}>حفظ التغييرات</button>
        <button className="admin-btn ghost" onClick={reset}>استعادة الافتراضي</button>
        {status && <span className="admin-msg">{status}</span>}
        {error && <span className="admin-err">{error}</span>}
      </div>
    </div>
  );
}
