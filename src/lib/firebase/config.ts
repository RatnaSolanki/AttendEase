import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCuwes_Bu3JYYWL_8GauhyZJPO8WS9r8nI",
  authDomain: "sam-app-a0854.firebaseapp.com",
  projectId: "sam-app-a0854",
  storageBucket: "sam-app-a0854.firebasestorage.app",
  messagingSenderId: "147729527147",
  appId: "1:147729527147:web:96ba8fd2eec65c0db5dc2e",
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Initialize services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
