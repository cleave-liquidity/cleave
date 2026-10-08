# YELTRA Launch Film (Remotion) — Handoff

Film peluncuran YELTRA berdurasi 30 detik, dibuat dengan [Remotion](https://www.remotion.dev). Dokumen ini menjelaskan cara menjalankan, merender, dan mengubahnya.

| | |
|---|---|
| Composition ID | `YeltraLaunchFilm` |
| Ukuran | 1920 × 1080 (16:9) |
| Frame rate | 30 fps |
| Durasi | 900 frame = 30,0 detik |
| Remotion | 4.0.534 (React 19, TypeScript) |
| Output | `remotion/out/yeltra-launch-film.mp4` (H.264 + AAC stereo, ±19 MB) |

Project ini **terisolasi** di folder `remotion/` dengan `package.json` dan `node_modules` sendiri. Aplikasi Next.js tidak mengimpor apa pun dari sini, dan sebaliknya. Folder ini juga dikecualikan dari `tsconfig.json` dan `eslint.config.mjs` di root, dan `remotion/out/` masuk `.gitignore`.

---

## 1. Cara pakai cepat

Semua perintah dijalankan dari dalam folder `remotion/`.

```bash
cd remotion
bun install            # sekali saja (npm / pnpm juga bisa)

bun run studio         # preview interaktif di browser (scrub timeline, play, edit lalu hot reload)
bun run render         # render penuh → out/yeltra-launch-film.mp4
bun run still          # satu frame (default frame 0) → out/still.png
bun run typecheck      # cek tipe
```

Render satu frame tertentu:

```bash
bunx remotion still src/index.ts YeltraLaunchFilm out/frame-450.png --frame=450
```

### Kalau Remotion mencoba mengunduh Chrome / gagal menemukan browser

Pakai Chrome yang sudah ada di mesin:

```bash
bunx remotion render src/index.ts YeltraLaunchFilm out/yeltra-launch-film.mp4 \
  --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --concurrency 4
```

Render penuh memakan sekitar 1,5 menit di laptop biasa. `ffmpeg` tidak perlu dipasang terpisah. Remotion membawa sendiri, dan bisa dipanggil lewat `bunx remotion ffmpeg` / `bunx remotion ffprobe`.

### Catatan font

Font (Geist, Geist Mono, Caveat) dimuat lewat `@remotion/google-fonts`, jadi **render pertama butuh koneksi internet**. Jangan pakai karakter `…` di teks monospace karena Geist Mono tidak punya glyph itu dan tampil sebagai `_`. Pakai `...`.

---

## 2. Isi film (storyboard)

Satu perjalanan visual yang menerus tanpa hard cut. Antar-scene tumpang tindih 8 frame (`LEAD`), jadi setiap pergantian adalah gerakan kamera melewati geometri yang sama.

| Detik | Frame | Scene | Isi |
|---|---|---|---|
| 00–03 | 0–90 | **Interrupt** | Garis oranye menggambar kurva yield, angka 5.2% / 7.8% / 11.4% muncul, freeze. "YIELD SHOULDN'T JUST SIT THERE." berubah jadi "TRADE IT." |
| 03–06 | 90–180 | **YELTRA Reveal** | Garis menekuk jadi orbit, titik jadi planet (logo asli), wordmark "YELTRA" dan "Yield, made tradable.", kamera menembus orbit. |
| 06–11 | 180–330 | **Yield Markets** | Market Explorer terisi 7 baris, banyak market menyatu ke satu layer, satu baris terbuka, kamera menyelam ke kurvanya. "DISCOVER YIELD." → "YELTRA MARKETS." |
| 11–16 | 330–480 | **Fixed Yield** | Kurva bergerak ditangkap garis strike dan menjadi rata, angka berhenti, timeline jatuh tempo terkunci. Warna biru/cyan. "FIXED YIELD." → "LOCK THE RATE." |
| 16–21 | 480–630 | **Trading Yield** | Garis lepas bebas di dalam antarmuka aktif (skenario Rate Drops/Now/Rises, exposure). Warna oranye. "TRADING YIELD." → "TRADE WHAT YIELD DOES NEXT." |
| 21–25 | 630–750 | **Dividend Earn** | Event distribusi di sebuah rail terhubung ke posisi. Modul Dividend Earn terbuka **di dalam** frame Trading Yield. |
| 25–30 | 750–900 | **System + lockup** | Markets, Fixed, Trading (dengan Dividend Earn di dalamnya) berkumpul jadi satu sistem, runtuh ke planet, lalu lockup: "YELTRA / YIELD YOU CAN TRADE. / LOCK IT. TRADE IT. ENHANCE ELIGIBLE POSITIONS. / ROBINHOOD CHAIN · yeltra.tech", lalu fade ke hitam. |

---

## 3. Struktur folder

```
remotion/
├── package.json · tsconfig.json · remotion.config.ts   # setup (H.264, CRF 14, yuv420p)
├── public/
│   ├── logo.png                    # salinan logo planet YELTRA asli (dari /public/logo.png)
│   └── audio/yeltra-score.wav      # score hasil generate (jangan edit manual)
├── scripts/
│   ├── make-audio.py               # generator audio (lihat §5)
│   ├── stills.mjs                  # render beberapa frame untuk review
│   └── sheet.py                    # contact sheet dari hasil stills.mjs (butuh Pillow)
└── src/
    ├── index.ts                    # registerRoot
    ├── Root.tsx                    # <Composition id="YeltraLaunchFilm" .../>
    ├── YeltraLaunchFilm.tsx        # menyusun 7 scene + <Audio>
    ├── styles/
    │   ├── tokens.ts               # warna, font, batas scene (B), alamat kontrak asli
    │   └── motion.ts               # easing, seg(), lerp(), snapDecay, tickValue, srand
    ├── components/                 # komponen animasi bersama (lihat §4)
    └── scenes/                     # satu file per scene + marketData.ts
```

---

## 4. Cara kerja kode

### Scene dan waktu

Setiap scene dibungkus `<Scene from dur lead tail ...>` ([`components/Scene.tsx`](src/components/Scene.tsx)). Di dalamnya, `useScene()` mengembalikan `{ t, dur }`:

- `t = 0` adalah **awal nominal scene** (mis. frame 330 untuk Fixed Yield).
- `t` boleh negatif sampai `-lead`, yaitu saat scene mulai fade-in di atas scene sebelumnya.
- Scene yang keluar hanya men-scale/blur, tidak pernah fade, supaya tidak ada dip hitam.

Semua animasi ditulis sebagai fungsi dari `t` memakai helper di `styles/motion.ts`, misalnya `seg(t, 20, 40)` yang menghasilkan progress 0→1 antara `t = 20` dan `t = 40`. Jadi **semua angka timing di dalam scene adalah frame relatif terhadap awal scene**, bukan frame absolut film.

Batas scene ada di satu tempat, `B` di `styles/tokens.ts`:

```ts
export const B = { interrupt: 0, reveal: 90, markets: 180, fixed: 330,
                   trading: 480, dividend: 630, system: 750, end: 900 } as const;
```

> Mengubah `B` menggeser scene, tapi **tidak** mengubah durasi total. Kalau total durasi berubah, ubah `DURATION` di `tokens.ts` dan `durationInFrames` di `Root.tsx`, dan **generate ulang audio** (§5).

### Komponen bersama (`src/components/`)

| Komponen | Fungsi |
|---|---|
| `Scene` | Pembungkus scene, tumpang tindih, `useScene()` |
| `TechGrid` | Grid teknis latar |
| `YieldCurve` | Kurva yield (tiga gelombang sinus → path Bezier), parameter `amp`, `phase`, `progress` |
| `HandDrawnLine` | Garis/panah/catatan ala sketsa dengan jitter ber-seed (`HandNote` memakai font Caveat) |
| `KineticText` / `DecodeText` | Teks kinetik per huruf / efek decode noise |
| `TechnicalLabel` | Label monospace yang mengetik sendiri. `uppercase={false}` untuk alamat/domain. `IllustrativeTag` = catatan "Illustrative rates · not live data" |
| `YeltraLogo` | `YeltraMark` (planet asli) dan `YeltraWordmark` |
| `OrbitSystem` | Cincin orbit di sekitar planet |
| `ProductFrame` | Frame UI bergaya produk YELTRA (header, status, sudut braket) |
| `MarketRow` | Baris Market Explorer |

### Deterministik

Render harus identik di setiap run. Karena itu **jangan pakai `Math.random()`**. Pakai `srand("seed")` dari `motion.ts` atau `random()` dari Remotion. Hanya SVG/CSS/primitif Remotion yang dipakai, tanpa library animasi tambahan.

### Preview scene tertentu

Di Studio, pakai timeline untuk lompat ke frame awal scene. Untuk review banyak frame sekaligus tanpa membuka Studio:

```bash
bun scripts/stills.mjs 44 66 112 384 720 834      # → out/f044.png, f066.png, ... (skala 0,5)
python3 scripts/sheet.py out/sheet.png 44 66 112 384   # contact sheet 2 kolom
```

`stills.mjs` membaca path Chrome dari env `CHROME_PATH` (default: Chrome macOS standar).

---

## 5. Audio

Film punya score **sintesis**, tanpa sample dan tanpa lisensi pihak ketiga. File dibuat oleh [`scripts/make-audio.py`](scripts/make-audio.py) (Python + numpy, deterministik) menjadi `public/audio/yeltra-score.wav` (44,1 kHz, stereo, tepat 30 detik), lalu dipasang lewat satu baris `<Audio src={staticFile("audio/yeltra-score.wav")} />` di `YeltraLaunchFilm.tsx`.

Setiap bunyi ditempatkan **berdasarkan nomor frame** (`add(T(384), ...)`), disalin dari file scene, supaya jatuh tepat di visualnya. Contoh: hantaman "TRADE IT." di frame 66, "snap" Fixed Yield di frame 384, chime "ELIGIBLE" di frame 720, pulse sistem di frame 834. Trading Yield memakai beat 120 bpm, yaitu 15 frame per beat.

```bash
python3 scripts/make-audio.py      # generate ulang WAV (± 2 detik; butuh numpy)
```

**Kalau timing visual diubah**, frame yang bersangkutan di `make-audio.py` harus disesuaikan juga. Kalau tidak, bunyi akan bergeser dari gambarnya.

Mengganti dengan musik/SFX sendiri: timpa `public/audio/yeltra-score.wav` dengan file 30 detik, atau ubah `src` di `<Audio>`. Untuk render tanpa suara, hapus/komentari baris `<Audio>`, atau render dengan `--muted`.

Mengatur level: di akhir `make-audio.py`, `mix / peak * 0.72` menentukan level puncak, dan argumen `gain` di tiap `add(...)` menentukan volume per bunyi.

---

## 6. Mengubah konten

| Yang mau diubah | Di mana |
|---|---|
| Warna dan font | `src/styles/tokens.ts` (`C`, `FONT`). Nilainya disalin dari token brand di `tailwind.config.ts`, jangan diganti sembarangan |
| Teks headline | File scene yang bersangkutan (`KineticText text="..."`) |
| Baris Market Explorer | `src/scenes/marketData.ts` |
| Logo | `public/logo.png` |
| Timing di dalam scene | Angka di `seg(t, a, b)` pada scene itu (frame relatif scene) |
| Batas antar-scene | `B` di `tokens.ts` |
| Alamat kontrak yang tampil | `REAL_CONTRACTS` di `tokens.ts` (disalin dari `lib/contracts/project-deployments.ts`) |

Layout memakai koordinat piksel absolut untuk kanvas 1920×1080. **Versi vertikal/persegi tidak cukup dengan mengganti ukuran composition**, karena posisi tiap scene perlu disusun ulang.

---

## 7. Aturan konten (jangan dilanggar saat mengedit)

Film ini publik dan menyangkut produk finansial. Yang **tidak boleh** ditambahkan:

- Angka TVL, APY nyata, volume, jumlah user, earnings, revenue, atau dividen yang bisa di-claim.
- Alamat kontrak, tx hash, atau payout karangan. Alamat yang tampil hanya 4 kontrak Mainnet YELTRA asli (`REAL_CONTRACTS`).
- Klaim bahwa settlement dividen sudah aktif di Mainnet. Modul Dividend Earn menampilkan "OPT-IN REQUIRED · SETTLEMENT NOT ENABLED" dan "Protocol direction · in development", sesuai panel asli di aplikasi.
- Dividend Earn sebagai produk keempat. Ia selalu **bagian dari Trading Yield** (ada di dalam frame Trading Yield dan, di diagram sistem, di dalam kotak Trading Yield).
- Pendle atau Morpho sebagai pemeran utama.
- Gradien ungu, kartu glass, maskot.

Angka rate yang bergerak (3,30%, 7,50%, 7,20%, dll.) hanya dekorasi. Karena itu tag `IllustrativeTag` ("Illustrative rates · not live data") tampil di setiap scene yang menganimasikan angka. **Jangan dihapus.**

Istilah produk yang dipakai: **Fixed Yield** (PT), **Trading Yield** (YT), **Dividend Earn** (enhancement di dalam Trading Yield). Tidak lagi memakai "Long Yield".

---

## 8. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| Browser tidak ditemukan / mencoba mengunduh Chrome | Pakai `--browser-executable` (§1) |
| Font berubah ke fallback saat render | Tidak ada internet saat render pertama; ulangi dengan koneksi |
| Glyph `_` menggantikan `…` | Pakai `...` di teks monospace |
| Bunyi tidak pas dengan gambar | Frame di `make-audio.py` tidak disesuaikan setelah timing scene diubah |
| `stills.mjs` error modul tidak ditemukan | Jalankan `bun install` di `remotion/` dulu (`@remotion/bundler` dan `@remotion/renderer` ikut terpasang lewat `@remotion/cli`) |
| `sheet.py` error `PIL` | `pip install pillow` |

---

## 9. Verifikasi terakhir

Hasil render yang tercatat saat dokumen ini dibuat:

- 1920×1080, 30 fps, 900 frame, 30,000 detik, H.264 + AAC stereo.
- Typecheck lulus (`bun run typecheck` di `remotion/` dan di root).
- Lint root lulus (`remotion/` diabaikan).
- Audio belum diaudisi oleh pembuatnya secara pendengaran. Sinkronisasi diverifikasi lewat ekstraksi audio dari MP4 dan pengecekan posisi onset, jadi **balance volume dan rasa musik perlu didengar langsung** sebelum dipublikasikan.
