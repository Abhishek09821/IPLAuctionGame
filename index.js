 /
/**
 * Attach Socket.io logic to the HTTP server.
 * Called once from server.js.
 */
module.exports = function attachSockets(io) {

  /* ── Auth middleware ────────────────────── */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No auth token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  /* ── Connection ─────────────────────────── */
  io.on('connection', socket => {
    console.log(`🟢 Socket connected: ${socket.id} (user ${socket.user.id})`);

    /* ── JOIN ROOM ──────────────────────── */
    socket.on('room:join', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (!room) return ack({ error: 'Room not found' });

        socket.join(roomId);
        socket.roomId  = roomId;

        // Track which team this user controls
        const [[team]] = await db.query(
          'SELECT * FROM teams WHERE room_id=? AND user_id=?',
          [roomId, socket.user.id]
        );
        socket.teamId = team?.id ?? null;

        // Send current state to the joining socket
        const [teams]   = await db.query('SELECT id,name,short_name,color,emoji,budget,is_ai FROM teams WHERE room_id=?', [roomId]);
        const [players] = await db.query('SELECT * FROM players');
        ack({ ok: true, room, teams, players, yourTeamId: socket.teamId });

        // Notify others
        socket.to(roomId).emit('room:player_joined', {
          userId  : socket.user.id,
          username: socket.user.username,
          teamId  : socket.teamId,
        });
      } catch (e) {
        ack({ error: e.message });
      }
    });

    

  

   

  
   
