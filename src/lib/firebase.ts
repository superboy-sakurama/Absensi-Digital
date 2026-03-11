import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: 'AIzaSyDR8PFtFxueV36nt0LGy0vqcYu1leSonUs',
  authDomain: 'si-abon-23f16.firebaseapp.com',
  projectId: 'si-abon-23f16',
  storageBucket: 'si-abon-23f16.appspot.com',
  messagingSenderId: '42862742734',
  appId: '1:42862742734:web:7488dbf79ae2cdb51f949f',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with offline persistence enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);
storage.maxUploadRetryTime = 60000; // 60 seconds
