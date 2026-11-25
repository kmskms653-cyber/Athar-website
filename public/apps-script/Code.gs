/**
 * أثر — جسر الإيصالات مع Google Drive
 * ------------------------------------
 * يعمل هذا الملف داخل حساب atharstudio653@gmail.com فقط.
 * يستقبل الإيصالات من الموقع ويحفظها في:
 *     Drive ← Athar / Customer Receipts
 * ويسمح للوحة المدير بعرض الإيصال وتنزيله وحذفه (نقل إلى المهملات).
 *
 * طريقة التركيب: افتح script.new من حساب atharstudio653@gmail.com،
 * الصق هذا الملف، ثم انشر كتطبيق ويب (تنفيذ: أنا، الوصول: أي شخص).
 */

var CFG = {
  ROOT_FOLDER: 'Athar',
  SUB_FOLDER: 'Customer Receipts',
  PHOTO_FOLDER: 'Customer Uploads',
  // كلمة مرور لوحة الإدارة لهذا الجسر — غيّرها قبل النشر.
  // يمكن أيضاً وضعها في Project Settings ← Script properties باسم ADMIN_KEY
  ADMIN_KEY: 'ATHAR-2026-change-me',
  // مفتاح الرفع العام (موجود داخل الموقع). غيّره إن أردت إبطال الرفع القديم.
  PUBLIC_KEY: 'athar-upload-2026',
  NOTIFY_EMAIL: 'atharstudio653@gmail.com',
  MAX_BYTES: 10 * 1024 * 1024,
  ALLOWED: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  MAX_LIST: 200,
  // ----- تسليم الملفات بعد التحقق من الدفع -----
  FIREBASE_API_KEY: 'AIzaSyDbkXT2ALoYsD2nqSKZLS7wzR_Oqc8jnv8',
  FIREBASE_PROJECT: 'athar-studio-584dd',
  DELIVERY_FOLDER: 'Deliveries',
  BUNDLES: ['starter-bundle', 'ads-bundle', 'reels-bundle', 'athar-complete-bundle'],
  // أكبر ملف يُرسل مباشرة عبر الجسر؛ الأكبر يُشارك مع بريد المشتري فقط
  MAX_DELIVER_BYTES: 24 * 1024 * 1024
};

/* ------------------------------------------------------------------ */
/* نقاط الدخول                                                        */
/* ------------------------------------------------------------------ */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    if (action === 'ping') return json(ping());
    return json({ ok: false, error: 'إجراء غير معروف عبر GET' });
  } catch (err) {
    return json({ ok: false, error: message(err) });
  }
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, error: 'صيغة الطلب غير صحيحة' });
  }

  try {
    switch (body.action) {
      case 'ping':
        return json(ping());
      case 'upload':
        return json(uploadReceipt(body));
      case 'download':
        requireAdmin(body);
        return json(downloadFile(body));
      case 'delete':
        requireAdmin(body);
        return json(deleteFile(body));
      case 'deliveryList':
        return json(deliveryList(body));
      case 'deliveryFile':
        return json(deliveryFile(body));
      case 'notify':
        return json(notifyRequest(body));
      case 'requestFolder':
        requireAdmin(body);
        return json(requestFolder(body));
      case 'setupDelivery':
        requireAdmin(body);
        return json(setupDelivery());
      case 'list':
        requireAdmin(body);
        return json(listFiles());
      case 'test':
        requireAdmin(body);
        return json({ ok: true, message: 'مفتاح الإدارة صحيح', folder: folderInfo() });
      default:
        return json({ ok: false, error: 'إجراء غير معروف: ' + body.action });
    }
  } catch (err) {
    return json({ ok: false, error: message(err) });
  }
}

/* ------------------------------------------------------------------ */
/* الإجراءات                                                          */
/* ------------------------------------------------------------------ */

function ping() {
  var f = folderInfo();
  return {
    ok: true,
    service: 'athar-receipts',
    version: '1.0',
    account: Session.getEffectiveUser().getEmail(),
    folder: f,
    now: new Date().toISOString()
  };
}

function uploadReceipt(body) {
  if (body.key !== publicKey()) throw new Error('مفتاح الرفع غير صحيح');

  var isPhoto = String(body.kind || '') === 'photo';
  var orderId = clean(String(body.orderId || ''), 40) || 'ATHAR-ORDER';
  var name = clean(String(body.name || 'receipt'), 120) || 'receipt';
  var mime = String(body.mimeType || '').toLowerCase();
  var data = String(body.data || '');

  if (CFG.ALLOWED.indexOf(mime) === -1 || (isPhoto && mime === 'application/pdf')) throw new Error('نوع الملف غير مدعوم: ' + mime);
  if (!data) throw new Error('لم يصل محتوى الملف');
  if (data.length > CFG.MAX_BYTES * 1.4) throw new Error('حجم الملف أكبر من المسموح');

  var bytes = Utilities.base64Decode(data);
  if (bytes.length > CFG.MAX_BYTES) throw new Error('حجم الملف أكبر من 10 ميجابايت');

  var ext = extension(name, mime);
  var stamp = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyyMMdd-HHmmss');
  var safeName = orderId + ' — ' + stamp + '.' + ext;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var file;
  try {
    var folder = isPhoto ? photoFolder() : targetFolder();
    var blob = Utilities.newBlob(bytes, mime, safeName);
    file = folder.createFile(blob);
    file.setDescription((isPhoto ? 'صورة عميل — الطلب ' : 'إيصال تحويل — الطلب ') + orderId);
  } finally {
    lock.releaseLock();
  }

  try {
    if (isPhoto) throw new Error('skip');
    MailApp.sendEmail({
      to: CFG.NOTIFY_EMAIL,
      subject: 'إيصال جديد — ' + orderId,
      htmlBody:
        '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.9;color:#1c1a19">' +
        '<p><b>وصل إيصال جديد إلى مجلد أثر.</b></p>' +
        '<p>رقم الطلب: <b>' + escape_(orderId) + '</b><br>' +
        'اسم الملف: ' + escape_(file.getName()) + '<br>' +
        'الحجم: ' + (bytes.length / 1024).toFixed(0) + ' كيلوبايت</p>' +
        '<p><a href="' + file.getUrl() + '">فتح في Google Drive</a></p>' +
        '</div>'
    });
  } catch (err) {
    // البريد اختياري — لا نفشل الرفع بسببه
  }

  return {
    ok: true,
    fileId: file.getId(),
    url: file.getUrl(),
    downloadUrl: file.getDownloadUrl(),
    name: file.getName(),
    originalName: name,
    mimeType: mime,
    size: bytes.length,
    folder: folderInfo()
  };
}

function downloadFile(body) {
  var id = String(body.fileId || '');
  if (!id) throw new Error('معرّف الملف مطلوب');
  var file = DriveApp.getFileById(id);
  var blob = file.getBlob();
  var b64 = Utilities.base64Encode(blob.getBytes());
  return {
    ok: true,
    fileId: file.getId(),
    name: file.getName(),
    mimeType: blob.getContentType(),
    size: blob.getBytes().length,
    data: b64
  };
}

function deleteFile(body) {
  var id = String(body.fileId || '');
  if (!id) throw new Error('معرّف الملف مطلوب');

  var file = DriveApp.getFileById(id);
  var name = file.getName();
  file.setTrashed(true);

  return {
    ok: true,
    deleted: true,
    fileId: id,
    name: name,
    message: 'نُقل الإيصال إلى مهملات Drive'
  };
}

function listFiles() {
  var folder = targetFolder();
  var it = folder.getFiles();
  var out = [];
  while (it.hasNext() && out.length < CFG.MAX_LIST) {
    var f = it.next();
    out.push({
      id: f.getId(),
      name: f.getName(),
      size: f.getSize(),
      updated: f.getLastUpdated().toISOString(),
      url: f.getUrl()
    });
  }
  out.sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
  return { ok: true, count: out.length, files: out, folder: folderInfo() };
}

/* ------------------------------------------------------------------ */
/* أدوات                                                              */
/* ------------------------------------------------------------------ */

function requireAdmin(body) {
  if (String(body.adminKey || '') !== adminKey()) {
    throw new Error('مفتاح الإدارة غير صحيح');
  }
}

function adminKey() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || CFG.ADMIN_KEY;
}

function publicKey() {
  return PropertiesService.getScriptProperties().getProperty('PUBLIC_KEY') || CFG.PUBLIC_KEY;
}

function rootFolder() {
  var it = DriveApp.getFoldersByName(CFG.ROOT_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.ROOT_FOLDER);
}

function targetFolder() {
  var root = rootFolder();
  var it = root.getFoldersByName(CFG.SUB_FOLDER);
  return it.hasNext() ? it.next() : root.createFolder(CFG.SUB_FOLDER);
}

function photoFolder() {
  var root = rootFolder();
  var it = root.getFoldersByName(CFG.PHOTO_FOLDER);
  return it.hasNext() ? it.next() : root.createFolder(CFG.PHOTO_FOLDER);
}

function folderInfo() {
  var f = targetFolder();
  return {
    name: CFG.ROOT_FOLDER + ' / ' + CFG.SUB_FOLDER,
    id: f.getId(),
    url: f.getUrl()
  };
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean(str, max) {
  return String(str).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function extension(name, mime) {
  var m = /\.([a-z0-9]{2,5})$/i.exec(name);
  if (m) return m[1].toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function message(err) {
  return String((err && err.message) || err || 'خطأ غير معروف');
}

function escape_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


/* ------------------------------------------------------------------ */
/* تسليم الملفات: لا يُسلَّم شيء قبل التحقق من الدفع                  */
/* ------------------------------------------------------------------ */

/** يتحقق من هوية المشتري (Firebase ID token) ومن أن طلبه بحالة completed */
function verifyBuyer(body) {
  var requestId = String(body.requestId || '');
  var bundleId = String(body.bundleId || '');
  if (requestId) {
    if (!/^[A-Za-z0-9]{10,40}$/.test(requestId)) throw new Error('رقم الطلب غير صحيح');
  } else if (CFG.BUNDLES.indexOf(bundleId) === -1) {
    throw new Error('حزمة غير معروفة');
  }
  var idToken = String(body.idToken || '');
  if (!idToken) throw new Error('سجّل الدخول أولاً');

  var lk = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + CFG.FIREBASE_API_KEY,
    { method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true }
  );
  if (lk.getResponseCode() !== 200) throw new Error('جلسة الدخول غير صالحة، أعد تسجيل الدخول');
  var user = (JSON.parse(lk.getContentText()).users || [])[0];
  if (!user || !user.localId) throw new Error('جلسة الدخول غير صالحة');

  // قراءة الطلب بصلاحية المشتري نفسه: قواعد Firestore تسمح له بقراءة طلبه فقط
  var docPath = requestId
    ? 'serviceRequests/' + requestId
    : 'orders/' + encodeURIComponent(user.localId + '_' + bundleId);
  var url = 'https://firestore.googleapis.com/v1/projects/' + CFG.FIREBASE_PROJECT +
    '/databases/(default)/documents/' + docPath;
  var od = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true });
  if (od.getResponseCode() !== 200) throw new Error('لا يوجد طلب مطابق');
  var f = JSON.parse(od.getContentText()).fields || {};
  var status = f.status && f.status.stringValue;
  var owner = f.uid && f.uid.stringValue;
  if (owner !== user.localId || status !== 'completed') {
    throw new Error('لم يتم تأكيد الدفع بعد؛ لا تُسلَّم الملفات قبل ذلك');
  }
  return { uid: user.localId, email: String(user.email || '').toLowerCase(), bundleId: bundleId, requestId: requestId };
}

function deliveryRoot_() {
  var root = rootFolder();
  var it = root.getFoldersByName(CFG.DELIVERY_FOLDER);
  return it.hasNext() ? it.next() : root.createFolder(CFG.DELIVERY_FOLDER);
}

function bundleFolder_(bundleId, create, requestId) {
  var parent = deliveryRoot_();
  if (requestId) {
    var rp = parent.getFoldersByName('requests');
    parent = rp.hasNext() ? rp.next() : parent.createFolder('requests');
    bundleId = requestId;
  }
  var it = parent.getFoldersByName(bundleId);
  if (it.hasNext()) return it.next();
  if (create) return parent.createFolder(bundleId);
  return null;
}

function deliveryList(body) {
  var buyer = verifyBuyer(body);
  var folder = bundleFolder_(buyer.bundleId, false, buyer.requestId);
  var files = [];
  if (folder) {
    var it = folder.getFiles();
    while (it.hasNext() && files.length < 100) {
      var f = it.next();
      files.push({ id: f.getId(), name: f.getName(), size: f.getSize(), mimeType: f.getMimeType() });
    }
  }
  files.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  return { ok: true, files: files, maxDirect: CFG.MAX_DELIVER_BYTES };
}

function deliveryFile(body) {
  var buyer = verifyBuyer(body);
  var id = String(body.fileId || '');
  var folder = bundleFolder_(buyer.bundleId, false, buyer.requestId);
  if (!folder || !id) throw new Error('الملف غير موجود');
  var it = folder.getFiles();
  var file = null;
  while (it.hasNext()) { var c = it.next(); if (c.getId() === id) { file = c; break; } }
  if (!file) throw new Error('الملف غير موجود في هذه الحزمة');

  if (file.getSize() > CFG.MAX_DELIVER_BYTES) {
    // ملف كبير: يُشارك مع بريد المشتري فقط ويُفتح من Drive
    file.addViewer(buyer.email);
    return { ok: true, mode: 'share', name: file.getName(), url: file.getUrl() };
  }
  var blob = file.getBlob();
  return {
    ok: true, mode: 'direct', name: file.getName(),
    mimeType: blob.getContentType(), size: file.getSize(),
    data: Utilities.base64Encode(blob.getBytes())
  };
}

/** ينشئ مجلدات التسليم لكل حزمة ويعيد روابطها (للمدير) */
function setupDelivery() {
  var out = [];
  CFG.BUNDLES.forEach(function (id) {
    var f = bundleFolder_(id, true);
    out.push({ bundleId: id, url: f.getUrl(), files: (function () { var n = 0, it = f.getFiles(); while (it.hasNext()) { it.next(); n++; } return n; })() });
  });
  return { ok: true, root: deliveryRoot_().getUrl(), folders: out };
}

/** مجلد تسليم طلب خدمة (للمدير): ضع فيه الملف النهائي */
function requestFolder(body) {
  var id = String(body.requestId || '');
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) throw new Error('رقم الطلب غير صحيح');
  var f = bundleFolder_('', true, id);
  return { ok: true, url: f.getUrl() };
}

/** إشعار بريدي بطلب خدمة جديد (مفتاح الرفع العام) */
function notifyRequest(body) {
  if (body.key !== publicKey()) throw new Error('مفتاح الرفع غير صحيح');
  var t = function (v, n) { return escape_(clean(String(v || ''), n)); };
  MailApp.sendEmail({
    to: CFG.NOTIFY_EMAIL,
    subject: 'طلب خدمة جديد — ' + clean(String(body.title || ''), 60),
    htmlBody: '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9">' +
      '<p><b>وصل طلب خدمة جديد بانتظار التحقق من الحوالة.</b></p>' +
      '<p>الخدمة: ' + t(body.title, 80) + '<br>السعر: ' + t(body.price, 10) + ' ريال<br>' +
      'العميل: ' + t(body.email, 120) + '<br>رقم الطلب: ' + t(body.requestId, 40) + '</p></div>'
  });
  return { ok: true };
}
