# MLBB Draft Overlay

Overlay draft pick/ban Mobile Legends gaya siaran turnamen (1920×1080) untuk OBS, plus panel kontrol untuk operator.

- `overlay.html`: tampilan siaran (header tim + skor, timer, 5 ban per tim, 5 kartu pick dengan nama pemain, sorotan hero di tengah, tracker urutan draft).
- `control.html`: panel operator (pilih hero, lock, undo, timer, edit nama tim/pemain/warna/logo/skor).
- `draft.js`: data hero, urutan draft, dan sinkronisasi state.

## Urutan draft (format turnamen, 10 ban)

| Fase | Urutan |
|---|---|
| Ban 1 | Blue, Red, Blue, Red, Blue, Red |
| Pick 1 | Blue · Red Red · Blue Blue · Red |
| Ban 2 | Red, Blue, Red, Blue |
| Pick 2 | Red · Blue Blue · Red |

Urutan ini ada di `SEQ` dalam `draft.js` kalau mau diubah.

## Menjalankan

Paling aman lewat server lokal supaya overlay dan panel kontrol berbagi state:

```bash
python -m http.server 8000
```

- Overlay: `http://localhost:8000/overlay.html`
- Kontrol: `http://localhost:8000/control.html`
- Overlay tanpa background (transparan): `overlay.html?bg=0`

### Di OBS

1. **Browser Source** → URL `http://localhost:8000/overlay.html` (atau `?bg=0`), ukuran 1920×1080.
2. **Docks → Custom Browser Docks** → tambahkan `http://localhost:8000/control.html`. Dock dan browser source berjalan di browser OBS yang sama, jadi perubahan langsung tersinkron.

Kalau panel kontrol dibuka di Chrome biasa (bukan dock OBS), overlay di OBS **tidak** ikut berubah karena storage-nya terpisah. Gunakan Custom Browser Dock, atau tampilkan overlay lewat Window Capture dari Chrome yang sama.

## Kontrol

| Aksi | Cara |
|---|---|
| Sorot hero (preview di overlay) | Klik hero |
| Kunci & lanjut | Klik hero yang sama lagi / `Enter` / tombol LOCK |
| Cari cepat | `/`, ketik nama, `Enter` (sorot), `Enter` (kunci) |
| Lewati ban | Tombol NO BAN |
| Undo | `Ctrl+Z` |
| Batal sorot | `Esc` |
| Start/pause timer | `Space` |
| Koreksi slot | Klik slot di Papan Draft |

## Gambar

- Hero: taruh di `heroes/<namahero>.png` (lihat `heroes/README.md`). Folder & ekstensi bisa diganti di panel kontrol.
- Logo tim: isi path/URL di panel kontrol (mis. `logos/tim.png`).

Repo ini tidak menyertakan art hero resmi. Siapkan sendiri gambar yang kamu punya hak pakainya.
