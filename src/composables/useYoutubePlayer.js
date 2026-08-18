import { ref, onUnmounted } from 'vue'

const player = ref(null)
const isPlaying = ref(false)
const isReady = ref(false)
const currentTrack = ref(null)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(80)

let progressInterval = null
let endedCallback = null

export function useYoutubePlayer() {
  function initPlayer() {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)

    window.onYouTubeIframeAPIReady = () => {
      player.value = new YT.Player('player', {
        height: '0',
        width: '0',
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onReady: (e) => {
            isReady.value = true
            e.target.setVolume(volume.value)
          },
          onStateChange: (e) => {
            isPlaying.value = e.data === YT.PlayerState.PLAYING
            if (isPlaying.value) {
              duration.value = player.value.getDuration()
              startProgressTracking()
            } else {
              stopProgressTracking()
            }
            if (e.data === YT.PlayerState.ENDED && endedCallback) {
              endedCallback()
            }
          },
        },
      })
    }
  }
  function onEnded(cb) {
    endedCallback = cb
  }

  function startProgressTracking() {
    stopProgressTracking()
    progressInterval = setInterval(() => {
      if (player.value?.getCurrentTime) {
        currentTime.value = player.value.getCurrentTime()
      }
    }, 500)
  }

  function stopProgressTracking() {
    if (progressInterval) clearInterval(progressInterval)
  }

  function playTrack(track) {
    if (!player.value || !isReady.value) {
      console.warn('Player belum siap, coba lagi sebentar')
      return
    }
    player.value.loadVideoById(track.id.videoId)
    player.value.playVideo()
    currentTrack.value = track
    currentTime.value = 0
  }

  function togglePlay() {
    if (!player.value) return
    isPlaying.value ? player.value.pauseVideo() : player.value.playVideo()
  }

  function seekTo(seconds) {
    if (!player.value) return
    player.value.seekTo(seconds, true)
    currentTime.value = seconds
  }

  function setVolume(value) {
    if (!player.value) return
    volume.value = value
    player.value.setVolume(value)
  }

  onUnmounted(() => stopProgressTracking())

  return {
    initPlayer,
    onEnded,
    playTrack,
    togglePlay,
    seekTo,
    setVolume,
    isPlaying,
    isReady,
    currentTrack,
    currentTime,
    duration,
    volume,
  }
}