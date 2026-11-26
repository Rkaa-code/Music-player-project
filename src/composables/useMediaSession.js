import { watch } from 'vue'

export function useMediaSession({ track, isPlaying, currentTime, duration, handlers }) {
  if (!('mediaSession' in navigator)) return

  watch(track, (t) => {
    if (!t) return
    const th = t.snippet?.thumbnails
    const art = [th?.high, th?.medium, th?.default].filter(Boolean)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.snippet?.title ?? '',
      artist: t.snippet?.channelTitle ?? '',
      album: 'LRMP',
      artwork: art.map((a) => ({ src: a.url, sizes: `${a.width ?? 120}x${a.height ?? 90}` })),
    })
  }, { immediate: true })

  watch(isPlaying, (p) => {
    navigator.mediaSession.playbackState = p ? 'playing' : 'paused'
  }, { immediate: true })

  // posisi lagu di notifikasi (progress bar)
  watch(currentTime, (t) => {
    if (!duration.value) return
    try {
      navigator.mediaSession.setPositionState({
        duration: duration.value,
        position: Math.min(t, duration.value),
        playbackRate: 1,
      })
    } catch {}
  })

  const set = (action, fn) => {
    try { navigator.mediaSession.setActionHandler(action, fn) } catch {}
  }
  set('play', handlers.play)
  set('pause', handlers.pause)
  set('previoustrack', handlers.prev)
  set('nexttrack', handlers.next)
  set('seekto', (d) => handlers.seek(d.seekTime))
}