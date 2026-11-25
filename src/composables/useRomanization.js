// composables/useRomanization.js
import { ref, computed, watch } from 'vue'
import { needsRomanization, romanizeLines } from '../utils/romanize'

const STORAGE_KEY = 'lyrics-romanize'

function loadPref() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function savePref(v) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch {
    // abaikan kalau storage tidak tersedia
  }
}

/**
 * @param {import('vue').Ref<Array<{text:string}>>} lines  hasil useLyrics
 */
export function useRomanization(lines) {
  const enabled = ref(loadPref())
  const romanized = ref([])
  const busy = ref(false)

  // tombol hanya relevan kalau lirik memang berisi aksara non-Latin
  const available = computed(() => needsRomanization(lines.value))

  let token = 0
  watch(
    [lines, enabled, available],
    async () => {
      const t = ++token
      romanized.value = []

      // lazy: library & kamus baru dimuat saat toggle benar-benar menyala
      if (!enabled.value || !available.value) {
        busy.value = false
        return
      }

      busy.value = true
      try {
        const out = await romanizeLines(lines.value)
        if (t === token) romanized.value = out
      } catch (err) {
        console.warn('[romanize] gagal:', err)
      } finally {
        if (t === token) busy.value = false
      }
    },
    { immediate: true },
  )

  function toggle() {
    enabled.value = !enabled.value
    savePref(enabled.value)
  }

  return { enabled, available, romanized, busy, toggle }
}