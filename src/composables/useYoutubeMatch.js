const CACHE_PREFIX = 'ytmatch:'
const BAD_WORDS = /\b(live|cover|karaoke|remix|reaction|instrumental)\b/i

const cacheKey = ({ spotify: s }) => `${CACHE_PREFIX}${s.artist}|${s.title}`.toLowerCase()

function pickBest(track, items) {
  const { title, artist } = track.spotify
  const scored = items.map((item) => {
    const t = item.snippet.title.toLowerCase()
    const ch = item.snippet.channelTitle.toLowerCase()
    let score = 0
    if (BAD_WORDS.test(item.snippet.title) && !BAD_WORDS.test(title)) score -= 5
    if (t.includes(title.toLowerCase())) score += 3
    if (artist && (t.includes(artist.split(',')[0].toLowerCase()) || ch.includes(artist.split(',')[0].toLowerCase()))) score += 2
    if (/official|audio/.test(t)) score += 1
    if (ch.endsWith('- topic')) score += 2
    return { item, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.item ?? null
}

export function useYoutubeMatch(searchYoutube) {
  // searchYoutube(query) => Promise<item[]> (bentuk item = hasil YouTube search.list)
  async function resolveTrack(track) {
    if (track.id?.videoId) return true

    const key = cacheKey(track)
    try {
      const cached = JSON.parse(localStorage.getItem(key))
      if (cached) { Object.assign(track, cached); return true }
    } catch {}

    const { artist, title } = track.spotify
    const items = await searchYoutube(`${artist} - ${title} official audio`)
    const best = items?.length ? pickBest(track, items) : null
    if (!best) return false

    track.id = best.id
    track.snippet = best.snippet
    try { localStorage.setItem(key, JSON.stringify({ id: best.id, snippet: best.snippet })) } catch {}
    return true
  }

  return { resolveTrack }
}