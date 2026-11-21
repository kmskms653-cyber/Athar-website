import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: '',
  authDomain: 'athar-studio-584dd.firebaseapp.com',
  projectId: 'athar-studio-584dd',
  storageBucket: 'athar-studio-584dd.firebasestorage.app',
  messagingSenderId: '293559751500',
  appId: '1:293559751500:web:ce1e3c7d590d3532f4b5e9'
};

// البريد المعتمد للمدير؛ تتم المقارنة بعد توحيد حالة الأحرف.
export const ADMIN_EMAIL = 'kmskms653@gmail.com';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ login_hint: ADMIN_EMAIL });
