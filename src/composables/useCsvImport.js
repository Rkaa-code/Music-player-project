import Papa from 'papaparse'

const clean = (s) => (s ?? '').toString().trim()

export function parseSpotifyCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const required = ['Track Name', 'Artist Name(s)']
        const missing = required.filter((c) => !meta.fields.includes(c))
        if (missing.length) {
          return reject(new Error(`Kolom tidak ditemukan: ${missing.join(', ')}. Pastikan CSV berasal dari Exportify.`))
        }

        const tracks = data
          .map((row) => {
            const title = clean(row['Track Name'])
            const artist = clean(row['Artist Name(s)']).split(';').map((a) => a.trim()).join(', ')
            return {
              id: { videoId: null }, // diisi saat match
              snippet: {
                title,
                channelTitle: artist,
                thumbnails: {
                  default: { url: '' },
                  medium: { url: '' },
                  high: { url: '' },
                },
              },
              spotify: {
                title,
                artist,
                durationSec: Math.round((Number(row['Duration (ms)']) || 0) / 1000),
              },
              key: crypto.randomUUID(),
            }
          })
          .filter((t) => t.spotify.title)

        resolve(tracks)
      },
      error: reject,
    })
  })
}