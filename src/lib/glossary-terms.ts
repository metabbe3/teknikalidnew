export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  category: "teknikal" | "fundamental" | "pasar" | "strategi";
  related?: string[]; // slugs of related terms
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: "saham",
    term: "Saham",
    definition:
      "Bukti kepemilikan seseorang atau badan hukum terhadap suatu perusahaan. Pemegang saham memiliki hak atas dividen dan keuntungan dari kenaikan harga saham (capital gain).",
    category: "pasar",
    related: ["dividen", "capital-gain", "blue-chip", "lot"],
  },
  {
    slug: "ihsg",
    term: "IHSG",
    definition:
      "Indeks Harga Saham Gabungan — indeks komposit yang mengukur pergerakan harga seluruh saham yang tercatat di Bursa Efek Indonesia (BEI). IHSG menjadi barometer utama kondisi pasar saham Indonesia.",
    category: "pasar",
    related: ["market-cap", "saham", "blue-chip"],
  },
  {
    slug: "rsi",
    term: "RSI",
    definition:
      "Relative Strength Index — indikator momentum yang mengukur kecepatan dan perubahan pergerakan harga. Nilai RSI berkisar 0–100; di atas 70 dianggap overbought, di bawah 30 dianggap oversold.",
    category: "teknikal",
    related: ["overbought", "oversold", "divergence", "macd"],
  },
  {
    slug: "macd",
    term: "MACD",
    definition:
      "Moving Average Convergence Divergence — indikator trend-following yang menunjukkan hubungan antara dua moving average harga saham. Sinyal beli terjadi ketika MACD line memotong signal line dari bawah, dan sebaliknya untuk sinyal jual.",
    category: "teknikal",
    related: ["moving-average", "divergence", "rsi"],
  },
  {
    slug: "support",
    term: "Support",
    definition:
      "Level harga terendah di mana saham cenderung mengalami tekanan beli sehingga harga sulit turun lebih jauh. Support terbentuk dari akumulasi pembeli pada level tersebut.",
    category: "teknikal",
    related: ["resistance", "breakdown", "trendline", "volume"],
  },
  {
    slug: "resistance",
    term: "Resistance",
    definition:
      "Level harga tertinggi di mana saham cenderung mengalami tekanan jual sehingga harga sulit naik lebih tinggi. Resistance terbentuk dari distribusi penjual pada level tersebut.",
    category: "teknikal",
    related: ["support", "breakout", "trendline", "volume"],
  },
  {
    slug: "candlestick",
    term: "Candlestick",
    definition:
      "Jenis chart yang menampilkan informasi harga open, high, low, dan close (OHLC) dalam satu periode. Candlestick hijau/putih menandakan harga naik, sedangkan merah/hitam menandakan harga turun.",
    category: "teknikal",
    related: ["volume", "support", "resistance", "breakout"],
  },
  {
    slug: "volume",
    term: "Volume",
    definition:
      "Jumlah saham yang diperdagangkan dalam satu periode tertentu. Volume tinggi menunjukkan minat pasar yang besar dan mengkonfirmasi kekuatan suatu pergerakan harga.",
    category: "pasar",
    related: ["candlestick", "breakout", "accumulation", "distribution"],
  },
  {
    slug: "bullish",
    term: "Bullish",
    definition:
      "Kondisi pasar yang menunjukkan tren naik atau sentimen positif. Investor bullish percaya harga akan terus meningkat dan cenderung mengambil posisi beli.",
    category: "pasar",
    related: ["bearish", "breakout", "golden-cross", "trendline"],
  },
  {
    slug: "bearish",
    term: "Bearish",
    definition:
      "Kondisi pasar yang menunjukkan tren turun atau sentimen negatif. Investor bearish percaya harga akan terus menurun dan cenderung mengambil posisi jual.",
    category: "pasar",
    related: ["bullish", "breakdown", "death-cross", "short-selling"],
  },
  {
    slug: "diversifikasi",
    term: "Diversifikasi",
    definition:
      "Strategi investasi dengan menyebarkan dana ke berbagai jenis aset atau sektor untuk mengurangi risiko. Intinya: jangan menaruh semua telur dalam satu keranjang.",
    category: "strategi",
    related: ["portfolio", "reksadana", "obligasi", "risk-reward-ratio"],
  },
  {
    slug: "dividen",
    term: "Dividen",
    definition:
      "Bagian dari laba perusahaan yang dibagikan kepada pemegang saham. Dividen bisa berupa tunai (cash dividend) atau saham tambahan (stock dividend).",
    category: "fundamental",
    related: ["saham", "eps", "per", "blue-chip"],
  },
  {
    slug: "eps",
    term: "EPS",
    definition:
      "Earnings Per Share — laba bersih perusahaan dibagi jumlah saham beredar. EPS menunjukkan profitabilitas per lembar saham dan menjadi indikator penting bagi investor fundamental.",
    category: "fundamental",
    related: ["per", "pbv", "dividen", "market-cap"],
  },
  {
    slug: "per",
    term: "PER",
    definition:
      "Price to Earnings Ratio — perbandingan antara harga saham dengan laba per saham (EPS). PER digunakan untuk menilai apakah saham dinilai mahal atau murah. PER rendah bisa mengindikasikan saham undervalued.",
    category: "fundamental",
    related: ["eps", "pbv", "market-cap", "dividen"],
  },
  {
    slug: "pbv",
    term: "PBV",
    definition:
      "Price to Book Value — perbandingan antara harga saham dengan nilai buku per saham. PBV di bawah 1 bisa mengindikasikan saham diperdagangkan di bawah nilai asetnya.",
    category: "fundamental",
    related: ["per", "eps", "market-cap"],
  },
  {
    slug: "market-cap",
    term: "Market Cap",
    definition:
      "Market Capitalization — total nilai pasar suatu perusahaan, dihitung dari harga saham dikali jumlah saham beredar. Market cap menunjukkan seberapa besar perusahaan dalam pandangan pasar.",
    category: "fundamental",
    related: ["saham", "eps", "per", "ihsg"],
  },
  {
    slug: "ipo",
    term: "IPO",
    definition:
      "Initial Public Offering — penawaran saham perusahaan kepada publik untuk pertama kalinya di bursa saham. Melalui IPO, perusahaan memperoleh modal dari investor publik.",
    category: "pasar",
    related: ["saham", "market-cap", "blue-chip"],
  },
  {
    slug: "blue-chip",
    term: "Blue Chip",
    definition:
      "Saham perusahaan besar, mapan, dan memiliki reputasi keuangan yang solid. Blue chip biasanya merupakan pemimpin di industrinya, membayar dividen konsisten, dan memiliki market cap besar.",
    category: "pasar",
    related: ["saham", "market-cap", "dividen", "ihsg"],
  },
  {
    slug: "lot",
    term: "Lot",
    definition:
      "Satuan terkecil dalam transaksi saham di BEI. Satu lot terdiri dari 100 lembar saham. Untuk membeli saham, investor harus membeli minimal 1 lot.",
    category: "pasar",
    related: ["saham", "bid-offer", "market-order"],
  },
  {
    slug: "bid-offer",
    term: "Bid-Offer",
    definition:
      "Bid adalah harga tertinggi yang ingin dibayar pembeli, sedangkan Offer (Ask) adalah harga terendah yang diminta penjual. Selisih antara bid dan offer disebut spread.",
    category: "pasar",
    related: ["lot", "market-order", "limit-order", "volume"],
  },
  {
    slug: "auto-rejection",
    term: "Auto Rejection",
    definition:
      "Mekanisme otomatis BEI yang menghentikan perdagangan saham jika harga bergerak melebihi batas atas atau batas bawah yang ditetapkan. Bertujuan mencegah volatilitas berlebihan.",
    category: "pasar",
    related: ["circuit-breaker", "saham", "ihsg"],
  },
  {
    slug: "circuit-breaker",
    term: "Circuit Breaker",
    definition:
      "Mekanisme penghentian sementara perdagangan di bursa ketika IHSG anjlok melewati batas tertentu. Circuit breaker diterapkan untuk memberikan waktu jeda dan meredam panik pasar.",
    category: "pasar",
    related: ["auto-rejection", "ihsg", "bearish"],
  },
  {
    slug: "moving-average",
    term: "Moving Average",
    definition:
      "Indikator teknikal yang menghitung rata-rata harga dalam periode tertentu. Jenis umum: Simple Moving Average (SMA) dan Exponential Moving Average (EMA). Digunakan untuk mengidentifikasi arah tren.",
    category: "teknikal",
    related: ["macd", "golden-cross", "death-cross", "bollinger-bands"],
  },
  {
    slug: "bollinger-bands",
    term: "Bollinger Bands",
    definition:
      "Indikator yang terdiri dari tiga garis: middle band (SMA 20), upper band, dan lower band. Band melebar saat volatilitas tinggi dan menyempit saat volatilitas rendah. Membantu mengidentifikasi kondisi overbought/oversold.",
    category: "teknikal",
    related: ["moving-average", "overbought", "oversold", "volatility"],
  },
  {
    slug: "stochastic",
    term: "Stochastic",
    definition:
      "Oscillator momentum yang membandingkan harga penutupan terakhir dengan rentang harga pada periode tertentu. Nilai di atas 80 dianggap overbought, di bawah 20 dianggap oversold.",
    category: "teknikal",
    related: ["rsi", "overbought", "oversold", "divergence"],
  },
  {
    slug: "fibonacci",
    term: "Fibonacci",
    definition:
      "Alat analisis teknikal yang menggunakan rasio Fibonacci (23.6%, 38.2%, 50%, 61.8%) untuk mengidentifikasi level support dan resistance potensial serta target harga.",
    category: "teknikal",
    related: ["support", "resistance", "trendline", "breakout"],
  },
  {
    slug: "breakout",
    term: "Breakout",
    definition:
      "Pergerakan harga yang menembus level resistance ke atas dengan volume signifikan. Breakout mengindikasikan potensi tren naik baru dan sering menjadi sinyal entry bagi trader.",
    category: "teknikal",
    related: ["resistance", "volume", "bullish", "gap-up"],
  },
  {
    slug: "breakdown",
    term: "Breakdown",
    definition:
      "Pergerakan harga yang menembus level support ke bawah dengan volume signifikan. Breakdown mengindikasikan potensi tren turun baru dan sering menjadi sinyal untuk keluar posisi.",
    category: "teknikal",
    related: ["support", "volume", "bearish", "gap-down"],
  },
  {
    slug: "trendline",
    term: "Trendline",
    definition:
      "Garis yang ditarik pada chart untuk menghubungkan serangkaian harga (higher lows untuk uptrend, lower highs untuk downtrend). Trendline membantu mengidentifikasi arah tren dan level support/resistance dinamis.",
    category: "teknikal",
    related: ["support", "resistance", "breakout", "breakdown"],
  },
  {
    slug: "gap-up",
    term: "Gap Up",
    definition:
      "Kondisi di mana harga pembukaan hari ini lebih tinggi dari harga penutupan hari kemarin, menciptakan celah (gap) pada chart. Gap up biasanya terjadi karena sentimen positif atau berita baik.",
    category: "teknikal",
    related: ["gap-down", "breakout", "bullish", "volume"],
  },
  {
    slug: "gap-down",
    term: "Gap Down",
    definition:
      "Kondisi di mana harga pembukaan hari ini lebih rendah dari harga penutupan hari kemarin, menciptakan celah (gap) pada chart. Gap down biasanya terjadi karena sentimen negatif atau berita buruk.",
    category: "teknikal",
    related: ["gap-up", "breakdown", "bearish", "volume"],
  },
  {
    slug: "short-selling",
    term: "Short Selling",
    definition:
      "Strategi menjual saham yang dipinjam dengan harapan bisa membeli kembali di harga yang lebih rendah. Trader mendapat keuntungan dari selisih harga jual dan harga beli kembali.",
    category: "strategi",
    related: ["bearish", "margin-trading", "cut-loss", "stop-loss"],
  },
  {
    slug: "margin-trading",
    term: "Margin Trading",
    definition:
      "Bertransaksi saham dengan menggunakan dana pinjaman dari sekuritas. Margin trading memperbesar potensi keuntungan sekaligus memperbesar risiko kerugian.",
    category: "strategi",
    related: ["short-selling", "cut-loss", "risk-reward-ratio", "stop-loss"],
  },
  {
    slug: "cost-averaging",
    term: "Cost Averaging",
    definition:
      "Strategi investasi dengan membeli saham secara rutin dalam jumlah tertentu tanpa memperhatikan kondisi harga. Tujuannya untuk meratakan biaya rata-rata pembelian dari waktu ke waktu.",
    category: "strategi",
    related: ["diversifikasi", "portfolio", "cut-loss"],
  },
  {
    slug: "cut-loss",
    term: "Cut Loss",
    definition:
      "Tindakan menjual saham pada harga yang lebih rendah dari harga beli untuk membatasi kerugian lebih lanjut. Cut loss adalah disiplin risiko yang penting dalam trading.",
    category: "strategi",
    related: ["stop-loss", "take-profit", "trailing-stop", "risk-reward-ratio"],
  },
  {
    slug: "take-profit",
    term: "Take Profit",
    definition:
      "Tindakan menjual saham ketika harga sudah mencapai target keuntungan yang ditentukan. Take profit membantu investor mengamankan keuntungan sebelum harga berbalik arah.",
    category: "strategi",
    related: ["cut-loss", "trailing-stop", "stop-loss", "risk-reward-ratio"],
  },
  {
    slug: "trailing-stop",
    term: "Trailing Stop",
    definition:
      "Jenis stop order yang mengikuti pergerakan harga secara otomatis. Trailing stop bergerak naik saat harga naik, tetapi tetap di tempat saat harga turun, sehingga mengamankan profit yang sudah didapat.",
    category: "strategi",
    related: ["stop-loss", "take-profit", "cut-loss"],
  },
  {
    slug: "risk-reward-ratio",
    term: "Risk Reward Ratio",
    definition:
      "Perbandingan antara potensi kerugian dengan potensi keuntungan dari suatu transaksi. Misalnya rasio 1:3 berarti rela rugi Rp1 untuk potensi untung Rp3. Semakin tinggi rasio, semakin menguntungkan strategi tersebut.",
    category: "strategi",
    related: ["stop-loss", "take-profit", "cut-loss", "portfolio"],
  },
  {
    slug: "overbought",
    term: "Overbought",
    definition:
      "Kondisi di mana suatu saham dinilai sudah terlalu banyak dibeli sehingga harganya dianggap terlalu tinggi. Biasanya ditandai dengan nilai RSI di atas 70 dan berpotensi terjadi koreksi harga.",
    category: "teknikal",
    related: ["oversold", "rsi", "stochastic", "bollinger-bands"],
  },
  {
    slug: "oversold",
    term: "Oversold",
    definition:
      "Kondisi di mana suatu saham dinilai sudah terlalu banyak dijual sehingga harganya dianggap terlalu rendah. Biasanya ditandai dengan nilai RSI di bawah 30 dan berpotensi terjadi rebound.",
    category: "teknikal",
    related: ["overbought", "rsi", "stochastic", "bollinger-bands"],
  },
  {
    slug: "golden-cross",
    term: "Golden Cross",
    definition:
      "Pola di mana Moving Average jangka pendek (biasanya MA 50) memotong Moving Average jangka panjang (biasanya MA 200) dari bawah ke atas. Dianggap sebagai sinyal bullish yang kuat.",
    category: "teknikal",
    related: ["death-cross", "moving-average", "bullish", "macd"],
  },
  {
    slug: "death-cross",
    term: "Death Cross",
    definition:
      "Pola di mana Moving Average jangka pendek (biasanya MA 50) memotong Moving Average jangka panjang (biasanya MA 200) dari atas ke bawah. Dianggap sebagai sinyal bearish yang kuat.",
    category: "teknikal",
    related: ["golden-cross", "moving-average", "bearish", "macd"],
  },
  {
    slug: "divergence",
    term: "Divergence",
    definition:
      "Kondisi di mana arah pergerakan harga berlawanan dengan arah indikator teknikal. Bullish divergence terjadi saat harga turun tapi indikator naik, dan sebaliknya untuk bearish divergence.",
    category: "teknikal",
    related: ["rsi", "macd", "volume", "stochastic"],
  },
  {
    slug: "accumulation",
    term: "Accumulation",
    definition:
      "Fase di mana investor institusional atau investor besar secara bertahap membeli saham dalam jumlah besar. Biasanya terjadi setelah periode penurunan dan sebelum tren naik dimulai.",
    category: "teknikal",
    related: ["distribution", "volume", "bullish", "support"],
  },
  {
    slug: "distribution",
    term: "Distribution",
    definition:
      "Fase di mana investor institusional atau investor besar secara bertahap menjual saham dalam jumlah besar. Biasanya terjadi setelah periode kenaikan dan sebelum tren turun dimulai.",
    category: "teknikal",
    related: ["accumulation", "volume", "bearish", "resistance"],
  },
  {
    slug: "market-order",
    term: "Market Order",
    definition:
      "Perintah beli atau jual saham pada harga pasar terbaik yang tersedia saat itu. Market order akan langsung tereksekusi, tetapi harga yang didapat tidak selalu sesuai harapan.",
    category: "pasar",
    related: ["limit-order", "stop-loss", "bid-offer", "lot"],
  },
  {
    slug: "limit-order",
    term: "Limit Order",
    definition:
      "Perintah beli atau jual saham pada harga tertentu yang ditentukan. Order hanya akan tereksekusi jika harga pasar mencapai harga limit yang ditentukan atau lebih baik.",
    category: "pasar",
    related: ["market-order", "stop-loss", "bid-offer", "lot"],
  },
  {
    slug: "stop-loss",
    term: "Stop Loss",
    definition:
      "Perintah otomatis untuk menjual saham ketika harga turun mencapai level tertentu yang ditentukan. Stop loss berfungsi untuk membatasi kerugian dan melindungi modal investor.",
    category: "strategi",
    related: ["cut-loss", "trailing-stop", "take-profit", "limit-order"],
  },
  {
    slug: "reksadana",
    term: "Reksadana",
    definition:
      "Wadah yang menghimpun dana dari investor untuk kemudian diinvestasikan ke portofolio efek oleh manajer investasi. Reksadana memudahkan investor kecil untuk berinvestasi secara diversifikasi.",
    category: "fundamental",
    related: ["diversifikasi", "obligasi", "portfolio", "saham"],
  },
  {
    slug: "obligasi",
    term: "Obligasi",
    definition:
      "Surat utang yang diterbitkan oleh pemerintah atau perusahaan. Pemegang obligasi menerima bunga (kupon) secara berkala dan pokok pinjaman dikembalikan pada tanggal jatuh tempo.",
    category: "fundamental",
    related: ["reksadana", "diversifikasi", "portfolio"],
  },
  {
    slug: "right-issue",
    term: "Right Issue",
    definition:
      "Penerbitan saham baru oleh perusahaan yang ditawarkan terlebih dahulu kepada pemegang saham lama secara proporsional. Harga right issue biasanya lebih rendah dari harga pasar.",
    category: "pasar",
    related: ["saham", "stock-split", "ipo"],
  },
  {
    slug: "stock-split",
    term: "Stock Split",
    definition:
      "Pemecahan saham yang menambah jumlah saham beredar dengan menurunkan nominal harga per lembar. Misalnya stock split 1:2 berarti 1 saham menjadi 2 saham dengan harga per saham setengahnya.",
    category: "pasar",
    related: ["saham", "right-issue", "lot", "market-cap"],
  },
  {
    slug: "capital-gain",
    term: "Capital Gain",
    definition:
      "Keuntungan yang diperoleh dari selisih antara harga jual dan harga beli suatu investasi. Capital gain merupakan salah satu sumber utama keuntungan berinvestasi di saham.",
    category: "fundamental",
    related: ["dividen", "saham", "portfolio", "take-profit"],
  },
  {
    slug: "portfolio",
    term: "Portfolio",
    definition:
      "Kumpulan seluruh investasi yang dimiliki oleh seorang investor. Portofolio yang baik terdiri dari berbagai instrumen yang terdiversifikasi untuk mengoptimalkan return dan meminimalkan risiko.",
    category: "strategi",
    related: ["diversifikasi", "watchlist", "reksadana", "saham"],
  },
  {
    slug: "watchlist",
    term: "Watchlist",
    definition:
      "Daftar saham yang dipantau secara berkala oleh investor atau trader. Watchlist membantu investor memantau pergerakan harga dan momen yang tepat untuk masuk atau keluar pasar.",
    category: "strategi",
    related: ["screener", "portfolio", "saham"],
  },
  {
    slug: "screener",
    term: "Screener",
    definition:
      "Alat untuk menyaring saham berdasarkan kriteria tertentu seperti harga, volume, PER, market cap, dan indikator teknikal lainnya. Screener membantu investor menemukan saham yang sesuai dengan strategi mereka.",
    category: "strategi",
    related: ["watchlist", "backtesting", "per", "volume"],
  },
  {
    slug: "backtesting",
    term: "Backtesting",
    definition:
      "Menguji strategi trading dengan menggunakan data harga historis untuk mengevaluasi performa strategi tersebut di masa lalu. Backtesting membantu trader memvalidasi strategi sebelum diterapkan secara real.",
    category: "strategi",
    related: ["paper-trading", "screener", "risk-reward-ratio"],
  },
  {
    slug: "paper-trading",
    term: "Paper Trading",
    definition:
      "Simulasi trading dengan uang virtual tanpa risiko finansial nyata. Paper trading cocok untuk pemula yang ingin belajar dan menguji strategi sebelum menggunakan uang sungguhan.",
    category: "strategi",
    related: ["backtesting", "day-trading", "swing-trading"],
  },
  {
    slug: "swing-trading",
    term: "Swing Trading",
    definition:
      "Gaya trading yang memegang posisi selama beberapa hari hingga beberapa minggu untuk menangkap pergerakan harga dalam swing (ayunan). Swing trader mengandalkan analisis teknikal untuk menentukan entry dan exit.",
    category: "strategi",
    related: ["day-trading", "support", "resistance", "trendline"],
  },
  {
    slug: "day-trading",
    term: "Day Trading",
    definition:
      "Gaya trading di mana semua posisi dibuka dan ditutup dalam hari yang sama. Day trader tidak memegang saham semalam (overnight) untuk menghindari risiko gap up/gap down.",
    category: "strategi",
    related: ["swing-trading", "volume", "candlestick", "gap-up"],
  },
];
