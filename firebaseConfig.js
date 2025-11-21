// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Move config values directly here
const firebaseConfig = {};

const app = initializeApp(firebaseConfig);
// Initialize Firestore (Database)
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
