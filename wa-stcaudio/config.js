// Ubah sesuai kebutuhan. Bisa juga lewat environment variable.
export default {
  // Awalan perintah yang diterima, contoh: .stc  !stc  /stc
  prefixes: ['.', '!', '/', '#'],
  botName: process.env.BOT_NAME || 'STC Audio Bot',
  // Nama pack & author yang tertempel di setiap stiker
  stickerPack: process.env.STICKER_PACK || 'STC Audio',
  stickerAuthor: process.env.STICKER_AUTHOR || 'wa-stcaudio',
  // Isi nomor (format 62xxx, tanpa + dan spasi) untuk login pakai kode pairing.
  // Kosongkan untuk login pakai QR di terminal.
  pairingNumber: process.env.PAIRING_NUMBER || '',
  // Folder sesi login. Jangan dibagikan ke siapa pun.
  sessionDir: process.env.SESSION_DIR || './session',
  // Batas ukuran media yang diproses (MB)
  maxMediaMB: Number(process.env.MAX_MEDIA_MB || 30)
}
