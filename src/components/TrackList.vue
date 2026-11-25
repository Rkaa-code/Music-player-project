<template>
  <div class="track-list-wrap">
    <ul class="track-list" ref="listEl">
      <li
        v-for="(item, i) in pagedTracks"
        :key="item.id.videoId"
        :class="{ active: item.id.videoId === playingId }"
        @click="$emit('select', item)"
        @contextmenu="openMenu($event, item)"
      >
        <span class="index">
          <span v-if="item.id.videoId === playingId" class="playing-bars">
            <i></i><i></i><i></i>
          </span>
          <span v-else>{{ startIndex + i + 1 }}</span>
        </span>

        <img :src="item.snippet.thumbnails.default.url" />

        <div class="track-info">
          <span class="title">{{ item.snippet.title }}</span>
          <span class="channel">{{ item.snippet.channelTitle }}</span>
        </div>

        <span class="duration">{{ item.duration || '0:00' }}</span>
      </li>
    </ul>

    <nav v-if="tracks.length > 0" class="pagination" aria-label="Navigasi halaman">
      <label class="per-page">
        <span>Per halaman</span>
        <select :value="perPage" @change="onPerPageChange">
          <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>

      <div v-if="totalPages > 1" class="pager">
        <button
          class="pg-btn"
          title="Sebelumnya"
          aria-label="Halaman sebelumnya"
          :disabled="page === 1"
          @click="goTo(page - 1)"
        >
          <ChevronLeft :size="16" :stroke-width="2.5" />
        </button>

        <template v-for="(p, idx) in pageItems" :key="`${p}-${idx}`">
          <span v-if="p === '…'" class="pg-gap">…</span>
          <button
            v-else
            class="pg-btn pg-num"
            :class="{ current: p === page }"
            :aria-current="p === page ? 'page' : undefined"
            @click="goTo(p)"
          >
            {{ p }}
          </button>
        </template>

        <button
          class="pg-btn"
          title="Berikutnya"
          aria-label="Halaman berikutnya"
          :disabled="page === totalPages"
          @click="goTo(page + 1)"
        >
          <ChevronRight :size="16" :stroke-width="2.5" />
        </button>
      </div>

      <span class="range">{{ startIndex + 1 }}–{{ endIndex }} dari {{ tracks.length }}</span>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useTrackMenu } from '../composables/useTrackMenu'

const { openMenu } = useTrackMenu()

const props = defineProps({
  tracks: { type: Array, default: () => [] },
  playingId: { type: String, default: null },
  // pilihan jumlah lagu per halaman
  perPageOptions: { type: Array, default: () => [10, 20, 50] },
  // jumlah awal per halaman
  defaultPerPage: { type: Number, default: 10 },
})
defineEmits(['select'])

const listEl = ref(null)
const page = ref(1)
const perPage = ref(props.defaultPerPage)

const totalPages = computed(() => Math.max(1, Math.ceil(props.tracks.length / perPage.value)))
const startIndex = computed(() => (page.value - 1) * perPage.value)
const endIndex = computed(() => Math.min(startIndex.value + perPage.value, props.tracks.length))
const pagedTracks = computed(() => props.tracks.slice(startIndex.value, endIndex.value))

// daftar tombol halaman: 1 … 4 5 6 … 20
const pageItems = computed(() => {
  const total = totalPages.value
  const cur = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const set = new Set([1, total, cur - 1, cur, cur + 1])
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)

  const out = []
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
})

function goTo(p) {
  const next = Math.min(Math.max(1, p), totalPages.value)
  if (next === page.value) return
  page.value = next
  nextTick(() => listEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function onPerPageChange(e) {
  perPage.value = Number(e.target.value)
  page.value = 1
}

// hasil pencarian / daftar baru -> kembali ke halaman 1
watch(
  () => props.tracks,
  () => {
    page.value = 1
  },
)

// jaga-jaga kalau jumlah lagu berkurang sampai halaman sekarang tidak ada
watch(totalPages, (n) => {
  if (page.value > n) page.value = n
})
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

/* ===== Pagination ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-top: 16px;
  padding: 12px 16px 0;
  border-top: 1px solid var(--border);
  font-family: 'Inter', sans-serif;
}

.per-page {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.per-page select {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  cursor: pointer;
}

.per-page select:focus-visible {
  outline: 2px solid var(--coral);
  outline-offset: 2px;
}

.pager {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pg-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  transition: color 0.15s ease, background 0.15s ease;
}

.pg-btn:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface);
}

.pg-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.pg-btn:focus-visible {
  outline: 2px solid var(--coral);
  outline-offset: 2px;
}

.pg-num.current {
  color: var(--brass);
  background: var(--surface);
  border-color: var(--brass);
}

.pg-gap {
  min-width: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.range {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .pagination {
    justify-content: center;
  }

  .range {
    display: none;
  }
}
</style>