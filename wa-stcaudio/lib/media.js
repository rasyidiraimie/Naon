import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import webpmux from 'node-webpmux'

const tmp = (ext) => path.join(os.tmpdir(), `stcaudio-${randomBytes(6).toString('hex')}.${ext}`)

/** Jalankan ffmpeg: buffer masuk -> buffer keluar. */
export async function ffmpeg (input, inExt, outExt, args) {
  const inFile = tmp(inExt)
  const outFile = tmp(outExt)
  await fs.writeFile(inFile, input)
  try {
    await new Promise((resolve, reject) => {
      const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile, ...args, outFile])
      let err = ''
      p.stderr.on('data', d => { err += d })
      p.on('error', reject)
      p.on('close', code => code === 0 ? resolve() : reject(new Error(err.trim() || `ffmpeg keluar dengan kode ${code}`)))
    })
    return await fs.readFile(outFile)
  } finally {
    await Promise.allSettled([fs.unlink(inFile), fs.unlink(outFile)])
  }
}

/** Gambar / video / gif -> stiker WebP 512x512 (video maks 8 detik). */
export async function toSticker (buffer, { isVideo = false, pack = '', author = '', crop = false } = {}) {
  const fit = crop
    ? 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512'
    : 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
  const args = isVideo
    ? ['-vf', `fps=15,${fit}`, '-vcodec', 'libwebp', '-loop', '0', '-t', '8', '-an', '-q:v', '50', '-compression_level', '6', '-preset', 'default']
    : ['-vf', fit, '-vcodec', 'libwebp', '-q:v', '80', '-frames:v', '1']
  const webp = await ffmpeg(buffer, isVideo ? 'mp4' : 'jpg', 'webp', args)
  return addExif(webp, pack, author)
}

/** Tempel nama pack & author ke stiker. */
export async function addExif (webp, pack, author) {
  const img = new webpmux.Image()
  await img.load(webp)
  const json = Buffer.from(JSON.stringify({
    'sticker-pack-id': `stcaudio-${randomBytes(4).toString('hex')}`,
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    emojis: ['🎵']
  }), 'utf8')
  const head = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
  const exif = Buffer.concat([head, json])
  exif.writeUIntLE(json.length, 14, 4)
  img.exif = exif
  return img.save(null)
}

/** Stiker -> gambar PNG (stiker bergerak diambil frame pertamanya). */
export const stickerToImage = (webp) => ffmpeg(webp, 'webp', 'png', ['-frames:v', '1'])

/** Video / audio / VN -> MP3. */
export const toMp3 = (buffer, ext = 'mp4') =>
  ffmpeg(buffer, ext, 'mp3', ['-vn', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k'])

/** Video / audio -> voice note (Opus mono). */
export const toVoiceNote = (buffer, ext = 'mp4') =>
  ffmpeg(buffer, ext, 'ogg', ['-vn', '-ac', '1', '-c:a', 'libopus', '-b:a', '64k', '-avoid_negative_ts', 'make_zero'])

/** Efek audio, nama perintah -> filter ffmpeg. */
export const AUDIO_FX = {
  bass: 'equalizer=f=60:width_type=o:width=2:g=12,volume=0.9',
  slow: 'atempo=0.8',
  fast: 'atempo=1.35',
  nightcore: 'asetrate=44100*1.25,aresample=44100,atempo=1.05',
  vibra: 'vibrato=f=6.5:d=0.6',
  robot: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75",
  echo: 'aecho=0.8:0.88:60:0.4',
  reverse: 'areverse',
  chipmunk: 'asetrate=44100*1.6,aresample=44100',
  deep: 'asetrate=44100*0.75,aresample=44100,atempo=1.1',
  earrape: 'volume=12,acrusher=bits=8:mode=log:aa=1'
}

export const applyFx = (buffer, ext, fx) =>
  ffmpeg(buffer, ext, 'mp3', ['-vn', '-af', AUDIO_FX[fx], '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k'])
