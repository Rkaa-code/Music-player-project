// utils/romanize.js
// Ubah lirik non-Latin (Jepang, Korea, Mandarin, Arab, Rusia, Thai, dll) jadi huruf Latin.
// Library di-import secara lazy, jadi tidak membebani bundle awal.

const KANA_RE = /[\u3040-\u30ff\u31f0-\u31ff]/
const HAN_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/
const NON_LATIN_RE =
  /[\u0370-\u03ff\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\u0900-\u097f\u0e00-\u0e7f\u1100-\u11ff\u3040-\u30ff\u31f0-\u31ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/

const clean = (s) =>
  (s || '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim()

/**
 * Apakah lirik ini layak ditawarkan romanisasi?
 * True kalau minimal 20% baris berisi aksara non-Latin.
 */
export function needsRomanization(lines) {
  const textLines = lines.filter((l) => l.text)
  if (!textLines.length) return false
  const nonLatin = textLines.filter((l) => NON_LATIN_RE.test(l.text)).length
  return nonLatin / textLines.length >= 0.2
}

// ===== Jepang =====
// Pakai tokenizer kuromoji langsung (build browser-nya, dimuat lewat <script>),
// lalu bacaan katakana tiap kata diubah ke romaji dengan wanakana.
// Ini menghindari kuroshiro yang sering bermasalah di Vite.
//
// Kebutuhan:
//   public/dict/        <- 12 file .dat.gz dari node_modules/kuromoji/dict
//   public/kuromoji.js  <- salinan node_modules/kuromoji/build/kuromoji.js (kalau tidak ada, dipakai CDN)
const KUROMOJI_CDN = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error(`gagal memuat ${src}`))
    document.head.appendChild(s)
  })
}

async function ensureKuromoji() {
  if (window.kuromoji) return
  for (const src of ['/kuromoji.js', KUROMOJI_CDN]) {
    try {
      await loadScript(src)
    } catch {
      // coba sumber berikutnya
    }
    // Vite mengembalikan index.html untuk file yang tidak ada, jadi cek hasilnya, bukan cuma onload
    if (window.kuromoji) return
  }
  throw new Error('kuromoji.js tidak bisa dimuat (cek public/kuromoji.js atau koneksi internet)')
}

let tokPromise = null
let tokFailed = false

function getTokenizer() {
  if (tokFailed) return Promise.resolve(null)
  if (!tokPromise) {
    tokPromise = (async () => {
      await ensureKuromoji()
      return new Promise((resolve, reject) => {
        window.kuromoji.builder({ dictPath: '/dict/' }).build((err, tokenizer) => {
          if (err) reject(err)
          else resolve(tokenizer)
        })
      })
    })().catch((err) => {
      console.error('[romanize] kuromoji gagal dimuat, pakai wanakana (kanji tidak terbaca):', err)
      tokFailed = true
      return null
    })
  }
  return tokPromise
}

// partikel yang dibaca beda dari tulisannya
const PARTICLE_READING = { は: 'wa', へ: 'e', を: 'o' }

async function japanese(text) {
  const [tokenizer, { toRomaji }] = await Promise.all([getTokenizer(), import('wanakana')])

  // fallback: hanya kana yang berubah, kanji dibiarkan
  if (!tokenizer) return clean(toRomaji(text))

  const parts = tokenizer.tokenize(text).map((t) => {
    if (t.pos === '助詞' && PARTICLE_READING[t.surface_form]) {
      return PARTICLE_READING[t.surface_form]
    }
    const reading = t.reading && t.reading !== '*' ? t.reading : t.surface_form
    return toRomaji(reading)
  })
  return clean(parts.join(' '))
}

// ===== Mandarin =====
async function chinese(text) {
  const { pinyin } = await import('pinyin-pro')
  return clean(pinyin(text, { toneType: 'symbol', type: 'string' }))
}

// ===== Korea, Arab, Cyrillic, Yunani, Thai, Hindi, Ibrani, dll =====
async function latinize(text) {
  const { default: anyAscii } = await import('any-ascii')
  return clean(anyAscii(text))
}

async function romanizeLine(text, songHasKana) {
  if (!text || !NON_LATIN_RE.test(text)) return ''
  // kanji murni di lagu Jepang tetap dibaca sebagai Jepang, bukan Mandarin
  if (KANA_RE.test(text) || (songHasKana && HAN_RE.test(text))) return japanese(text)
  if (HAN_RE.test(text)) return chinese(text)
  return latinize(text)
}

/**
 * @param {Array<{text:string}>} lines
 * @returns {Promise<string[]>} satu string per baris ('' kalau tidak perlu / tidak ada)
 */
export async function romanizeLines(lines) {
  const songHasKana = lines.some((l) => KANA_RE.test(l.text))
  return Promise.all(lines.map((l) => romanizeLine(l.text, songHasKana)))
}