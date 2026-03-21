
console.log("THIS IS MY SERVER FILE 🚀");
const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'viratkohli',
  database: 'ipl_game'
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed ❌");
    console.log(err);
  } else {
    console.log("MySQL Connected ✅");
  }
});
let currentAuction = {
  playerId: null,
  currentBid: 0,
  highestBidder: null
};

app.get('/', (req, res) => {
  res.send("Backend + MySQL Connected 🚀");
});

// 🔥 THIS IS IMPORTANT ROUTE
app.get('/players', (req, res) => {
  db.query("SELECT * FROM players", (err, result) => {
    if (err) {
      res.send(err);
    } else {
      res.json(result);
    }
  });
});

app.get('/test', (req, res) => {
  res.send("TEST WORKING");
});

app.post('/buy', (req, res) => {
  const { player_id, team_id, price } = req.body;

  // Insert into auction table
  db.query(
    "INSERT INTO auctions (player_id, team_id, price) VALUES (?, ?, ?)",
    [player_id, team_id, price],
    (err) => {
      if (err) {
        return res.send(err);
      }

      // Deduct budget
      db.query(
        "UPDATE teams SET budget = budget - ? WHERE id = ?",
        [price, team_id]
      );

      res.send("Player bought successfully ✅");
    }
  );
});
app.get('/buy', (req, res) => {
    res.send("Buy page working");
});
app.post('/start-auction', (req, res) => {
  const { playerId, basePrice } = req.body;

  currentAuction = {
    playerId,
    currentBid: basePrice,
    highestBidder: null
  };

  res.json({ message: 'Auction started 🚀', currentAuction });
});
app.post('/bid', (req, res) => {
  const { teamId, bidAmount } = req.body;

  if (bidAmount <= currentAuction.currentBid) {
    return res.status(400).json({ message: 'Bid too low ❌' });
  }

  currentAuction.currentBid = bidAmount;
  currentAuction.highestBidder = teamId;

  res.json({ message: 'Bid placed ✅', currentAuction });
});
app.post('/end-auction', (req, res) => {
  if (!currentAuction.highestBidder) {
    return res.json({ message: 'No bids placed ❌' });
  }

  const { playerId, currentBid, highestBidder } = currentAuction;

  db.query(
    'UPDATE players SET team_id = ?, sold_price = ? WHERE id = ?',
    [highestBidder, currentBid, playerId],
    (err) => {
      if (err) return res.status(500).send(err);

      db.query(
        'UPDATE teams SET purse = purse - ? WHERE id = ?',
        [currentBid, highestBidder],
        (err) => {
          if (err) return res.status(500).send(err);

          res.json({ message: 'Auction ended 🏁 Player sold!' });
        }
      );
    }
  );
});





app.get('/auction', (req, res) => {
    res.send("Auction Page");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});