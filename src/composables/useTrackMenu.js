import { reactive } from 'vue'

// state singleton: satu menu untuk seluruh app
const menu = reactive({
  visible: false,
  x: 0,
  y: 0,
  openId: 0,       // naik tiap menu dibuka, dipakai untuk reset halaman menu
  track: null,
  playlist: null,  // diisi kalau menu dibuka dari dalam sebuah playlist
})

export function useTrackMenu() {
  function openMenu(e, track, playlist = null) {
    e.preventDefault() // matikan menu bawaan Chrome
    menu.x = e.clientX
    menu.y = e.clientY
    menu.track = track
    menu.playlist = playlist
    menu.openId++
    menu.visible = true
  }

  function closeMenu() {
    menu.visible = false
  }

  return { menu, openMenu, closeMenu }
}