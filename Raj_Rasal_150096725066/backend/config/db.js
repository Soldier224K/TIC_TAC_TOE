// =============================================================================
// Database Configuration (MongoDB + Mongoose Connection)
// =============================================================================

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tictactoe';

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.log(`⚠️ MongoDB Connection Error: ${error.message}`);
    console.log('ℹ️ Running with in-memory storage fallback for match history.');
  }
};

const getDBStatus = () => isConnected;

module.exports = { connectDB, getDBStatus };
