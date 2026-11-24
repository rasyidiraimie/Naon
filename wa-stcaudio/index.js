import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  getContentType,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import config from './config.js'
import { AUDIO_FX, applyFx, stickerToImage, toMp3, toSticker, toVoiceNote } from './lib/media.js'

const logger = pino({ level: 'silent' })

const MENU = (p) => `*${config.botName}* 🎵

*Stiker*
${p}stc / ${p}s — gambar, video, atau gif jadi stiker
${p}stc crop — stiker dipotong kotak penuh
${p}stc Nama|Author — stiker dengan nama pack sendiri
${p}toimg — stiker jadi gambar

*Audio*
${p}tomp3 / ${p}audio — video atau VN jadi MP3
${p}tovn / ${p}vn — video atau audio jadi voice note

*Efek audio* (balas audio/VN/video)
${Object.keys(AUDIO_FX).map(f => p + f).join('  ')}

Kirim media dengan caption perintah, atau balas (reply) media dengan perintahnya.`

/** Buka pembungkus pesan sekali-lihat / pesan sementara. */
function unwrap (message) {
  let m = message
  for (let i = 0; i < 5 && m; i++) {
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message || m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message
    if (!inner) break
    m = inner
  }
  return m
}

function textOf (m) {
  return m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption ||
    m?.videoMessage?.caption || m?.documentMessage?.caption || ''
}

/** Cari media: pertama dari pesan itu sendiri, lalu dari pesan yang dibalas. */
function findMedia (msg, content) {
  const ctx = content?.[getContentType(content)]?.contextInfo
  const candidates = [{ message: content, key: msg.key }]
  if (ctx?.quotedMessage) {
    candidates.push({
      message: unwrap(ctx.quotedMessage),
      key: { remoteJid: msg.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant, fromMe: false }
    })
  }
  for (const c of candidates) {
    const type = getContentType(c.message)
    if (['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage'].includes(type)) {
      return { type, node: c.message[type], wa: { key: c.key, message: c.message } }
    }
  }
  return null
}

const extOf = (type, node) => {
  if (type === 'audioMessage') return node.mimetype?.includes('ogg') ? 'ogg' : node.mimetype?.includes('mp4') ? 'm4a' : 'mp3'
  if (type === 'videoMessage') return 'mp4'
  if (type === 'stickerMessage') return 'webp'
  if (type === 'documentMessage') return (node.fileName?.split('.').pop() || 'bin').toLowerCase()
  return 'jpg'
}

async function start () {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir)
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false
  })

  sock.ev.on('creds.update', saveCreds)

  if (config.pairingNumber && !state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairingNumber.replace(/\D/g, ''))
        console.log(`\nKode pairing: ${code.match(/.{1,4}/g).join('-')}`)
        console.log('Buka WhatsApp > Perangkat tertaut > Tautkan perangkat > Tautkan dengan nomor telepon.\n')
      } catch (e) {
        console.error('Gagal meminta kode pairing:', e.message)
      }
    }, 3000)
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && !config.pairingNumber) {
      console.log('\nScan QR ini dari WhatsApp > Perangkat tertaut > Tautkan perangkat:\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') console.log(`✅ ${config.botName} tersambung sebagai ${sock.user?.id}`)
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        console.log(`❌ Sesi keluar. Hapus folder "${config.sessionDir}" lalu jalankan ulang untuk login lagi.`)
      } else {
        console.log(`⚠️ Koneksi terputus (${code ?? 'tanpa kode'}), menyambung ulang...`)
        setTimeout(start, 2000)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      try {
        await handle(sock, msg)
      } catch (e) {
        console.error('Error:', e)
        await sock.sendMessage(msg.key.remoteJid, { text: `Gagal memproses: ${e.message}` }, { quoted: msg }).catch(() => {})
      }
    }
  })
}

async function handle (sock, msg) {
  if (!msg.message || msg.key.remoteJid === 'status@broadcast') return
  const content = unwrap(msg.message)
  const text = textOf(content).trim()
  const prefix = config.prefixes.find(p => text.startsWith(p))
  if (!prefix) return

  const [rawCmd, ...rest] = text.slice(prefix.length).trim().split(/\s+/)
  const cmd = (rawCmd || '').toLowerCase()
  const arg = rest.join(' ')
  const jid = msg.key.remoteJid
  const reply = (payload) => sock.sendMessage(jid, typeof payload === 'string' ? { text: payload } : payload, { quoted: msg })

  const getMedia = async (allowed) => {
    const media = findMedia(msg, content)
    if (!media || !allowed.includes(media.type)) return null
    const size = Number(media.node.fileLength || 0)
    if (size > config.maxMediaMB * 1024 * 1024) throw new Error(`Media terlalu besar (maks ${config.maxMediaMB} MB).`)
    const buffer = await downloadMediaMessage(media.wa, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage })
    return { ...media, buffer, ext: extOf(media.type, media.node) }
  }

  switch (cmd) {
    case 'menu': case 'help': case 'start':
      return reply(MENU(prefix))

    case 'stc': case 's': case 'sticker': case 'stiker': {
      const m = await getMedia(['imageMessage', 'videoMessage', 'stickerMessage'])
      if (!m) return reply(`Kirim atau balas gambar/video/gif dengan caption *${prefix}${cmd}*`)
      if (m.type === 'videoMessage' && Number(m.node.seconds || 0) > 10) return reply('Video maksimal 10 detik.')
      const crop = /^crop\b/i.test(arg)
      const [pack, author] = arg.replace(/^crop\s*/i, '').split('|').map(s => s?.trim())
      const webp = await toSticker(m.buffer, {
        isVideo: m.type === 'videoMessage' || (m.type === 'stickerMessage' && m.node.isAnimated),
        crop,
        pack: pack || config.stickerPack,
        author: author || config.stickerAuthor
      })
      return reply({ sticker: webp })
    }

    case 'toimg': case 'toimage': {
      const m = await getMedia(['stickerMessage'])
      if (!m) return reply(`Balas stiker dengan *${prefix}toimg*`)
      return reply({ image: await stickerToImage(m.buffer), caption: 'Ini gambarnya ✨' })
    }

    case 'tomp3': case 'audio': case 'mp3': {
      const m = await getMedia(['videoMessage', 'audioMessage', 'documentMessage'])
      if (!m) return reply(`Kirim atau balas video/VN dengan *${prefix}${cmd}*`)
      return reply({ audio: await toMp3(m.buffer, m.ext), mimetype: 'audio/mpeg' })
    }

    case 'tovn': case 'vn': case 'ptt': {
      const m = await getMedia(['videoMessage', 'audioMessage', 'documentMessage'])
      if (!m) return reply(`Kirim atau balas video/audio dengan *${prefix}${cmd}*`)
      return reply({ audio: await toVoiceNote(m.buffer, m.ext), mimetype: 'audio/ogg; codecs=opus', ptt: true })
    }

    default:
      if (AUDIO_FX[cmd]) {
        const m = await getMedia(['audioMessage', 'videoMessage', 'documentMessage'])
        if (!m) return reply(`Balas audio/VN/video dengan *${prefix}${cmd}*`)
        return reply({ audio: await applyFx(m.buffer, m.ext, cmd), mimetype: 'audio/mpeg', ptt: m.node.ptt === true })
      }
  }
}

start()
