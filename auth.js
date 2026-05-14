// src/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
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
