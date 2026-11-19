import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpLeft, Menu, X, Instagram, Mail, Sparkles, PenTool, Camera, Layers, ArrowLeft } from 'lucide-react';
import './style.css';

const services = [
  { icon: <Sparkles />, title: 'الهوية البصرية', desc: 'نبني هويات متكاملة تعبّر عن شخصية مشروعك وتمنحه حضوراً لا يُنسى.' },
  { icon: <Camera />, title: 'صناعة المحتوى', desc: 'نحوّل الأفكار والمنتجات إلى محتوى بصري يحكي قصتك بوضوح.' },
  { icon: <Layers />, title: 'التصميم الرقمي', desc: 'تصاميم وتجارب رقمية تجمع بين الجمال وسهولة الاستخدام.' },
  { icon: <PenTool />, title: 'التصميم الإبداعي', desc: 'حلول تصميمية مرنة للحملات والمطبوعات والمواد التسويقية.' }
];
const works = [
  { n: '01', title: 'هوية مقهى مختص', type: 'هوية بصرية', tone: 'coffee' },
  { n: '02', title: 'حكاية منتج', type: 'تصوير ومحتوى', tone: 'product' },
  { n: '03', title: 'تفاصيل تصنع الفرق', type: 'تصميم إبداعي', tone: 'editorial' }
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({name:'', email:'', service:'', message:''});
  const go = (id) => { document.getElementById(id)?.scrollIntoView({behavior:'smooth'}); setMenuOpen(false); };
  const submit = (e) => { e.preventDefault(); setSent(true); };
  return <div>
    <header className="header">
      <a className="brand" href="#home" onClick={e=>{e.preventDefault();go('home')}}><span className="brand-mark">أثر</span><span className="brand-en">ATHAR STUDIO</span></a>
      <button className="menu-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label="القائمة">{menuOpen?<X/>:<Menu/>}</button>
      <nav className={menuOpen?'nav open':'nav'}>
        {[['home','الرئيسية'],['about','عن أثر'],['services','خدماتنا'],['work','أعمالنا'],['contact','تواصل معنا']].map(([id,label])=><a key={id} href={'#'+id} onClick={e=>{e.preventDefault();go(id)}}>{label}</a>)}
      </nav>
      <button className="header-cta" onClick={()=>go('contact')}>ابدأ مشروعك <ArrowUpLeft size={16}/></button>
    </header>

    <main>
      <section className="hero" id="home">
        <div className="hero-noise"></div>
        <div className="hero-content">
          <p className="eyebrow"><span></span> استوديو إبداعي مستقل</p>
          <h1>نصنع حضوراً<br/><em>يترك أثراً.</em></h1>
          <p className="hero-copy">نصمم الهويات ونبتكر التجارب ونصنع محتوى يعبّر عنك، ويمنح مشروعك مكاناً يستحقه.</p>
          <div className="hero-actions"><button className="btn gold" onClick={()=>go('work')}>اكتشف أعمالنا <ArrowLeft size={17}/></button><button className="text-link" onClick={()=>go('about')}>تعرّف على أثر</button></div>
        </div>
        <div className="hero-side"><span>الفكرة بداية الأثر</span><b>01 / 04</b></div>
        <div className="hero-art"><div className="art-circle"></div><div className="art-word">أثــر</div><div className="art-caption">DESIGN WITH MEANING</div></div>
        <div className="hero-bottom"><span>الرياض — المملكة العربية السعودية</span><span>إبداع • هوية • تجربة</span></div>
      </section>

      <section className="intro section" id="about">
        <div className="section-tag">01 — من نحن</div>
        <div className="intro-grid"><h2>كل علامة<br/>لها <em>حكاية.</em></h2><div><p className="lead">في أثر، نؤمن أن التصميم ليس مجرد شكل جميل؛ بل فكرة واضحة، وتفاصيل مدروسة، وتجربة تبقى في الذاكرة.</p><p className="muted">نعمل مع المشاريع الطموحة لنمنحها لغة بصرية متماسكة وصوتاً يعبّر عنها بثقة. من أول فكرة، حتى آخر تفصيلة.</p><button className="under-link" onClick={()=>go('contact')}>لنتحدث عن مشروعك <ArrowLeft size={16}/></button></div></div>
      </section>

      <section className="services section" id="services">
        <div className="section-head"><div><div className="section-tag">02 — ماذا نقدم</div><h2>أفكار تتحول<br/><em>إلى أثر.</em></h2></div><p>نرافق مشروعك في كل مرحلة، ونقدّم حلولاً إبداعية تبدأ من الفكرة ولا تنتهي عند التنفيذ.</p></div>
        <div className="service-grid">{services.map((s,i)=><article className="service-card" key={s.title}><div className="service-top"><span>0{i+1}</span>{s.icon}</div><h3>{s.title}</h3><p>{s.desc}</p><ArrowUpLeft className="card-arrow"/></article>)}</div>
      </section>

      <section className="work section" id="work">
        <div className="section-head"><div><div className="section-tag">03 — مختارات من أعمالنا</div><h2>تفاصيل<br/><em>تُرى وتُحس.</em></h2></div><p>مساحة للأفكار التي نمنحها شكلاً، وللتفاصيل الصغيرة التي تصنع فرقاً كبيراً.</p></div>
        <div className="work-grid">{works.map(w=><article className={'work-card '+w.tone} key={w.n}><div className="work-visual"><span className="work-index">{w.n}</span><div className="work-symbol">{w.tone==='coffee'?'قهوة':w.tone==='product'?'أثــر':'فكرة'}</div><span className="work-stamp">ATHAR STUDIO</span></div><div className="work-meta"><div><h3>{w.title}</h3><span>{w.type}</span></div><ArrowUpLeft/></div></article>)}</div>
        <p className="note">* الأعمال المعروضة نماذج تصورية أولية، وسيتم استبدالها بمشاريع الاستوديو الفعلية.</p>
      </section>

      <section className="quote"><span>“</span><p>الأثر الجميل لا يحتاج إلى ضجيج،<br/>يكفي أن يكون صادقاً.</p><small>ATHAR — DESIGN STUDIO</small></section>

      <section className="contact section" id="contact">
        <div className="section-head"><div><div className="section-tag">04 — لنبدأ معاً</div><h2>لديك فكرة؟<br/><em>لنصنع أثرها.</em></h2></div><p>أخبرنا عن مشروعك، وسنعود إليك لمناقشة الخطوة التالية.</p></div>
        <div className="contact-grid"><div className="contact-aside"><p>نحب الأفكار التي تحمل معنى، والمشاريع التي تطمح إلى ترك بصمتها.</p><a href="mailto:hello@athar.studio"><Mail size={17}/> hello@athar.studio</a><span><Instagram size={17}/> @athar.studio</span></div>
          <form onSubmit={submit} className="contact-form"><label>الاسم<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="اسمك الكريم"/></label><label>البريد الإلكتروني<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label><label>الخدمة المطلوبة<select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="">اختر الخدمة</option><option>الهوية البصرية</option><option>صناعة المحتوى</option><option>التصميم الرقمي</option><option>أخرى</option></select></label><label>حدثنا عن فكرتك<textarea rows="3" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="اكتب تفاصيل مشروعك هنا..."/></label><button className="btn gold" type="submit">إرسال الطلب <ArrowLeft size={17}/></button>{sent&&<p className="form-msg">تم تجهيز طلبك في هذه الصفحة. يلزم ربط النموذج بخدمة استقبال الطلبات ليتم إرساله فعلياً.</p>}</form>
        </div>
      </section>
    </main>
    <footer><a className="footer-logo" href="#home">أثر</a><span>© 2026 ATHAR STUDIO — جميع الحقوق محفوظة</span><button onClick={()=>go('home')}>العودة للأعلى ↑</button></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
