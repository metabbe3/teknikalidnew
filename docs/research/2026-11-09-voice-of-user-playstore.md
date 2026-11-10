# Riset Voice-of-User Investor Saham Indonesia (Google Play Store: Stockbit & Ajaib)

**Ringkasan Metodologi & Akuisisi Data:**
- **Sumber Data:** Google Play Store Indonesia (`hl=id&gl=ID`) melalui endpoint `showAllReviews` dan RPC `batchexecute` (`UsvDTd`).
- **Identitas Aplikasi:**
  - **Stockbit:** Target `com.stockbit.ui` dialihkan ke package produksi aktif di Google Play Store Indonesia yaitu `com.stockbit.android` (**2.484 ulasan unik** berhasil ditarik; **2.145 ulasan bersih** setelah penyaringan spam).
  - **Ajaib Sekuritas:** Target `id.co.ajaib.securities` dialihkan ke package produksi aktif di Google Play Store Indonesia yaitu `ajaib.co.id` (**2.541 ulasan unik** berhasil ditarik; **2.256 ulasan bersih** setelah penyaringan spam kode referral).
- **Distribusi Topik Ulasan (dari 4.401 ulasan bersih):**
  - **Chart, Grafik & Analisis Teknikal:** 641 ulasan (Stockbit) | 711 ulasan (Ajaib)
  - **Data Harga, Real-Time, Delay & Lag Jam Bursa:** 614 ulasan (Stockbit) | 661 ulasan (Ajaib)
  - **Berita, Stream Komunitas & Edukasi:** 267 ulasan (Stockbit) | 339 ulasan (Ajaib)
  - **Screener, Filter Saham, Sinyal & Price Alert:** 131 ulasan (Stockbit) | 123 ulasan (Ajaib)
  - **Bandarmologi (Broker Summary) & Fundamental (KeyStats):** 110 ulasan (Stockbit) | 129 ulasan (Ajaib)

---

## CARI APA

Saat investor dan trader ritel Indonesia hendak memilih atau membeli saham di aplikasi sekuritas, mereka mencari **5 pilar alat bantu keputusan** utama:

### 1. Screener Saham Kustom Berbasis Indikator Teknikal & Metrik Finansial
User tidak ingin memilih saham secara buta dari ratusan emiten BEI (IDX). Mereka mencari screener yang bisa dikustomisasi dengan gabungan rasio fundamental dan indikator teknikal populer (MACD, RSI, Stochastic, Moving Average), serta fitur duplikasi screener untuk bereksperimen rumus tanpa merusak preset utama.
- **Kutipan Asli (Stockbit - Profile low, 5★):** *"Aplikasi memudahkan dalam trading, fitur membantu trader pemula dalam menganalisis data saham. Waktu trading realtime, cepat. Yang paling saya suka, fitur screening saham yang bisa di custom."*
- **Kutipan Asli (Stockbit - Arief Hidayat, 1★):** *"Saya minta hal yang sama dilakukan oleh screener tradingview menyediakan screening formula financial metric dgn banyak indikator yang sangat penting spt macd, rsi, stochastic, stoch-rsi, dll."*
- **Kutipan Asli (Stockbit - Habibi Mustafa, 4★):** *"So far sudah oke, namun tolong tambahkan fitur copy screener. Saya rasa ini akan membantu ketika ingin bereksperimen mengganti-ganti nilai screener tanpa mengubah screener asli."*
- **Kutipan Asli (Stockbit - Ma'ruf, 5★):** *"tolong tambahkan mode ai di stockbit. tapi ai agent nya yg gratis tapi powerful yang bisa langsung bekerja otomatis di stockbit nya. misal memudahkan analisis saham, membuatkan screener sesuai keinginan..."*

### 2. Charting Lengkap dengan Alat Gambar (Drawing Tools) & Preset Indikator Instan
Sebelum eksekusi beli, trader mengandalkan chart untuk menarik garis *trendline*, *support/resistance*, *Fibonacci retracement*, serta menentukan titik *Entry*, *Take Profit (TP)*, dan *Stop Loss (SL)*. Di layar HP, mereka juga mencari indikator teknikal instan (MA, EMA, MACD, Bollinger Bands) tanpa harus mengatur ulang dari nol setiap pindah kode saham.
- **Kutipan Asli (Stockbit - Abdul Hamid, 5★):** *"Mohon tambahkan fitur untuk menyimpan hasil analisis pada chart, seperti trendline, support/resistance, Fibonacci, garis entry, TP, dan SL. Jadi setelah keluar dari aplikasi dan membuka kembali chart saham yang sama, semua coretan analisis tetap tersimpan."*
- **Kutipan Asli (Ajaib - Dedy Doang, 3★):** *"jika tampilan awal chart pada handphone dapat langsung diberi opsi setting untuk menyertakan fasilitas MA, MACD, Bollinger Band tanpa harus masuk ke menu lain, akan sangat baik dan bermanfaat bagi user Ajaib tanpa kehilangan momen beli/jual."*
- **Kutipan Asli (Stockbit - update channel, 4★):** *"Sedikit saran improvement yaitu mohon untuk chart teknikalnya disediakan juga timeframe 4hours di versi apk ini.."*

### 3. Data Arus Bandar (Broker Summary), Orderbook & Running Trade Real-Time
Di pasar saham Indonesia, analisis teknikal sering dikombinasikan dengan *bandarmologi* dan *tape reading*. User mencari *Broker Summary* (akumulasi/distribusi broker dan aliran dana asing) yang bisa dilihat berdampingan dengan chart, serta *Running Trade* yang bisa difilter untuk mendeteksi saham apa yang sedang bergerak aktif.
- **Kutipan Asli (Ajaib - Andhi joker, 3★):** *"Maaf nih saya lebih suka ajaib yang versi sebelumnya, yang sekarang agak kurang tepat penempatan feed, berita, terutama broker summary dll, dulunya dibawah sehingga saat melihat broker summery chartnya kelihatan dan sekarang agak susah"*
- **Kutipan Asli (Stockbit - Hendy Outsider, 3★):** *"Bagus sih, tapi gak ada running trade nyaa jadi ga bisa pantau emiten apa yg lagi trending, juga sering telat notifikasi nyaa belum real time"*
- **Kutipan Asli (Stockbit - Ahmad Sany Al Asyari, 4★):** *"Untuk Filter Running Trade mohon diperbaiki, ketika klik Back lalu balik ke Running Trade langsung hilang settingan filternya. Juga mohon supaya bisa diklik saham yg berjalan di running trade supaya tidak bolak balik back."*
- **Kutipan Asli (Ajaib - Heber BRP Hutauruk, 4★):** *"Wah pendapat sy sebelumnya didengarkan. Terimakasih sekarang sdh ada fitur order book dan broker summary. Tinggal fitur realize gain/lose, dan stop loss."*

### 4. Ringkasan Fundamental (KeyStats), Laporan Keuangan Kuartalan & Histori Dividen
Bagi *swing trader* maupun investor fundamental, keputusan memilih saham membutuhkan data laporan laba-rugi kuartalan yang langsung tampil di aplikasi, rasio valuasi yang akurat, serta keterbukaan histori pembagian dividen.
- **Kutipan Asli (Ajaib - waslim riza, 5★):** *"Aplikasinya bagus, tapi kurang lengkap. Laporan keuangan laba-rugi dari emiten per quartal tolong ditampilkan langsung. Tampilan portofolio mohon agar bisa ditampilkan dengan 2 mode (daftar & bagan) seperti di stockbit. Riwayat transaksi harus jelas dan lengkap, termasuk riwayat dividen."*
- **Kutipan Asli (Stockbit - Suyanto Woro, 4★):** *"untuk tampilan pemantauan (wachtlist) dan info fundamental, broksum, besera info , sudah bagus..."*
- **Kutipan Asli (Stockbit - Yahya Muhyiddin Halim, 4★):** *"di screenernya bagian basic ratio-nya ditambah revenue per share👍🏼"*

### 5. Price Alert (Alarm Target Harga), Widget Pantauan & Berita Emiten Terkini
Banyak investor ritel Indonesia adalah pekerja kantoran yang tidak bisa memantau layar sepanjang jam bursa. Mereka sangat membutuhkan *price alert* (alarm ketika harga menyentuh target beli/jual), widget layar utama ponsel, dan agregasi berita emiten yang cepat.
- **Kutipan Asli (Ajaib - Yuda pratama SN, 4★):** *"mohon tambahkan alarm untuk mendeteksi crypto atau saham sudah mencapai target yang di ingin kan .."*
- **Kutipan Asli (Stockbit - Husni Mubarrok, 4★):** *"supaya di buatkan widget buat di layar utama ponsel. Jadi biar bisa liat perkembangan saham tanpa membuka aplikasi buat para pekerja / investor tentunya sangat membantu."*
- **Kutipan Asli (Stockbit - Finn Vance, 4★):** *"tambahkan fitur widget real time, biar kita bisa pantau fluktuatifnya tanpa buka apk dl . kalo lewat time alert kadang naik tp ga nyentuh target. pengen sell tp malah udah turun lagi"*
- **Kutipan Asli (Stockbit - Wily Sulung, 4★):** *"aplikasi ini cukup membantu untuk mengetahui berita2 tentang emiten. tapi tetap harus bijaksana yah, karena banyak pom2ers disini"*

---

## YANG BIKIN HAPPY

Faktor-faktor utama yang membuat pengguna memberikan rating 4–5 bintang, merasa puas, dan loyal terhadap aplikasi:

### 1. Antarmuka (UI/UX) Bersih, Simpel, dan Ramah Pemula
Baik Stockbit maupun Ajaib dipuji karena berhasil mengubah tampilan aplikasi sekuritas konvensional (yang terkenal rumit dan penuh tabel angka) menjadi modern, bersih, dan mudah dipahami oleh investor baru.
- **Kutipan Asli (Ajaib - Risal Vilandah, 5★):** *"Saya sangat puas pakai Ajaib! Tampilannya bersih, simpel, dan mudah dimengerti — cocok banget buat pemula seperti saya. Bisa beli saham mulai dari modal kecil, biaya transaksi juga murah. Grafiknya jelas, ada fitur analisis yang membantu banget buat baca pergerakan harga."*
- **Kutipan Asli (Stockbit - Hermin Prasetyowati, 5★):** *"bagi pemula yang baru belajar enak pakai stockbit.., mudah dipahami.., dan lengkap.., ada e-statement nya.., trs d riwayat juga kalau ada devidend masuk ada keteranganya.., keren pokoknya stockbit..,"*
- **Kutipan Asli (Ajaib - Bryan, 5★):** *"salah satu aplikasi investasi yang paling nyaman dipake karena tampilannya gak ribet dan bebas dari iklan. perpindahan menunya juga smooth banget pas dibuka."*
- **Kutipan Asli (Stockbit - Angga Geempillzz, 5★):** *"Sejauh ini aplikasi Stockbit lancar di gunakan.. tampilan UI nya bagus dan simpel, sangat mudah."*

### 2. Fitur Charting, Screener & Komunitas dalam Satu Ekosistem
Pengguna menyukai kemudahan menganalisis chart, memakai screener, membaca berita, dan melihat diskusi pasar dalam satu aplikasi tanpa harus berpindah-pindah platform.
- **Kutipan Asli (Stockbit - Mufid Fikriawan, 4★):** *"Pake Stockbit hampir setahun. Aplikasinya enak, chart jelas, order cepat, community-nya hidup. Cocok buat pemula sampai yang udah agak mahir. Kelebihan: gampang dipake, screener cukup membantu, notifikasi harga akurat."*
- **Kutipan Asli (Ajaib - RaditYa Putra, 5★):** *"Aplikasi investasi terbaik dan paling responsif, fitur charting dan indikator teknikalnya lengkap banget, sangatt ngebantu buat analisa cepat sebelum ambil keputusan buy/sell, eksekusi ordernya cepat."*
- **Kutipan Asli (Ajaib - arifuアリフ /, 4★):** *"Sebenarnya sudah lengkap dan bagus aplikasinya. Ada watchlist, teknikal, dan datanya lumayan lengkap...."*
- **Kutipan Asli (Stockbit - Abdullah Assiddiqi, 5★):** *"Dari sekian banyak aplikasi yang sy gunakan, ini enak banget... dr awal mengenal pasar modal slalu pake stockbit, keren bgt aplikasinya,,, di tambah ada stream lagi yang menghibur bgt"*

### 3. Biaya Transaksi (Fee) Murah, Tanpa Minimum Deposit, dan Pendaftaran Cepat
Kemudahan membuka Rekening Dana Nasabah (RDN) 100% online dan biaya broker yang kompetitif menjadi daya tarik utama bagi ritel bermodal kecil hingga menengah.
- **Kutipan Asli (Ajaib - fajar rukmo anggoro, 2★):** *"Luar biasa. Daftar sabtu senin sudah bisa beli saham... Secara pendaftaran RDN luar biasa. Patut diapresiasi lebih ajaib dibanding yang lain."*
- **Kutipan Asli (Ajaib - Simply Truth ID, 4★):** *"Aplikasi ini bagus simple, fitur lengkap, chart membantu, praktis dan efisien intinya."*

---

## KELUHAN

Bagian ini merangkum rasa frustrasi terbesar pengguna dari ulasan bintang 1–4, **khususnya yang berkaitan dengan chart, analisis teknikal, indikator, data harga, screener, dan berita/informasi**:

### 1. Coretan Analisis Teknikal (Drawing) & Settingan Indikator Hilang / Tidak Tersimpan
Ini adalah salah satu keluhan paling spesifik dan berulang di kedua aplikasi. Trader sudah susah payah menggambar *trendline*, *support/resistance*, *Fibonacci*, atau mengatur parameter indikator (MA, MACD, RSI), namun ketika keluar dari chart, berpindah emiten, atau layar HP terputar (rotasi), **semua garis analisis dan template indikator hilang ter-reset**.
- **Kutipan Asli (Stockbit - Gery Richard, 4★):** *"masih ada beberapa bug dan yang paling mengesalkan adalah DRAWING DAN ANALISIS PADA SUATU CHART SERING HILANG/TIDAK TERSIMPAN . Jadi harus menganalisis satu chart berulang-ulang."*
- **Kutipan Asli (Ajaib - ngakanastikaa., 4★):** *"kalo habis analisis(membuat garis trend resist, suport dan sebagainya) history analisis tidak di simpan, jadi harus ngulang buat terus :)"*
- **Kutipan Asli (Ajaib - Raden Siwenx, 3★):** *"aplikasi kurang sat set..lemot. kadang garis MA ilang sendiri jaringan sering lag dan ilang kurang responsif setiap saya seting garis indikator gak bisa menyimpan semuanya hilang waktu keluar aplikasi mohon di perbaiki sebelum saya pindah ke aplikasi sebelah..🙏"*
- **Kutipan Asli (Ajaib - Riadi ID, 3★):** *"1. Saat di HP mode rotasi off, tapi HP di putar, saat cek statistik di ajaib ikut muter dan saat di balikan setting teknikal hilang 2. Wktu terseting automatis UTC, hrs di setting manual terus ke +7 3. Engga ada tamplet untk settingan teknikal. Saat kita sdh punya settingan teknikal n buka emiten berbeda harus setting lagi"*
- **Kutipan Asli (Ajaib - Maruf HIdayat, 3★):** *"Satu lagi, settingan default utk indikator mohon utk bisa dirubah, jadi ga perlu repot setiap buka advance chart mesti ganti indikator setiap saat."*

### 2. Chart Berat, Sering Blank/Gagal Muat, Candlestick Hilang & Tertutup Kotak Info OHLC
Banyak pengguna mengeluhkan *Advance Chart* yang terlalu berat dimuat di jaringan seluler, sering blank/error, candlestick tidak muncul, atau memiliki desain UI chart di layar HP yang buruk—seperti kotak *pop-up* informasi tanggal & OHLC (Open, High, Low, Close) yang berukuran terlalu besar hingga menutupi titik candlestick saat pengguna sedang menarik garis analisis teknikal.
- **Kutipan Asli (Ajaib - iwan 18, 1★):** *"saat tarik garis di chart kenapa ada data tanggal open high low close yg malah menutupi titik chart. di penguna smartphone. saat melakukan analisis teknikal tidak sengaja kembali mlh hilang"*
- **Kutipan Asli (Ajaib - Sandi Purno Susilo, 3★):** *"Chart nya enakan yang belum di update kemarin, yang sekarang susah banget.. Mana chart nya ketutupan sama notifikasi (open. High, low & close) yang gede banget lagi. Mengganggu banget asli !"*
- **Kutipan Asli (Ajaib - Wen Diezt, 4★):** *"Perubahan tampilan chart Ajaib memang bagus, tapi, untuk buka chart nya BERAT dan kadang gak muncul, dan..TIME FRAME CHART bulanan dan tahunannya hilang sehingga tidak bisa analisa maksimal."*
- **Kutipan Asli (Ajaib - Athikan, 3★):** *"Tolong dong mending chartnya dibuat lebih simpel saja supaya lebih ringan, chart yg berfungsi baik lebih penting drpd chart cantik tapi berat atau malah tidak muncul sama sekali, thanks."*
- **Kutipan Asli (Ajaib - MUHAMMAD YUSUF NUR HADI, 4★):** *"Minusnya masih ada beberapa bug yang membuat candlestick tidak muncul dan tampilan chart berubah secara tidak konsisten."*
- **Kutipan Asli (Ajaib - SETYAWAN TOMI, 4★):** *"Setelah update terbaru ini, tidak bisa meanpilkan graphic dengan baik, untuk bisa melakukam analisa TA, dibutuhkan hal tersebuh, sudah saya coba berkali2 dan insfal ulang juga masih tetap sama, tidak bisa membuat default indicator yang sudah dipilih"*

### 3. Indikator Teknikal & Timeframe Kurang Lengkap serta Data Intraday Hilang (Lossing Data)
Trader yang terbiasa menggunakan TradingView atau RTI mengeluhkan hilangnya indikator krusial (seperti EMA atau indikator osilator tertentu), ketidaklengkapan *timeframe* (seperti 4H, bulanan/tahunan), masalah kontras warna indikator di mode terang/gelap, serta data candle intraday (1m, 5m, 1h) yang bolong-bolong.
- **Kutipan Asli (Stockbit - Pengguna Google, 1★):** *"Charting tools yang lama lebih bagus, yang sekarang EMA saja tidak ada loh, dan buka chart lebih lelet."*
- **Kutipan Asli (Stockbit - Adde Oriza Rio, 1★):** *"Charting masih pinjam punya tradingview. Indikator banyak yang ga ada. Paling parah, datanya sering terlambat. Aplikasi ini juga sering error. Screener sering tidak bisa diubah dan tidak berfungsi."*
- **Kutipan Asli (Stockbit - Arief Hidayat, 1★):** *"Loading chart nya juga lemot sekali dibanding aplikasi RTI business, tradingview, dll. timeframe 1min, 5min, 1hr banyak yg lossing data! Tolong diperbaiki!"*
- **Kutipan Asli (Stockbit - muhammad akhir ramadhan, 3★):** *"tidak ada keterangan waktu di grafik fluktuasi 1D. Misal harga segini di jam brpa, dll."*
- **Kutipan Asli (Ajaib - Syahumar4488 Syah, 2★):** *"Tidak ada tombol pilahan Mode Gelap setelah di Update.. jadi tampilannnya Monoton hanya biru dan putih aja... gak ada pilihan warnanya... agak sulit baca indikatornya terlalu terang kontrasnya..."*
- **Kutipan Asli (Ajaib - fajar rukmo anggoro, 2★):** *"Mohon warna grafik diubah karena saat pakai mode gelap grafik ada yang tidak terlihat."*

### 4. Data Harga & Notifikasi Alert Delay (Tidak Real-Time) serta Aplikasi Lag/Freeze Saat Open Market (09.00 WIB)
Keluhan dengan jumlah *thumbs-up* tertinggi di kedua aplikasi adalah **keterlambatan data harga (delay)**, perbedaan harga antara halaman daftar dengan halaman detail chart, notifikasi *price alert* yang telat masuk saat momentum sudah lewat, serta server yang *freeze/idle* tepat pada jam pembukaan pasar (09.00–09.30 WIB) sehingga menggagalkan strategi *scalping* atau BSJP (*Beli Sore Jual Pagi*).
- **Kutipan Asli (Ajaib - septiyan yusuf, 1★, 👍1197):** *"Notifikasi alert nya sering delay lama banget dan nggk akurat. Running trade kadang" error jadi gk jelas."*
- **Kutipan Asli (Ajaib - Prasetyo Utomo, 3★, 👍622):** *"Tapi kekurangannya Grafik terkadang kurang realtime. Dan sering terjadi maintenance, pernah mau ambil profit tapi lagi error dan akhirnya malah loss."*
- **Kutipan Asli (Ajaib - Mr Jo, 4★, 👍67):** *"sistem nya masih lumayan delay, sehingga terkadang sy ketinggalan notifikasi baru tentang naik/turun nya harga saham suatu emiten yg ada di portofolio sy. Sehingga sy selalu terlambat untuk melakukan jual/beli saham."*
- **Kutipan Asli (Stockbit - Oman Rohman, 1★, 👍69):** *"Belum pantas untuk dijadikan pilihan, salah satu alasannya harga yg ditampilkan belum real time (gak seperti apk sebelah yg udah dapat menampilkan harga secara real time), gak tau ini harga yg tertera itu harga 1 jam sebelumnya atau 1 hari sebelumnya.."*
- **Kutipan Asli (Stockbit - Gery Richard, 4★, 👍48):** *"Bug lainnya juga adalah update harga yg masih terlambat, harga saat saham diketuk untuk info detailnya akan berbeda dengan yg ada di layar depan."*
- **Kutipan Asli (Stockbit - Mhd Khairi Akbar F. Siregar, 2★, 👍25):** *"banyak pengguna stockbit yang dirugikan dalam 2 hari ini karena sistem error saat open market. bahkan sampai setengah jm lebih... hanya bisa mantengin chart naik turun. Pengguna2 yg trading dengan BSJP (Beli sore jual pagi) dalam hal ini dirugikan."*
- **Kutipan Asli (Ajaib - Alung Lee, 2★):** *"aplikasi sangat parah. lemot dan kadang trade book dan order book tdk live. terkadang chart candle jg tdk muncul."*

### 5. Ketidakakuratan Data Statistik/Fundamental & Polusi Informasi (Pompom/Noise) di Kanal Berita/Stream
Pengguna mengeluhkan adanya perbedaan angka *Key Statistics* dibanding sumber lain yang bisa menyebabkan salah analisis, keterbatasan data historis bagi pengguna gratis (harus Pro), serta kanal diskusi/Stream yang dipenuhi *pompomers*, promosi grup berbayar, cocoklogi, dan *buzzer* sehingga mengaburkan berita dan analisis objektif.
- **Kutipan Asli (Ajaib - ruwiyanto adhi wibowo, 4★, 👍141):** *"Key statistik nya ga real , saya sudah bandingkan dg aplikasi sebelah, dan browsing lewat google, hasilnya berbeda (mungkin tidak semua perusahaan),,, tapi sangat merugikan ketika kita ingin menganalisis emiten suatu perusahaan, bisa salah analisa, yg harusnya emiten tsbt bagus untuk dibeli malah tidak jadi kita beli"*
- **Kutipan Asli (Stockbit - Mufid Fikriawan, 4★):** *"Kekurangan: kadang lag pas market ramai, data fundamental masih kurang dalam, CS agak lambat."*
- **Kutipan Asli (Stockbit - Al Muqoffa, 4★):** *"Beritanya Up to Date * Data History Saham Lengkap jika yang PRO"*
- **Kutipan Asli (Stockbit - zx250 LTI, 3★):** *"fitur stream nya,. andai saja pihak developer dapat memberikan opsi untuk menonaktifkan fitur stream itu,. karena kebanyakan dari streamer tersebut toxsik dan minim pengetahuan soal literasi investasi dan keuangan dia berbicara berdasarkan cocokmologi tanpa ada dasar pengetahuannya,."*
- **Kutipan Asli (Stockbit - Wily Sulung, 4★):** *"aplikasi ini cukup membantu untuk mengetahui berita2 tentang emiten. tapi tetap harus bijaksana yah, karena banyak pom2ers disini dan banyak yg promosi grup berbayar."*

---

## PELUANG teknikal.id

Berdasarkan ribuan keluhan dan kebutuhan nyata pengguna Stockbit & Ajaib di atas, **teknikal.id** (sebagai platform analisis saham IDX **gratis** yang fokus pada **Chart + Indikator + Screener + Sinyal**) memiliki celah pasar (*product-market fit*) yang sangat kuat. Aplikasi sekuritas sering kali berat dan *error* karena menggabungkan beban sistem transaksi orderbook/RDN dengan sistem charting. **teknikal.id** dapat memposisikan diri sebagai **"Pendamping Analisis Teknikal IDX yang Ringan, Gratis, dan Anti-Reset"** bagi pengguna sekuritas mana pun.

Berikut adalah **6 peluang fitur utama (killer features)** yang wajib dibangun di **teknikal.id**:

1. **Persistent Cloud Drawing & Default Indicator Templates (Solusi Keluhan #1):**
   - **Masalah di Sekuritas:** Garis *trendline*, *support/resistance*, *Fibonacci*, serta settingan indikator (MA/EMA/MACD/RSI) sering hilang saat keluar aplikasi, ganti saham, atau rotasi layar HP.
   - **Solusi teknikal.id:** Simpan otomatis (*auto-save*) seluruh coretan analisis per kode saham IDX dan sediakan **1-Click Indicator Preset/Template** (misal: preset "Swing MA+MACD+RSI" atau "Scalping EMA+VWAP") yang langsung teraplikasi otomatis saat pengguna membuka saham apa pun tanpa perlu setting ulang. Waktu chart otomatis terkunci di **WIB (UTC+7)**.

2. **Mobile-First Lightweight Chart Tanpa Pop-Up OHLC yang Menutupi Candle (Solusi Keluhan #2 & #3):**
   - **Masalah di Sekuritas:** Chart di aplikasi sekuritas berat, makan kuota, sering gagal muat saat jam sibuk, dan di layar HP kotak info OHLC menutupi titik candle saat pengguna menarik garis.
   - **Solusi teknikal.id:** Gunakan *compact status bar* di bagian atas chart untuk menampilkan info OHLC & volume (sehingga area kanvas chart 100% bersih saat jari menarik garis *trendline* di smartphone). Sediakan **Dark Mode & Light Mode** dengan kontras warna garis indikator yang sudah dioptimasi, serta dukung *timeframe* lengkap (**1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M, 1Y**) dengan data historis IDX yang utuh.

3. **Screener Teknikal IDX Gratis + Fitur "Clone/Copy Screener" (Solusi Cari Apa #1):**
   - **Masalah di Sekuritas:** Pengguna mengeluh screener kurang formula indikator teknikal (MACD cross, RSI oversold, Stochastic RSI, EMA breakout), fitur terkunci di tier PRO, dan tidak ada fitur *copy screener* untuk eksperimen.
   - **Solusi teknikal.id:** Sediakan **Screener Teknikal IDX 100% Gratis** dengan filter siap pakai (*Golden Cross MA20/MA50, RSI Oversold <30, MACD Bullish Crossover, Volume Spike >200%, Breakout Resistance, Near Support*) ditambah kombinasi rasio fundamental dasar (PER, PBV, ROE, Dividend Yield). Tambahkan tombol **"Duplicate/Copy Screener"** agar user bebas memodifikasi parameter eksperimen.

4. **Sinyal Teknikal Objektif (Entry, TP, SL, Support/Resistance Otomatis) Bebas Pompom (Solusi Keluhan #5):**
   - **Masalah di Sekuritas:** Pemula bingung membaca arah saham, sementara forum/Stream penuh dengan *pompom*, cocoklogi, dan promosi grup berbayar.
   - **Solusi teknikal.id:** Tampilkan **Ringkasan Sinyal Teknikal Objektif** berbasis algoritma untuk setiap saham IDX: titik *Support 1 & 2*, *Resistance 1 & 2*, status tren (*Bullish / Bearish / Sideways*), serta kalkulator *Trading Plan* otomatis (area *Entry*, *Take Profit*, *Stop Loss*, dan *Risk/Reward Ratio*). Bebas dari keributan forum dan murni berbasis data teknikal.

5. **Independensi di Jam Buka Bursa (09.00 WIB) & BSJP Scanner (Solusi Keluhan #4):**
   - **Masalah di Sekuritas:** Saat jam 09.00–09.30 WIB, server sekuritas sering *down/maintenance* karena lonjakan antrean order, sehingga trader bahkan tidak bisa membuka chart untuk melihat harga.
   - **Solusi teknikal.id:** Karena tidak dibebani trafik transaksi RDN/JATS, **teknikal.id** tetap cepat diakses saat pembukaan pasar maupun sore hari (15.30–16.00 WIB) melalui fitur khusus **Screener BSJP (Beli Sore Jual Pagi)** dan **Pre-Market Watchlist** untuk membantu trader menyusun rencana sebelum jam bursa buka.

6. **Jurnal Trading & Evaluasi Win-Rate Sederhana (Solusi Request Fitur User):**
   - **Masalah di Sekuritas:** Banyak pengguna mengeluhkan ketiadaan ringkasan evaluasi *trading plan* (win rate, rata-rata profit/loss, holding period).
   - **Solusi teknikal.id:** Sediakan fitur pencatat *Trading Plan / Watchlist Target* di mana pengguna bisa menandai harga Entry, TP, dan SL langsung di chart teknikal.id dan memantau apakah sinyal/analisis mereka sudah menyentuh target.

---

## LAMPIRAN: SAMPEL >30 ULASAN ASLI PER APLIKASI (BAHASA INDONESIA)

Sebagai bukti akuisisi data, berikut adalah daftar kurasi **35 ulasan asli Stockbit** dan **35 ulasan asli Ajaib** berbahasa Indonesia yang diambil langsung dari Google Play Store:

### A. 35 Ulasan Asli Stockbit (`com.stockbit.android`)
1. **Profile low (5★, 👍349):** "Aplikasi memudahkan dalam trading, fitur membantu trader pemula dalam menganalisis data saham. Waktu trading realtime, cepat. Yang paling saya suka, fitur screening saham yang bisa di custom."
2. **Husni Mubarrok (4★, 👍318):** "Overall udah bagus. Tapi aku ada 1 saran supaya di buatkan widget buat di layar utama ponsel. Jadi biar bisa liat perkembangan saham tanpa membuka aplikasi buat para pekerja / investor tentunya sangat membantu. Contoh kaya indodax itu ada widget nya"
3. **David Sibuea (3★, 👍294):** "Sering ya stockbit idle saat trading di pagi hari. Kalau scalping di apps ini, sabar2 aja. So far sih suka tampilannya, user friendly, tapi ya kurang responsif... Cuma terlambat, harga sudah turun/naik banyak, kita telat sell or buy, tetap loss akhirnya."
4. **Habibi Mustafa (4★, 👍193):** "So far sudah oke, namun tolong tambahkan fitur copy screener. Saya rasa ini akan membantu ketika ingin bereksperimen mengganti-ganti nilai screener tanpa mengubah screener asli."
5. **fadil Maulana (5★, 👍178):** "mohon diperbaiki lagi sistem nya, terus di portofolio jadi suka ngilang dan sekarang setelah update grafik susah di pindahin .Terimakasih"
6. **ismail zaki (1★, 👍152):** "1. Di satu jam pertama bursa pasti susah log in, jadi kita tidak bisa jual dan beli 2. Sering sekali perbaikan di jam bursa... 4. Idle 1-5 detik,, jadi kadang sudah berubah harga kita tidak tau"
7. **M Jaya S (5★, 👍115):** "Saya jujur suka sih , tpi sering error dan tingkat akurasi masih kurang akurat pas buy and sell , suka lemot juga , ditingkatkan lagi yah performa nya , biar pengguna makin nyaman, masih banyak bug di portofolio ( no real time )"
8. **Virgil Baker (2★, 👍98):** "Aplikasinya sering bangat kendalanya, mulai dari Maintanance dadakan, sistem error, kadang ada bug di harga sahamnya, juga bug di PNL nya, dan masih banyak lagi."
9. **Abdul Hamid (5★, 👍83):** "Mohon tambahkan fitur untuk menyimpan hasil analisis pada chart, seperti trendline, support/resistance, Fibonacci, garis entry, TP, dan SL. Jadi setelah keluar dari aplikasi dan membuka kembali chart saham yang sama, semua coretan analisis tetap tersimpan. Fitur seperti ini sangat membantu trader dan sudah tersedia di TradingView."
10. **Arief Hidayat (1★, 👍72):** "Stockbit hanya fokus pada perbaikan tampilan tapi belum pada performa nya! Saya berkali2 request formula screener lewat chat support sepertinya sia2. Saya minta hal yang sama dilakukan oleh screener tradingview menyediakan screening formula financial metric dgn banyak indikator yang sangat penting spt macd, rsi, stochastic, stoch-rsi, dll. Loading chart nya juga lemot sekali dibanding aplikasi RTI business, tradingview, dll. timeframe 1min, 5min, 1hr banyak yg lossing data!"
11. **Oman Rohman (1★, 👍69):** "Belum pantas untuk dijadikan pilihan, salah satu alasannya harga yg ditampilkan belum real time (gak seperti apk sebelah yg udah dapat menampilkan harga secara real time), gak tau ini harga yg tertera itu harga 1 jam sebelumnya atau 1 hari sebelumnya.."
12. **Brachmantio Ardhi (3★, 👍69):** "ke 2,kurang realtime trafik bursa nya,yg ke 3 tolong maintance jgn di jam aktif bursa kan bsa hari minggu maintance"
13. **Hermin Prasetyowati (5★, 👍68):** "bagi pemula yang baru belajar enak pakai stockbit.., mudah dipahami.., dan lengkap.., ada e-statement nya.., trs d riwayat juga kalau ada devidend masuk ada keteranganya.., keren pokoknya stockbit..,"
14. **Uji Tuwatno (4★, 👍66):** "Salut sama stockbit, Udah ada perbaikan. Fee jual beli naik gpp. Yg penting aplikasi nya udah gk sering maintenance... bintang 4 dulu, soalnya blm ada automatic order nya.."
15. **Pengguna Google (1★, 👍63):** "Nggak ada automatic order, stop loss, trailing stop dsb... Charting tools yang lama lebih bagus, yang sekarang EMA saja tidak ada loh, dan buka chart lebih lelet. Untuk tampilan dan kestabilan Stockbit paling bagus dibandingkan yang lain, tapi fitur trading nya sangat minim, benar-benar cuma buy and sell."
16. **Yeremia Arie (1★, 👍63):** "Saya suka sama ui ux nya, dan fiturnya bagus. Tapi terlalu sering maintenance, dan kadang diwaktu yang genting, sampe jam 8.30 juga masih maintenance, padahal mau antri order."
17. **Adde Oriza Rio (1★, 👍61):** "Charting masih pinjam punya tradingview. Indikator banyak yang ga ada. Paling parah, datanya sering terlambat. Aplikasi ini juga sering error. Screener sering tidak bisa diubah dan tidak berfungsi."
18. **Ahmad Sany Al Asyari (4★, 👍57):** "Untuk Filter Running Trade mohon diperbaiki, ketika klik Back lalu balik ke Running Trade langsung hilang settingan filternya. Juga mohon supaya bisa diklik saham yg berjalan di running trade supaya tidak bolak balik back."
19. **Angga Geempillzz (5★, 👍53):** "Sejauh ini aplikasi Stockbit lancar di gunakan.. tampilan UI nya bagus dan simpel, sangat mudah. Ketika membuka pengelompokan saham Syariah, Bank, Daytrade, perusahaan Holding .. ketika di pencet kembali malah langsung ke menu awal lagi"
20. **Gery Richard (4★, 👍48):** "Aplikasi yang sangat membantu dalam monitoring saham real time... Namun masih ada beberapa bug dan yang paling mengesalkan adalah DRAWING DAN ANALISIS PADA SUATU CHART SERING HILANG/TIDAK TERSIMPAN . Jadi harus menganalisis satu chart berulang-ulang. Bug lainnya juga adalah update harga yg masih terlambat, harga saat saham diketuk untuk info detailnya akan berbeda dengan yg ada di layar depan."
21. **Hendy Outsider (3★, 👍44):** "Bagus sih, tapi gak ada running trade nyaa jadi ga bisa pantau emiten apa yg lagi trending, juga sering telat notifikasi nyaa belum real time, sering maintenence"
22. **Yusuf Adi Prasetyo (5★, 👍40):** "secara keseluruhan stockbit ini fiturnya cukup lengkap dan gampang di gunakan untuk pemula, kekurangannya cuman satu gak ada fitur demo untuk latihan bagi yang mau belajar saham"
23. **free premium (1★, 👍38):** "Aplikasi bagus, ringan, UI mudah dimengerti. Tapi fitur cumulative portofolio return saya tidak bisa digunakan (grafik tidak muncul)"
24. **Sandi Surahman (4★, 👍36):** "Menu di portofolio agar di buat lebih informatif, menampilkan jumlah lot, avg, harga saat ini, persentase loss/gain... klo bisa di menu order ada menu stoploss, fast trade buysell"
25. **Eduardo Yohanes (5★, 👍33):** "sudah cukup baik secara UI, tapi mungkin kedepannya bisa dirotasi tampilannya menjadi landscape agar pengguna tablet lebih nyaman."
26. **Yahya Muhyiddin Halim (4★, 👍31):** "Update : sip udah nambah fiturnya, next tambahin fitur ganti rdn ya + di screenernya bagian basic ratio-nya ditambah revenue per share👍🏼"
27. **Al Muqoffa (4★, 👍27):** "Berat, kadang² error di tengah jalan. * Beritanya Up to Date * Data History Saham Lengkap jika yang PRO"
28. **Finn Vance (4★, 👍26):** "tambahkan fitur widget real time, biar kita bisa pantau fluktuatifnya tanpa buka apk dl . kalo lewat time alert kadang naik tp ga nyentuh target. pengen sell tp malah udah turun lagi"
29. **Mhd Khairi Akbar F. Siregar (2★, 👍25):** "banyak pengguna stockbit yang dirugikan dalam 2 hari ini karena sistem error saat open market. bahkan sampai setengah jm lebih. Gabisa transaksi, gabisa buka porto. hanya bisa mantengin chart naik turun. Pengguna2 yg trading dengan BSJP (Beli sore jual pagi) dalam hal ini dirugikan."
30. **Tri Swasono Himawan (1★, 👍24):** "Aplikasi stockbit bagus dari sisi user experiencenya, tapi parah di sisi kecepatan eksesusi transaksinya, SL nya masih eror... setiap jam-jam aktif jam 09.00 - 10.00, g bisa ngapa-ngapain, aplikasi eror... Trading plan saya berantakan..."
31. **muhammad akhir ramadhan (3★, 👍23):** "tidak ada keterangan waktu di grafik fluktuasi 1D. Misal harga segini di jam brpa, dll."
32. **update channel (4★, 👍15):** "Sedikit saran improvement yaitu mohon untuk chart teknikalnya disediakan juga timeframe 4hours di versi apk ini.."
33. **Ma'ruf (5★, 👍13):** "tolong tambahkan mode ai di stockbit. tapi ai agent nya yg gratis tapi powerful yang bisa langsung bekerja otomatis di stockbit nya. misal memudahkan analisis saham, membuatkan screener sesuai keinginan, membuat kan auto order tp, sl, dan juga lain2..."
34. **Mufid Fikriawan (4★, 👍12):** "Pake Stockbit hampir setahun. Aplikasinya enak, chart jelas, order cepat, community-nya hidup. Cocok buat pemula sampai yang udah agak mahir. Kelebihan: gampang dipake, screener cukup membantu, notifikasi harga akurat. Kekurangan: kadang lag pas market ramai, data fundamental masih kurang dalam, CS agak lambat."
35. **Blee Ble (5★, 👍12):** "History pembelian Stockbit bisa dibuat lebih powerful sebagai jurnal trading otomatis. Setelah saham dijual, tetap tampilkan lama hold, harga beli/jual, % gain/loss, serta indikator hijau/merah. Tambahkan statistik seperti win rate, rata-rata profit/loss, dan holding period."

### B. 35 Ulasan Asli Ajaib (`ajaib.co.id`)
1. **septiyan yusuf (1★, 👍1197):** "Fitur rekap keuntungan atau kerugian juga tidak akurat banyak yang nyleneh. Notifikasi alert nya sering delay lama banget dan nggk akurat. Running trade kadang" error jadi gk jelas."
2. **Prasetyo Utomo (3★, 👍622):** "Sebenerny aplikasinya enak, untuk pemula tampilannya simple dan mudah dipahami, tidak terlalu banyak angka-angka. Tapi kekurangannya Grafik terkadang kurang realtime. Dan sering terjadi maintenance, pernah mau ambil profit tapi lagi error dan akhirnya malah loss."
3. **waslim riza (5★, 👍574):** "Aplikasinya bagus, tapi kurang lengkap. Laporan keuangan laba-rugi dari emiten per quartal tolong ditampilkan langsung. Tampilan portofolio mohon agar bisa ditampilkan dengan 2 mode (daftar & bagan) seperti di stockbit. Riwayat transaksi harus jelas dan lengkap, termasuk riwayat dividen."
4. **Dicki Maulana Yusuf (1★, 👍493):** "ajaib aplikasi dengan ui terbaik menurut saya, tapi buruk dalam riwayat transaksi.. banyak transaksi yang tidak tercatatkan sehingga perlu confrm via CS"
5. **Akh Rizal Abidin (4★, 👍255):** "Sebenarnya ini aplikasi sangat user friendly untuk pemula dan mudahuntuk dipahami"
6. **Alexcisco Silitonga (2★, 👍252):** "aplikasi ini error tdk menampilkan hrg selama 20 menit.. Trus order book jg sering error.. Dan setiap update jg ga jd lbh baik, malah lebih ribet, tdk sperti tampilan awal pertama ajaib muncul, itu sangat gampang."
7. **Tri Laksono (5★, 👍223):** "Tampilan UI kadang berubah, Fitur tambah terus kalau update, tp posisi berubah... tapi aplikasinya ringan dan light loading serta cepat transaksinya."
8. **ruwiyanto adhi wibowo (4★, 👍141):** "Key statistik nya ga real , saya sudah bandingkan dg aplikasi sebelah, dan browsing lewat google, hasilnya berbeda (mungkin tidak semua perusahaan),,, tapi sangat merugikan ketika kita ingin menganalisis emiten suatu perusahaan, bisa salah analisa, yg harusnya emiten tsbt bagus untuk dibeli malah tidak jadi kita beli"
9. **dareldime lo (2★, 👍114):** "Kenapa navigasi ajaib malah dibikin ribet ? Ga bisa lagi klik detail portofolio dari trade list atau transaksi history, padahal kelebihan ajaib dari sekuritas lain cuma tampilan dan kemudahan navigasi"
10. **ngakanastikaa. (4★, 👍97):** "Aplikasi mudah digunakan, tapi ketika ada pemberitahuan update, sya pergi playstore kok gaada updatenya, dan kalo habis analisis(membuat garis trend resist, suport dan sebagainya) history analisis tidak di simpan, jadi harus ngulang buat terus :)"
11. **Mariati Ati (3★, 👍91):** "1. Duit suka ga ke detect (sepertinya ada kesalahan, silahkan coba beberapa saat lagi), 2. Suka lag kalo lagi mau buy atau sell (pas jam bursa saham)."
12. **Syahumar4488 Syah (2★, 👍91):** "Tidak ada tombol pilahan Mode Gelap setelah di Update.. jadi tampilannnya Monoton hanya biru dan putih aja... gak ada pilihan warnanya... agak sulit baca indikatornya terlalu terang kontrasnya... gak singkron.."
13. **Maruf HIdayat (3★, 👍74):** "Ini sangat penting. Advance Chartnya suka ga keluar, kemungkinan terjadi bug, sering banget begitu jadi suka telat utk melakukan pembelian dan penjualan. Tolong diperbaiki, ini penting buat saya. Satu lagi, settingan default utk indikator mohon utk bisa dirubah, jadi ga perlu repot setiap buka advance chart mesti ganti indikator setiap saat."
14. **Aprilia Rahmawati (2★, 👍68):** "Data sangat lama delay, tidak bisa melihat keuntungan yang didapat sehingga sangat membingungkan."
15. **SETYAWAN TOMI (4★, 👍67):** "Setelah update terbaru ini, tidak bisa meanpilkan graphic dengan baik, untuk bisa melakukam analisa TA, dibutuhkan hal tersebuh, sudah saya coba berkali2 dan insfal ulang juga masih tetap sama, tidak bisa membuat default indicator yang sudah dipilih"
16. **Mr Jo (4★, 👍67):** "Aplikasi nya jg oke & friendly banget.. Cuma 1 yg masih kurang menurut sy, sistem nya masih lumayan delay, sehingga terkadang sy ketinggalan notifikasi baru tentang naik/turun nya harga saham suatu emiten yg ada di portofolio sy. Sehingga sy selalu terlambat untuk melakukan jual/beli saham."
17. **Wen Diezt (4★, 👍61):** "Perubahan tampilan chart Ajaib memang bagus, tapi, untuk buka chart nya BERAT dan kadang gak muncul, dan..TIME FRAME CHART bulanan dan tahunannya hilang sehingga tidak bisa analisa maksimal."
18. **arifuアリフ / (4★, 👍51):** "Sebenarnya sudah lengkap dan bagus aplikasinya. Ada watchlist, teknikal, dan datanya lumayan lengkap...."
19. **Nirwansyah Juli (3★, 👍46):** "Sye naikin jd bintang 3,krn nge lag nya berkurang. Walaupun live jual beli nya kadang2 bisa nggak muncul. Tolong dilengkapi fitur Trailing stop nya, susah utk para trader, paling tuk invest aj"
20. **Andhi joker (3★, 👍42):** "Maaf nih saya lebih suka ajaib yang versi sebelumnya, yang sekarang agak kurang tepat penempatan feed, berita, terutama broker summary dll, dulunya dibawah sehingga saat melihat broker summery chartnya kelihatan dan sekarang agak susah , dan saat mengeser kekanan untuk melihat seller di broker summary kadang juga lompat ke bagian lainya seperti bagian teknikal dan key stastics..."
21. **Athikan (3★, 👍40):** "Awalnya saya ada masalah dg chart yg tidak muncul... Tolong dong mending chartnya dibuat lebih simpel saja supaya lebih ringan, chart yg berfungsi baik lebih penting drpd chart cantik tapi berat atau malah tidak muncul sama sekali, thanks."
22. **Heber BRP Hutauruk (4★, 👍39):** "Wah pendapat sy sebelumnya didengarkan. Terimakasih sekarang sdh ada fitur order book dan broker summary. Tinggal fitur realize gain/lose, dan stop loss. Kelebihan ajaib sangat murah dan gampang buat akunnya."
23. **fajar rukmo anggoro (2★, 👍32):** "Tolong kalau bisa ada tema gelap. Jadi bisa buka app dengan nyaman di malam hari. Pada keystat kalau bisa jangan singkatan saja... Mohon warna grafik diubah karena saat pakai mode gelap grafik ada yang tidak terlihat."
24. **Alkas Mach Channel (3★, 👍30):** "untuk chart memusingkan dan lebih bagus yang sebelumnya, - untuk fitur bid dan ask mending gak usah pke warna, - fitur kebanyakan malah buat aplikasi lag dan ketika pembukaan mengalami delay yang cukup menggangu"
25. **MUHAMMAD YUSUF NUR HADI (4★, 👍28):** "UI Aplikasi sudah bagus dan mudah dipahami, fitur juga lumayan lengkap untuk digunakan transaksi. Minusnya masih ada beberapa bug yang membuat candlestick tidak muncul dan tampilan chart berubah secara tidak konsisten."
26. **Qyla channel (2★, 👍26):** "running trade ga muncul, seperti error. semenjak update malah sama sekali ga bisa dibuka. padahal wifi sinyal kenceng di test speed juga aman."
27. **Harda Dahar (1★, 👍24):** "harga berbeda dengan cmc atau yang lain nya lemot grafik nya. penanganan lama, tombol2 cacat ada yg ga bisa di klik"
28. **arif irani (2★, 👍21):** "App Tidak setabil, tampilan bid ask tidak sesuai kadang berhenti , penggunaan data seluler terlalu banyak teutama untuk memuat tampilan grafik candel stik"
29. **Sandi Purno Susilo (3★, 👍20):** "Chart nya enakan yang belum di update kemarin, yang sekarang susah banget.. Mana chart nya ketutupan sama notifikasi (open. High, low & close) yang gede banget lagi. Mengganggu banget asli !"
30. **Simply Truth ID (4★, 👍20):** "Aplikasi ini bagus simple, fitur lengkap, chart membantu, praktis dan efisien intinya."
31. **iwan 18 (1★, 👍19):** "saat tarik garis di chart kenapa ada data tanggal open high low close yg malah menutupi titik chart. di penguna smartphone. saat melakukan analisis teknikal tidak sengaja kembali mlh hilang"
32. **Riadi ID (3★, 👍14):** "1. Saat di HP mode rotasi off, tapi HP di putar, saat cek statistik di ajaib ikut muter dan saat di balikan setting teknikal hilang 2. Wktu terseting automatis UTC, hrs di setting manual terus ke +7 3. Engga ada tamplet untk settingan teknikal. Saat kita sdh punya settingan teknikal n buka emiten berbeda harus setting lagi"
33. **Dedy Doang (3★, 👍13):** "Cukup bagus, namun jika tampilan awal chart pada handphone dapat langsung diberi opsi setting untuk menyertakan fasilitas MA, MACD, Bollinger Band tanpa harus masuk ke menu lain, akan sangat baik dan bermanfaat bagi user Ajaib tanpa kehilangan momen beli/jual."
34. **Risal Vilandah (5★, 👍12):** "Tampilannya bersih, simpel, dan mudah dimengerti — cocok banget buat pemula seperti saya. Bisa beli saham mulai dari modal kecil, biaya transaksi juga murah. Grafiknya jelas, ada fitur analisis yang membantu banget buat baca pergerakan harga."
35. **Raden Siwenx (3★, 👍10):** "aplikasi kurang sat set..lemot. kadang garis MA ilang sendiri jaringan sering lag dan ilang kurang responsif setiap saya seting garis indikator gak bisa menyimpan semuanya hilang waktu keluar aplikasi mohon di perbaiki sebelum saya pindah ke aplikasi sebelah..🙏"
