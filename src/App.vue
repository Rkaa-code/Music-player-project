<template>
  <PlaylistSidebar :playing-id="currentTrack?.id?.videoId" @play="onPlaylistPlay" />

  <div class="app">
    <ContextMenu
      @play="onMenuPlay"
      @play-next="queueNext"
      @add-queue="queueEnd"
      @detail="(t) => (detailTrack = t)"
    />
    <header class="app-header">
      <span class="eyebrow">Now Browsing</span>
      <h1>LRMusic</h1>
    </header>

    <SearchBar @results="onResults" @searching="isSearching = $event" />

    <p v-if="tracks.length === 0" class="empty-state">
      {{ isSearching ? 'Lagu tidak ditemukan.' : 'Memuat lagu trending...' }}
    </p>
    <h2 v-else-if="!isSearching" class="section-label">Trending Sekarang</h2>

    <TrackList
      :tracks="tracks"
      :playing-id="currentTrack?.id?.videoId"
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
      @toggle-play="togglePlay"
      @seek="seekTo"
      @volume-change="setVolume"
      @prev="playPrevious"
      @next="playNext"
      @toggle-shuffle="toggleShuffle"
      @cycle-repeat="cycleRepeat"
      @show-detail="detailTrack = currentTrack"
      @toggle-lyrics="lyricsOpen = !lyricsOpen"
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
import { ref, onMounted } from 'vue'
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


const { resolveTrack } = useYoutubeMatch(searchYoutube)

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

onMounted(() => initPlayer())

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

// pilih lagu dari hasil pencarian/trending -> antrian = daftar itu
function onSelect(track) {
  queue.value = tracks.value
  playSafe(track)
}

// pilih lagu dari dalam sebuah playlist (sidebar) -> antrian = isi playlist itu
function onPlaylistPlay(track, playlist) {
  queue.value = playlist.tracks
  playSafe(track)
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

function currentIndex() {
  if (!currentTrack.value) return -1
  return queue.value.findIndex((t) => t.id.videoId === currentTrack.value.id.videoId)
}

function playNext() {
  if (queue.value.length === 0) return

  if (shuffle.value) {
    const randomIdx = Math.floor(Math.random() * queue.value.length)
    playSafe(queue.value[randomIdx], 1)
    return
  }

  const idx = currentIndex()
  let nextIdx = idx + 1

  if (nextIdx >= queue.value.length) {
    if (repeatMode.value === 'all') {
      nextIdx = 0
    } else {
      return // sudah di lagu terakhir, berhenti
    }
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

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
}

.app {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  margin-left: 260px;
  padding: 24px clamp(16px, 4vw, 48px) 130px;
  font-family: 'Inter', sans-serif;
}

.app-header {
  margin-bottom: 28px;
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
  }
}
</style>