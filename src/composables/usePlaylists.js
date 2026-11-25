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

// identitas stabil sebuah lagu: lagu import punya `key` (videoId-nya baru ada setelah di-match),
// lagu dari pencarian memakai videoId
export const trackKey = (t) => t?.id?.videoId ?? t?.snippet?.title ?? ''

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

  function importPlaylist(name, tracks) {
    const playlist = {
      id: makeId(),
      name: (name || '').trim() || 'Playlist import',
      createdAt: Date.now(),
      tracks,
    }
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
    return !!videoId && !!playlist?.tracks.some((t) => t.id?.videoId === videoId)
  }

  function addTrackToPlaylist(playlistId, track) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (!playlist || !track) return
    const vid = track.id?.videoId
    const exists = playlist.tracks.some(
      (t) => trackKey(t) === trackKey(track) || (vid && t.id?.videoId === vid)
    )
    if (exists) return
    playlist.tracks.push(track)
  }

  // `key` boleh berupa trackKey(track) atau videoId
  function removeTrackFromPlaylist(playlistId, key) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (!playlist) return
    playlist.tracks = playlist.tracks.filter((t) => trackKey(t) !== key && t.id?.videoId !== key)
  }

  function reorderTracks(playlistId, tracks) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (!playlist) return
    playlist.tracks = tracks
  }

  return {
    playlists,
    createPlaylist,
    importPlaylist,
    deletePlaylist,
    renamePlaylist,
    isTrackInPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderTracks,
  }
}