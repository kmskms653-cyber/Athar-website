import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpLeft, Menu, X, Mail, Sparkles, PenTool, Camera, Layers, ArrowLeft } from 'lucide-react';
import './style.css';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { defaults, mergeContent } from './content';

const Instagram = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const icons = [<Sparkles />, <Camera />, <Layers />, <PenTool />];
const tones = ['coffee', 'product', 'editorial'];
const Admin = lazy(() => import('./Admin'));
const Studio = lazy(() => import('./Studio'));

function Site({ c }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [form, setForm] = useState({name:'', email:'', service:'', message:''});
  const go = (id) => { document.getElementById(id)?.scrollIntoView({behavior:'smooth'}); setMenuOpen(false); };
  const pickService = (title) => { setForm(f => ({...f, service: title})); go('contact'); };
  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true); setSendError(''); setSent(false);
    try {
      await addDoc(collection(db, 'requests'), {
        name: form.name.trim().slice(0, 120),
        email: form.email.trim().toLowerCase().slice(0, 254),
        service: form.service.trim().slice(0, 120),
        message: form.message.trim().slice(0, 4000),
        status: 'new',
        createdAt: serverTimestamp()
      });
      setSent(true);
      setForm({ name: '', email: '', service: '', message: '' });
    } catch (err) {
      console.error('Athar contact request failed:', err);
      setSendError('تعذر حفظ طلبك حالياً. يرجى المحاولة لاحقاً أو التواصل معنا عبر البريد الظاهر بجانب النموذج.');
    } finally { setSending(false); }
  };
  return <div>
    <header className="header">
      <a className="brand" href="#home" onClick={e=>{e.preventDefault();go('home')}}><span className="brand-mark">أثر</span><span className="brand-en">ATHAR STUDIO</span></a>
      <button className="menu-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label="القائمة">{menuOpen?<X/>:<Menu/>}</button>
      <nav className={menuOpen?'nav open':'nav'}>
        {[['home','الرئيسية'],['about','عن أثر'],['services','خدماتنا'],['work','أعمالنا'],['studio','استديو القوالب'],['contact','تواصل معنا']].map(([id,label])=><a key={id} href={'#'+id} onClick={e=>{e.preventDefault();if(id==='studio'){window.location.hash='studio';setMenuOpen(false)}else go(id)}}>{label}</a>)}
      </nav>
      <div className="header-actions"><a className="studio-link" href="#studio">استديو القوالب</a><button className="header-cta" onClick={()=>go('contact')}>ابدأ مشروعك <ArrowUpLeft size={16}/></button></div>
    </header>

    <main>
      <section className="hero" id="home">
        <div className="hero-noise"></div>
        <div className="hero-content">
          <p className="eyebrow"><span></span> استوديو إبداعي مستقل</p>
          <h1>{c.heroLine1}<br/><em>{c.heroLine2}</em></h1>
          <p className="hero-copy">{c.heroCopy}</p>
          <div className="hero-actions"><button className="btn gold" onClick={()=>go('work')}>اكتشف أعمالنا <ArrowLeft size={17}/></button><button className="text-link" onClick={()=>go('about')}>تعرّف على أثر</button></div>
        </div>
        <div className="hero-side"><span>الفكرة بداية الأثر</span><b>01 / 04</b></div>
        <div className="hero-art"><div className="art-circle"></div><div className="art-word">أثــر</div><div className="art-caption">DESIGN WITH MEANING</div></div>
        <div className="hero-bottom"><span>الرياض — المملكة العربية السعودية</span><span>إبداع • هوية • تجربة</span></div>
      </section>

      <section className="intro section" id="about">
        <div className="section-tag">01 — من نحن</div>
        <div className="intro-grid"><h2>كل علامة<br/>لها <em>حكاية.</em></h2><div><p className="lead">{c.aboutLead}</p><p className="muted">{c.aboutMuted}</p><button className="under-link" onClick={()=>go('contact')}>لنتحدث عن مشروعك <ArrowLeft size={16}/></button></div></div>
      </section>

      <section className="services section" id="services">
        <div className="section-head"><div><div className="section-tag">02 — ماذا نقدم</div><h2>أفكار تتحول<br/><em>إلى أثر.</em></h2></div><p>نرافق مشروعك في كل مرحلة، ونقدّم حلولاً إبداعية تبدأ من الفكرة ولا تنتهي عند التنفيذ.</p></div>
        <div className="service-grid">{c.services.map((s,i)=><a className="service-card" href="#contact" key={s.title} onClick={e=>{e.preventDefault();pickService(s.title)}} aria-label={`اطلب خدمة ${s.title}`}><div className="service-top"><span>0{i+1}</span>{icons[i]}</div><h3>{s.title}</h3><p>{s.desc}</p><ArrowUpLeft className="card-arrow"/></a>)}</div>
      </section>

      <section className="work section" id="work">
        <div className="section-head"><div><div className="section-tag">03 — أعمال تجريبية</div><h2>تفاصيل<br/><em>تُرى وتُحس.</em></h2></div><p>مساحة للأفكار التي نمنحها شكلاً، وللتفاصيل الصغيرة التي تصنع فرقاً كبيراً.</p></div>
        <div className="work-grid">{c.works.map((w,i)=><article className={'work-card '+tones[i]} key={i}><div className={'work-visual'+(w.img?' has-img':'')}><span className="work-index">{'0'+(i+1)}</span>{w.video?<video src={w.video} poster={w.img} autoPlay muted loop playsInline preload="metadata" aria-label={w.title}/>:w.img?<img src={w.img} alt={w.title} loading="lazy"/>:<div className="work-symbol">{['قهوة','أثــر','فكرة'][i]}</div>}<span className="work-stamp">ATHAR STUDIO</span></div><div className="work-meta"><div><h3>{w.title}</h3><span>{w.type}</span></div><ArrowUpLeft/></div></article>)}</div>
        {c.worksNote&&<p className="note">{c.worksNote}</p>}
      </section>

      <section className="quote"><span>“</span><p>الأثر الجميل لا يحتاج إلى ضجيج،<br/>يكفي أن يكون صادقاً.</p><small>ATHAR — DESIGN STUDIO</small></section>

      <section className="contact section" id="contact">
        <div className="section-head"><div><div className="section-tag">04 — لنبدأ معاً</div><h2>لديك فكرة؟<br/><em>لنصنع أثرها.</em></h2></div><p>أخبرنا عن مشروعك، وسنعود إليك لمناقشة الخطوة التالية.</p></div>
        <div className="contact-grid"><div className="contact-aside"><p>نحب الأفكار التي تحمل معنى، والمشاريع التي تطمح إلى ترك بصمتها.</p><a href={'mailto:'+c.contactEmail}><Mail size={17}/> {c.contactEmail}</a><span><Instagram size={17}/> {c.instagram}</span></div>
          <form onSubmit={submit} className="contact-form"><label>الاسم<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="اسمك الكريم"/></label><label>البريد الإلكتروني<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label><label>الخدمة المطلوبة<select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="">اختر الخدمة</option>{c.services.map(s=><option key={s.title}>{s.title}</option>)}<option>أخرى</option></select></label><label>حدثنا عن فكرتك<textarea rows="3" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="اكتب تفاصيل مشروعك هنا..."/></label><button className="btn gold" type="submit" disabled={sending}>{sending ? 'جارٍ إرسال الطلب...' : 'إرسال الطلب'} <ArrowLeft size={17}/></button>{sent&&<p className="form-msg success-msg" role="status">وصل طلبك بنجاح، وسنتواصل معك قريباً.</p>}{sendError&&<p className="form-msg error-msg" role="alert">{sendError}</p>}</form>
        </div>
      </section>
    </main>
    <footer><a className="footer-logo" href="#home">أثر</a><span>© 2026 ATHAR STUDIO — جميع الحقوق محفوظة</span><button onClick={()=>go('home')}>العودة للأعلى ↑</button></footer>
  </div>;
}
function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [c, setC] = useState(defaults);
  useEffect(() => {
    const h = () => setHash(window.location.hash);
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  useEffect(() => {
    getDoc(doc(db, 'site', 'content')).then(snap => { if (snap.exists()) setC(mergeContent(snap.data())); }).catch(() => {});
  }, []);
  if (hash === '#admin') {
    return <Suspense fallback={<div className="admin-page"><p>جارٍ التحميل...</p></div>}><Admin content={c} onSaved={setC} /></Suspense>;
  }
  if (hash === '#studio') return <Suspense fallback={<div className="admin-page"><p>جارٍ فتح الاستديو...</p></div>}><Studio /></Suspense>;
  return <Site c={c} />;
}

createRoot(document.getElementById('root')).render(<App/>);
