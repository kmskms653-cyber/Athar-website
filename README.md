# أثر — ATHAR STUDIO

React 19 + Vite 7 + Firebase 11 (Node 20.19+) — مطابق لملف «بيانات منصة أثر».

    npm install
    npm run dev      # تطوير محلي
    npm run build    # الناتج في dist
    npm run preview

## الصفحات
`/` الموقع · `/#admin` لوحة الإدارة (Google) · `/#studio` استديو القوالب · `/studio/index.html` صفحة الاستديو المباشرة

## البيانات
- Firestore: `requests` (حالات: new / in_progress / completed) و`site/content`.
- المدير: `kmskms653@gmail.com` (بريد موثق عبر Google).
- العملاء: `atharstudio653@gmail.com` · إنستغرام `@atharstudio24`.
- الاستديو: 8 قوالب، حفظ في IndexedDB، تصدير PNG 1080×1080 (html2canvas).
- الهوية: خلفية `#050402`، عاجي `#F8F6F2`، ذهبي `#948369`، بني `#533B19`؛ الشعار في `public/logo.png`.

## ما يُكمل من لوحات الحسابات
1. Firebase Authentication: فعّل Google وأضف نطاق Vercel إلى Authorized domains.
2. Firestore: انشر `firestore.rules` كاملاً.
3. Vercel: Framework = Vite، Build = `npm run build`، Output = `dist`، Root Directory = مجلد `package.json`، ثم Redeploy.
4. أرسل طلباً تجريبياً، ثم ادخل `/#admin` وتأكد من ظهوره.

## الأعمال
ضع صور/فيديو الأعمال في `public/works` (`work-1.jpg` ...)، ولتشغيل فيديو ضع مساره في حقل `video` داخل `src/defaultContent.js`.
إن غابت الملفات تظهر خلفية متدرجة دون أخطاء.
