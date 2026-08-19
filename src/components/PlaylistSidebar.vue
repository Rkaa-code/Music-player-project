<template>
  <aside class="playlist-sidebar">
    <div v-if="!selected" class="sidebar-view">
      <div class="sidebar-header">
        <h2>Playlist</h2>
      </div>

      <form class="new-playlist-form" @submit.prevent="handleCreate">
        <input v-model="newPlaylistName" type="text" placeholder="Nama playlist baru..." maxlength="60" />
        <button type="submit" :disabled="!newPlaylistName.trim()">+</button>
      </form>

      <p v-if="playlists.length === 0" class="empty-hint">Belum ada playlist. Buat satu dulu.</p>

      <ul v-else class="playlist-list">
        <li v-for="pl in playlists" :key="pl.id" class="playlist-row" @click="selected = pl">
          <div class="playlist-info">
            <span class="playlist-name">{{ pl.name }}</span>
            <span class="playlist-count">{{ pl.tracks.length }} lagu</span>
          </div>
          <button class="icon-btn danger" title="Hapus playlist" @click.stop="handleDeletePlaylist(pl)">✕</button>
        </li>
      </ul>
    </div>

    <div v-else class="sidebar-view detail-view">
      <div class="sidebar-header detail-header">
        <button class="icon-btn" title="Kembali" @click="selected = null">←</button>
        <h2 class="detail-title">{{ selected.name }}</h2>
      </div>

      <button class="play-all-btn" :disabled="selected.tracks.length === 0" @click="handlePlayAll">
        ▶ Putar Playlist
      </button>

      <p v-if="selected.tracks.length === 0" class="empty-hint">Playlist ini masih kosong.</p>

      <ul v-else class="track-list">
        <li
          v-for="track in selected.tracks"
          :key="track.id.videoId"
          class="track-row"
          :class="{ active: track.id.videoId === playingId }"
        >
          <img class="thumb" :src="track.snippet?.thumbnails?.default?.url" :alt="track.snippet?.title" />
          <div class="track-meta" @click="$emit('play', track, selected)">
            <span class="track-title">{{ track.snippet?.title }}</span>
            <span class="track-channel">{{ track.snippet?.channelTitle }}</span>
          </div>
          <button
            class="icon-btn danger"
            title="Hapus dari playlist"
            @click="removeTrackFromPlaylist(selected.id, track.id.videoId)"
          >
            ✕
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup>
import { ref, watch } from 'vue'
import { usePlaylists } from '../composables/usePlaylists'

defineProps({
  playingId: { type: String, default: null },
})
const emit = defineEmits(['play'])

const { playlists, createPlaylist, deletePlaylist, removeTrackFromPlaylist } = usePlaylists()

const newPlaylistName = ref('')
const selected = ref(null)

// kalau playlist yang lagi dibuka kebetulan terhapus, otomatis balik ke daftar
watch(
  playlists,
  (val) => {
    if (selected.value && !val.find((p) => p.id === selected.value.id)) selected.value = null
  },
  { deep: true }
)

function handleCreate() {
  createPlaylist(newPlaylistName.value)
  newPlaylistName.value = ''
}

function handleDeletePlaylist(pl) {
  if (confirm(`Hapus playlist "${pl.name}"?`)) deletePlaylist(pl.id)
}

function handlePlayAll() {
  if (selected.value.tracks.length > 0) emit('play', selected.value.tracks[0], selected.value)
}
</script>

<style scoped>
.playlist-sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 260px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px 14px;
  overflow-y: auto;
  font-family: 'Inter', sans-serif;
}
.sidebar-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.sidebar-header h2 { font-family: 'Fraunces', serif; font-size: 18px; margin: 0; color: var(--text); }
.new-playlist-form { display: flex; gap: 6px; margin-bottom: 16px; }
.new-playlist-form input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; color: var(--text); font-size: 13px; }
.new-playlist-form button { background: var(--brass); border: none; border-radius: 6px; width: 28px; color: var(--bg); font-weight: 600; cursor: pointer; }
.new-playlist-form button:disabled { opacity: 0.4; cursor: not-allowed; }
.empty-hint { color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px 8px; }
.playlist-list, .track-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.playlist-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.playlist-row:hover { background: var(--surface-hover); }
.playlist-info { display: flex; flex-direction: column; min-width: 0; }
.playlist-name { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.playlist-count { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); }
.icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; line-height: 1; padding: 4px; border-radius: 4px; }
.icon-btn:hover { color: var(--text); background: var(--bg); }
.icon-btn.danger:hover { color: var(--coral); }
.detail-header { gap: 10px; }
.detail-title { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.play-all-btn { width: 100%; background: var(--coral); border: none; border-radius: 8px; color: var(--bg); font-weight: 600; font-size: 13px; padding: 10px; margin-bottom: 14px; cursor: pointer; }
.play-all-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.track-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; }
.track-row:hover { background: var(--surface-hover); }
.track-row.active { background: var(--surface-hover); outline: 1px solid var(--brass); }
.thumb { width: 32px; height: 32px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
.track-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; cursor: pointer; }
.track-title { font-size: 12.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-channel { font-size: 11px; color: var(--text-muted); }

@media (max-width: 720px) {
  .playlist-sidebar { position: static; width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
}
</style>