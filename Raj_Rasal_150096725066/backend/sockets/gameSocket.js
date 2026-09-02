// =============================================================================
// Socket.io Game Logic & Authoritative State Controller
// =============================================================================

const { saveGameRecord } = require('../controllers/historyController');

// ===== Authoritative Server Game State =====
let players = {};              // { [socketId]: { username: string, symbol: 'X' | 'O' } }
let board = Array(9).fill(''); // 3x3 board cells indexed 0 through 8
let currentTurn = 'X';         // 'X' (White) always moves first
let gameActive = false;
let moveCount = 0;

// Winning 3-cell pattern index combinations
const WIN_PATTERNS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Column 1
  [1, 4, 7], // Column 2
  [2, 5, 8], // Column 3
  [0, 4, 8], // Diagonal 1
  [2, 4, 6], // Diagonal 2
];

function checkWinner() {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], pattern };
    }
  }
  return board.includes('') ? null : 'draw';
}

function resetGame() {
  board = Array(9).fill('');
  currentTurn = 'X';
  gameActive = Object.keys(players).length === 2;
  moveCount = 0;
}

const getPlayerList = () =>
  Object.entries(players).map(([id, p]) => ({
    id,
    username: p.username,
    symbol: p.symbol,
  }));

const initGameSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Send initial player list
    socket.emit('players-update', getPlayerList());

    // 1. USER LOGIN
    socket.on('user-login', (username) => {
      username = (username || '').trim();

      if (!username || username.length < 2) {
        return socket.emit('login-error', 'Username must be at least 2 characters.');
      }
      if (Object.keys(players).length >= 2) {
        return socket.emit('login-error', 'Game lobby is full! Maximum 2 players.');
      }
      const isTaken = Object.values(players).some(
        (p) => p.username.toLowerCase() === username.toLowerCase()
      );
      if (isTaken) {
        return socket.emit('login-error', 'Username is already taken by another player.');
      }

      const symbol = Object.keys(players).length === 0 ? 'X' : 'O';
      players[socket.id] = { username, symbol };

      console.log(`👤 Player joined: ${username} (${symbol}) [${socket.id}]`);

      socket.emit('login-success', {
        username,
        symbol,
        players: getPlayerList(),
      });

      io.emit('players-update', getPlayerList());

      // Start match when both players are connected
      if (Object.keys(players).length === 2) {
        resetGame();
        io.emit('game-start', {
          board,
          currentTurn,
          players: getPlayerList(),
          message: "Match started! Player X's turn.",
        });
      }
    });

    // 2. MAKE MOVE
    socket.on('make-move', (index) => {
      const me = players[socket.id];

      if (!me || !gameActive) return;
      if (me.symbol !== currentTurn) return;
      if (index < 0 || index > 8 || board[index] !== '') return;

      board[index] = me.symbol;
      moveCount++;

      const result = checkWinner();

      if (result) {
        gameActive = false;
        const allPlayers = Object.values(players);
        const playerXObj = allPlayers.find((p) => p.symbol === 'X');
        const playerOObj = allPlayers.find((p) => p.symbol === 'O');

        let winnerSymbol = null;
        let winnerName = 'Draw';
        let message = "It's a draw! 🤝";
        let winningPattern = [];

        if (result !== 'draw') {
          winnerSymbol = result.winner;
          winningPattern = result.pattern;
          const winnerObj = allPlayers.find((p) => p.symbol === winnerSymbol);
          winnerName = winnerObj ? winnerObj.username : winnerSymbol;
          message = `🏆 ${winnerName} (${winnerSymbol}) wins!`;
        }

        io.emit('move-made', {
          board,
          currentTurn,
          lastMove: { index, symbol: me.symbol },
        });

        io.emit('game-over', {
          winner: winnerSymbol || 'draw',
          winnerName,
          winningPattern,
          message,
          totalMoves: moveCount,
        });

        // Save match record
        saveGameRecord({
          playerX: playerXObj ? playerXObj.username : 'Unknown',
          playerO: playerOObj ? playerOObj.username : 'Unknown',
          winner: winnerName,
          date: new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          totalMoves: moveCount,
          winningPattern,
        });
      } else {
        currentTurn = currentTurn === 'X' ? 'O' : 'X';
        io.emit('move-made', {
          board,
          currentTurn,
          lastMove: { index, symbol: me.symbol },
        });
      }
    });

    // 3. RESET GAME
    socket.on('reset-game', () => {
      if (Object.keys(players).length === 2) {
        resetGame();
        io.emit('game-reset', {
          board,
          currentTurn,
          players: getPlayerList(),
          message: 'New round started! Player X moves first.',
        });
      } else {
        board = Array(9).fill('');
        gameActive = false;
        io.emit('game-reset', {
          board,
          currentTurn: 'X',
          players: getPlayerList(),
          message: 'Board reset. Waiting for 2 players.',
        });
      }
    });

    // 4. DISCONNECT
    socket.on('disconnect', () => {
      const leftPlayer = players[socket.id];
      if (leftPlayer) {
        console.log(`👋 Player disconnected: ${leftPlayer.username} (${leftPlayer.symbol})`);
        delete players[socket.id];
        gameActive = false;
        board = Array(9).fill('');

        io.emit('players-update', getPlayerList());
        io.emit('player-left', {
          message: `${leftPlayer.username} left the match. Waiting for an opponent...`,
          players: getPlayerList(),
        });
      }
    });
  });
};

module.exports = { initGameSockets };
