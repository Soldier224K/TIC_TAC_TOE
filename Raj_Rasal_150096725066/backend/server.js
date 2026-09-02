// =============================================================================
// Real-Time Tic-Tac-Toe Server Entry Point
// Modular Backend Architecture (Firebase Default DB + MongoDB + Sockets)
// =============================================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Modular Imports
const { initFirebase } = require('./config/firebase');
const { connectDB } = require('./config/db');
const historyRoutes = require('./routes/historyRoutes');
const { initGameSockets } = require('./sockets/gameSocket');

// Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve Frontend Static Assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Mount API Routes
app.use('/api', historyRoutes);

// Fallback for single-page app
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(frontendPath, 'index.html'));
  }
  next();
});

// 1. Initialize Firebase (Default Database)
initFirebase();

// 2. Initialize MongoDB (Secondary Backup)
connectDB();

// 3. Initialize Socket.io Event Broker
initGameSockets(io);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Real-Time Server running at: http://localhost:${PORT}`);
});
