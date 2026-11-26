const YT = 'https://www.googleapis.com/youtube/v3'
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

async function yt(path, params) {
  const url = new URL(`${YT}/${path}`)
  Object.entries({ ...params, key: API_KEY }).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v)
  })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube API ${res.status}`)
  return res.json()
}

const https = (u) => (u ? u.replace(/^\/\//, 'https://') : '')

// ISO 8601 ("PT3M45S") -> "3:45" / "1:02:03"
function formatIso(iso = '') {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []
  const h = +m[1] || 0
  const min = +m[2] || 0
  const s = +m[3] || 0
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${String(min).padStart(2, '0')}:${ss}` : `${min}:${ss}`
}

// Isi durasi (1 unit kuota per 50 video)
export async function addDurations(tracks) {
  if (!tracks.length) return tracks
  const data = await yt('videos', {
    part: 'contentDetails',
    id: tracks.map((t) => t.id.videoId).join(','),
    maxResults: 50,
  })
  const map = new Map(data.items.map((v) => [v.id, formatIso(v.contentDetails.duration)]))
  return tracks.map((t) => ({ ...t, duration: map.get(t.id.videoId) ?? t.duration }))
}

// Dipakai useYoutubeMatch untuk mencari videoId dari lagu yang belum punya (mis. hasil import playlist).
// Mengembalikan array item { id: { videoId }, snippet, duration }.
export async function searchYoutube(query, max = 5) {
  const data = await yt('search', {
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: max,
  })
  const items = (data.items || [])
    .map((it) => ({
      ...it,
      id: typeof it.id === 'string' ? { videoId: it.id } : it.id,
    }))
    .filter((it) => it.id?.videoId)
  return addDurations(items)
}

export async function searchChannels(query, max = 6) {
  const data = await yt('search', { part: 'snippet', type: 'channel', q: query, maxResults: max })
  return data.items.map((it) => ({
    id: it.id.channelId,
    title: it.snippet.title,
    thumb: https(it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url),
  }))
}

// Semua upload channel ada di playlist dengan ID yang sama seperti ID channel,
// hanya awalan "UC" diganti "UU".
export async function getChannelUploads(channelId, pageToken, max = 50) {
  const data = await yt('playlistItems', {
    part: 'snippet',
    playlistId: 'UU' + channelId.slice(2),
    maxResults: max,
    pageToken,
  })

  const tracks = data.items
    .filter((it) => {
      const t = it.snippet.title
      return it.snippet.resourceId?.videoId && t !== 'Private video' && t !== 'Deleted video'
    })
    .map((it) => {
      const videoId = it.snippet.resourceId.videoId
      return {
        id: { videoId },
        snippet: {
          title: it.snippet.title,
          channelTitle: it.snippet.videoOwnerChannelTitle ?? it.snippet.channelTitle,
          thumbnails: it.snippet.thumbnails?.default
            ? it.snippet.thumbnails
            : { default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg` } },
        },
      }
    })

  return { tracks, nextPageToken: data.nextPageToken ?? null }
}