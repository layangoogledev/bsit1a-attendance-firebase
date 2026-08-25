/* =========================================================================
   PASTE YOUR OWN FIREBASE CONFIG HERE
   -------------------------------------------------------------------------
   Get this from: Firebase console → Project settings (gear icon) → General
   tab → "Your apps" → the web app (</>) you registered.
   It's safe for this object to be public/visible in your GitHub repo —
   Firebase apps are protected by Firestore Security Rules, not by hiding
   this config. See FIREBASE_SETUP.md for the full walkthrough.
   ========================================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyBIvuaVKTlL1oVAM-aKCh0KgVsS0FliUOE",
  authDomain: "bsit-attendance-firebase.firebaseapp.com",
  projectId: "bsit-attendance-firebase",
  storageBucket: "bsit-attendance-firebase.firebasestorage.app",
  messagingSenderId: "575624843376",
  appId: "1:575624843376:web:df9d8414b6c33296cc24b5",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
