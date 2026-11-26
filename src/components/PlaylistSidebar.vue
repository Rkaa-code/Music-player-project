<template>
  <aside class="playlist-sidebar" :class="{ open }">
    <div v-if="!selected" class="sidebar-view">
      <div class="sidebar-header">
        <h2>Playlist</h2>
        <button class="icon-btn close-btn" title="Tutup" aria-label="Tutup playlist" @click="emit('close')">
          <X :size="18" :stroke-width="2" />
        </button>
      </div>

      <form class="new-playlist-form" @submit.prevent="handleCreate">
        <input v-model="newPlaylistName" type="text" placeholder="Nama playlist baru..." maxlength="60" />
        <button type="submit" :disabled="!newPlaylistName.trim()">+</button>
      </form>

      <ImportPlaylist @import="handleImport" />

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

        <form v-if="isEditingName" class="rename-form" @submit.prevent="handleRenameSave">
          <input
            ref="renameInputEl"
            v-model="editedName"
            type="text"
            maxlength="60"
            @keydown.esc="cancelRename"
            @blur="handleRenameSave"
          />
        </form>
        <template v-else>
          <h2 class="detail-title">{{ selected.name }}</h2>
          <button class="icon-btn" title="Ganti nama" @click="startRename">
            <Pencil :size="13" :stroke-width="2" />
          </button>
        </template>

        <button class="icon-btn close-btn" title="Tutup" aria-label="Tutup playlist" @click="emit('close')">
          <X :size="18" :stroke-width="2" />
        </button>
      </div>

      <button class="play-all-btn" :disabled="selected.tracks.length === 0" @click="handlePlayAll">
        ▶ Putar Playlist
      </button>

      <p v-if="selected.tracks.length === 0" class="empty-hint">Playlist ini masih kosong.</p>

      <draggable
        v-else
        v-model="orderedTracks"
        :item-key="trackKey"
        handle=".drag-handle"
        ghost-class="ghost-track"
        drag-class="dragging-track"
        :animation="200"
        tag="ul"
        class="track-list"
      >
        <template #item="{ element: track }">
          <li
            class="track-row"
            :class="{ active: !!track.id.videoId && track.id.videoId === playingId }"
            @contextmenu="openMenu($event, track, selected)"
          >
            <span class="drag-handle" title="Seret untuk urutkan">
              <GripVertical :size="14" :stroke-width="2" />
            </span>
            <img
              v-if="track.snippet?.thumbnails?.default?.url"
              class="thumb"
              :src="track.snippet.thumbnails.default.url"
              :alt="track.snippet?.title"
            />
            <div v-else class="thumb thumb-empty"></div>
            <div class="track-meta" @click="$emit('play', track, selected)">
              <span class="track-title">{{ track.snippet?.title }}</span>
              <span class="track-channel">{{ track.snippet?.channelTitle }}</span>
            </div>
            <button
              class="icon-btn more-btn"
              title="Menu"
              aria-label="Menu lagu"
              @click.stop="openMenu($event, track, selected)"
            >
              <MoreVertical :size="16" :stroke-width="2" />
            </button>
            <button
              class="icon-btn danger"
              title="Hapus dari playlist"
              @click="removeTrackFromPlaylist(selected.id, trackKey(track))"
            >
              ✕
            </button>
          </li>
        </template>
      </draggable>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import { GripVertical, Pencil, X, MoreVertical } from 'lucide-vue-next'
import ImportPlaylist from './ImportPlaylist.vue'
import { usePlaylists, trackKey } from '../composables/usePlaylists'
import { useTrackMenu } from '../composables/useTrackMenu'

defineProps({
  // dipakai di layar kecil: sidebar jadi drawer yang digeser masuk
  open: { type: Boolean, default: false },
  playingId: { type: String, default: null },
})
const emit = defineEmits(['play', 'close'])

const { openMenu } = useTrackMenu()

const {
  playlists,
  createPlaylist,
  importPlaylist,
  deletePlaylist,
  renamePlaylist,
  removeTrackFromPlaylist,
  reorderTracks,
} = usePlaylists()

const newPlaylistName = ref('')
const selected = ref(null)

const isEditingName = ref(false)
const editedName = ref('')
const renameInputEl = ref(null)

// kalau playlist yang lagi dibuka kebetulan terhapus, otomatis balik ke daftar
watch(
  playlists,
  (val) => {
    if (selected.value && !val.find((p) => p.id === selected.value.id)) selected.value = null
  },
  { deep: true }
)

// v-model buat <draggable>: getter baca urutan sekarang, setter simpan urutan baru
const orderedTracks = computed({
  get: () => selected.value?.tracks ?? [],
  set: (newOrder) => {
    if (selected.value) reorderTracks(selected.value.id, newOrder)
  },
})

function handleCreate() {
  createPlaylist(newPlaylistName.value)
  newPlaylistName.value = ''
}

function handleImport({ name, tracks }) {
  const created = importPlaylist(name, tracks)
  // ambil lewat find() supaya yang dipilih adalah versi reaktifnya
  selected.value = playlists.value.find((p) => p.id === created.id) ?? null
}

function handleDeletePlaylist(pl) {
  if (confirm(`Hapus playlist "${pl.name}"?`)) deletePlaylist(pl.id)
}

function handlePlayAll() {
  if (selected.value.tracks.length > 0) emit('play', selected.value.tracks[0], selected.value)
}

async function startRename() {
  editedName.value = selected.value.name
  isEditingName.value = true
  await nextTick()
  renameInputEl.value?.focus()
  renameInputEl.value?.select()
}

function handleRenameSave() {
  if (!isEditingName.value) return // cegah blur ganda kepanggil setelah esc/submit
  const trimmed = editedName.value.trim()
  if (trimmed && trimmed !== selected.value.name) {
    renamePlaylist(selected.value.id, trimmed)
  }
  isEditingName.value = false
}

function cancelRename() {
  isEditingName.value = false
}
</script>

<style scoped>
.playlist-sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 260px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  /* padding bawah = tinggi player bar (--player-h dari PlayerBar) + sedikit ruang, biar lagu paling bawah tidak tertutup */
  padding: 20px 14px calc(var(--player-h, 0px) + 20px);
  overflow-y: auto;
  font-family: 'Inter', sans-serif;
}

/* scrollbar bertema: track transparan, thumb warna border, jadi brass saat di-hover (Chrome, Edge, Safari) */
.playlist-sidebar::-webkit-scrollbar {
  width: 10px;
}
.playlist-sidebar::-webkit-scrollbar-track {
  background: transparent;
}
.playlist-sidebar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 999px;
  border: 3px solid var(--surface); /* bikin thumb tampak lebih tipis dan melayang */
}
.playlist-sidebar::-webkit-scrollbar-thumb:hover {
  background: var(--brass);
}
.playlist-sidebar::-webkit-scrollbar-thumb:active {
  background: var(--coral);
}

/* Firefox: tidak mengenal ::-webkit-scrollbar, jadi pakai properti standar.
   Dibungkus @supports supaya Chrome tidak mengabaikan styling di atas */
@supports not selector(::-webkit-scrollbar) {
  .playlist-sidebar {
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
}
.sidebar-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.sidebar-header h2 { font-family: 'Fraunces', serif; font-size: 18px; margin: 0; color: var(--text); }
.new-playlist-form { display: flex; gap: 6px; margin-bottom: 12px; }
.new-playlist-form input { flex: 1; min-width: 0; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; color: var(--text); font-size: 13px; }
.new-playlist-form button { background: var(--brass); border: none; border-radius: 6px; width: 28px; color: var(--bg); font-weight: 600; cursor: pointer; }
.new-playlist-form button:disabled { opacity: 0.4; cursor: not-allowed; }
.empty-hint { color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px 8px; }
.playlist-list, .track-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.playlist-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.playlist-row:hover { background: var(--surface-hover); }
.playlist-info { display: flex; flex-direction: column; min-width: 0; }
.playlist-name { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.playlist-count { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); }
.icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; line-height: 1; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { color: var(--text); background: var(--bg); }
.icon-btn.danger:hover { color: var(--coral); }

/* tombol tutup & menu hanya muncul saat dibutuhkan (layar kecil / layar sentuh) */
.close-btn { display: none; margin-left: auto; }
.more-btn { display: none; }

.detail-header { gap: 6px; }
.detail-title {
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.rename-form {
  flex: 1;
  min-width: 0;
}
.rename-form input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--brass);
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--text);
  font-family: 'Fraunces', serif;
  font-size: 15px;
}

.play-all-btn { width: 100%; background: var(--coral); border: none; border-radius: 8px; color: var(--bg); font-weight: 600; font-size: 13px; padding: 10px; margin-bottom: 14px; cursor: pointer; }
.play-all-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.track-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--surface);
  -webkit-touch-callout: none;
}
.track-row:hover { background: var(--surface-hover); }
.track-row.active { background: var(--surface-hover); outline: 1px solid var(--brass); }

.drag-handle {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  cursor: grab;
  flex-shrink: 0;
  touch-action: none;
}
.drag-handle:active { cursor: grabbing; }

.ghost-track { opacity: 0.35; }
.dragging-track {
  background: var(--surface-hover) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.thumb { width: 32px; height: 32px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
.thumb-empty { background: var(--bg); }
.track-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; cursor: pointer; }
.track-title { font-size: 12.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-channel { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* layar sentuh tidak punya klik-kanan, jadi tombol menu ditampilkan */
@media (hover: none) {
  .more-btn { display: flex; }
}

/* ===== HP: sidebar jadi drawer yang digeser masuk dari kiri ===== */
@media (max-width: 720px) {
  .playlist-sidebar {
    width: min(85vw, 320px);
    height: 100dvh;
    transform: translateX(-100%);
    visibility: hidden;
    transition: transform 0.25s ease, visibility 0s linear 0.25s;
    z-index: 100;
    /* drawer menutupi player bar, jadi tidak perlu ruang ekstra untuk player */
    padding:
      calc(20px + env(safe-area-inset-top))
      14px
      calc(20px + env(safe-area-inset-bottom));
    overscroll-behavior: contain;
  }

  .playlist-sidebar.open {
    transform: translateX(0);
    visibility: visible;
    transition: transform 0.25s ease, visibility 0s;
    box-shadow: 8px 0 30px rgba(0, 0, 0, 0.5);
  }

  .close-btn { display: flex; }

  /* font 16px supaya iOS tidak zoom otomatis saat input difokus */
  .new-playlist-form input,
  .rename-form input { font-size: 16px; padding: 8px 10px; }
  .new-playlist-form button { width: 40px; font-size: 18px; }

  /* target sentuh lebih besar */
  .icon-btn { min-width: 36px; min-height: 36px; }
  .playlist-row { padding: 12px 10px; }
  .playlist-name { font-size: 14px; }
  .track-row { padding: 8px; gap: 6px; }
  .thumb { width: 40px; height: 40px; }
  .track-title { font-size: 14px; }
  .track-channel { font-size: 12px; }
  .play-all-btn { padding: 12px; font-size: 14px; }
  .drag-handle { padding: 10px 4px; }
}

@media (prefers-reduced-motion: reduce) {
  .playlist-sidebar { transition: none; }
}
</style>