// ================================================================
// FIREBASE CONFIG — fill in with your own project's web app config
// (Firebase console → Project settings → General → Your apps → SDK
// setup and configuration → Config). This value is meant to be public —
// it only identifies your project, it doesn't grant access. Real access
// control lives in the Firestore security rules you set in the console
// (see firestore.rules in this repo for what to paste there).
//
// Until this is filled in, the leaderboard quietly disables itself and
// shows "Leaderboard coming soon!" instead of erroring.
// ================================================================
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
