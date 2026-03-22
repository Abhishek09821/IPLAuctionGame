// src/server.js
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const authRoutes   = require('./routes/auth');
const roomRoutes   = require('./routes/rooms');
const { playersRouter, matchesRouter, pointsRouter } = require('./routes/players');
const attachSockets = require('./socket');

/* ── App setup ───────────────────────────── */
const app    = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',').map(s => s.trim());

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

/* ── Middleware ──────────────────────────── */
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

/* ── Health check ────────────────────────── */
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

/* ── REST Routes ─────────────────────────── */
app.use('/api/auth',    authRoutes);
app.use('/api/rooms',   roomRoutes);
app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/points',  pointsRouter);

/* ── Socket.io ───────────────────────────── */
attachSockets(io);

/* ── 404 & error handler ─────────────────── */
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

/* ── Listen ──────────────────────────────── */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`\n🚀  IPL Auction Server running on http://localhost:${PORT}\n`)
);
