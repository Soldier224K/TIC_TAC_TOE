// =============================================================================
// History Controller (Firebase as Default Database)
// =============================================================================

const GameHistory = require('../models/GameHistory');
const { getDBStatus } = require('../config/db');
const {
  saveMatchToFirebase,
  getMatchesFromFirebase,
  getFirebaseStatus,
} = require('../config/firebase');

// In-memory fallback array
const inMemoryHistory = [];

/**
 * Save completed game match (Firebase Default, MongoDB secondary backup)
 */
const saveGameRecord = async (matchData) => {
  inMemoryHistory.unshift(matchData);
  if (inMemoryHistory.length > 50) inMemoryHistory.pop();

  // 1. Primary: Save to Firebase Default Database
  try {
    await saveMatchToFirebase(matchData);
  } catch (err) {
    console.error('⚠️ Firebase save notice:', err.message);
  }

  // 2. Secondary: Backup to MongoDB if connected
  if (getDBStatus()) {
    try {
      const record = new GameHistory(matchData);
      await record.save();
      console.log('💾 Game result also backed up to MongoDB database');
    } catch (err) {
      console.error('❌ MongoDB backup notice:', err.message);
    }
  }
};

/**
 * GET /api/history - Retrieve recent game records (Firebase default)
 */
const getGameHistory = async (req, res) => {
  try {
    // 1. Try fetching from Firebase Default Database
    const firebaseRecords = await getMatchesFromFirebase();
    if (firebaseRecords && firebaseRecords.length > 0) {
      return res.json({
        success: true,
        source: 'firebase',
        count: firebaseRecords.length,
        data: firebaseRecords.slice(0, 15),
      });
    }

    // 2. Fallback to MongoDB if Firebase is empty/unreachable
    if (getDBStatus()) {
      const records = await GameHistory.find().sort({ _id: -1 }).limit(15);
      if (records && records.length > 0) {
        return res.json({
          success: true,
          source: 'mongodb',
          count: records.length,
          data: records,
        });
      }
    }

    // 3. Fallback to in-memory records
    return res.json({
      success: true,
      source: 'in-memory',
      count: inMemoryHistory.length,
      data: inMemoryHistory.slice(0, 15),
    });
  } catch (error) {
    console.error('Error in getGameHistory:', error.message);
    return res.status(500).json({
      success: false,
      source: 'in-memory',
      data: inMemoryHistory.slice(0, 15),
      error: error.message,
    });
  }
};

/**
 * GET /api/status - Server health check
 */
const getServerStatus = (req, res) => {
  res.json({
    status: 'online',
    defaultDatabase: 'firebase',
    firebaseConnected: getFirebaseStatus(),
    mongoConnected: getDBStatus(),
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  saveGameRecord,
  getGameHistory,
  getServerStatus,
};
