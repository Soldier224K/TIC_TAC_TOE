// =============================================================================
// Firebase Configuration & Service Layer (Production Admin Mode)
// Authenticated with Service Account Private Key
// =============================================================================

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const fs = require('fs');
const path = require('path');

let isFirebaseConnected = false;
let rtdb = null;

const FIREBASE_DB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://tictactoe-f13ec-default-rtdb.asia-southeast1.firebasedatabase.app';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tictactoe-f13ec';

/**
 * Initialize Firebase Admin SDK using the Service Account Private Key
 */
const initFirebase = () => {
  try {
    let serviceAccount = null;

    // Search for serviceAccountKey.json in known paths
    const potentialPaths = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      path.join(__dirname, 'serviceAccountKey.json'),
      path.join(__dirname, '../serviceAccountKey.json'),
      path.join(__dirname, '../../serviceAccountKey.json'),
      path.join(process.cwd(), 'serviceAccountKey.json'),
    ].filter(Boolean);

    for (const p of potentialPaths) {
      if (fs.existsSync(p)) {
        try {
          serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
          console.log(`🔑 Loaded Firebase Service Account Key from: ${p}`);
          break;
        } catch (e) {}
      }
    }

    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (e) {}
    }

    if (serviceAccount) {
      const app = getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount),
            databaseURL: FIREBASE_DB_URL,
            projectId: PROJECT_ID,
          })
        : getApps()[0];

      rtdb = getDatabase(app);
      isFirebaseConnected = true;
      console.log(`🔥 Firebase Admin SDK Authenticated (Production Mode): ${FIREBASE_DB_URL}`);
      return;
    }

    console.log(`⚠️ serviceAccountKey.json not found. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env`);
  } catch (error) {
    console.error(`❌ Firebase Admin SDK initialization error:`, error.message);
  }
};

/**
 * Save match record into Firebase Realtime Database
 * @param {Object} matchData 
 */
const saveMatchToFirebase = async (matchData) => {
  const matchPayload = {
    ...matchData,
    timestamp: Date.now(),
  };

  if (rtdb) {
    try {
      const newGameRef = rtdb.ref('games').push();
      await newGameRef.set(matchPayload);
      console.log('🔥 Match successfully saved to Firebase Realtime Database (Admin SDK)');
      return { success: true, id: newGameRef.key };
    } catch (err) {
      console.error('❌ Failed to save match to Firebase:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Firebase Admin not initialized' };
};

/**
 * Fetch matches from Firebase Realtime Database
 * @returns {Promise<Array>}
 */
const getMatchesFromFirebase = async () => {
  if (rtdb) {
    try {
      const snapshot = await rtdb.ref('games').limitToLast(20).once('value');
      const data = snapshot.val();
      if (!data) return [];
      return Object.entries(data)
        .map(([id, game]) => ({ id, ...game }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (err) {
      console.error('❌ Failed to fetch matches from Firebase:', err.message);
      return [];
    }
  }
  return [];
};

const getFirebaseStatus = () => isFirebaseConnected;

module.exports = {
  initFirebase,
  saveMatchToFirebase,
  getMatchesFromFirebase,
  getFirebaseStatus,
  FIREBASE_DB_URL,
};
