// =============================================================================
// TIC-TAC-TOE: CHESS.COM EDITION CLIENT CONTROLLER
// =============================================================================

const socket = io();

// ===== Game State Variables =====
let myUsername = '';
let mySymbol = null;        // 'X' (White) or 'O' (Black)
let currentTurn = null;     // 'X' or 'O'
let gameActive = false;
let moveHistory = [];       // Array of { num, white: 'b2', black: 'a1' }
let soundEnabled = true;
let lastMoveIndex = null;

// Clock Timers (3 minutes per player = 180s)
let whiteTime = 180;
let blackTime = 180;
let clockInterval = null;

// Algebraic Coordinates Mapping for 3x3 Grid
const COORDINATES = [
  'a3', 'b3', 'c3',
  'a2', 'b2', 'c2',
  'a1', 'b1', 'c1',
];

// ===== DOM Elements =====
const mainAppLayout = document.getElementById('main-app-layout');
const boardElement = document.getElementById('board');
const loginModal = document.getElementById('login-modal');
const usernameInput = document.getElementById('username-input');
const joinGameBtn = document.getElementById('join-game-btn');
const loginErrorMsg = document.getElementById('login-error-msg');
const lobbyStatusText = document.getElementById('lobby-status-text');

// Player Banners & Clocks
const topPlayerBar = document.getElementById('top-player-bar');
const topPlayerName = document.getElementById('top-player-name');
const topPlayerSymbol = document.getElementById('top-player-symbol');
const topClockTime = document.getElementById('top-clock-time');

const bottomPlayerBar = document.getElementById('bottom-player-bar');
const bottomPlayerName = document.getElementById('bottom-player-name');
const bottomPlayerSymbol = document.getElementById('bottom-player-symbol');
const bottomClockTime = document.getElementById('bottom-clock-time');

const sidebarHandle = document.getElementById('sidebar-handle');
const gameStatusLabel = document.getElementById('game-status-label');
const movesList = document.getElementById('moves-list');

// Navigation Items
const navPlay = document.getElementById('nav-play');
const navHistory = document.getElementById('nav-history');
const navRules = document.getElementById('nav-rules');

// Buttons & Actions
const rematchBtn = document.getElementById('rematch-btn');
const resetBtn = document.getElementById('reset-btn');
const viewDbBtn = document.getElementById('view-db-btn');
const soundBtn = document.getElementById('sound-btn');
const refreshArchiveBtn = document.getElementById('refresh-archive-btn');

// Tabs
const tabMovesBtn = document.getElementById('tab-moves-btn');
const tabHistoryBtn = document.getElementById('tab-history-btn');
const tabMovesContent = document.getElementById('tab-moves-content');
const tabHistoryContent = document.getElementById('tab-history-content');
const archiveList = document.getElementById('archive-list');

// Modals
const gameOverModal = document.getElementById('game-over-modal');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverReason = document.getElementById('game-over-reason');
const resultTrophyBox = document.getElementById('result-trophy-box');
const resultIcon = document.getElementById('result-icon');
const burstRing = document.getElementById('burst-ring');
const winnerNameDisplay = document.getElementById('winner-name-display');
const loserNameDisplay = document.getElementById('loser-name-display');
const modalMovesCount = document.getElementById('modal-moves-count');
const modalRematchBtn = document.getElementById('modal-rematch-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

const rulesModal = document.getElementById('rules-modal');
const rulesCloseBtn = document.getElementById('rules-close-btn');
const confettiHolder = document.getElementById('confetti-holder');

// =============================================================================
// Chess.com Procedural Audio Synthesizer
// =============================================================================
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const ChessAudio = {
  // Iconic wooden piece placement sound
  playMove() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  },

  // Game start notification chime
  playGameStart() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [587.33, 880]; // D5, A5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.25);
      });
    } catch (e) {}
  },

  // Victory fanfare chord
  playVictory() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.4);
      });
    } catch (e) {}
  },

  // Defeat tone
  playDefeat() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [392.00, 369.99, 329.63, 293.66]; // G4, F#4, E4, D4
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
    } catch (e) {}
  },

  // Draw tone
  playDraw() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [440, 392, 349.23];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch (e) {}
  }
};

// =============================================================================
// Confetti Animation Generator
// =============================================================================
function triggerVictoryConfetti() {
  confettiHolder.innerHTML = '';
  const colors = ['#f59e0b', '#81b64c', '#38bdf8', '#ffffff', '#ec4899'];

  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    const bg = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const duration = 1.6 + Math.random() * 1.8;
    const size = 7 + Math.random() * 8;

    p.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${bg};
      top: -20px;
      left: ${left}%;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      opacity: 0.95;
      pointer-events: none;
      transform: rotate(${Math.random() * 360}deg);
      animation: fallConfetti ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    `;
    confettiHolder.appendChild(p);
  }

  setTimeout(() => {
    confettiHolder.innerHTML = '';
  }, 4000);
}

// Dynamically inject confetti keyframes
const dynamicAnimStyle = document.createElement('style');
dynamicAnimStyle.innerHTML = `
@keyframes fallConfetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
}
`;
document.head.appendChild(dynamicAnimStyle);

// =============================================================================
// Build 3x3 Checkered Chess Board with Coordinates
// =============================================================================
function buildCheckeredBoard() {
  boardElement.innerHTML = '';

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.dataset.index = i;

    // Alternating green and buff checkered squares
    const row = Math.floor(i / 3);
    const col = i % 3;
    const isLight = (row + col) % 2 === 0;
    cell.className = `cell ${isLight ? 'tile-light' : 'tile-dark'}`;

    // Add rank labels (3, 2, 1) on leftmost squares
    if (col === 0) {
      const rankLbl = document.createElement('span');
      rankLbl.className = 'rank-label';
      rankLbl.textContent = 3 - row;
      cell.appendChild(rankLbl);
    }

    // Add file labels (a, b, c) on bottom squares
    if (row === 2) {
      const fileLbl = document.createElement('span');
      fileLbl.className = 'file-label';
      fileLbl.textContent = ['a', 'b', 'c'][col];
      cell.appendChild(fileLbl);
    }

    cell.addEventListener('click', () => {
      // Guard: Only allow move if game is running, cell is vacant, and it is client's turn
      if (!gameActive) return;
      if (cell.querySelector('.piece-x') || cell.querySelector('.piece-o')) return;
      if (currentTurn !== mySymbol) return;

      socket.emit('make-move', i);
    });

    boardElement.appendChild(cell);
  }
}

buildCheckeredBoard();

// =============================================================================
// Clock / Timer Logic
// =============================================================================
function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startClockTimer() {
  if (clockInterval) clearInterval(clockInterval);

  clockInterval = setInterval(() => {
    if (!gameActive) return;

    if (currentTurn === 'X') {
      whiteTime = Math.max(0, whiteTime - 1);
    } else if (currentTurn === 'O') {
      blackTime = Math.max(0, blackTime - 1);
    }

    renderClocks();
  }, 1000);
}

function stopClockTimer() {
  if (clockInterval) clearInterval(clockInterval);
}

function renderClocks() {
  const myIsWhite = mySymbol === 'X';

  if (myIsWhite) {
    bottomClockTime.textContent = formatClock(whiteTime);
    topClockTime.textContent = formatClock(blackTime);
  } else {
    bottomClockTime.textContent = formatClock(blackTime);
    topClockTime.textContent = formatClock(whiteTime);
  }
}

// =============================================================================
// UI Board & Move Notation Renderers
// =============================================================================
function updateBoardUI(boardState, turn, lastMove) {
  currentTurn = turn;
  const cells = document.querySelectorAll('.cell');

  cells.forEach((cell, i) => {
    const val = boardState[i];
    
    // Clear existing piece icons
    const existingPiece = cell.querySelector('.piece-x, .piece-o');
    if (existingPiece) existingPiece.remove();

    // Reset last move class
    cell.classList.remove('last-move', 'taken');

    if (val === 'X') {
      const piece = document.createElement('span');
      piece.className = 'piece-x';
      piece.textContent = '✕';
      cell.appendChild(piece);
      cell.classList.add('taken');
    } else if (val === 'O') {
      const piece = document.createElement('span');
      piece.className = 'piece-o';
      piece.textContent = '◯';
      cell.appendChild(piece);
      cell.classList.add('taken');
    }

    // Apply last move highlight
    if (lastMove && lastMove.index === i) {
      cell.classList.add('last-move');
    }
  });

  // Active Player Bar Highlighting
  const isWhiteTurn = turn === 'X';
  const myIsWhite = mySymbol === 'X';

  if (gameActive) {
    if (myIsWhite) {
      bottomPlayerBar.classList.toggle('active-turn', isWhiteTurn);
      topPlayerBar.classList.toggle('active-turn', !isWhiteTurn);
    } else {
      bottomPlayerBar.classList.toggle('active-turn', !isWhiteTurn);
      topPlayerBar.classList.toggle('active-turn', isWhiteTurn);
    }

    gameStatusLabel.textContent = isWhiteTurn ? "White (X) to move" : "Black (O) to move";
  } else {
    bottomPlayerBar.classList.remove('active-turn');
    topPlayerBar.classList.remove('active-turn');
  }
}

// Update Move Notation Table (Chess.com Style)
function addMoveToNotation(index, symbol) {
  const coord = COORDINATES[index] || `cell-${index}`;

  if (symbol === 'X') {
    const moveNum = moveHistory.length + 1;
    moveHistory.push({ num: moveNum, white: coord, black: '' });
  } else if (symbol === 'O' && moveHistory.length > 0) {
    moveHistory[moveHistory.length - 1].black = coord;
  }

  renderMovesTable();
}

function renderMovesTable() {
  if (moveHistory.length === 0) {
    movesList.innerHTML = '<div class="empty-moves">Game moves will appear here...</div>';
    return;
  }

  movesList.innerHTML = moveHistory.map((m, i) => `
    <div class="move-row ${i === moveHistory.length - 1 ? 'current-step' : ''}">
      <span class="num">${m.num}.</span>
      <span class="white-move">${m.white || ''}</span>
      <span class="black-move">${m.black || ''}</span>
    </div>
  `).join('');

  movesList.scrollTop = movesList.scrollHeight;
}

// Update Player Bars
function updatePlayerRoster(players) {
  const pX = players.find(p => p.symbol === 'X');
  const pO = players.find(p => p.symbol === 'O');

  if (mySymbol === 'X') {
    bottomPlayerName.textContent = pX ? `${pX.username} (You)` : 'Waiting...';
    bottomPlayerSymbol.textContent = 'X';
    topPlayerName.textContent = pO ? pO.username : 'Waiting for Opponent...';
    topPlayerSymbol.textContent = 'O';
  } else if (mySymbol === 'O') {
    bottomPlayerName.textContent = pO ? `${pO.username} (You)` : 'Waiting...';
    bottomPlayerSymbol.textContent = 'O';
    topPlayerName.textContent = pX ? pX.username : 'Waiting for Opponent...';
    topPlayerSymbol.textContent = 'X';
  } else {
    bottomPlayerName.textContent = 'You (Guest)';
    topPlayerName.textContent = 'Opponent';
  }

  if (lobbyStatusText) {
    lobbyStatusText.textContent = `${players.length}/2 Players Connected`;
  }
}

// =============================================================================
// Socket.io Real-Time Event Handlers
// =============================================================================

// 1. Login Events
function handleJoinGame() {
  const username = usernameInput.value.trim();
  if (username.length < 2) {
    loginErrorMsg.textContent = 'Player handle must be at least 2 characters.';
    loginErrorMsg.classList.remove('hidden');
    return;
  }
  myUsername = username;
  loginErrorMsg.classList.add('hidden');
  socket.emit('user-login', username);
}

joinGameBtn.addEventListener('click', handleJoinGame);
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleJoinGame();
});

socket.on('login-success', (data) => {
  mySymbol = data.symbol;
  loginModal.classList.add('hidden');
  sidebarHandle.textContent = data.username;

  updatePlayerRoster(data.players || []);
  gameStatusLabel.textContent = 'Waiting for second player...';
});

socket.on('login-error', (msg) => {
  loginErrorMsg.textContent = msg;
  loginErrorMsg.classList.remove('hidden');
});

// 2. Players Update
socket.on('players-update', (players) => {
  updatePlayerRoster(players);
});

// 3. Game Start
socket.on('game-start', (data) => {
  gameActive = true;
  moveHistory = [];
  whiteTime = 180;
  blackTime = 180;

  gameOverModal.classList.add('hidden');
  mainAppLayout.classList.remove('arena-defeat-shake');
  buildCheckeredBoard();
  updatePlayerRoster(data.players);
  updateBoardUI(data.board, data.currentTurn, null);
  renderMovesTable();
  renderClocks();
  startClockTimer();

  ChessAudio.playGameStart();
});

// 4. Move Made
socket.on('move-made', (data) => {
  updateBoardUI(data.board, data.currentTurn, data.lastMove);
  
  if (data.lastMove) {
    addMoveToNotation(data.lastMove.index, data.lastMove.symbol);
    ChessAudio.playMove();
  }
});

// 5. Game Over with Rich Animations
socket.on('game-over', (data) => {
  gameActive = false;
  stopClockTimer();

  // Highlight winning squares with laser glow
  if (data.winningPattern && data.winningPattern.length > 0) {
    const cells = document.querySelectorAll('.cell');
    data.winningPattern.forEach(idx => {
      if (cells[idx]) cells[idx].classList.add('winning-tile');
    });
  }

  // Setup Visual Themes & Animations
  resultTrophyBox.className = 'crown-icon-box';
  burstRing.className = 'burst-ring';

  if (data.winner === 'draw') {
    // DRAW STATE
    gameOverTitle.textContent = "Game Drawn 🤝";
    gameOverReason.textContent = "Evenly contested match";
    resultTrophyBox.classList.add('draw-theme');
    resultIcon.className = 'fa-solid fa-handshake';
    winnerNameDisplay.textContent = "Draw";
    loserNameDisplay.textContent = "Draw";
    ChessAudio.playDraw();
  } else {
    const isMe = data.winner === mySymbol;
    if (isMe) {
      // VICTORY STATE
      gameOverTitle.textContent = "Victory! 🏆";
      gameOverReason.textContent = `${data.winnerName} won by 3-in-a-row`;
      resultTrophyBox.classList.add('win-theme');
      burstRing.classList.add('win-theme');
      resultIcon.className = 'fa-solid fa-crown';
      winnerNameDisplay.textContent = `${data.winnerName} (You)`;
      loserNameDisplay.textContent = 'Opponent';
      triggerVictoryConfetti();
      ChessAudio.playVictory();
    } else {
      // DEFEAT STATE
      gameOverTitle.textContent = "Defeat";
      gameOverReason.textContent = `${data.winnerName} won by 3-in-a-row`;
      resultTrophyBox.classList.add('defeat-theme');
      resultIcon.className = 'fa-solid fa-shield-halved';
      winnerNameDisplay.textContent = data.winnerName;
      loserNameDisplay.textContent = `${myUsername} (You)`;
      mainAppLayout.classList.add('arena-defeat-shake');
      ChessAudio.playDefeat();
    }
  }

  modalMovesCount.textContent = data.totalMoves || moveHistory.length;
  gameStatusLabel.textContent = `Game Over • ${data.winnerName} won`;

  setTimeout(() => {
    gameOverModal.classList.remove('hidden');
  }, 400);
});

// 6. Game Reset
socket.on('game-reset', (data) => {
  gameActive = data.players && data.players.length === 2;
  moveHistory = [];
  whiteTime = 180;
  blackTime = 180;
  
  gameOverModal.classList.add('hidden');
  mainAppLayout.classList.remove('arena-defeat-shake');
  buildCheckeredBoard();
  updateBoardUI(data.board, data.currentTurn, null);
  renderMovesTable();
  renderClocks();

  if (gameActive) {
    startClockTimer();
    ChessAudio.playGameStart();
  } else {
    stopClockTimer();
  }
});

// 7. Player Left
socket.on('player-left', (data) => {
  gameActive = false;
  stopClockTimer();
  const msg = typeof data === 'string' ? data : (data.message || 'Opponent left');
  gameStatusLabel.textContent = msg;
  updatePlayerRoster(data.players || []);
});

// =============================================================================
// Navigation, Tabs & Action Buttons
// =============================================================================

// 1. Left Sidebar Navigation
navPlay.addEventListener('click', () => {
  navPlay.classList.add('active');
  navHistory.classList.remove('active');
  navRules.classList.remove('active');
  tabMovesBtn.click();
});

navHistory.addEventListener('click', () => {
  navHistory.classList.add('active');
  navPlay.classList.remove('active');
  navRules.classList.remove('active');
  tabHistoryBtn.click();
});

navRules.addEventListener('click', () => {
  rulesModal.classList.remove('hidden');
});

rulesCloseBtn.addEventListener('click', () => {
  rulesModal.classList.add('hidden');
});

// 2. Actions & Rematch
rematchBtn.addEventListener('click', () => socket.emit('reset-game'));
resetBtn.addEventListener('click', () => socket.emit('reset-game'));
modalRematchBtn.addEventListener('click', () => {
  gameOverModal.classList.add('hidden');
  socket.emit('reset-game');
});
modalCloseBtn.addEventListener('click', () => gameOverModal.classList.add('hidden'));

// 3. Tab Switching
tabMovesBtn.addEventListener('click', () => {
  tabMovesBtn.classList.add('active');
  tabHistoryBtn.classList.remove('active');
  tabMovesContent.classList.add('active');
  tabHistoryContent.classList.remove('active');

  navPlay.classList.add('active');
  navHistory.classList.remove('active');
});

tabHistoryBtn.addEventListener('click', () => {
  tabHistoryBtn.classList.add('active');
  tabMovesBtn.classList.remove('active');
  tabHistoryContent.classList.add('active');
  tabMovesContent.classList.remove('active');

  navHistory.classList.add('active');
  navPlay.classList.remove('active');
  loadArchiveHistory();
});

viewDbBtn.addEventListener('click', () => {
  tabHistoryBtn.click();
});

refreshArchiveBtn.addEventListener('click', loadArchiveHistory);

// Sound Toggle
soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.innerHTML = soundEnabled 
    ? '<i class="fa-solid fa-volume-high"></i> <span class="nav-label">Sound</span>' 
    : '<i class="fa-solid fa-volume-xmark"></i> <span class="nav-label">Muted</span>';
});

// Load Match Records from Firebase (Default DB) or MongoDB
async function loadArchiveHistory() {
  try {
    archiveList.innerHTML = '<div class="empty-moves"><i class="fa-solid fa-fire fa-spin" style="color:#f59e0b;"></i> Loading Firebase records...</div>';
    const res = await fetch('/api/history');
    const result = await res.json();
    const records = result.data || [];
    const sourceName = result.source === 'firebase' ? '🔥 Firebase RTDB' : (result.source === 'mongodb' ? '🍃 MongoDB' : '⚡ Memory');

    if (records.length === 0) {
      archiveList.innerHTML = `
        <div class="empty-moves">
          <i class="fa-solid fa-box-open" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
          <p>No matches recorded yet.</p>
          <span style="font-size: 11px; color: var(--text-muted);">Play a match to log stats to ${sourceName}!</span>
        </div>
      `;
      return;
    }

    archiveList.innerHTML = records.map(r => {
      const isDraw = r.winner === 'Draw';
      const winnerHtml = isDraw 
        ? '<span style="color: var(--draw-blue); font-weight: 700;">🤝 Draw</span>'
        : `<span class="archive-winner-badge"><i class="fa-solid fa-trophy"></i> ${r.winner}</span>`;

      return `
        <div class="archive-card">
          <div class="archive-card-top">
            <span><i class="fa-regular fa-clock"></i> ${r.date || 'Recent'}</span>
            <span style="font-size: 10px; color: #f59e0b; font-weight: 700;">${sourceName}</span>
          </div>
          <div class="archive-matchup">
            ${r.playerX} (White) vs ${r.playerO} (Black)
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size: 11px; margin-top: 2px;">
            ${winnerHtml}
            <span style="color:var(--text-muted);"><strong>${r.totalMoves || '-'}</strong> moves</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    archiveList.innerHTML = '<div class="empty-moves" style="color: #ef4444;">Failed to fetch history records.</div>';
  }
}
