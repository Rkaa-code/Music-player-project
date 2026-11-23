const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

export async function searchYoutube(query, maxResults = 5) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults,
    q: query,
    key: API_KEY,
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  if (!res.ok) throw new Error(`YouTube search gagal (${res.status})`)

  const data = await res.json()
  return data.items ?? []
}