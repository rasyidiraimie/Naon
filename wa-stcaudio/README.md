# wa-stcaudio

Bot WhatsApp untuk membuat **stiker** dan mengolah **audio**. Dibuat dengan [Baileys](https://github.com/WhiskeySockets/Baileys) dan ffmpeg.

## Fitur

| Perintah | Fungsi |
|---|---|
| `.menu` | Tampilkan daftar perintah |
| `.stc` / `.s` | Gambar, video, atau gif jadi stiker (video maks 10 detik) |
| `.stc crop` | Stiker dipotong kotak penuh (tanpa ruang transparan) |
| `.stc Nama\|Author` | Stiker dengan nama pack dan author sendiri |
| `.toimg` | Stiker jadi gambar |
| `.tomp3` / `.audio` | Video atau VN jadi MP3 |
| `.tovn` / `.vn` | Video atau audio jadi voice note |
| `.bass` `.slow` `.fast` `.nightcore` `.vibra` `.robot` `.echo` `.reverse` `.chipmunk` `.deep` `.earrape` | Efek audio |

Kirim media dengan caption perintah, atau balas (reply) media dengan perintahnya. Awalan `.` `!` `/` `#` semuanya bisa dipakai.

## Persiapan

- Node.js 20 atau lebih baru
- ffmpeg (dengan libwebp, libopus, libmp3lame)
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Termux: `pkg install nodejs ffmpeg`
  - Windows: unduh dari https://ffmpeg.org lalu tambahkan ke PATH

## Menjalankan

```bash
cd wa-stcaudio
npm install
npm start
```

Scan QR yang muncul di terminal dari **WhatsApp > Perangkat tertaut > Tautkan perangkat**.

Kalau mau login pakai kode pairing (tanpa scan QR):

```bash
PAIRING_NUMBER=628123456789 npm start
```

Lalu masukkan kode yang muncul di **Perangkat tertaut > Tautkan dengan nomor telepon**.

Sesi login tersimpan di folder `session/`. Jangan bagikan folder ini. Kalau sesi keluar, hapus folder itu lalu login ulang.

## Pengaturan

Ubah `config.js` atau pakai environment variable:

| Variabel | Bawaan | Keterangan |
|---|---|---|
| `BOT_NAME` | STC Audio Bot | Nama bot di menu |
| `STICKER_PACK` | STC Audio | Nama pack di stiker |
| `STICKER_AUTHOR` | wa-stcaudio | Author di stiker |
| `PAIRING_NUMBER` | (kosong) | Nomor bot untuk login kode pairing |
| `SESSION_DIR` | ./session | Folder sesi |
| `MAX_MEDIA_MB` | 30 | Batas ukuran media |

> Catatan: Baileys adalah library tidak resmi. Pakai nomor cadangan, karena WhatsApp bisa memblokir nomor yang dipakai sebagai bot.
