<script setup>
import { ref } from 'vue'
import { parseSpotifyCsv } from '../composables/useCsvImport'

const emit = defineEmits(['import'])

const fileInput = ref(null)
const error = ref('')
const loading = ref(false)

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  error.value = ''
  loading.value = true
  try {
    const tracks = await parseSpotifyCsv(file)
    emit('import', { name: file.name.replace(/\.csv$/i, ''), tracks })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
    e.target.value = '' // supaya file yang sama bisa dipilih lagi
  }
}
</script>

<template>
  <div class="import">
    <input ref="fileInput" type="file" accept=".csv" hidden @change="onFile" />
    <button class="import-btn" :disabled="loading" @click="fileInput.click()">
      {{ loading ? 'Membaca file…' : 'Import playlist (CSV)' }}
    </button>
    <p v-if="error" class="import-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.import { margin-bottom: 16px; }
.import-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brass);
  background: transparent;
  border: 1px solid var(--brass);
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}
.import-btn:hover:not(:disabled) { background: var(--surface-hover); }
.import-btn:disabled { opacity: 0.6; cursor: default; }
.import-error { color: var(--coral); font-size: 13px; margin: 8px 0 0; }
</style>