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

    /* ── START AUCTION (host only) ──────── */
    socket.on('auction:start', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (!room)              return ack({ error: 'Room not found' });
        if (room.host_id !== socket.user.id)
          return ack({ error: 'Only the host can start' });
        if (room.status !== 'waiting')
          return ack({ error: 'Auction already started' });

        await db.query("UPDATE rooms SET status='auction' WHERE id=?", [roomId]);
        const aRoom = await am.initRoom(io, roomId);
        aRoom.start();
        ack({ ok: true });
      } catch (e) {
        ack({ error: e.message });
      }
    });

    /* ── PLACE BID ──────────────────────── */
    socket.on('auction:bid', ({ roomId }, ack) => {
      if (!socket.teamId) return ack({ error: 'No team assigned' });
      const aRoom = am.getRoom(roomId);
      if (!aRoom)  return ack({ error: 'Auction not active' });
      const result = aRoom.humanBid(socket.teamId);
      ack(result);
    });

    /* ── SIMULATE SEASON ────────────────── */
    socket.on('season:simulate', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (!room)                  return ack({ error: 'Room not found' });
        if (room.host_id !== socket.user.id) return ack({ error: 'Host only' });
        if (room.status !== 'season')        return ack({ error: 'Not in season stage' });

        io.to(roomId).emit('season:started');
        const results = await simulateLeague(roomId);
        io.to(roomId).emit('season:complete', { results });
        ack({ ok: true });
      } catch (e) {
        ack({ error: e.message });
      }
    });

  
   
