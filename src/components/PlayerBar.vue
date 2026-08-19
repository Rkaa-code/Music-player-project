<template>
  <div class="player-bar" v-if="track">
    <div class="player-bar-inner">
      <div class="now-playing">
        <div class="art-wrap">
          <div class="vinyl" :class="{ spinning: isPlaying }">
            <div class="vinyl-grooves"></div>
            <div class="vinyl-ring vinyl-ring-outer"></div>
            <div class="vinyl-ring vinyl-ring-inner"></div>
            <div class="vinyl-label">
              <span class="vinyl-hole"></span>
            </div>
          </div>
          <div class="vinyl-sheen"></div>
          <img class="cover" :src="track.snippet.thumbnails.default.url" />
          <span class="pulse-dot" v-if="isPlaying"></span>
        </div>

        <div class="info" @click="$emit('show-detail')">
          <span class="title-mask">
            <span class="title" :class="{ marquee: isPlaying }">{{ track.snippet.title }}</span>
          </span>
          <span class="channel">{{ track.snippet.channelTitle }}</span>
        </div>
      </div>

      <div class="center">
        <div class="controls-row">
          <button
            class="ctrl-btn"
            :class="{ active: shuffle }"
            title="Acak"
            @click="$emit('toggle-shuffle')"
          >
            <Shuffle :size="16" :stroke-width="2" />
          </button>

          <button class="ctrl-btn" title="Sebelumnya" @click="$emit('prev')">
            <SkipBack :size="18" :stroke-width="2" fill="currentColor" />
          </button>

          <button class="play-btn" :class="{ active: isPlaying }" @click="$emit('toggle-play')">
            <Pause v-if="isPlaying" :size="15" fill="currentColor" :stroke-width="0" />
            <Play v-else :size="15" fill="currentColor" :stroke-width="0" class="play-icon" />
          </button>

          <button class="ctrl-btn" title="Selanjutnya" @click="$emit('next')">
            <SkipForward :size="18" :stroke-width="2" fill="currentColor" />
          </button>

          <button
            class="ctrl-btn repeat-btn"
            :class="{ active: repeatMode !== 'off' }"
            title="Ulangi"
            @click="$emit('cycle-repeat')"
          >
            <Repeat1 v-if="repeatMode === 'one'" :size="16" :stroke-width="2" />
            <Repeat v-else :size="16" :stroke-width="2" />
          </button>
        </div>

        <div class="progress-row">
          <span class="time">{{ formatTime(currentTime) }}</span>
          <input
            type="range"
            class="seek-bar"
            min="0"
            :max="duration || 0"
            :value="currentTime"
            :style="{ '--fill': seekPercent + '%' }"
            @input="onSeek"
          />
          <span class="time">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div class="right-group">
        <AddToPlaylistMenu :track="track" />

        <button
          class="ctrl-btn lyrics-btn"
          :class="{ active: lyricsOpen }"
          title="Lirik"
          @click="$emit('toggle-lyrics')"
        >
          <Mic2 :size="16" :stroke-width="2" />
        </button>

        <div class="volume">
          <span class="volume-icon">
            <VolumeX v-if="volume === 0" :size="16" :stroke-width="2" />
            <Volume1 v-else-if="volume < 50" :size="16" :stroke-width="2" />
            <Volume2 v-else :size="16" :stroke-width="2" />
          </span>
          <input
            type="range"
            class="volume-bar"
            min="0"
            max="100"
            :value="volume"
            :style="{ '--fill': volume + '%' }"
            @input="onVolumeChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Mic2,
} from 'lucide-vue-next'
import AddToPlaylistMenu from './AddToPlaylistMenu.vue'

const props = defineProps({
  track: { type: Object, default: null },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  volume: { type: Number, default: 80 },
  shuffle: { type: Boolean, default: false },
  repeatMode: { type: String, default: 'off' }, // 'off' | 'all' | 'one'
  lyricsOpen: { type: Boolean, default: false },
})

const emit = defineEmits([
  'toggle-play',
  'seek',
  'volume-change',
  'prev',
  'next',
  'toggle-shuffle',
  'cycle-repeat',
  'show-detail',
  'toggle-lyrics',
])

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onSeek(e) {
  emit('seek', Number(e.target.value))
}

function onVolumeChange(e) {
  emit('volume-change', Number(e.target.value))
}

const seekPercent = computed(() => {
  if (!props.duration) return 0
  return Math.min(100, (props.currentTime / props.duration) * 100)
})
</script>

<style scoped>
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  height: 90px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  box-shadow: 0 -12px 24px -12px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.player-bar-inner {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(0, 2fr) minmax(180px, 1fr);
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 1100px;
  padding: 0 20px;
}

.now-playing {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.art-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.vinyl {
  position: absolute;
  top: 50%;
  left: 16px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #0c0f10;
  transform: translateY(-50%);
  transition: transform 0.2s ease;
  box-shadow:
    0 3px 10px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 -2px 2px rgba(0, 0, 0, 0.55),
    inset 0 2px 2px rgba(255, 255, 255, 0.06);
}

.vinyl.spinning {
  animation: spin 3.5s linear infinite;
}

.vinyl-grooves {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 32%, rgba(255, 255, 255, 0.06), transparent 55%),
    repeating-radial-gradient(
      circle,
      #161a1b 0px,
      #161a1b 1.4px,
      #0a0d0e 1.4px,
      #0a0d0e 3px
    );
  opacity: 0.9;
}

.vinyl-ring {
  position: absolute;
  inset: 0;
  margin: auto;
  border-radius: 50%;
  border: 1px solid #2a2f30;
}

.vinyl-ring-outer {
  width: 80%;
  height: 80%;
}

.vinyl-ring-inner {
  width: 46%;
  height: 46%;
  border-color: #232728;
}

.vinyl-label {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 18%;
  height: 18%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.4), transparent 60%),
    var(--brass);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vinyl-hole {
  width: 26%;
  height: 26%;
  border-radius: 50%;
  background: #0a0d0e;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.7);
}

.vinyl-sheen {
  position: absolute;
  top: 50%;
  left: 16px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  transform: translateY(-50%);
  background: conic-gradient(
    from 205deg at 50% 50%,
    rgba(255, 255, 255, 0.16),
    transparent 22%,
    transparent 78%,
    rgba(255, 255, 255, 0.05)
  );
  mix-blend-mode: screen;
  pointer-events: none;
}

@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to { transform: translateY(-50%) rotate(360deg); }
}

.cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 44px;
  height: 44px;
  border-radius: 5px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
}

.pulse-dot {
  position: absolute;
  bottom: -2px;
  left: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--coral);
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 0 rgba(226, 118, 92, 0.6);
  animation: pulse 1.8s ease-out infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(226, 118, 92, 0.55); }
  70% { box-shadow: 0 0 0 6px rgba(226, 118, 92, 0); }
  100% { box-shadow: 0 0 0 0 rgba(226, 118, 92, 0); }
}

.info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  gap: 1px;
  cursor: pointer;
}

.title-mask {
  overflow: hidden;
  white-space: nowrap;
  display: block;
  mask-image: linear-gradient(90deg, #000 90%, transparent 100%);
}

.title {
  display: inline-block;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.title.marquee {
  animation: marquee 9s linear infinite;
  animation-delay: 1.5s;
}

@keyframes marquee {
  0%, 15% { transform: translateX(0); }
  85%, 100% { transform: translateX(calc(-100% + 240px)); }
}

@media (prefers-reduced-motion: reduce) {
  .title.marquee, .vinyl.spinning, .pulse-dot {
    animation: none;
  }
}

.channel {
  font-size: 12px;
  color: var(--text-muted);
}

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.ctrl-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  position: relative;
  transition: color 0.15s ease, transform 0.1s ease;
}

.ctrl-btn:hover {
  color: var(--text);
  transform: scale(1.08);
}

.ctrl-btn.active {
  color: var(--brass);
}

.play-btn {
  background: var(--brass);
  color: #1a1608;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: filter 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.play-btn:hover {
  filter: brightness(1.1);
  transform: scale(1.05);
}

.play-btn.active {
  box-shadow: 0 0 0 4px rgba(201, 162, 74, 0.18);
}

.play-icon {
  margin-left: 1px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
}

.time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  min-width: 34px;
  text-align: center;
  flex-shrink: 0;
}

input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--brass) 0%,
    var(--brass) var(--fill, 0%),
    var(--border) var(--fill, 0%),
    var(--border) 100%
  );
  outline: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--brass);
  cursor: pointer;
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
}

input[type='range']::-moz-range-thumb {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--brass);
  cursor: pointer;
  border: 2px solid var(--surface);
}

input[type='range']:focus-visible {
  outline: 2px solid var(--coral);
  outline-offset: 2px;
}

.seek-bar {
  flex: 1;
}

.right-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.lyrics-btn {
  width: 30px;
  height: 30px;
}

.volume {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  color: var(--text-muted);
}

.volume-icon {
  display: flex;
  align-items: center;
}

.volume-bar {
  width: 90px;
}

@media (max-width: 480px) {
  .volume {
    display: none;
  }
  .player-bar-inner {
    grid-template-columns: minmax(120px, 1fr) minmax(0, 2fr);
    padding: 0 12px;
  }
  .right-group {
    display: none;
  }
}
</style>