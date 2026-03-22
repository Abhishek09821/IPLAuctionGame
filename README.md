# 🏏 IPL Auction Simulator — Backend

Real-time multiplayer auction + season simulation server built with **Node.js · Express · Socket.io · MySQL**.

---

## 📁 Project Structure

```
ipl-backend/
├── src/
│   ├── server.js               ← Entry point
│   ├── config/
│   │   └── db.js               ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js             ← JWT middleware
│   ├── routes/
│   │   ├── auth.js             ← POST /api/auth/register|login
│   │   ├── rooms.js            ← POST/GET /api/rooms
│   │   └── players.js          ← GET /api/players, /matches, /points
│   ├── services/
│   │   ├── aiBidder.js         ← AI bid evaluation engine
│   │   └── matchSimulator.js   ← League + playoff simulation
│   └── socket/
│       ├── index.js            ← Socket.io event handlers
│       └── auctionManager.js   ← Live auction room state machine
├── db/
│   ├── migrate.js              ← Creates all tables
│   └── seed.js                 ← Seeds 55 IPL players
├── .env.example
└── package.json
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
cd ipl-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
```

### 3. Create database
```sql
-- In MySQL client:
CREATE DATABASE ipl_auction;
```

### 4. Run migrations & seed
```bash
node db/migrate.js    # Creates all tables
node db/seed.js       # Seeds players
```

### 5. Start the server
```bash
npm run dev           # Development (with nodemon)
npm start             # Production
```

Server runs at **http://localhost:4000**

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{username, email, password}` | Register |
| POST | `/api/auth/login` | `{email, password}` | Login → JWT |

All other routes require: `Authorization: Bearer <token>`

### Rooms
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/rooms` | `{teamIndex}` | Create room (0–7) |
| GET | `/api/rooms/:roomId` | — | Room + teams |
| GET | `/api/rooms/:roomId/squad/:teamId` | — | Team's squad |

### Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players` | All 55 players |
| GET | `/api/matches/:roomId` | Match results |
| GET | `/api/points/:roomId` | Points table |

---

## ⚡ Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `room:join` | `{ roomId }` | Join a room |
| `auction:start` | `{ roomId }` | Start auction (host only) |
| `auction:bid` | `{ roomId }` | Place a bid on current player |
| `season:simulate` | `{ roomId }` | Simulate league stage (host only) |
| `playoffs:simulate` | `{ roomId }` | Simulate playoffs (host only) |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room:player_joined` | `{userId, username, teamId}` | Another user joined |
| `auction:player` | `{player, index, total}` | New player up for auction |
| `auction:timer` | `{remaining}` | Countdown tick |
| `auction:bid` | `{teamId, teamName, amount}` | Bid placed |
| `auction:sold` | `{player, teamId, price, budgets}` | Player sold |
| `auction:unsold` | `{player}` | Player unsold |
| `auction:complete` | `{teams}` | All players auctioned |
| `season:started` | — | League simulation begins |
| `season:complete` | `{results[]}` | League done |
| `playoffs:complete` | `{q1, eliminator, q2, final, champion}` | Playoffs done |

---

## 🗄️ Database Schema

```
users       id, username, email, password
rooms       id (UUID), host_id, status
teams       id, room_id, name, short_name, budget, is_ai, user_id
players     id, name, country, role, base_price, rating, ...
auctions    id, room_id, player_id, team_id, sold_price
matches     id, room_id, stage, team1_id, team2_id, winner_id, score1, score2
points      id, room_id, team_id, matches, wins, losses, points, nrr
```

---

## 🤖 AI Logic

AI teams bid based on:
- **Role balance** — won't overbid on a role they already have enough of
- **Budget preservation** — always keeps ₹1.5 Cr+ in reserve
- **Player rating** — maximum willingness scales with `rating/100 × 20 Cr`
- **Desperation** — teams with <5 players bid 40% more aggressively
- **Probability** — elite players (rt≥90) almost always attract bids; weaker ones sometimes get skipped

---

## 🏏 Match Simulation

1. Top 11 players by rating are selected for each team
2. Squad strength = average rating of top 11 × role-balance bonus (5%)
3. Win probability = `strength1 / (strength1 + strength2)`
4. Scores are generated with realistic T20 ranges (155–210 winner, 90–195 loser)
5. NRR updated after every match

---

## 🚀 Deployment

```
Frontend  →  Vercel  (React)
Backend   →  Render  (Node.js)
Database  →  PlanetScale or Railway  (MySQL)
```

On Render set environment variables matching `.env.example`.
PlanetScale connection string goes into `DB_HOST`, `DB_USER`, `DB_PASSWORD`.

---

## 📈 Phase Roadmap

| Phase | Status | Features |
|-------|--------|---------|
| 1 | ✅ Done | DB schema, auth, REST APIs |
| 2 | ✅ Done | Real-time auction, AI teams, Socket.io |
| 3 | ✅ Done | Match simulation, points table, playoffs |
| 4 | 🔜 Next | React frontend, Vercel deploy |
| 5 | 🔜 Future | Player form, trading window, commentary |
