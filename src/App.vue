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

    <SearchBar @results="onResults" @searching="isSearching = $event" @query="onQuery" />

    <!-- hasil channel yang cocok dengan kata kunci + beberapa lagu pratinjau -->
    <section v-if="channelBlocks.length && !activeChannel" class="channel-results">
      <h2 class="section-label">Channel</h2>

      <article v-for="ch in channelBlocks" :key="ch.id" class="channel-block">
        <button class="channel-header" @click="openChannel(ch)">
          <img :src="ch.thumb" :alt="ch.title" />
          <span class="channel-name">{{ ch.title }}</span>
          <span class="see-all">Lihat semua <ChevronRight :size="16" :stroke-width="2" /></span>
        </button>

        <ul v-if="ch.previews.length" class="preview-list">
          <li
            v-for="t in ch.previews"
            :key="t.id.videoId"
            :class="{ active: t.id.videoId === currentTrack?.id?.videoId }"
            @click="onPreviewSelect(t, ch.previews)"
          >
            <img :src="t.snippet.thumbnails.default.url" alt="" />
            <span class="p-title">{{ t.snippet.title }}</span>
          </li>
        </ul>
      </article>
    </section>

    <div v-if="activeChannel" class="channel-head">
      <button class="back-btn" aria-label="Kembali ke hasil pencarian" @click="closeChannel">
        <ArrowLeft :size="20" :stroke-width="2" />
      </button>
      <img :src="activeChannel.thumb" :alt="activeChannel.title" />
      <h2>{{ activeChannel.title }}</h2>
    </div>
    <p v-else-if="tracks.length === 0" class="empty-state">
      {{ isSearching ? 'Lagu tidak ditemukan.' : 'Memuat lagu trending...' }}
    </p>
    <h2 v-else-if="!isSearching" class="section-label">
      {{ lastQuery ? 'Lagu' : 'Trending Sekarang' }}
    </h2>

    <p v-if="activeChannel && channelLoading && tracks.length === 0" class="empty-state">
      Memuat lagu channel…
    </p>

    <TrackList
      :tracks="tracks"
      :playing-id="currentTrack?.id?.videoId"
      :per-page-options="[10, 25, 50, 100]"
      :default-per-page="10"
      @select="onSelect"
    />

    <button
      v-if="activeChannel && channelNext"
      class="load-more"
      :disabled="channelLoading"
      @click="loadMoreChannel"
    >
      {{ channelLoading ? 'Memuat…' : 'Muat lebih banyak' }}
    </button>

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
import { Menu, ArrowLeft, ChevronRight } from 'lucide-vue-next'
import SearchBar from './components/SearchBar.vue'
import TrackList from './components/TrackList.vue'
import PlayerBar from './components/PlayerBar.vue'
import TrackDetailModal from './components/TrackDetailModal.vue'
import LyricsPanel from './components/LyricsPanel.vue'
import PlaylistSidebar from './components/PlaylistSidebar.vue'
import ContextMenu from './components/ContextMenu.vue'
import { useYoutubePlayer } from './composables/useYoutubePlayer'
import { useYoutubeMatch } from './composables/useYoutubeMatch'
import { searchYoutube, searchChannels, getChannelUploads, addDurations } from './api/youtube'
import QueuePanel from './components/QueuePanel.vue'
import { useQueue } from './composables/useQueue'
import { useMediaSession } from './composables/useMediaSession'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

let keepPlaying = false

const { resolveTrack } = useYoutubeMatch(searchYoutube)

const queueOpen = ref(false)

// drawer playlist (dipakai di layar kecil; di desktop sidebar selalu tampil)
const sidebarOpen = ref(false)

let originalQueue = []
let playToken = 0

// ===== state channel =====
const lastQuery = ref('')
const channelBlocks = ref([]) // [{ id, title, thumb, previews: [track, ...] }]
const activeChannel = ref(null)
const channelNext = ref(null)
const channelLoading = ref(false)
let savedTracks = []
let channelToken = 0
const channelCache = new Map() // cache per kata kunci supaya pencarian yang sama tidak memakan kuota lagi

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

// ===== Keyboard shortcut =====
useKeyboardShortcuts({
  hasTrack: () => !!currentTrack.value,
  isPlaying,
  currentTime,
  duration,
  togglePlay,
  seekTo,
})

// ===== Media session (kontrol di notifikasi / layar kunci HP) =====
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

// ===== Lanjut memutar saat halaman pindah ke latar belakang =====
function onVisibility() {
  keepPlaying = document.hidden ? isPlaying.value : false
}

watch(isPlaying, (playing) => {
  if (playing || !document.hidden || !keepPlaying) return
  setTimeout(() => {
    if (document.hidden && keepPlaying && !isPlaying.value) togglePlay()
  }, 300)
})

// ===== Drawer: kunci scroll halaman saat terbuka, tutup dengan Esc / saat layar melebar =====
const mobileQuery = window.matchMedia('(max-width: 720px)')

watch(sidebarOpen, (open) => {
  document.body.style.overflow = open && mobileQuery.matches ? 'hidden' : ''
})

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
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  mobileQuery.removeEventListener('change', onBreakpointChange)
  document.removeEventListener('visibilitychange', onVisibility)
  document.body.style.overflow = ''
})

onEnded(() => {
  if (repeatMode.value === 'one') {
    playTrack(currentTrack.value)
    return
  }
  playNext()
})

// =========== CHANNEL =========== //

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\s*-\s*topic$/, '')
    .replace(/\b(official|vevo|channel)\b/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// channel dianggap cocok kalau namanya mengandung kata kunci, kata kunci mengandung namanya,
// atau semua kata kunci ada di namanya
function isChannelMatch(title, query) {
  const t = norm(title)
  const q = norm(query)
  if (!t || !q) return false
  return t.includes(q) || (t.length >= 3 && q.includes(t)) || q.split(' ').every((w) => t.includes(w))
}

async function onQuery(q) {
  lastQuery.value = q
  activeChannel.value = null
  channelNext.value = null
  channelBlocks.value = []

  const token = ++channelToken
  if (!q) return

  try {
    let blocks = channelCache.get(q)
    if (!blocks) {
      const found = (await searchChannels(q, 8))
        .filter((ch) => isChannelMatch(ch.title, q))
        .slice(0, 3)

      blocks = await Promise.all(
        found.map(async (ch) => {
          try {
            const { tracks: list } = await getChannelUploads(ch.id, undefined, 5)
            return { ...ch, previews: list.slice(0, 4) }
          } catch {
            return { ...ch, previews: [] }
          }
        }),
      )
      channelCache.set(q, blocks)
    }
    // abaikan hasil lama kalau sudah ada pencarian yang lebih baru
    if (token === channelToken) channelBlocks.value = blocks
  } catch (e) {
    console.error(e)
  }
}

// pilih lagu dari pratinjau channel -> antrian = pratinjau itu
function onPreviewSelect(track, list) {
  setQueue(list, track)
  playSafe(track)
}

async function openChannel(ch) {
  if (!activeChannel.value) savedTracks = tracks.value // simpan hasil pencarian untuk tombol kembali
  activeChannel.value = ch
  channelLoading.value = true
  tracks.value = []
  try {
    const { tracks: list, nextPageToken } = await getChannelUploads(ch.id)
    tracks.value = await addDurations(list)
    channelNext.value = nextPageToken
  } catch (e) {
    console.error(e)
  } finally {
    channelLoading.value = false
  }
}

async function loadMoreChannel() {
  if (!channelNext.value || channelLoading.value) return
  channelLoading.value = true
  try {
    const { tracks: list, nextPageToken } = await getChannelUploads(
      activeChannel.value.id,
      channelNext.value,
    )
    tracks.value = [...tracks.value, ...(await addDurations(list))]
    channelNext.value = nextPageToken
  } catch (e) {
    console.error(e)
  } finally {
    channelLoading.value = false
  }
}

function closeChannel() {
  activeChannel.value = null
  channelNext.value = null
  tracks.value = savedTracks
}

// ============================== //

function onResults(results) {
  activeChannel.value = null
  channelNext.value = null
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

/* ===== Hasil channel ===== */
.channel-results {
  margin-bottom: 24px;
}

.channel-block {
  margin-bottom: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.channel-header:hover {
  background: var(--surface-hover);
}

.channel-header img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.channel-name {
  flex: 1;
  min-width: 0;
  font: 600 15px 'Inter', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.see-all {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font: 500 12px 'Inter', sans-serif;
  color: var(--brass);
}

.preview-list {
  list-style: none;
  margin: 0;
  padding: 0 6px 6px;
}

.preview-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.preview-list li:hover,
.preview-list li.active {
  background: var(--surface-hover);
}

.preview-list li.active .p-title {
  color: var(--brass);
}

.preview-list img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.p-title {
  min-width: 0;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Header saat membuka satu channel ===== */
.channel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.channel-head img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.channel-head h2 {
  margin: 0;
  min-width: 0;
  font: 600 20px 'Fraunces', serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  cursor: pointer;
}

.back-btn:hover {
  border-color: var(--brass);
}

.load-more {
  display: flex;
  margin: 16px auto 0;
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  font: 500 13px 'Inter', sans-serif;
  cursor: pointer;
}

.load-more:hover:not(:disabled) {
  border-color: var(--brass);
}

.load-more:disabled {
  opacity: 0.5;
  cursor: default;
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