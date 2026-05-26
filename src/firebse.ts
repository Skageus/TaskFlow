import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // For Database
import { getAuth } from "firebase/auth";           // For Auth

const firebaseConfig = {
  apiKey: "AIzaSyCOlU8tmE9_zHc5rO95oGI8ISqb484HUxQ",
  authDomain: "todo-list-app-7a7c0.firebaseapp.com",
  projectId: "todo-list-app-7a7c0",
  storageBucket: "todo-list-app-7a7c0.firebasestorage.app",
  messagingSenderId: "693462987289",
  appId: "1:693462987289:web:55be457f3f6a63ef28b088"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);