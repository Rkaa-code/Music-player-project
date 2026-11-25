<template>
  <aside v-if="open" class="queue-panel" aria-label="Antrian lagu">
    <header class="qp-header">
      <h2>Antrian</h2>
      <button class="qp-icon" title="Tutup" @click="$emit('close')">✕</button>
    </header>

    <section v-if="current" class="qp-section">
      <h3 class="qp-label">Sedang diputar</h3>
      <div class="qp-row now">
        <img v-if="thumb(current)" class="qp-thumb" :src="thumb(current)" alt="" />
        <div v-else class="qp-thumb qp-thumb-empty"></div>
        <div class="qp-meta">
          <span class="qp-title">{{ current.snippet?.title }}</span>
          <span class="qp-channel">{{ current.snippet?.channelTitle }}</span>
        </div>
      </div>
    </section>

    <section class="qp-section qp-grow">
      <div class="qp-label-row">
        <h3 class="qp-label">Berikutnya · {{ upcoming.length }}</h3>
        <button v-if="upcoming.length" class="qp-clear" @click="$emit('clear')">Kosongkan</button>
      </div>

      <p v-if="shuffle" class="qp-hint">Shuffle aktif: urutan antrian diacak.</p>
      <p v-else-if="repeatMode === 'all' && upcoming.length" class="qp-hint">
        Repeat semua: setelah lagu terakhir kembali ke awal antrian.
      </p>

      <p v-if="upcoming.length === 0" class="qp-empty">Tidak ada lagu berikutnya.</p>

      <ul v-else class="qp-list">
        <li
          v-for="(t, i) in upcoming"
          :key="`${i}-${trackKey(t)}`"
          class="qp-row"
          @click="$emit('play', i)"
        >
          <span class="qp-index">{{ i + 1 }}</span>
          <img v-if="thumb(t)" class="qp-thumb" :src="thumb(t)" alt="" />
          <div v-else class="qp-thumb qp-thumb-empty"></div>
          <div class="qp-meta">
            <span class="qp-title">{{ t.snippet?.title }}</span>
            <span class="qp-channel">{{ t.snippet?.channelTitle }}</span>
          </div>
          <button class="qp-icon danger" title="Hapus dari antrian" @click.stop="$emit('remove', i)">✕</button>
        </li>
      </ul>
    </section>
  </aside>
</template>

<script setup>
import { trackKey } from '../composables/usePlaylists'

defineProps({
  open: { type: Boolean, default: false },
  current: { type: Object, default: null },
  upcoming: { type: Array, default: () => [] },
  shuffle: { type: Boolean, default: false },
  repeatMode: { type: String, default: 'off' },
})
defineEmits(['close', 'play', 'remove', 'clear'])

const thumb = (t) => t?.snippet?.thumbnails?.default?.url
</script>

<style scoped>
.queue-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 110px; /* sisakan ruang untuk PlayerBar, sesuaikan dengan tingginya */
  width: min(340px, 100vw);
  z-index: 900;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.35);
  font-family: 'Inter', sans-serif;
}
.qp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 8px;
}
.qp-header h2 { font-family: 'Fraunces', serif; font-size: 18px; margin: 0; color: var(--text); }
.qp-section { padding: 8px 12px; }
.qp-grow { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.qp-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 8px 4px;
}
.qp-label-row { display: flex; align-items: center; justify-content: space-between; }
.qp-label-row .qp-label { margin-bottom: 8px; }
.qp-clear {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
}
.qp-clear:hover { color: var(--coral); background: var(--bg); }
.qp-hint { margin: 0 4px 8px; font-size: 11.5px; color: var(--text-muted); }
.qp-empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
  border: 1px dashed var(--border);
  border-radius: 10px;
}
.qp-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; min-height: 0; }
.qp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
}
.qp-row:hover { background: var(--surface-hover); }
.qp-row.now { cursor: default; background: var(--surface-hover); outline: 1px solid var(--brass); }
.qp-row.now:hover { background: var(--surface-hover); }
.qp-index {
  width: 18px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.qp-thumb { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
.qp-thumb-empty { background: var(--bg); }
.qp-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.qp-title { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qp-channel { font-size: 11.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qp-icon {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 4px;
  border-radius: 4px;
  flex-shrink: 0;
}
.qp-icon:hover { color: var(--text); background: var(--bg); }
.qp-icon.danger:hover { color: var(--coral); }
</style>