<template>
  <ul class="track-list">
    <li
      v-for="(item, index) in tracks"
      :key="item.id.videoId"
      :class="{ active: item.id.videoId === playingId }"
      @click="$emit('select', item)"
    >
      <span class="index">
        <span v-if="item.id.videoId === playingId" class="playing-bars">
          <i></i><i></i><i></i>
        </span>
        <span v-else>{{ index + 1 }}</span>
      </span>

      <img :src="item.snippet.thumbnails.default.url" />

      <div class="track-info">
        <span class="title">{{ item.snippet.title }}</span>
        <span class="channel">{{ item.snippet.channelTitle }}</span>
      </div>

      <span class="duration">{{ item.duration || '0:00' }}</span>
    </li>
  </ul>
</template>

<script setup>
defineProps({
  tracks: { type: Array, default: () => [] },
  playingId: { type: String, default: null },
})
defineEmits(['select'])
</script>

<style scoped>
.track-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

li {
  display: grid;
  grid-template-columns: 40px 40px 1fr 48px;
  align-items: center;
  gap: 14px;
  padding: 8px 16px;
  height: 56px;
  cursor: pointer;
  border-radius: 4px;
}

li:hover {
  background: var(--surface);
}

li.active {
  background: var(--surface);
}

li.active .title {
  color: var(--brass);
}

.index {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--text-muted);
  text-align: center;
  pointer-events: none;
}

.playing-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
  justify-content: center;
  margin: 0 auto;
}

.playing-bars i {
  display: block;
  width: 2px;
  background: var(--brass);
  border-radius: 1px;
  animation: bounce 0.9s ease-in-out infinite;
}

.playing-bars i:nth-child(1) {
  height: 40%;
  animation-delay: -0.6s;
}
.playing-bars i:nth-child(2) {
  height: 100%;
  animation-delay: -0.3s;
}
.playing-bars i:nth-child(3) {
  height: 65%;
  animation-delay: 0s;
}

@keyframes bounce {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
  .playing-bars i {
    animation: none;
  }
}

img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  pointer-events: none;
  flex-shrink: 0;
}

.track-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: none;
  gap: 2px;
  min-width: 0;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.channel {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.duration {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
  pointer-events: none;
  flex-shrink: 0;
}
</style>