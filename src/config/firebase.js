import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFunctions} from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_DATABASE_URL,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Functions and get a reference to the service
export const functions = getFunctions(app);

export const db = getFirestore(app);

// Collection references
export const COLLECTIONS = {
  STUDENTS: 'students',
  COURSES: 'courses',
  EXAMS: 'exams',
  ATTENDANCE: 'attendance',
  DEVICES: 'devices',
  LECTURERS: 'lecturers',
  SETTINGS: 'settings'
};

export default app;