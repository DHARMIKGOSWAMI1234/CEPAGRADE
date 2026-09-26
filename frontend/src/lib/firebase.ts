import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Read configuration from Vite environment variables
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const rawStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
const rawMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
const rawAppId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;

export const firebaseConfig = {
  apiKey: rawApiKey?.trim() || '',
  authDomain: rawAuthDomain?.trim() || '',
  projectId: rawProjectId?.trim() || '',
  storageBucket: rawStorageBucket?.trim() || '',
  messagingSenderId: rawMessagingSenderId?.trim() || '',
  appId: rawAppId?.trim() || '',
};

// Validate configuration format without crashing when unconfigured
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.includes('placeholder') &&
    !firebaseConfig.apiKey.includes('your-') &&
    !firebaseConfig.projectId.includes('your-')
);

// Initialize Firebase App & Modular Auth
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
  }
}

export const app = firebaseApp;
export const auth = firebaseAuth;
