import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { IDX40_TICKERS } from "../src/lib/idx-stocks";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Config ───────────────────────────────────────────────────────
const NUM_USERS = 20;
const NUM_POSTS = 150;
const NUM_LIKES = 500;
const NUM_COMMENTS = 100;
const NUM_FOLLOWS = 50;
const NUM_STOCK_FOLLOWS = 30;

const USERNAMES = [
  "trader_pro", "saham_master", "idx_hunter", "chart_wizard", "bullish_id",
  "bearish_alert", "technical_guru", "swing_trader", "scalper_id", "value_investor",
  "dividen_king", "bluechip_fan", "smallcap_hunter", "ipo_watcher", "market_sentinel",
  "bursa_analyst", "candle_reader", "volume_tracker", "rsi_expert", "macd_trader",
];

const NAMES = [
  "Andi Pratama", "Budi Santoso", "Citra Dewi", "Dian Kusuma", "Eko Putra",
  "Fajar Hidayat", "Gita Permata", "Hendra Wijaya", "Indah Sari", "Joko Susanto",
  "Kartika Dewi", "Lukman Hakim", "Maya Putri", "Nanda Saputra", "Omar Fadil",
  "Putri Anggraeni", "Rizky Ramadhan", "Sari Indah", "Taufik Nugroho", "Umar Bakri",
];

const BIOS = [
  "Full-time trader, saham IDX sejak 2018",
  "Technical analysis enthusiast",
  "Value investor dengan fokus blue chip",
  "Swing trader | Chart pattern lover",
  "Momentum trader, fokus pada volume breakout",
  "Long term investor, dividend growth strategy",
  "Day trader IDX | Scalping & momentum",
  "Former analyst, now independent trader",
  "Saham syariah & fundamental analysis",
  "Chartist | Price action | Support Resistance",
  "Growth stock picker | IDX mid-cap specialist",
  "Quantitative analysis & backtesting",
  "Options & derivatives enthusiast",
  "Market psychology & sentiment analyst",
  "Crypto & saham dual trader",
];

const POST_CONTENTS = [
  "BBCA terlihat membentuk pola cup and handle di timeframe harian. Breakout di atas 9.800 bisa membawa harga ke 10.500.",
  "Volume BBRI hari ini sangat tinggi, 2x rata-rata 20 hari. Ada akumulasi besar dari institusi asing.",
  "RSI BMRI sudah di area oversold di 28. Biasanya rebound 3-5% dalam seminggu setelah RSI di bawah 30.",
  "Pola head and shoulders terbentuk di TLKM. Target bearish ke 3.200 jika leher neckline ditembus.",
  "ADX AMMN menunjukkan trend kuat dengan +DI di atas -DI. Bullish momentum masih kuat.",
  "MACD golden cross baru terjadi di UNVR. Sinyal bullish jangka menengah.",
  "Bollinger Band squeeze di GOTO. Volatilitas menurun, biasanya diikuti breakout besar.",
  "Stochastic oversold bounce di ANTM. Entry bagus untuk swing trade 1-2 minggu.",
  "Support kuat di INDF di area 6.800. Bounce beberapa kali dari level ini.",
  "Resistance berat di ASII di 6.200. Butuh volume besar untuk breakout.",
  "EMA 50 dan 200 hampir bersilangan di ICBP. Death cross terancam, hati-hati.",
  "Volume breakout di MDKA! Harga tembus resistance dengan volume 3x rata-rata.",
  "Candlestick doji terbentuk di ADRO. Indikasi keraguan pasar, bisa reversal.",
  "Fibonacci retracement 61.8% di CPIN tepat di 8.500. Level krusial untuk watch.",
  "Bearish divergence di RSI SIDO. Harga naik tapi RSI turun, waspada koreksi.",
  "Double bottom terbentuk di MAPI. Target harga ke 2.800 jika neckline tembus.",
  "Triple top di TOWR di area 800. Pattern reversal bearish yang cukup kuat.",
  "Gap up di BRIS hari ini. Biasanya gap akan diisi dalam 3-5 hari trading.",
  "Moving average ribbon bullish di INKP. Semua MA sejajar naik, trend kuat.",
  "OBV naik tajam di AKRA meskipun harga sideways. Akumulasi tersembunyi.",
  "Pola ascending triangle di PGAS. Target breakout ke 1.800.",
  "Ichimoku cloud di atas harga EXCL. Resistance dinamis di area 5.000.",
  "VWAP menunjukkan buyer dominan di ITMG sepanjang sesi. Bullish intraday.",
  "Parabolic SAR berbalik bullish di KLBF. Sinyal buy untuk medium term.",
  "On-balance volume di JSMR baru crossing ke atas. Bullish confirmation.",
  "Channel naik rapi di UNTR. Buy on dip di lower channel.",
  "Price action bullish di MEDC. Higher high dan higher low konsisten.",
  "Williams %R di oversold zone untuk PGEO. Potensi bounce minggu depan.",
  "Aroon up meningkat tajam di AMRT. Trend baru mungkin dimulai.",
  "Chaikin money flow positif di MAPI. Akumulasi institusi terlihat jelas.",
  "Market hari ini menarik, IHSG rebound dari support 7.100. Sentimen mulai membaik.",
  "Siapa yang ikut rally AMMN hari ini? Gain hampir 5% dari pembukaan!",
  "Analisa teknikal vs fundamental — mana yang lebih penting untuk swing trading?",
  "Rapat Bank Indonesia besok. Apa impactnya ke sektor perbankan?",
  "Earnings season Q3 dimulai minggu depan. Saham apa yang harus di-watch?",
  "Tips untuk pemula: selalu gunakan stop loss. Pengalaman pahit belajar tanpa SL.",
  "Pullback sehat di BBCA setelah rally 3 hari. Masih bullish menurut saya.",
  "Divergence di hampir semua bank blue chip. Waspadai koreksi mendalam.",
  "Sector rotation dari perbankan ke komoditas. Rotasi ini biasanya bertahan 2-4 minggu.",
  "Jangan FOMO! Tunggu konfirmasi breakout sebelum entry. Disiplin adalah kunci.",
  "Happy trading everyone! Semoga portofolio hijau semua minggu ini 📈",
  "Staking positions di BBRI dan BMRI untuk jangka panjang. Dividen dan capital gain.",
  "Backtest strategy saya menunjukkan win rate 62% di saham IDX40. Lumayan!",
  "Apakah ada yang pakai Williams %R? Indikator ini underrated menurut saya.",
  "Volume market hari ini tipis. Better wait and see sampai volume kembali normal.",
  "Watchlist minggu ini: BBCA, BBRI, TLKM, AMMN, MDKA. Ada yang mau ditambahkan?",
  "Koreksi di sektor teknologi global. Impact ke TLKM dan EXCL bisa signifikan.",
  "Rally komoditas berlanjut. ITMG, ANTM, ADRO masih momentum kuat.",
  "Strategi averaging down vs averaging up — mana yang lebih baik?",
  "Catatan trading hari ini: 3 win, 1 loss. Net gain 2.1%. Konsisten itu penting!",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(daysAgo: number): Date {
  const now = Date.now();
  const past = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

async function main() {
  console.log("🌱 Seeding community test data...\n");

  // ─── 1. Create Users ───────────────────────────────────────────
  console.log(`Creating ${NUM_USERS} users...`);
  const users = [];
  for (let i = 0; i < NUM_USERS; i++) {
    const rep = [0, 5, 15, 30, 55, 80, 120, 180, 250, 350, 420, 500][Math.floor(Math.random() * 12)];
    const user = await prisma.user.upsert({
      where: { email: `${USERNAMES[i]}@test.com` },
      update: {
        name: NAMES[i],
        bio: pick(BIOS),
        reputation: rep,
      },
      create: {
        email: `${USERNAMES[i]}@test.com`,
        username: USERNAMES[i],
        name: NAMES[i],
        bio: pick(BIOS),
        reputation: rep,
      },
    });
    users.push(user);
  }
  console.log(`  ✓ Created ${users.length} users`);

  // ─── 2. Create Posts ───────────────────────────────────────────
  console.log(`Creating ${NUM_POSTS} posts...`);
  const posts = [];
  for (let i = 0; i < NUM_POSTS; i++) {
    const author = pick(users);
    const hasTicker = Math.random() < 0.6;
    const ticker = hasTicker ? pick(IDX40_TICKERS) : null;
    const hasPrediction = ticker != null && Math.random() < 0.4;
    const directions = ["bullish", "bearish", "neutral"];

    const post = await prisma.post.create({
      data: {
        content: pick(POST_CONTENTS),
        authorId: author.id,
        tickerTag: ticker,
        predictionDirection: hasPrediction ? pick(directions) : null,
        predictionTarget: hasPrediction ? (Math.random() < 0.5 ? randInt(1000, 15000) : null) : null,
        createdAt: randDate(30),
      },
    });
    posts.push(post);
  }
  console.log(`  ✓ Created ${posts.length} posts`);

  // ─── 3. Create Likes ───────────────────────────────────────────
  console.log(`Creating ${NUM_LIKES} likes...`);
  let likesCreated = 0;
  const likeSet = new Set<string>();
  let likeAttempts = 0;
  while (likesCreated < NUM_LIKES && likeAttempts < NUM_LIKES * 3) {
    likeAttempts++;
    const user = pick(users);
    const post = pick(posts);
    const key = `${user.id}-${post.id}`;
    if (likeSet.has(key)) continue;
    likeSet.add(key);

    await prisma.like.create({
      data: { userId: user.id, postId: post.id },
    });
    await prisma.post.update({
      where: { id: post.id },
      data: { likesCount: { increment: 1 } },
    });
    likesCreated++;
  }
  console.log(`  ✓ Created ${likesCreated} likes`);

  // ─── 4. Create Comments ────────────────────────────────────────
  console.log(`Creating ${NUM_COMMENTS} comments...`);
  const commentContents = [
    "Analisa yang bagus!", "Setuju dengan pandangan ini.", "Thanks for sharing!",
    "Chart patternnya jelas terlihat.", "Saya punya view berbeda nih.",
    "Mantap, jadi tambah yakin.", "Stop loss di mana kak?", "Volume memang konfirmasi.",
    "Breakout atau fakeout ya?", "Divergence-nya kuat, nice catch!",
    "Sudah entry belum nih?", "Target harga realistis menurut saya.",
    "Risk reward ratio-nya bagus.", "Patut dicontoh analisanya.",
    "Apakah ini masih valid hari ini?",
  ];
  for (let i = 0; i < NUM_COMMENTS; i++) {
    const user = pick(users);
    const post = pick(posts);
    await prisma.comment.create({
      data: {
        content: pick(commentContents),
        authorId: user.id,
        postId: post.id,
        createdAt: randDate(20),
      },
    });
    await prisma.post.update({
      where: { id: post.id },
      data: { commentsCount: { increment: 1 } },
    });
  }
  console.log(`  ✓ Created ${NUM_COMMENTS} comments`);

  // ─── 5. Create Follows ─────────────────────────────────────────
  console.log(`Creating ${NUM_FOLLOWS} follows...`);
  let followsCreated = 0;
  const followSet = new Set<string>();
  let followAttempts = 0;
  while (followsCreated < NUM_FOLLOWS && followAttempts < NUM_FOLLOWS * 5) {
    followAttempts++;
    const follower = pick(users);
    const following = pick(users);
    if (follower.id === following.id) continue;
    const key = `${follower.id}-${following.id}`;
    if (followSet.has(key)) continue;
    followSet.add(key);

    await prisma.follow.create({
      data: { followerId: follower.id, followingId: following.id },
    });
    followsCreated++;
  }
  console.log(`  ✓ Created ${followsCreated} follows`);

  // ─── 6. Create Stock Follows ───────────────────────────────────
  console.log(`Creating ${NUM_STOCK_FOLLOWS} stock follows...`);
  let stockFollowsCreated = 0;
  const stockFollowSet = new Set<string>();
  let stockFollowAttempts = 0;
  while (stockFollowsCreated < NUM_STOCK_FOLLOWS && stockFollowAttempts < NUM_STOCK_FOLLOWS * 5) {
    stockFollowAttempts++;
    const user = pick(users);
    const ticker = pick(IDX40_TICKERS);
    const key = `${user.id}-${ticker}`;
    if (stockFollowSet.has(key)) continue;
    stockFollowSet.add(key);

    await prisma.stockFollow.create({
      data: { userId: user.id, ticker },
    });
    stockFollowsCreated++;
  }
  console.log(`  ✓ Created ${stockFollowsCreated} stock follows`);

  // ─── Summary ───────────────────────────────────────────────────
  const totalUsers = await prisma.user.count();
  const totalPosts = await prisma.post.count();
  const totalLikes = await prisma.like.count();
  const totalComments = await prisma.comment.count();
  const totalFollows = await prisma.follow.count();

  console.log("\n✅ Seed complete!");
  console.log(`   Users: ${totalUsers} | Posts: ${totalPosts} | Likes: ${totalLikes} | Comments: ${totalComments} | Follows: ${totalFollows}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
