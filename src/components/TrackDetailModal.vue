<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="track" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal">
          <div class="cover-wrap" @click="$emit('play', track)">
            <img class="cover" :src="coverUrl" :alt="track.snippet.title" />

            <iframe
              v-if="mountPreview"
              class="cover-preview"
              :class="{ 'is-visible': showPreview }"
              :src="previewSrc"
              frameborder="0"
              allow="autoplay; encrypted-media"
              tabindex="-1" 
              />

            <button class="close-btn" @click.stop="$emit('close')" aria-label="Tutup">
              <X :size="16" />
            </button>

            <div class="cover-play">
              <Play :size="26" fill="currentColor" :stroke-width="0" />
            </div>

            <div class="cover-caption">
              <p v-if="track.snippet.channelTitle" class="channel">
                {{ track.snippet.channelTitle }}
              </p>
              <h2 class="title">{{ track.snippet.title }}</h2>
            </div>
          </div>

          <div class="tear">
            <span class="tear-cap tear-cap-left" />
            <span class="tear-line" />
            <span class="tear-cap tear-cap-right" />
          </div>

          <div class="notes">
            <p v-if="track.snippet.publishedAt" class="meta-row">
              <span class="meta-label">Dipublikasikan</span>
              <span class="meta-value">{{ formatDate(track.snippet.publishedAt) }}</span>
            </p>

            <p v-if="track.snippet.description" class="description">
              {{ track.snippet.description }}
            </p>

            <div class="actions">
              <button class="play-btn" @click="$emit('play', track)">
                <Play :size="15" fill="currentColor" :stroke-width="0" />
                Putar Lagu
              </button>
              <a
                class="youtube-link"
                :href="`https://www.youtube.com/watch?v=${track.id.videoId}`"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka di YouTube ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { X, Play } from 'lucide-vue-next'

const props = defineProps({
  track: { type: Object, default: null },
})

defineEmits(['close', 'play'])

const coverUrl = computed(() => {
  const thumbs = props.track?.snippet?.thumbnails
  return thumbs?.high?.url || thumbs?.medium?.url || thumbs?.default?.url
})

// siklus: cover statis -> (preload video tersembunyi) -> fade-in video ->
// video terlihat penuh beberapa detik -> fade-out -> balik ke cover -> ulang
const PREVIEW_START = 15
const PREVIEW_END = 45 // window klip di-embed lebih lebar dari waktu tampil, biar ada slack loading
const STATIC_DURATION_MS = 8000 // durasi cover statis sebelum preview berikutnya
const PRELOAD_MS = 1200 // video dimuat/buffering dulu tersembunyi sebelum fade-in ditrigger
const PREVIEW_VISIBLE_MS = 7000 // durasi video BENAR-BENAR terlihat penuh (5–8 detik)
const FADE_MS = 600 // harus sama dengan durasi transition di CSS .preview-fade

const mountPreview = ref(false) // iframe ada di DOM (loading) atau tidak
const showPreview = ref(false) // iframe di-fade-in (opacity 1) atau tidak

let timers = []
function schedule(fn, delay) {
  timers.push(setTimeout(fn, delay))
}
function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

function runCycle() {
  // fase 1: cover statis tampil
  schedule(() => {
    // fase 2: mount iframe tersembunyi, biarkan video mulai buffering/muter
    mountPreview.value = true

    schedule(() => {
      // fase 3: fade-in — video sudah punya waktu buffer, jadi begitu muncul langsung mulus
      showPreview.value = true

      schedule(() => {
        // fase 4: fade-out balik ke cover
        showPreview.value = false

        schedule(() => {
          // fase 5: lepas iframe dari DOM, ulangi siklus dari awal
          mountPreview.value = false
          runCycle()
        }, FADE_MS)
      }, PREVIEW_VISIBLE_MS)
    }, PRELOAD_MS)
  }, STATIC_DURATION_MS)
}

function startCycle() {
  mountPreview.value = false
  showPreview.value = false
  runCycle()
}

function stopCycle() {
  clearTimers()
  mountPreview.value = false
  showPreview.value = false
}

watch(
  () => props.track?.id?.videoId,
  (videoId) => {
    stopCycle()
    if (videoId) startCycle()
  },
  { immediate: true }
)

onBeforeUnmount(stopCycle)

const previewSrc = computed(() => {
  const videoId = props.track?.id?.videoId
  if (!videoId) return ''
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    start: String(PREVIEW_START),
    end: String(PREVIEW_END),
    loop: '1',
    playlist: videoId,
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    disablekb: '1',
    fs: '0',
    playsinline: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
})

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 32px;
}

.modal {
  position: relative;
  width: 100%;
  max-width: 640px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 14px 14px 0 rgba(0, 0, 0, 0.35);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.modal::-webkit-scrollbar {
  width: 6px;
}
.modal::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

/* ---- cover, image-forward with overlaid caption ---- */
.cover-wrap {
  position: relative;
  aspect-ratio: 16 / 8;
  flex-shrink: 0;
  cursor: pointer;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease; /* FADE_MS di JS harus sama dengan angka ini (600ms) */
}

.cover-preview.is-visible {
  opacity: 1;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.6s ease;
}
.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.45);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  border-color: var(--brass);
}

.cover-play {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 44px;
  height: 44px;
  border-radius: 4px;
  border: 1px solid var(--brass);
  background: rgba(0, 0, 0, 0.4);
  color: var(--brass);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  z-index: 2;
}

.cover-wrap:hover .cover-play {
  opacity: 1;
  transform: translateX(0);
}

.cover-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 48px 28px 22px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.55) 60%, transparent);
  z-index: 2;
}

.channel {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brass);
  margin: 0 0 6px;
}

.title {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 28px;
  line-height: 1.25;
  margin: 0;
  color: var(--text);
}

/* ---- ticket-style tear divider ---- */
.tear {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tear-line {
  flex: 1;
  height: 0;
  border-top: 2px dashed var(--border);
}

.tear-cap {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.72);
  flex-shrink: 0;
}

.tear-cap-left {
  margin-left: -7px;
}

.tear-cap-right {
  margin-right: -7px;
}

/* ---- liner notes body ---- */
.notes {
  padding: 24px 30px 32px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  margin: 0 0 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.meta-label {
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.meta-value {
  color: var(--text);
  text-align: right;
}

.description {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-muted);
  white-space: pre-line;
  margin: 0 0 28px;
  padding-left: 16px;
  border-left: 2px solid var(--border);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--brass);
  border: 1.5px solid var(--brass);
  padding: 11px 22px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.play-btn:hover {
  background: var(--brass);
  color: #1a1608;
}

.youtube-link {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  border-bottom: 1px dotted var(--text-muted);
  white-space: nowrap;
}

.youtube-link:hover {
  color: var(--text);
  border-bottom-color: var(--text);
}

/* ---- transitions ---- */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal,
.modal-fade-leave-active .modal {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.modal-fade-enter-from .modal,
.modal-fade-leave-to .modal {
  opacity: 0;
  transform: translateY(14px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active,
  .modal-fade-enter-active .modal,
  .modal-fade-leave-active .modal,
  .cover-preview {
    transition: none !important;
  }
}

@media (max-width: 560px) {
  .modal-overlay {
    padding: 16px;
  }
  .title {
    font-size: 22px;
  }
  .notes {
    padding: 20px 20px 24px;
  }
}
</style>