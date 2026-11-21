import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// إعدادات Firebase Web عامة وليست كلمات مرور؛ الحماية الفعلية في Auth وقواعد Firestore.
const firebaseConfig = {
  apiKey: "AIzaSyDbkXT2ALoYsD2nqSKZLS7wzR_Oqc8jnv8",
  authDomain: "athar-studio-584dd.firebaseapp.com",
  projectId: "athar-studio-584dd",
  storageBucket: "athar-studio-584dd.firebasestorage.app",
  messagingSenderId: "293559751500",
  appId: "1:293559751500:web:ce1e3c7d590d3532f4b5e9",
};

export const ADMIN_EMAIL = "kmskms653@gmail.com";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
