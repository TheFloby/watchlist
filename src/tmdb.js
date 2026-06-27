import { TMDB_API_KEY } from './config'

const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

// Recherche multi (films + séries) sur TMDB.
// Retourne une liste normalisée : { id, name, year, image_url, tmdbType }
export async function searchTitles(query) {
  if (!query || query.trim().length < 2) return []

  const url = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(query)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Recherche TMDB impossible')

  const data = await res.json()

  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 8)
    .map((r) => {
      const isMovie = r.media_type === 'movie'
      const date = isMovie ? r.release_date : r.first_air_date
      return {
        id: `${r.media_type}-${r.id}`,
        tmdbId: r.id,
        name: isMovie ? r.title : r.name,
        year: date ? date.slice(0, 4) : null,
        image_url: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : null,
        tmdbType: isMovie ? 'film' : 'serie',
      }
    })
}

// Récupère le nombre total de saisons d'une série (uniquement utile pour les séries/séries animées).
// Retourne null si l'info n'est pas disponible (ex: film, ou erreur réseau).
export async function fetchSeasonCount(tmdbId) {
  if (!tmdbId) return null

  try {
    const url = `${BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = await res.json()
    // On exclut les "saisons spéciales" (souvent numérotées 0, ce sont des bonus/épisodes spéciaux)
    const realSeasons = (data.seasons || []).filter((s) => s.season_number > 0)
    return realSeasons.length || data.number_of_seasons || null
  } catch {
    return null
  }
}
