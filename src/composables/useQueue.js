import { computed } from 'vue'

export function useQueue({ queue, getIndex, playAt }) {
  const current = computed(() => queue.value[getIndex()] ?? null)

  const upcomingIdx = computed(() => {
    const cur = getIndex()
    return queue.value.map((_, i) => i).filter((i) => i > cur)
  })
  const upcoming = computed(() => upcomingIdx.value.map((i) => queue.value[i]))

  const playUpcoming = (i) => playAt(upcomingIdx.value[i])

  const removeUpcoming = (i) => {
    const target = upcomingIdx.value[i]
    queue.value = queue.value.filter((_, k) => k !== target)
  }

  const clearUpcoming = () => {
    const drop = new Set(upcomingIdx.value)
    queue.value = queue.value.filter((_, k) => !drop.has(k))
  }

  return { current, upcoming, playUpcoming, removeUpcoming, clearUpcoming }
}