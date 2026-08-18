<template>
  <div class="app">
    <header class="app-header">
      <span class="eyebrow">Now Browsing</span>
      <h1>Tukiyem Music</h1>
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
      @play="(t) => { playTrack(t); detailTrack = null }"
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
import { ref, onMounted, watch } from 'vue'
import SearchBar from './components/SearchBar.vue'
import TrackList from './components/TrackList.vue'
import PlayerBar from './components/PlayerBar.vue'
import TrackDetailModal from './components/TrackDetailModal.vue'
import LyricsPanel from './components/LyricsPanel.vue'
import { useYoutubePlayer } from './composables/useYoutubePlayer'

const tracks = ref([])
const isSearching = ref(false)
const shuffle = ref(false)
const repeatMode = ref('off')
const detailTrack = ref(null)
const lyricsOpen = ref(false)

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

// kalau lagu ganti (next/prev/pilih lain), panel lirik tetap terbuka
// dan otomatis nyari lirik lagu yang baru lewat prop currentTrack

function onResults(results) {
  tracks.value = results
}

function onSelect(track) {
  playTrack(track)
}

function currentIndex() {
  if (!currentTrack.value) return -1
  return tracks.value.findIndex((t) => t.id.videoId === currentTrack.value.id.videoId)
}

function playNext() {
  if (tracks.value.length === 0) return

  if (shuffle.value) {
    const randomIdx = Math.floor(Math.random() * tracks.value.length)
    playTrack(tracks.value[randomIdx])
    return
  }

  const idx = currentIndex()
  let nextIdx = idx + 1

  if (nextIdx >= tracks.value.length) {
    if (repeatMode.value === 'all') {
      nextIdx = 0
    } else {
      return // sudah di lagu terakhir, berhenti
    }
  }

  playTrack(tracks.value[nextIdx])
}

function playPrevious() {
  if (tracks.value.length === 0) return

  const idx = currentIndex()
  let prevIdx = idx - 1

  if (prevIdx < 0) {
    prevIdx = repeatMode.value === 'all' ? tracks.value.length - 1 : 0
  }

  playTrack(tracks.value[prevIdx])
}

function toggleShuffle() {
  shuffle.value = !shuffle.value
}

function cycleRepeat() {
  const modes = ['off', 'all', 'one']
  const idx = modes.indexOf(repeatMode.value)
  repeatMode.value = modes[(idx + 1) % modes.length]
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
</style>