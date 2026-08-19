<template>
  <div class="search-bar">
    <span class="search-icon">⚲</span>
    <input
      v-model="query"
      @keyup.enter="search"
      placeholder="Cari lagu atau artis..."
    />
    <button @click="search">Cari</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['results', 'searching'])
const query = ref('')
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

function normalize(items) {
  return items.map((item) => ({
    ...item,
    id: typeof item.id === 'string' ? { videoId: item.id } : item.id,
  }))
}

function parseDuration(iso) {
  // "PT3M45S" -> "3:45", "PT1H2M3S" -> "1:02:03"
  const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return '0:00'

  const h = parseInt(match[1] || 0)
  const m = parseInt(match[2] || 0)
  const s = parseInt(match[3] || 0)

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

async function fetchDurations(items) {
  const ids = items.map((item) => item.id.videoId).filter(Boolean).join(',')
  if (!ids) return items

  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`
  const res = await fetch(url)
  const data = await res.json()

  const durationMap = {}
  ;(data.items || []).forEach((v) => {
    durationMap[v.id] = parseDuration(v.contentDetails.duration)
  })

  return items.map((item) => ({
    ...item,
    duration: durationMap[item.id.videoId] || '0:00',
  }))
}

async function search() {
  const keyword = query.value.trim()

  if (!keyword) {
    emit('searching', false)
    fetchTrending()
    return
  }

  emit('searching', true)

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
    keyword
  )}&type=video&videoCategoryId=10&maxResults=10&key=${API_KEY}`

  const res = await fetch(url)
  const data = await res.json()

  const validItems = normalize(data.items || []).filter((item) => item.id?.videoId)
  const withDurations = await fetchDurations(validItems)
  emit('results', withDurations)
}

async function fetchTrending() {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=ID&maxResults=10&key=${API_KEY}`

  const res = await fetch(url)
  const data = await res.json()

  const validItems = normalize(data.items || []).filter((item) => item.id?.videoId)
  const withDurations = await fetchDurations(validItems)
  emit('results', withDurations)
}

onMounted(() => {
  emit('searching', false)
  fetchTrending()
})
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px 6px 4px 14px;
  margin-bottom: 24px;
  transition: border-color 0.15s ease;
}

.search-bar:focus-within {
  border-color: var(--brass);
  box-shadow: 0 0 0 3px rgba(226, 118, 92, 0.15);
}
.search-icon {
  color: var(--text-muted);
  font-size: 14px;
  transform: scaleX(-1);
}

input {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  outline: none;
}

input::placeholder {
  color: var(--text-muted);
}

button {
  padding: 9px 18px;
  border: none;
  border-radius: 7px;
  background: var(--brass);
  color: #1a1608;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: filter 0.15s ease;
}

button:hover {
  filter: brightness(1.1);
}
</style>