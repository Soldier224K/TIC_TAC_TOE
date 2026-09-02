# 🎮 TicTacToe.com — Real-Time Chess.com Edition (MERN Stack Architecture)

A full-stack, real-time multiplayer application built with a clean, industry-standard modular architecture separating **Frontend** and **Backend** layers. Built with **Node.js**, **Express**, **Socket.io**, and **MongoDB (Mongoose)** with an authoritative server model, Chess.com checkered interface, digital turn clocks, move notations, and audio synthesizer.

---

## 🌐 Live Deployment
- **Live Game URL:** [https://tic-tac-toe-qxvh.onrender.com](https://tic-tac-toe-qxvh.onrender.com/)
- **API Status Health:** [https://tic-tac-toe-qxvh.onrender.com/api/status](https://tic-tac-toe-qxvh.onrender.com/api/status)
- **Match History API:** [https://tic-tac-toe-qxvh.onrender.com/api/history](https://tic-tac-toe-qxvh.onrender.com/api/history)

---

## 📁 Project Architecture & Directory Structure

```
TIC_TAC_TOE/
├── .env                              # Environment variables (PORT, MONGO_URI)
├── package.json                      # Project dependencies & start scripts
├── README.md                         # Complete documentation
│
├── backend/                          # 🔙 BACKEND LAYER (Node.js + Express)
│   ├── config/
│   │   └── db.js                     # MongoDB connection & status tracking
│   ├── models/
│   │   └── GameHistory.js            # Mongoose match history schema
│   ├── controllers/
│   │   └── historyController.js      # REST API handlers & database storage
│   ├── routes/
│   │   └── historyRoutes.js          # Express API router (/api/history, /api/status)
│   ├── sockets/
│   │   └── gameSocket.js             # Socket.io authoritative game loop & events
│   └── server.js                     # Express app & server entry point
│
└── frontend/                         # 🎨 FRONTEND LAYER (Chess.com Theme)
    ├── index.html                    # Chess.com layout, navigation & arena
    ├── style.css                     # Checkered board, clocks & green buttons
    └── script.js                     # Socket.io client, move notation, & audio
```

---

## ⚡ Backend Architecture Highlights

### 1. `backend/config/db.js`
Manages the persistent connection to MongoDB Atlas / Local MongoDB via Mongoose and provides connection status health.

### 2. `backend/models/GameHistory.js`
Defines the Mongoose document schema for recorded matches:
- `playerX`: Username of player assigned 'X' (White)
- `playerO`: Username of player assigned 'O' (Black)
- `winner`: Username of the winner or `'Draw'`
- `date`: Timestamp string of match completion
- `totalMoves`: Total valid turns played (1..9)
- `winningPattern`: Array of the 3 winning cell indices (e.g. `[0, 1, 2]`)

### 3. `backend/controllers/historyController.js`
Encapsulates database operations for saving and fetching match history with an in-memory fallback if the database connection is pending.

### 4. `backend/routes/historyRoutes.js`
Express router that exposes:
- `GET /api/history` — Returns recent match history.
- `GET /api/status` — Returns server & database connectivity health.

### 5. `backend/sockets/gameSocket.js`
Authoritative real-time game engine managing:
- Player pairing and symbol assignment (`X` and `O`).
- Server-side validation of turn ownership, cell vacancy, and move validity.
- 8-combination winning calculation (`WIN_PATTERNS`).
- Real-time broadcasts (`game-start`, `move-made`, `game-over`, `game-reset`, `player-left`).

---

## 🎨 Frontend Architecture Highlights

### 1. `frontend/index.html`
- **Left Navigation Sidebar**: Dark charcoal menu with `TicTacToe.com` knight branding and tools.
- **Center Stage**: Opponent top bar, 3x3 checkered green & buff board (`#779556` / `#ebecd0`) with coordinates (`a-c`, `1-3`), and player bottom bar.
- **Right Sidebar**: Move notation table (`1. b2  a1`, `2. c3  b1`), status indicators, and Chess.com green action buttons.

### 2. `frontend/style.css`
Full responsive stylesheet inspired by Chess.com's modern design system, digital monospace clocks, glowing active turn highlights, and animated dialogs.

### 3. `frontend/script.js`
- Web Audio API procedural sound synthesizer (wooden piece clicks, turn notifications, victory chords).
- Digital countdown clocks (`03:00`) that tick down on each player's active turn.
- Algebraic notation parser and Socket.io event bindings.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/tictactoe
```

### 3. Start the Server
```bash
npm start
```

Access the app in your browser: **`http://localhost:3000`**
