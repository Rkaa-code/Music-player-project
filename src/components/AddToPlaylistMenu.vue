<template>
  <div class="add-to-playlist" ref="rootEl">
    <button
      class="ctrl-btn playlist-btn"
      :class="{ active: open }"
      title="Tambah ke playlist"
      @click="open = !open"
    >
      <ListMusic :size="16" :stroke-width="2" />
    </button>

    <div v-if="open" class="menu">
      <p class="menu-title">Tambah ke playlist</p>

      <p v-if="playlists.length === 0" class="menu-empty">Belum ada playlist.</p>

      <ul v-else class="menu-list">
        <li v-for="pl in playlists" :key="pl.id" class="menu-item" @click="toggleTrack(pl)">
          <span class="check" :class="{ checked: isTrackInPlaylist(pl.id, track?.id?.videoId) }">
            <Check v-if="isTrackInPlaylist(pl.id, track?.id?.videoId)" :size="12" :stroke-width="3" />
          </span>
          <span class="menu-item-name">{{ pl.name }}</span>
        </li>
      </ul>

      <form class="new-form" @submit.prevent="handleCreate">
        <input v-model="newName" type="text" placeholder="Playlist baru..." maxlength="60" />
        <button type="submit" :disabled="!newName.trim()">+</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ListMusic, Check } from 'lucide-vue-next'
import { usePlaylists } from '../composables/usePlaylists'

const props = defineProps({
  track: { type: Object, default: null },
})

const { playlists, createPlaylist, isTrackInPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } = usePlaylists()

const open = ref(false)
const newName = ref('')
const rootEl = ref(null)

function toggleTrack(pl) {
  if (!props.track) return
  const videoId = props.track.id.videoId
  if (isTrackInPlaylist(pl.id, videoId)) {
    removeTrackFromPlaylist(pl.id, videoId)
  } else {
    addTrackToPlaylist(pl.id, props.track)
  }
}

function handleCreate() {
  const pl = createPlaylist(newName.value)
  newName.value = ''
  if (pl && props.track) addTrackToPlaylist(pl.id, props.track)
}

function onClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.add-to-playlist {
  position: relative;
}

.ctrl-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: color 0.15s ease, transform 0.1s ease;
}
.ctrl-btn:hover { color: var(--text); transform: scale(1.08); }
.ctrl-btn.active { color: var(--brass); }

.menu {
  position: absolute;
  bottom: calc(100% + 10px);
  right: -8px;
  width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 10px;
  z-index: 20;
}

.menu-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 8px;
}

.menu-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 0;
}

.menu-list {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
}
.menu-item:hover { background: var(--surface-hover); }

.check {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--bg);
}
.check.checked { background: var(--brass); border-color: var(--brass); }

.menu-item-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.new-form {
  display: flex;
  gap: 6px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
}
.new-form input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--text);
  font-size: 12.5px;
  min-width: 0;
}
.new-form button {
  background: var(--brass);
  border: none;
  border-radius: 6px;
  width: 26px;
  color: var(--bg);
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}
.new-form button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>