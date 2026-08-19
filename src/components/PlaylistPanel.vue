<template>
  <Teleport to="body">
    <Transition name="scrim-fade">
      <div v-if="open" class="playlist-scrim" @click.self="$emit('close')">
        <Transition name="panel-slide-left" appear>
          <aside class="playlist-panel">
            <header class="panel-header">
              <div>
                <p class="eyebrow">Koleksi</p>
                <h3 class="panel-title">Playlist</h3>
              </div>
              <button class="close-btn" @click="$emit('close')" aria-label="Tutup">
                <X :size="16" />
              </button>
            </header>

            <div class="panel-body">
              <section v-if="currentTrack" class="quick-add">
                <p class="section-label">Tambah lagu ini</p>

                <div class="quick-track">
                  <img class="quick-thumb" :src="currentTrack.snippet.thumbnails.default.url" />
                  <div class="quick-info">
                    <p class="quick-title">{{ currentTrack.snippet.title }}</p>
                    <p class="quick-channel">{{ currentTrack.snippet.channelTitle }}</p>
                  </div>
                </div>

                <div v-if="playlists.length" class="chip-row">
                  <button
                    v-for="p in playlists"
                    :key="p.id"
                    class="chip"
                    :class="{ active: isTrackInPlaylist(p.id, currentTrack.id.videoId) }"
                    @click="toggleTrack(p)"
                  >
                    <Check v-if="isTrackInPlaylist(p.id, currentTrack.id.videoId)" :size="12" />
                    {{ p.name }}
                  </button>
                </div>

                <form class="new-playlist-form" @submit.prevent="handleCreate">
                  <input
                    v-model="newName"
                    class="new-playlist-input"
                    type="text"
                    placeholder="Nama playlist baru..."
                  />
                  <button class="new-playlist-btn" type="submit" title="Buat playlist">
                    <Plus :size="14" />
                  </button>
                </form>
              </section>

              <div class="tear">
                <span class="tear-cap tear-cap-left" />
                <span class="tear-line" />
                <span class="tear-cap tear-cap-right" />
              </div>

              <section class="playlist-list">
                <p v-if="playlists.length === 0" class="empty-msg">
                  Belum ada playlist. Buat satu di atas.
                </p>

                <div v-for="p in playlists" :key="p.id" class="playlist-group">
                  <button class="playlist-head" @click="toggleExpand(p.id)">
                    <ChevronDown v-if="expanded[p.id]" :size="14" class="chevron" />
                    <ChevronRight v-else :size="14" class="chevron" />
                    <span class="playlist-name">{{ p.name }}</span>
                    <span class="playlist-count">{{ p.tracks.length }}</span>
                    <span class="delete-playlist" title="Hapus playlist" @click.stop="handleDelete(p)">
                      <Trash2 :size="13" />
                    </span>
                  </button>

                  <ul v-if="expanded[p.id]" class="track-list">
                    <li v-if="p.tracks.length === 0" class="empty-msg small">Belum ada lagu.</li>
                    <li
                      v-for="t in p.tracks"
                      :key="t.id.videoId"
                      class="track-row"
                      :class="{ playing: t.id.videoId === playingId }"
                    >
                      <img class="track-thumb" :src="t.snippet.thumbnails.default.url" />
                      <button class="track-title-btn" @click="$emit('play', t, p)">
                        <span class="track-title">{{ t.snippet.title }}</span>
                        <span class="track-channel">{{ t.snippet.channelTitle }}</span>
                      </button>
                      <button
                        class="remove-track"
                        title="Hapus dari playlist"
                        @click="removeTrackFromPlaylist(p.id, t.id.videoId)"
                      >
                        <X :size="13" />
                      </button>
                    </li>
                  </ul>
                </div>
              </section>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { X, Plus, Check, ChevronDown, ChevronRight, Trash2 } from 'lucide-vue-next'
import { usePlaylists } from '../composables/usePlaylists'

const props = defineProps({
  open: { type: Boolean, default: false },
  currentTrack: { type: Object, default: null },
  playingId: { type: String, default: '' },
})

defineEmits(['close', 'play'])

const {
  playlists,
  createPlaylist,
  deletePlaylist,
  isTrackInPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
} = usePlaylists()

const newName = ref('')
const expanded = reactive({})

function toggleExpand(id) {
  expanded[id] = !expanded[id]
}

function handleCreate() {
  const created = createPlaylist(newName.value)
  if (created) {
    newName.value = ''
    expanded[created.id] = true
    if (props.currentTrack) addTrackToPlaylist(created.id, props.currentTrack)
  }
}

function toggleTrack(playlist) {
  if (!props.currentTrack) return
  const videoId = props.currentTrack.id.videoId
  if (isTrackInPlaylist(playlist.id, videoId)) {
    removeTrackFromPlaylist(playlist.id, videoId)
  } else {
    addTrackToPlaylist(playlist.id, props.currentTrack)
  }
}

function handleDelete(playlist) {
  if (confirm(`Hapus playlist "${playlist.name}"?`)) {
    deletePlaylist(playlist.id)
  }
}
</script>

<style scoped>
.playlist-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 40;
  display: flex;
  justify-content: flex-start;
}

.playlist-panel {
  width: min(400px, 100vw);
  height: 100%;
  background: var(--surface);
  border-right: 1px solid var(--border);
  box-shadow: 16px 0 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brass);
  margin: 0 0 6px;
}

.panel-title {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 19px;
  color: var(--text);
  margin: 0;
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.close-btn:hover {
  color: var(--text);
  border-color: var(--brass);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.panel-body::-webkit-scrollbar {
  width: 5px;
}
.panel-body::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.quick-add {
  padding: 20px 22px 4px;
}

.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.quick-track {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.quick-thumb {
  width: 40px;
  height: 40px;
  border-radius: 5px;
  object-fit: cover;
  flex-shrink: 0;
}

.quick-info {
  min-width: 0;
}

.quick-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-channel {
  font-size: 11.5px;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.chip:hover {
  color: var(--text);
  border-color: var(--text-muted);
}

.chip.active {
  background: var(--brass);
  border-color: var(--brass);
  color: #1a1608;
  font-weight: 600;
}

.new-playlist-form {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.new-playlist-input {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--text);
  min-width: 0;
}

.new-playlist-input::placeholder {
  color: var(--text-muted);
}

.new-playlist-input:focus {
  outline: none;
  border-color: var(--brass);
}

.new-playlist-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid var(--brass);
  background: transparent;
  color: var(--brass);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.new-playlist-btn:hover {
  background: var(--brass);
  color: #1a1608;
}

.tear {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.tear-line {
  flex: 1;
  height: 0;
  border-top: 2px dashed var(--border);
}

.tear-cap {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.tear-cap-left {
  margin-right: -6px;
}
.tear-cap-right {
  margin-left: -6px;
}

.playlist-list {
  padding: 16px 0 20px;
}

.empty-msg {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 22px;
}

.empty-msg.small {
  padding: 10px 22px;
  font-size: 12px;
  text-align: left;
}

.playlist-group {
  border-bottom: 1px solid var(--border);
}

.playlist-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 14px 22px;
  cursor: pointer;
  color: var(--text);
  font-family: 'Inter', sans-serif;
}

.chevron {
  color: var(--text-muted);
  flex-shrink: 0;
}

.playlist-name {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.delete-playlist {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s ease, background 0.15s ease;
}

.delete-playlist:hover {
  color: var(--coral);
  background: rgba(226, 118, 92, 0.12);
}

.track-list {
  list-style: none;
  margin: 0;
  padding: 0 12px 10px;
}

.track-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
}

.track-row:hover {
  background: var(--surface-hover);
}

.track-row.playing .track-title {
  color: var(--brass);
}

.track-thumb {
  width: 34px;
  height: 34px;
  border-radius: 5px;
  object-fit: cover;
  flex-shrink: 0;
}

.track-title-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.track-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.track-channel {
  font-size: 11px;
  color: var(--text-muted);
}

.remove-track {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.remove-track:hover {
  color: var(--coral);
  background: rgba(226, 118, 92, 0.12);
}

/* transitions */
.scrim-fade-enter-active,
.scrim-fade-leave-active {
  transition: opacity 0.2s ease;
}
.scrim-fade-enter-from,
.scrim-fade-leave-to {
  opacity: 0;
}

.panel-slide-left-enter-active,
.panel-slide-left-leave-active {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-left-enter-from,
.panel-slide-left-leave-to {
  transform: translateX(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .scrim-fade-enter-active,
  .scrim-fade-leave-active,
  .panel-slide-left-enter-active,
  .panel-slide-left-leave-active {
    transition: none !important;
  }
}

@media (max-width: 480px) {
  .playlist-panel {
    width: 100vw;
  }
}
</style>