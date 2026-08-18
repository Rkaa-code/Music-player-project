import { ref, watch } from 'vue'

const LRC_LINE_RE = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/

// tag embel-embel yang sering muncul di judul video (EN + JP), bikin query nyasar
const NOISE_TAGS = [
  'official', 'lyric', 'lyrics', 'audio', 'mv', 'music video', 'visualizer',
  'm/v', 'pv', '公式', '歌詞', '歌詞付き', 'ミュージックビデオ', 'フル',
]
const NOISE_RE = new RegExp(`(${NOISE_TAGS.join('|')})`, 'i')

// tanda baca full-width JP yang sering nempel di akhir judul tapi sering
// TIDAK ada di judul kanonik yang tersimpan di database lirik (LRCLIB dsb),
// jadi bikin pencarian substring gagal walau judulnya sama persis secara makna.
const JP_TRAILING_PUNCT_RE = /[。！？、]+$/

/**
 * Judul video YouTube berantakan & polanya beda-beda tiap region.
 * Coba beberapa pola umum sebelum jatuh ke fallback artist = channel.
 */
function parseTrackInfo(track) {
  const rawTitle = track?.snippet?.title || ''
  const rawChannel = (track?.snippet?.channelTitle || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*VEVO$/i, '')
    .trim()

  // buang tag 【...】/[...]/(...)/（...） yang isinya noise (Official, MV, 歌詞, dll)
  // dicek dari awal juga (bukan cuma di cleanTitle), soalnya noise tag kadang
  // muncul SEBELUM pola 「」/『』 yang dicek di bawah, mis. "Artis（Official）「Judul」"
  let title = cleanTitle(rawTitle)

  // pola JP: Artis「Judul」atau Artis『Judul』
  const jpQuoteMatch = title.match(/^(.+?)[「『](.+?)[」』]/)
  if (jpQuoteMatch) {
    return {
      artist: jpQuoteMatch[1].trim() || rawChannel,
      title: cleanTitle(jpQuoteMatch[2]),
    }
  }

  // judul yang HANYA berupa 「Judul」/『Judul』 tanpa nama artis di depan
  const quoteOnlyMatch = title.match(/^[「『](.+?)[」』]/)
  if (quoteOnlyMatch) {
    return { artist: rawChannel, title: cleanTitle(quoteOnlyMatch[1]) }
  }

  // pola umum: "Artis - Judul" atau "Artis／Judul" (fullwidth slash JP)
  const sepMatch = title.match(/^(.+?)\s*[-－／\/]\s*(.+)$/)
  if (sepMatch) {
    return { artist: sepMatch[1].trim(), title: cleanTitle(sepMatch[2]) }
  }

  return { artist: rawChannel, title: cleanTitle(title) }
}

function cleanTitle(title) {
  return title
    // dukung kurung biasa "()" DAN kurung full-width JP "（）" — banyak judul
    // official JP pakai full-width, dan sebelumnya cuma "()" yang ke-strip
    .replace(/[（(]([^）)]*)[）)]/g, (m, inner) => (NOISE_RE.test(inner) ? '' : m))
    .replace(/[【\[]([^】\]]*)[】\]]/g, (m, inner) => (NOISE_RE.test(inner) ? '' : m))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// varian tanpa tanda baca akhir JP, buat fallback pencarian
function stripJpTrailingPunct(str) {
  return str.replace(JP_TRAILING_PUNCT_RE, '').trim()
}

// jeda minimal (detik) antar baris buat dianggap instrumental kalau LRC-nya
// nggak eksplisit kasih baris kosong sebagai penanda
const INSTRUMENTAL_GAP_THRESHOLD = 8
// jarak dari akhir baris sebelumnya sebelum icon note dianggap mulai muncul,
// ngasih waktu buat baris terakhir "kebaca" dulu sebelum berpindah ke ikon
const INSTRUMENTAL_SETTLE_TIME = 4

function parseLrc(lrcText) {
  const lines = []
  for (const raw of lrcText.split('\n')) {
    const match = raw.match(LRC_LINE_RE)
    if (!match) continue
    const [, mm, ss, frac, text] = match
    const ms = frac.length === 2 ? Number(frac) * 10 : Number(frac)
    const time = Number(mm) * 60 + Number(ss) + ms / 1000
    const clean = text.trim()
    // baris kosong (timestamp tanpa teks) SENGAJA dipertahankan, bukan dibuang —
    // banyak sumber lirik ter-sinkron (LRCLIB, Musixmatch) memang menulis baris
    // kosong buat nandain bagian instrumental / tanpa vokal
    lines.push({ time, text: clean, isInstrumental: clean === '' })
  }
  lines.sort((a, b) => a.time - b.time)
  return insertGapMarkers(lines)
}

// nambahin penanda instrumental sintetis di jeda panjang yang nggak punya
// baris kosong eksplisit dari sumbernya
function insertGapMarkers(lines) {
  const result = []
  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i])
    const next = lines[i + 1]
    const gapIsMarked = lines[i].isInstrumental || (next && next.isInstrumental)
    if (next && !gapIsMarked && next.time - lines[i].time > INSTRUMENTAL_GAP_THRESHOLD) {
      result.push({
        time: lines[i].time + INSTRUMENTAL_SETTLE_TIME,
        text: '',
        isInstrumental: true,
      })
    }
  }
  return result
}

/**
 * Cari baris yang lagi aktif di waktu tertentu — dipakai UI buat nentuin
 * mau nampilin teks lirik atau ikon note (kalau isInstrumental true).
 * @param {number} currentTime
 * @param {Array<{time:number,text:string,isInstrumental:boolean}>} lines
 */
export function getActiveLine(currentTime, lines) {
  let active = null
  for (const line of lines) {
    if (line.time > currentTime) break
    active = line
  }
  return active
}

async function searchLrclib(params) {
  const query = new URLSearchParams(params)
  const res = await fetch(`https://lrclib.net/api/search?${query.toString()}`)
  if (!res.ok) throw new Error('lrclib request failed')
  const results = await res.json()
  if (!Array.isArray(results)) return null
  return results.find((r) => r.syncedLyrics) || null
}

/**
 * Coba beberapa strategi pencarian dari yang paling ketat ke paling longgar,
 * berhenti di percobaan pertama yang ketemu lirik ter-sinkron.
 */
async function findLyrics(track) {
  const { artist, title } = parseTrackInfo(track)
  const rawTitle = cleanTitle(track?.snippet?.title || '')

  // versi title tanpa tanda baca akhir JP (。！？、), buat kasus di mana
  // judul kanonik di database lirik tidak menyertakan tanda baca itu
  const strippedTitle = title ? stripJpTrailingPunct(title) : ''
  const strippedRawTitle = rawTitle ? stripJpTrailingPunct(rawTitle) : ''

  const attempts = [
    // 1. ketat: judul + artis hasil parsing
    artist && title ? { track_name: title, artist_name: artist } : null,
    // 2. judul hasil parsing aja, tanpa filter artis (kalau nama artis kanji vs romaji beda)
    title ? { track_name: title } : null,
    // 3. judul + artis, tapi tanpa tanda baca akhir JP
    artist && strippedTitle && strippedTitle !== title
      ? { track_name: strippedTitle, artist_name: artist }
      : null,
    // 4. judul tanpa tanda baca akhir JP, tanpa filter artis
    strippedTitle && strippedTitle !== title ? { track_name: strippedTitle } : null,
    // 5. free-text pakai judul mentah yang sudah dibersihkan dari tag noise
    rawTitle ? { q: rawTitle } : null,
    // 6. free-text tanpa tanda baca akhir JP
    strippedRawTitle && strippedRawTitle !== rawTitle ? { q: strippedRawTitle } : null,
  ].filter(Boolean)

  for (const params of attempts) {
    try {
      const found = await searchLrclib(params)
      if (found) return found
    } catch {
      // lanjut ke strategi berikutnya
    }
  }
  return null
}

/**
 * @param {import('vue').Ref<object|null>} trackRef
 */
export function useLyrics(trackRef) {
  const lines = ref([])
  const status = ref('idle') // idle | loading | found | not-found | error

  async function fetchLyrics(track) {
    if (!track) {
      lines.value = []
      status.value = 'idle'
      return
    }

    status.value = 'loading'
    lines.value = []

    try {
      const found = await findLyrics(track)
      if (found) {
        lines.value = parseLrc(found.syncedLyrics)
        status.value = lines.value.length ? 'found' : 'not-found'
      } else {
        status.value = 'not-found'
      }
    } catch (err) {
      status.value = 'error'
    }
  }

  watch(trackRef, (track) => fetchLyrics(track), { immediate: true })

  return { lines, status }
}