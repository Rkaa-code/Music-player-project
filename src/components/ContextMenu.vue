<template>
  <Teleport to="body">
    <div
      v-if="menu.visible"
      ref="menuEl"
      class="ctx-menu"
      role="menu"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      @contextmenu.prevent
    >
      <div class="ctx-grabber" aria-hidden="true"></div>

      <template v-if="page === 'main'">
        <button class="ctx-item" role="menuitem" @click="act('play')">▶ Putar sekarang</button>
        <button class="ctx-item" role="menuitem" @click="act('play-next')">Putar berikutnya</button>
        <button class="ctx-item" role="menuitem" @click="act('add-queue')">Tambah ke antrian</button>

        <div class="ctx-sep"></div>

        <button class="ctx-item" role="menuitem" @click="page = 'playlists'">
          <span>Tambah ke playlist</span>
          <span class="ctx-muted">›</span>
        </button>
        <button v-if="menu.playlist" class="ctx-item danger" role="menuitem" @click="removeFromCurrent">
          Hapus dari playlist ini
        </button>

        <div class="ctx-sep"></div>

        <button class="ctx-item" role="menuitem" @click="act('detail')">Lihat detail</button>
      </template>

      <template v-else>
        <button class="ctx-item" role="menuitem" @click="page = 'main'">
          <span class="ctx-muted">‹ Kembali</span>
        </button>
        <div class="ctx-sep"></div>

        <p v-if="playlists.length === 0" class="ctx-empty">Belum ada playlist</p>
        <button
          v-for="pl in playlists"
          :key="pl.id"
          class="ctx-item"
          role="menuitem"
          :disabled="has(pl)"
          @click="addTo(pl)"
        >
          <span class="ctx-name">{{ pl.name }}</span>
          <span v-if="has(pl)">✓</span>
        </button>

        <div class="ctx-sep"></div>
        <button class="ctx-item" role="menuitem" @click="addToNew">+ Playlist baru…</button>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useTrackMenu } from '../composables/useTrackMenu'
import { usePlaylists, trackKey } from '../composables/usePlaylists'

const emit = defineEmits(['play', 'play-next', 'add-queue', 'detail'])

const { menu, closeMenu } = useTrackMenu()
const { playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } = usePlaylists()

const menuEl = ref(null)
const page = ref('main')
const pos = ref({ x: 0, y: 0 })

// tiap kali menu dibuka (termasuk pindah ke lagu lain), mulai dari halaman utama
watch(() => menu.openId, () => {
  page.value = 'main'
})

// posisi mengikuti kursor/jari, tapi dijaga supaya tidak keluar layar.
// (di HP menu tampil sebagai bottom sheet lewat CSS, jadi posisi ini diabaikan di sana)
watch(
  () => [menu.visible, menu.openId, page.value],
  ([visible]) => {
    if (!visible) return
    pos.value = { x: menu.x, y: menu.y }
    const el = menuEl.value
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const pad = 8
    pos.value = {
      x: Math.max(pad, Math.min(menu.x, window.innerWidth - width - pad)),
      y: Math.max(pad, Math.min(menu.y, window.innerHeight - height - pad)),
    }
  },
  { flush: 'post' }
)

// --- tutup menu: klik di luar, Esc, scroll, resize, pindah tab/jendela ---
let lastWidth = 0

function onPointerDown(e) {
  if (!menuEl.value?.contains(e.target)) closeMenu()
}
function onScroll(e) {
  if (!menuEl.value?.contains(e.target)) closeMenu()
}
function onKeydown(e) {
  if (e.key === 'Escape') closeMenu()
}
// di HP, address bar yang naik/turun memicu resize (tinggi berubah), jadi hanya tutup kalau LEBAR berubah
function onResize() {
  if (window.innerWidth !== lastWidth) closeMenu()
}
function bind(on) {
  const m = on ? 'addEventListener' : 'removeEventListener'
  if (on) lastWidth = window.innerWidth
  window[m]('pointerdown', onPointerDown, true)
  window[m]('scroll', onScroll, true)
  window[m]('keydown', onKeydown)
  window[m]('resize', onResize)
  window[m]('blur', closeMenu)
}
watch(() => menu.visible, (v) => bind(v))
onBeforeUnmount(() => bind(false))

// --- aksi ---
const clone = (t) => JSON.parse(JSON.stringify(t))

function act(name) {
  emit(name, menu.track, menu.playlist)
  closeMenu()
}

function has(pl) {
  const t = menu.track
  if (!t) return false
  const vid = t.id?.videoId
  return pl.tracks.some((x) => trackKey(x) === trackKey(t) || (vid && x.id?.videoId === vid))
}

function addTo(pl) {
  addTrackToPlaylist(pl.id, clone(menu.track))
  closeMenu()
}

function addToNew() {
  const track = menu.track // diambil dulu, prompt() bisa membuat menu tertutup
  const name = window.prompt('Nama playlist baru')
  if (!name?.trim()) return
  const pl = createPlaylist(name)
  if (pl) addTrackToPlaylist(pl.id, clone(track))
  closeMenu()
}

function removeFromCurrent() {
  removeTrackFromPlaylist(menu.playlist.id, trackKey(menu.track))
  closeMenu()
}
</script>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 1000;
  width: 230px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  font-family: 'Inter', sans-serif;
}
.ctx-grabber { display: none; }
.ctx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.ctx-item:hover:not(:disabled) { background: var(--surface-hover); }
.ctx-item:disabled { color: var(--text-muted); cursor: default; }
.ctx-item.danger:hover { color: var(--coral); }
.ctx-sep { height: 1px; margin: 4px 6px; background: var(--border); }
.ctx-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ctx-muted { color: var(--text-muted); }
.ctx-empty { margin: 0; padding: 8px 10px; font-size: 12px; color: var(--text-muted); }

/* ===== HP: menu tampil sebagai bottom sheet di dasar layar ===== */
@media (max-width: 720px) {
  .ctx-menu {
    /* !important karena posisi desktop datang dari inline style */
    left: 0 !important;
    right: 0;
    top: auto !important;
    bottom: 0;
    width: 100%;
    max-height: 75dvh;
    padding: 6px 10px calc(10px + env(safe-area-inset-bottom));
    border-radius: 16px 16px 0 0;
    border-bottom: none;
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.6);
    overscroll-behavior: contain;
  }

  .ctx-grabber {
    display: block;
    width: 36px;
    height: 4px;
    margin: 6px auto 10px;
    border-radius: 2px;
    background: var(--border);
  }

  .ctx-item {
    padding: 14px 12px;
    font-size: 15px;
  }

  .ctx-empty { font-size: 14px; padding: 12px; }
}
</style>