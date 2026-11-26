import { onMounted, onBeforeUnmount } from 'vue'

// elemen yang sedang dipakai mengetik / punya kontrol keyboard sendiri -> shortcut dilewati
function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT') return true // termasuk slider (range): panah kiri/kanan sudah mengatur nilainya
  return tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts({ hasTrack, isPlaying, currentTime, duration, togglePlay, seekTo }) {
  function seekBy(delta) {
    const max = duration.value || 0
    seekTo(Math.min(Math.max(0, currentTime.value + delta), max))
  }

  function onKeydown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return // jangan bentrok dengan shortcut browser
    if (isTypingTarget(e.target)) return
    if (!hasTrack()) return

    switch (e.code) {
      case 'Space':
        e.preventDefault() // cegah halaman ikut scroll
        if (!e.repeat) togglePlay()
        break
      case 'ArrowRight':
        e.preventDefault()
        seekBy(e.shiftKey ? 10 : 5)
        break
      case 'ArrowLeft':
        e.preventDefault()
        seekBy(e.shiftKey ? -10 : -5)
        break
    }
  }

  // Space pada tombol yang sedang fokus akan "mengklik" tombol itu saat tombol dilepas,
  // jadi di-keyup juga dicegah supaya tidak terjadi play/pause dua kali
  function onKeyup(e) {
    if (e.code !== 'Space') return
    if (isTypingTarget(e.target) || !hasTrack()) return
    e.preventDefault()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
  })
}