/**
 * جسر الإيصالات مع Google Drive (Athar / Customer Receipts)
 * كل نداء يمر عبر تطبيق Google Apps Script المنشور من حساب الأستوديو،
 * ولا يحتاج العميل إلى تسجيل دخول Google Drive.
 */

const LS_URL = "athar.drive.url";
const LS_PUBLIC = "athar.drive.publicKey";
const LS_ADMIN = "athar.drive.adminKey";

const DEFAULT_BRIDGE_URL = "https://script.google.com/macros/s/AKfycbxWmSxydAl-wODTpY39yU-6WxX4DDvQSlplk8TAV4QVOuViAZ1aBAr_oR8hZvmKhQNsQQ/exec";

export const DRIVE_FOLDER_LABEL = "Athar / Customer Receipts";
export const DRIVE_ACCOUNT = "atharstudio653@gmail.com";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const read = (k, fallback = "") => {
  try { return localStorage.getItem(k) || fallback; } catch { return fallback; }
};
const write = (k, v) => {
  try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* ignore */ }
};

export function getDriveConfig() {
  return {
    url: read(LS_URL, DEFAULT_BRIDGE_URL),
    publicKey: read(LS_PUBLIC, "athar-upload-2026"),
    adminKey: read(LS_ADMIN),
  };
}

export function saveDriveConfig({ url, publicKey, adminKey }) {
  if (url !== undefined) write(LS_URL, String(url).trim());
  if (publicKey !== undefined) write(LS_PUBLIC, String(publicKey).trim());
  if (adminKey !== undefined) write(LS_ADMIN, String(adminKey).trim());
  window.dispatchEvent(new Event("athar:drive-config"));
}

export function clearDriveAdminKey() {
  write(LS_ADMIN, "");
}

export function driveReady() {
  const { url } = getDriveConfig();
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(url);
}

export function validateBridgeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "ضع رابط تطبيق الويب (ينتهي بـ /exec).";
  if (!/^https:\/\/script\.googleusercontent\.com\//.test(url) && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(url)) {
    return "الرابط لا يبدو رابط Apps Script. انسخه من: نشر ← تطبيقات الويب ← عنوان تطبيق الويب.";
  }
  if (!/\/exec$/.test(url)) return "الرابط يجب أن ينتهي بـ /exec وليس /dev.";
  return "";
}

function friendly(err) {
  const text = String((err && err.message) || err || "");
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) {
    return "تعذر الوصول إلى جسر Drive. تأكد أن تطبيق الويب منشور بصلاحية «أي شخص» وأن الرابط ينتهي بـ /exec.";
  }
  if (/مفتاح الإدارة/.test(text)) return "مفتاح الإدارة غير صحيح. انسخه من أعلى ملف Code.gs داخل Apps Script.";
  if (/مفتاح الرفع/.test(text)) return "مفتاح الرفع غير مطابق لإعدادات الجسر (PUBLIC_KEY في Code.gs).";
  return text || "تعذر إكمال الطلب مع Drive.";
}

/** نداء JSON إلى Apps Script عبر XHR (يدعم مهلة وتقدّم الرفع) */
export function driveCall(action, payload = {}, opts = {}) {
  const { timeout = 45000, onProgress, url } = opts;
  const target = url || getDriveConfig().url;

  return new Promise((resolve, reject) => {
    if (!target) { reject(new Error("لم يُربط Google Drive بعد.")); return; }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", target, true);
    xhr.setRequestHeader("Content-Type", "text/plain;charset=utf-8");
    xhr.timeout = timeout;

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status === 0) { reject(new Error("تعذر الوصول إلى جسر Drive. تأكد أن التطبيق منشور بصلاحية «أي شخص» وأن الرابط ينتهي بـ /exec.")); return; }
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("استجابة غير مفهومة من الجسر — تحقق من نشر التطبيق بالصلاحية الصحيحة."));
        return;
      }
      if (!data || data.ok === false) { reject(new Error(friendly(data && data.error))); return; }
      resolve(data);
    };
    xhr.onerror = () => reject(new Error("تعذر الوصول إلى جسر Drive. تأكد أن التطبيق منشور بصلاحية «أي شخص» وأن الرابط ينتهي بـ /exec، ثم أعد المحاولة."));
    xhr.ontimeout = () => reject(new Error("انتهت مهلة الاتصال بجسر Drive. حاول مجدداً أو ارفع ملفاً أصغر."));
    xhr.onabort = () => reject(new Error("أُلغي الرفع."));

    xhr.send(JSON.stringify({ action, ...payload }));
  });
}

export async function pingDrive(url) {
  const { publicKey } = getDriveConfig();
  return driveCall("ping", { key: publicKey }, { url, timeout: 20000 });
}

export async function testAdminKey(adminKey, url) {
  const cfg = getDriveConfig();
  return driveCall("test", { adminKey }, { url: url || cfg.url, timeout: 20000 });
}

export async function listDriveFiles(adminKey) {
  return driveCall("list", { adminKey }, { timeout: 45000 });
}

/** تنزيل الإيصال كـ Blob عبر الجسر (يعمل بغض النظر عن حساب Drive المسجّل في المتصفح) */
export async function downloadDriveFile(fileId, adminKey) {
  const res = await driveCall("download", { fileId, adminKey }, { timeout: 60000 });
  const bytes = base64ToBytes(res.data);
  return { blob: new Blob([bytes], { type: res.mimeType || "application/octet-stream" }), name: res.name, mimeType: res.mimeType, size: res.size };
}

export async function deleteDriveFile(fileId, adminKey) {
  return driveCall("delete", { fileId, adminKey }, { timeout: 45000 });
}

/* ------------------------------------------------------------------ */
/* تحضير الملف ثم رفعه                                                */
/* ------------------------------------------------------------------ */

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف."));
    reader.readAsDataURL(file);
  });
}

/** ضغط صور الجوال قبل الرفع حتى تبقى سريعة وواضحة */
export async function prepareReceipt(file) {
  if (!file) throw new Error("لم تُختر ملف.");
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) throw new Error("يُقبل JPG أو PNG أو WEBP أو PDF فقط.");
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("حجم الملف يتجاوز 10 ميجابايت.");

  if (!file.type.startsWith("image/")) return { file, name: file.name, mime: file.type, size: file.size };

  const needCompress = file.size > 700 * 1024;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { file, name: file.name, mime: file.type, size: file.size };
  }

  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && !needCompress) {
    bitmap.close && bitmap.close();
    return { file, name: file.name, mime: file.type, size: file.size };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close && bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) return { file, name: file.name, mime: file.type, size: file.size };

  const name = file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
  return { file: blob, name, mime: "image/jpeg", size: blob.size };
}

/** يرفع الإيصال إلى مجلد Athar / Customer Receipts ويعيد بيانات الملف */
export async function uploadReceipt(file, meta, onProgress) {
  const prepared = await prepareReceipt(file);
  const data = await fileToBase64(prepared.file);
  const { publicKey } = getDriveConfig();

  const res = await driveCall(
    "upload",
    { key: publicKey, kind: meta.kind || "", orderId: meta.orderId || "", name: prepared.name, mimeType: prepared.mime, data },
    { onProgress, timeout: 120000 }
  );

  return {
    fileId: res.fileId,
    url: res.url,
    name: res.name || prepared.name,
    originalName: prepared.name,
    mimeType: res.mimeType || prepared.mime,
    size: res.size || prepared.size,
    folder: res.folder,
  };
}

function base64ToBytes(b64) {
  const clean = String(b64 || "").replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function formatBytes(n) {
  const size = Number(n) || 0;
  if (size < 1024) return `${size} بايت`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} ك.ب`;
  return `${(size / (1024 * 1024)).toFixed(2)} م.ب`;
}

export function saveBlobToDevice(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "receipt";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}


/* ---------- تسليم الملفات من Drive بعد التحقق من الدفع ---------- */
export async function deliveryList(idToken, bundleId, requestId = "") {
  return driveCall("deliveryList", { idToken, bundleId, requestId }, { timeout: 45000 });
}

export async function deliveryFile(idToken, bundleId, fileId, requestId = "") {
  const res = await driveCall("deliveryFile", { idToken, bundleId, fileId, requestId }, { timeout: 120000 });
  if (res.mode === "share") return { mode: "share", url: res.url, name: res.name };
  const bytes = base64ToBytes(res.data);
  return { mode: "direct", name: res.name, blob: new Blob([bytes], { type: res.mimeType || "application/octet-stream" }) };
}

export async function setupDeliveryFolders(adminKey) {
  return driveCall("setupDelivery", { adminKey }, { timeout: 60000 });
}

export async function requestFolderUrl(requestId, adminKey) {
  return driveCall("requestFolder", { requestId, adminKey }, { timeout: 45000 });
}

export async function notifyNewRequest(info) {
  const { publicKey } = getDriveConfig();
  try { await driveCall("notify", { key: publicKey, ...info }, { timeout: 20000 }); } catch { /* اختياري */ }
}
