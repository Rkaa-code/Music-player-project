import { ref, watch } from 'vue'

const STORAGE_KEY = 'tukiyem_playlists_v1'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(playlists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists))
  } catch {
    // localStorage penuh atau diblokir browser (mode privat) — gagal diam-diam,
    // state tetap jalan di memori untuk sesi ini
  }
}

function makeId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// state singleton di luar fungsi -> semua komponen yang panggil usePlaylists()
// berbagi state reaktif yang sama, tanpa perlu provide/inject
const playlists = ref(loadFromStorage())

watch(playlists, (val) => saveToStorage(val), { deep: true })

export function usePlaylists() {
  function createPlaylist(name) {
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    const playlist = { id: makeId(), name: trimmed, createdAt: Date.now(), tracks: [] }
    playlists.value.push(playlist)
    return playlist
  }

  function deletePlaylist(id) {
    playlists.value = playlists.value.filter((p) => p.id !== id)
  }

  function renamePlaylist(id, name) {
    const trimmed = (name || '').trim()
    if (!trimmed) return
    const playlist = playlists.value.find((p) => p.id === id)
    if (playlist) playlist.name = trimmed
  }

  function isTrackInPlaylist(playlistId, videoId) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    return !!playlist?.tracks.some((t) => t.id.videoId === videoId)
  }

  function addTrackToPlaylist(playlistId, track) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (!playlist || !track) return
    if (playlist.tracks.some((t) => t.id.videoId === track.id.videoId)) return
    playlist.tracks.push(track)
  }

  function removeTrackFromPlaylist(playlistId, videoId) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (!playlist) return
    playlist.tracks = playlist.tracks.filter((t) => t.id.videoId !== videoId)
  }

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    isTrackInPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  }
}