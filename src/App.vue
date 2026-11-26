<template>
  <PlaylistSidebar
    :open="sidebarOpen"
    :playing-id="currentTrack?.id?.videoId"
    @play="onPlaylistPlay"
    @close="sidebarOpen = false"
  />
  <!-- latar gelap di belakang drawer (hanya tampil di HP) -->
  <div v-if="sidebarOpen" class="backdrop" @click="sidebarOpen = false"></div>

  <div class="app">
    <ContextMenu
      @play="onMenuPlay"
      @play-next="queueNext"
      @add-queue="queueEnd"
      @detail="(t) => (detailTrack = t)"
    />
    <header class="app-header">
      <button class="menu-btn" aria-label="Buka playlist" @click="sidebarOpen = true">
        <Menu :size="22" :stroke-width="2" />
      </button>
      <div class="app-title">
        <span class="eyebrow">Now Browsing</span>
        <h1>LRMP</h1>
      </div>
    </header>

    <SearchBar @results="onResults" @searching="isSearching = $event" />

    <p v-if="tracks.length === 0" class="empty-state">
      {{ isSearching ? 'Lagu tidak ditemukan.' : 'Memuat lagu trending...' }}
    </p>
    <h2 v-else-if="!isSearching" class="section-label">Trending Sekarang</h2>

    <TrackList
      :tracks="tracks"
      :playing-id="currentTrack?.id?.videoId"
      :per-page-options="[10, 25, 50, 100]"
      :default-per-page="10"
      @select="onSelect"
    />

    <div id="player" style="display: none"></div>
    <PlayerBar
      :track="currentTrack"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="duration"
      :volume="volume"
      :shuffle="shuffle"
      :repeat-mode="repeatMode"
      :lyrics-open="lyricsOpen"
      :queue-open="queueOpen"
      @toggle-queue="toggleQueue"
      @toggle-play="togglePlay"
      @seek="seekTo"
      @volume-change="setVolume"
      @prev="playPrevious"
      @next="playNext"
      @toggle-shuffle="toggleShuffle"
      @cycle-repeat="cycleRepeat"
      @show-detail="detailTrack = currentTrack"
      @toggle-lyrics="toggleLyrics"
    />

    <QueuePanel
      :open="queueOpen"
      :current="queueCurrent"
      :upcoming="upcoming"
      :shuffle="shuffle"
      :repeat-mode="repeatMode"
      @close="queueOpen = false"
      @play="playUpcoming"
      @remove="removeUpcoming"
      @clear="clearUpcoming"
    />

    <TrackDetailModal
      :track="detailTrack"
      @close="detailTrack = null"
      @play="(t) => { onSelect(t); detailTrack = null }"
    />

    <LyricsPanel
      :track="lyricsOpen ? currentTrack : null"
      :current-time="currentTime"
      @close="lyricsOpen = false"
      @seek="seekTo"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Menu } from 'lucide-vue-next'
import SearchBar from './components/SearchBar.vue'
import TrackList from './components/TrackList.vue'
import PlayerBar from './components/PlayerBar.vue'
import TrackDetailModal from './components/TrackDetailModal.vue'
import LyricsPanel from './components/LyricsPanel.vue'
import PlaylistSidebar from './components/PlaylistSidebar.vue'
import ContextMenu from './components/ContextMenu.vue'
import { useYoutubePlayer } from './composables/useYoutubePlayer'
import { useYoutubeMatch } from './composables/useYoutubeMatch'
import { searchYoutube } from './api/youtube'
import QueuePanel from './components/QueuePanel.vue'
import { useQueue } from './composables/useQueue'
import { useMediaSession } from './composables/useMediaSession'

let keepPlaying = false

const { resolveTrack } = useYoutubeMatch(searchYoutube)

const queueOpen = ref(false)

// drawer playlist (dipakai di layar kecil; di desktop sidebar selalu tampil)
const sidebarOpen = ref(false)

let originalQueue = []
let playToken = 0

const tracks = ref([])
const isSearching = ref(false)
const listTitle = ref('Trending Sekarang')
const shuffle = ref(false)
const repeatMode = ref('off')
const detailTrack = ref(null)
const lyricsOpen = ref(false)

// antrian aktif untuk next/prev — bisa berisi hasil pencarian ATAU isi playlist,
// tergantung dari mana lagu terakhir dipilih
const queue = ref([])

const {
  initPlayer,
  onEnded,
  playTrack,
  togglePlay,
  seekTo,
  setVolume,
  isPlaying,
  currentTrack,
  currentTime,
  duration,
  volume,
} = useYoutubePlayer()

const {
  current: queueCurrent,
  upcoming,
  playUpcoming,
  removeUpcoming,
  clearUpcoming,
} = useQueue({
  queue,
  getIndex: currentIndex,
  playAt: (i) => playSafe(queue.value[i], 1),
})

// ===== drawer: kunci scroll halaman saat terbuka, tutup dengan Esc / saat layar melebar =====
const mobileQuery = window.matchMedia('(max-width: 720px)')

// ---------------------------------------------------------------------------------- //

useMediaSession({
  track: currentTrack,
  isPlaying,
  currentTime,
  duration,
  handlers: {
    play: () => { if (!isPlaying.value) togglePlay() },
    pause: () => { keepPlaying = false; if (isPlaying.value) togglePlay() },
    prev: playPrevious,
    next: playNext,
    seek: seekTo,
  },
})

watch(sidebarOpen, (open) => {
  document.body.style.overflow = open && mobileQuery.matches ? 'hidden' : ''
})

function onVisibility() {
  keepPlaying = document.hidden ? isPlaying.value : false
}

watch(isPlaying, (playing) => {
  if (playing || !document.hidden || !keepPlaying) return
  setTimeout(() => {
    if (document.hidden && keepPlaying && !isPlaying.value) togglePlay()
  }, 300)
})

onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisibility))

// ----------------------------------------------------------------------------------- //

function onKeydown(e) {
  if (e.key === 'Escape') sidebarOpen.value = false
}

function onBreakpointChange(e) {
  if (!e.matches) sidebarOpen.value = false
}


onMounted(() => {
  initPlayer()
  window.addEventListener('keydown', onKeydown)
  mobileQuery.addEventListener('change', onBreakpointChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  mobileQuery.removeEventListener('change', onBreakpointChange)
  document.body.style.overflow = ''
})

onEnded(() => {
  if (repeatMode.value === 'one') {
    playTrack(currentTrack.value)
    return
  }
  playNext()
})

function onResults(results) {
  tracks.value = results
  listTitle.value = 'Trending Sekarang'
}

function onImport({ name, tracks: imported }) {
  tracks.value = imported
  listTitle.value = `Import: ${name} (${imported.length} lagu)`
}

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleQueue(head) {
  originalQueue = [...queue.value]
  queue.value = head
    ? [head, ...shuffled(queue.value.filter((t) => t !== head))]
    : shuffled(queue.value)
}

function restoreQueue() {
  if (!originalQueue.length) return
  const cur = new Set(queue.value)
  const orig = new Set(originalQueue)
  queue.value = [
    ...originalQueue.filter((t) => cur.has(t)),   // urutan asli, tanpa lagu yang sudah dihapus
    ...queue.value.filter((t) => !orig.has(t)),   // lagu yang ditambah saat shuffle (play next / add queue)
  ]
  originalQueue = []
}

function setQueue(list, startTrack) {
  queue.value = list
  if (shuffle.value) shuffleQueue(list.includes(startTrack) ? startTrack : null)
  else originalQueue = []
}
// pilih lagu dari hasil pencarian/trending -> antrian = daftar itu
function onSelect(track) {
  setQueue(tracks.value, track)
  playSafe(track)
}

// pilih lagu dari dalam sebuah playlist (sidebar) -> antrian = isi playlist itu
function onPlaylistPlay(track, playlist) {
  setQueue(playlist.tracks, track)
  playSafe(track)
  sidebarOpen.value = false // di HP, tutup drawer setelah lagu dipilih
}

function onMenuPlay(track, playlist) {
  if (playlist) onPlaylistPlay(track, playlist)
  else onSelect(track)
}

// antrian bisa sama dengan array daftar trending / isi playlist, jadi disalin dulu
// sebelum diubah supaya daftar aslinya tidak ikut berubah
function queueNext(track) {
  const q = [...queue.value]
  q.splice(currentIndex() + 1, 0, track)
  queue.value = q
}

function queueEnd(track) {
  queue.value = [...queue.value, track]
}

function toggleLyrics() {
  lyricsOpen.value = !lyricsOpen.value
  if (lyricsOpen.value) queueOpen.value = false
}

function toggleQueue() {
  queueOpen.value = !queueOpen.value
  if (queueOpen.value) lyricsOpen.value = false
}

function currentIndex() {
  if (!currentTrack.value) return -1
  return queue.value.findIndex((t) => t.id.videoId === currentTrack.value.id.videoId)
}

function playNext() {
  if (queue.value.length === 0) return

  const idx = currentIndex()
  let nextIdx = idx + 1

  if (nextIdx >= queue.value.length) {
    if (repeatMode.value !== 'all') return // sudah di lagu terakhir, berhenti

    if (shuffle.value && queue.value.length > 1) {
      // putaran baru: acak ulang, lagu yang baru selesai ditaruh paling belakang
      const last = queue.value[idx]
      queue.value = [...shuffled(queue.value.filter((t) => t !== last)), last]
    }
    nextIdx = 0
  }

  playSafe(queue.value[nextIdx], 1)
}
function playPrevious() {
  if (queue.value.length === 0) return

  const idx = currentIndex()
  let prevIdx = idx - 1

  if (prevIdx < 0) {
    prevIdx = repeatMode.value === 'all' ? queue.value.length - 1 : 0
  }

  playSafe(queue.value[prevIdx], -1)
}

function toggleShuffle() {
  shuffle.value = !shuffle.value
  if (shuffle.value) shuffleQueue(queue.value[currentIndex()])
  else restoreQueue()
}

function cycleRepeat() {
  const modes = ['off', 'all', 'one']
  const idx = modes.indexOf(repeatMode.value)
  repeatMode.value = modes[(idx + 1) % modes.length]
}

async function playSafe(track, step = 1, attempts = 0) {
  if (!track) return
  const token = ++playToken

  if (!track.id?.videoId) {
    const found = await resolveTrack(track)
    if (token !== playToken) return        // user sudah pindah lagu saat menunggu
    if (!found) {
      track.notFound = true
      const next = queue.value[queue.value.indexOf(track) + step]
      if (next && attempts < 5) return playSafe(next, step, attempts + 1)
      return
    }
  }
  playTrack(track)
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg: #12191a;
  --surface: #1c2528;
  --surface-hover: #232e31;
  --border: #2c3639;
  --brass: #c9a24a;
  --coral: #e2765c;
  --text: #f1ecdf;
  --text-muted: #8ea0a3;
}

* {
  box-sizing: border-box;
}

html {
  /* cegah teks membesar sendiri saat HP diputar landscape */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

.app {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  margin-left: 260px;
  /* ruang bawah mengikuti tinggi player bar (--player-h dari PlayerBar) */
  padding: 24px clamp(16px, 4vw, 48px) calc(var(--player-h, 0px) + 40px);
  font-family: 'Inter', sans-serif;
}

.app-header {
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* tombol hamburger: hanya tampil di HP */
.menu-btn {
  display: none;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  cursor: pointer;
}

.menu-btn:focus-visible {
  outline: 2px solid var(--coral);
  outline-offset: 2px;
}

.backdrop {
  display: none;
}

.eyebrow {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brass);
  margin-bottom: 6px;
}

h1 {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 34px;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--text);
}

.empty-state {
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
  padding: 40px 0;
  border: 1px dashed var(--border);
  border-radius: 10px;
}

.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 12px 4px;
}

@media (max-width: 720px) {
  .app {
    margin-left: 0;
    padding: calc(16px + env(safe-area-inset-top)) 14px calc(var(--player-h, 0px) + 32px);
  }

  .app-header {
    margin-bottom: 20px;
  }

  h1 {
    font-size: 26px;
  }

  .menu-btn {
    display: inline-flex;
  }

  .backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 90;
  }
}
</style>