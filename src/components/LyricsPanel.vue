<template>
  <Teleport to="body">
    <Transition name="scrim-fade">
      <div v-if="track" class="lyrics-scrim" @click.self="$emit('close')">
        <Transition name="panel-slide" appear>
          <aside class="lyrics-panel">
            <header class="panel-header">
              <div class="panel-header-text">
                <p class="eyebrow">Lirik</p>
                <h3 class="track-title">{{ track.snippet.title }}</h3>
                <p class="track-artist">{{ track.snippet.channelTitle }}</p>
              </div>

              <div class="header-actions">
                <button
                  v-if="available"
                  class="icon-btn"
                  :class="{ active: romanizeOn, busy: romanizeBusy }"
                  :title="romanizeOn ? 'Sembunyikan tulisan Latin' : 'Tampilkan tulisan Latin'"
                  :aria-pressed="romanizeOn"
                  aria-label="Tampilkan lirik dalam huruf Latin"
                  @click="toggleRomanize"
                >
                  <Languages :size="16" />
                </button>

                <button class="icon-btn" @click="$emit('close')" aria-label="Tutup">
                  <X :size="16" />
                </button>
              </div>
            </header>

            <div class="lyrics-body">
              <div v-if="status === 'loading'" class="state-msg">Mencari lirik...</div>
              <div v-else-if="status === 'not-found'" class="state-msg">
                Lirik tidak ditemukan untuk lagu ini.
              </div>
              <div v-else-if="status === 'error'" class="state-msg">
                Gagal memuat lirik. Coba lagi nanti.
              </div>

              <ul v-else class="lyrics-list">
                <li
                  v-for="(line, i) in lines"
                  :key="i"
                  :ref="(el) => setLineRef(el, i)"
                  class="lyrics-line"
                  :class="{ active: i === activeIndex, past: i < activeIndex }"
                  @click="$emit('seek', line.time)"
                >
                  <span class="line-text">{{ line.text }}</span>
                  <span v-if="romanizeOn && romanized[i]" class="line-roman">{{ romanized[i] }}</span>
                </li>
              </ul>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { X, Languages } from 'lucide-vue-next'
import { useLyrics } from '../composables/useLyrics'
import { useRomanization } from '../composables/useRomanization'

const props = defineProps({
  track: { type: Object, default: null },
  currentTime: { type: Number, default: 0 },
})

defineEmits(['close', 'seek'])

const trackRef = computed(() => props.track)
const { lines, status } = useLyrics(trackRef)

const {
  enabled: romanizeOn,
  available,
  romanized,
  busy: romanizeBusy,
  toggle: toggleRomanize,
} = useRomanization(lines)

const activeIndex = computed(() => {
  if (!lines.value.length) return -1
  let idx = -1
  for (let i = 0; i < lines.value.length; i++) {
    if (lines.value[i].time <= props.currentTime) idx = i
    else break
  }
  return idx
})

const lineEls = ref([])
function setLineRef(el, i) {
  if (el) lineEls.value[i] = el
}

watch(activeIndex, async (idx) => {
  await nextTick()
  const el = lineEls.value[idx]
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
})

watch(lines, () => {
  lineEls.value = []
})

// tinggi baris berubah saat teks Latin muncul/hilang, jadi pusatkan ulang baris aktif
watch([romanized, romanizeOn], async () => {
  await nextTick()
  const el = lineEls.value[activeIndex.value]
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
})
</script>

<style scoped>
.lyrics-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 40;
  display: flex;
  justify-content: flex-end;
}

.lyrics-panel {
  width: min(400px, 100vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -16px 0 32px rgba(0, 0, 0, 0.35);
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

.panel-header-text {
  min-width: 0;
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

.track-title {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 17px;
  line-height: 1.3;
  color: var(--text);
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.track-artist {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
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

.icon-btn:hover {
  color: var(--text);
  border-color: var(--brass);
}

.icon-btn.active {
  color: var(--brass);
  border-color: var(--brass);
}

.icon-btn.busy {
  animation: busy-pulse 1s ease-in-out infinite;
}

@keyframes busy-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.icon-btn:focus-visible {
  outline: 2px solid var(--coral);
  outline-offset: 2px;
}

.lyrics-body {
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.lyrics-body::-webkit-scrollbar {
  width: 5px;
}
.lyrics-body::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.state-msg {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 40px 12px;
}

.lyrics-list {
  list-style: none;
  margin: 0;
  padding: 40vh 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.lyrics-line {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-muted);
  opacity: 0.55;
  cursor: pointer;
  transition: color 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
  transform-origin: left center;
}

.lyrics-line:hover {
  opacity: 0.85;
  color: var(--text);
}

.lyrics-line.past {
  opacity: 0.35;
}

.lyrics-line.active {
  color: var(--brass);
  font-weight: 600;
  opacity: 1;
  font-size: 16.5px;
  transform: scale(1.02);
}

/* teks Latin di bawah baris asli */
.line-text {
  display: block;
}

.line-roman {
  display: block;
  margin-top: 3px;
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.4;
  font-style: italic;
  color: var(--text-muted);
}

.lyrics-line.active .line-roman {
  color: var(--brass);
  opacity: 0.85;
  font-size: 13px;
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

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .scrim-fade-enter-active,
  .scrim-fade-leave-active,
  .panel-slide-enter-active,
  .panel-slide-leave-active,
  .lyrics-line {
    transition: none !important;
  }

  .icon-btn.busy {
    animation: none;
  }
}

@media (max-width: 480px) {
  .lyrics-panel {
    width: 100vw;
  }
}
</style>