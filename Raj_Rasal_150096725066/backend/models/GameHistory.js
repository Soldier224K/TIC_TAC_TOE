// =============================================================================
// GameHistory Model (Mongoose Schema)
// =============================================================================

const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema(
  {
    playerX: {
      type: String,
      required: [true, 'Player X username is required'],
      trim: true,
    },
    playerO: {
      type: String,
      required: [true, 'Player O username is required'],
      trim: true,
    },
    winner: {
      type: String,
      required: [true, 'Winner name or Draw is required'],
    },
    date: {
      type: String,
      required: true,
    },
    totalMoves: {
      type: Number,
      required: true,
      min: 0,
      max: 9,
    },
    winningPattern: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);

module.exports = GameHistory;
