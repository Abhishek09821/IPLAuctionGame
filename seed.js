// db/seed.js – node db/seed.js
require('dotenv').config();
const pool = require('../src/config/db');

const PLAYERS = [
  // Batsmen
  { name:'Virat Kohli',       country:'India',       role:'Batsman',       base_price:2.00, rating:95, matches:230, batting_avg:48.0, strike_rate:130.0 },
  { name:'Rohit Sharma',      country:'India',       role:'Batsman',       base_price:2.00, rating:92, matches:245, batting_avg:45.0, strike_rate:133.0 },
  { name:'KL Rahul',          country:'India',       role:'Batsman',       base_price:2.00, rating:88, matches:110, batting_avg:47.0, strike_rate:136.0 },
  { name:'Shubman Gill',      country:'India',       role:'Batsman',       base_price:1.50, rating:86, matches:65,  batting_avg:44.0, strike_rate:140.0 },
  { name:'David Warner',      country:'Australia',   role:'Batsman',       base_price:1.50, rating:85, matches:162, batting_avg:42.0, strike_rate:143.0 },
  { name:'Jos Buttler',       country:'England',     role:'Batsman',       base_price:2.00, rating:90, matches:83,  batting_avg:50.0, strike_rate:149.0 },
  { name:'Faf du Plessis',    country:'South Africa',role:'Batsman',       base_price:1.00, rating:83, matches:130, batting_avg:38.0, strike_rate:138.0 },
  { name:'Yashasvi Jaiswal',  country:'India',       role:'Batsman',       base_price:0.40, rating:82, matches:30,  batting_avg:40.0, strike_rate:145.0 },
  { name:'Shreyas Iyer',      country:'India',       role:'Batsman',       base_price:1.50, rating:84, matches:98,  batting_avg:36.0, strike_rate:132.0 },
  { name:'Suryakumar Yadav',  country:'India',       role:'Batsman',       base_price:2.00, rating:91, matches:120, batting_avg:44.0, strike_rate:157.0 },
  { name:'Ruturaj Gaikwad',   country:'India',       role:'Batsman',       base_price:0.50, rating:81, matches:60,  batting_avg:41.0, strike_rate:137.0 },
  { name:'Devon Conway',      country:'New Zealand', role:'Batsman',       base_price:0.50, rating:78, matches:45,  batting_avg:38.0, strike_rate:129.0 },
  { name:'Glenn Maxwell',     country:'Australia',   role:'Batsman',       base_price:1.50, rating:82, matches:120, batting_avg:33.0, strike_rate:153.0 },
  { name:'Liam Livingstone',  country:'England',     role:'Batsman',       base_price:0.75, rating:80, matches:55,  batting_avg:30.0, strike_rate:155.0 },
  { name:'Tim David',         country:'Singapore',   role:'Batsman',       base_price:0.50, rating:77, matches:40,  batting_avg:29.0, strike_rate:162.0 },
  { name:'Tilak Varma',       country:'India',       role:'Batsman',       base_price:0.20, rating:72, matches:35,  batting_avg:32.0, strike_rate:138.0 },
  { name:'Rinku Singh',       country:'India',       role:'Batsman',       base_price:0.20, rating:70, matches:28,  batting_avg:29.0, strike_rate:148.0 },
  { name:'Abhishek Sharma',   country:'India',       role:'Batsman',       base_price:0.20, rating:68, matches:25,  batting_avg:26.0, strike_rate:155.0 },
  // Wicket-Keepers
  { name:'MS Dhoni',          country:'India',       role:'Wicket-Keeper', base_price:2.00, rating:88, matches:250, batting_avg:38.0, strike_rate:140.0 },
  { name:'Rishabh Pant',      country:'India',       role:'Wicket-Keeper', base_price:2.00, rating:87, matches:98,  batting_avg:40.0, strike_rate:149.0 },
  { name:'Sanju Samson',      country:'India',       role:'Wicket-Keeper', base_price:1.00, rating:84, matches:120, batting_avg:38.0, strike_rate:142.0 },
  { name:'Ishan Kishan',      country:'India',       role:'Wicket-Keeper', base_price:1.00, rating:82, matches:85,  batting_avg:36.0, strike_rate:138.0 },
  { name:'Heinrich Klaasen',  country:'South Africa',role:'Wicket-Keeper', base_price:0.50, rating:80, matches:55,  batting_avg:35.0, strike_rate:148.0 },
  { name:'Phil Salt',         country:'England',     role:'Wicket-Keeper', base_price:0.50, rating:76, matches:35,  batting_avg:33.0, strike_rate:152.0 },
  // All-Rounders
  { name:'Hardik Pandya',     country:'India',       role:'All-Rounder',   base_price:2.00, rating:89, matches:120, batting_avg:27.0, strike_rate:148.0 },
  { name:'Ravindra Jadeja',   country:'India',       role:'All-Rounder',   base_price:2.00, rating:88, matches:210, batting_avg:29.0, strike_rate:130.0 },
  { name:'Andre Russell',     country:'West Indies', role:'All-Rounder',   base_price:1.50, rating:87, matches:130, batting_avg:28.0, strike_rate:175.0 },
  { name:'Axar Patel',        country:'India',       role:'All-Rounder',   base_price:1.00, rating:82, matches:115, batting_avg:24.0, strike_rate:140.0 },
  { name:'Sam Curran',        country:'England',     role:'All-Rounder',   base_price:1.50, rating:80, matches:65,  batting_avg:22.0, strike_rate:143.0 },
  { name:'Ben Stokes',        country:'England',     role:'All-Rounder',   base_price:2.00, rating:86, matches:43,  batting_avg:28.0, strike_rate:138.0 },
  { name:'Marcus Stoinis',    country:'Australia',   role:'All-Rounder',   base_price:1.00, rating:79, matches:90,  batting_avg:25.0, strike_rate:145.0 },
  { name:'Washington Sundar', country:'India',       role:'All-Rounder',   base_price:0.50, rating:76, matches:70,  batting_avg:18.0, strike_rate:122.0 },
  { name:'Sunil Narine',      country:'West Indies', role:'All-Rounder',   base_price:1.50, rating:85, matches:175, batting_avg:21.0, strike_rate:162.0 },
  { name:'Mitchell Marsh',    country:'Australia',   role:'All-Rounder',   base_price:1.00, rating:78, matches:75,  batting_avg:25.0, strike_rate:147.0 },
  { name:'Shardul Thakur',    country:'India',       role:'All-Rounder',   base_price:0.75, rating:74, matches:85,  batting_avg:19.0, strike_rate:155.0 },
  { name:'Shivam Dube',       country:'India',       role:'All-Rounder',   base_price:0.40, rating:70, matches:45,  batting_avg:23.0, strike_rate:145.0 },
  // Bowlers
  { name:'Jasprit Bumrah',    country:'India',       role:'Bowler',        base_price:2.00, rating:97, matches:130, economy:6.80, wickets:145 },
  { name:'Rashid Khan',       country:'Afghanistan', role:'Bowler',        base_price:2.00, rating:94, matches:90,  economy:6.30, wickets:135 },
  { name:'Mohammed Shami',    country:'India',       role:'Bowler',        base_price:2.00, rating:90, matches:95,  economy:8.00, wickets:90  },
  { name:'Yuzvendra Chahal',  country:'India',       role:'Bowler',        base_price:1.00, rating:86, matches:150, economy:7.60, wickets:187 },
  { name:'Pat Cummins',       country:'Australia',   role:'Bowler',        base_price:1.50, rating:88, matches:70,  economy:8.20, wickets:90  },
  { name:'Kagiso Rabada',     country:'South Africa',role:'Bowler',        base_price:1.50, rating:87, matches:70,  economy:8.40, wickets:90  },
  { name:'Trent Boult',       country:'New Zealand', role:'Bowler',        base_price:1.50, rating:86, matches:85,  economy:8.00, wickets:105 },
  { name:'Bhuvneshwar Kumar', country:'India',       role:'Bowler',        base_price:1.00, rating:83, matches:160, economy:7.90, wickets:160 },
  { name:'Arshdeep Singh',    country:'India',       role:'Bowler',        base_price:0.50, rating:81, matches:65,  economy:8.30, wickets:75  },
  { name:'Kuldeep Yadav',     country:'India',       role:'Bowler',        base_price:1.00, rating:82, matches:80,  economy:7.10, wickets:100 },
  { name:'Mohammed Siraj',    country:'India',       role:'Bowler',        base_price:1.00, rating:82, matches:70,  economy:8.60, wickets:75  },
  { name:'Wanindu Hasaranga', country:'Sri Lanka',   role:'Bowler',        base_price:1.50, rating:83, matches:58,  economy:7.80, wickets:85  },
  { name:'Harshal Patel',     country:'India',       role:'Bowler',        base_price:0.50, rating:78, matches:80,  economy:8.50, wickets:95  },
  { name:'Avesh Khan',        country:'India',       role:'Bowler',        base_price:0.50, rating:76, matches:55,  economy:9.00, wickets:65  },
  { name:'Alzarri Joseph',    country:'West Indies', role:'Bowler',        base_price:0.50, rating:77, matches:40,  economy:8.80, wickets:50  },
  { name:'Anrich Nortje',     country:'South Africa',role:'Bowler',        base_price:0.75, rating:79, matches:45,  economy:8.80, wickets:60  },
  { name:'Noor Ahmad',        country:'Afghanistan', role:'Bowler',        base_price:0.40, rating:72, matches:25,  economy:8.50, wickets:30  },
  { name:'Deepak Chahar',     country:'India',       role:'Bowler',        base_price:0.50, rating:75, matches:70,  economy:8.20, wickets:80  },
  { name:'Umran Malik',       country:'India',       role:'Bowler',        base_price:0.40, rating:73, matches:35,  economy:9.50, wickets:35  },
  { name:'Matt Henry',        country:'New Zealand', role:'Bowler',        base_price:0.50, rating:75, matches:30,  economy:9.10, wickets:45  },
];

(async () => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM players');
    const sql = `INSERT INTO players
      (name,country,role,base_price,rating,matches,batting_avg,strike_rate,economy,wickets)
      VALUES (?,?,?,?,?,?,?,?,?,?)`;
    for (const p of PLAYERS) {
      await conn.query(sql, [
        p.name, p.country, p.role, p.base_price, p.rating,
        p.matches,
        p.batting_avg ?? null,
        p.strike_rate ?? null,
        p.economy    ?? null,
        p.wickets    ?? null,
      ]);
    }
    console.log(`✅  Seeded ${PLAYERS.length} players.`);
  } catch (e) {
    console.error('Seed error:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
