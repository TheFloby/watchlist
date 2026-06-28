import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { searchTitles, fetchSeasonCount } from '../tmdb'

const TYPES = [
  { value: 'serie', label: 'Série' },
  { value: 'serie_animee', label: 'Série animée' },
  { value: 'film', label: 'Film' },
  { value: 'manga', label: 'Manga' },
]

const STATUSES = [
  { value: 'a_voir', label: 'À voir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'vu', label: 'Terminé' },
]

const HAS_SEASONS = new Set(['serie', 'serie_animee'])

// adminMode : true pour le bouton "Ajouter directement" (Flo) — saute la case
// Propositions et permet de choisir directement le statut final.
export default function AddTitleForm({ user, onAdded, onClose, adminMode = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)

  // Le titre sélectionné (depuis TMDB ou saisi à la main)
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [type, setType] = useState('serie')
  const [totalSeasons, setTotalSeasons] = useState(null)
  const [tmdbId, setTmdbId] = useState(null)
  const [voteAverage, setVoteAverage] = useState(null)
  const [releaseYear, setReleaseYear] = useState(null)
  const [releaseDate, setReleaseDate] = useState(null)
  const [manualMode, setManualMode] = useState(false)
  const [directStatus, setDirectStatus] = useState('vu')
  const [currentSeason, setCurrentSeason] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  // Recherche TMDB avec un petit délai pour ne pas spammer l'API à chaque lettre
  useEffect(() => {
    if (manualMode) return

    clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setSearchFailed(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchFailed(false)
      try {
        const r = await searchTitles(query)
        setResults(r)
      } catch {
        setSearchFailed(true)
        setResults([])
      }
      setSearching(false)
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [query, manualMode])

  async function pickResult(result) {
    setName(result.name)
    setImageUrl(result.image_url || '')
    setType(result.tmdbType)
    setQuery(result.name + (result.year ? ` (${result.year})` : ''))
    setResults([])
    setTotalSeasons(null)
    setTmdbId(result.tmdbType === 'serie' ? result.tmdbId : null)
    setVoteAverage(result.voteAverage || null)
    setReleaseYear(result.year ? parseInt(result.year) : null)
    setReleaseDate(result.releaseDate || null)

    // Pour les séries, on va chercher le nombre de saisons en arrière-plan
    if (result.tmdbType === 'serie' && result.tmdbId) {
      const count = await fetchSeasonCount(result.tmdbId)
      setTotalSeasons(count)
    }
  }

  function switchToManual() {
    setManualMode(true)
    setResults([])
    setName(query)
    setTotalSeasons(null)
    setTmdbId(null)
    setVoteAverage(null)
    setReleaseYear(null)
    setReleaseDate(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const finalName = manualMode ? name.trim() : (name.trim() || query.trim())
    if (!finalName) return
    setLoading(true)
    setError('')

    // On garde le nombre de saisons et le tmdb_id trouvés via la recherche, même si
    // le type final choisi est "Manga" — l'oeuvre peut très bien avoir été trouvée comme
    // série animée sur TMDB, puis reclassée en Manga ici. On ne veut pas perdre ces infos,
    // sinon la vérification automatique des nouvelles saisons ne pourrait plus la suivre.
    const finalStatus = adminMode ? directStatus : 'proposition'

    // En mode admin, si le statut choisi est "en_cours" ou "vu", on enregistre
    // une saison cohérente (sinon le menu saison de la carte n'aurait rien à afficher).
    let finalCurrentSeason = null
    if (totalSeasons) {
      if (adminMode && finalStatus === 'en_cours') finalCurrentSeason = currentSeason
      else if (adminMode && finalStatus === 'vu') finalCurrentSeason = totalSeasons || currentSeason
    }

    const { error } = await supabase.from('titles').insert({
      name: finalName,
      image_url: imageUrl.trim() || null,
      type,
      status: finalStatus,
      total_seasons: totalSeasons || null,
      current_season: finalCurrentSeason,
      tmdb_id: tmdbId || null,
      tmdb_vote_average: voteAverage || null,
      release_year: releaseYear || null,
      release_date: releaseDate || null,
      has_been_in_progress: finalStatus === 'en_cours' || finalStatus === 'vu',
      added_by: user.id,
      added_by_email: user.email,
    })

    setLoading(false)

    if (error) {
      setError("Impossible d'ajouter ce titre. Réessaie.")
      return
    }

    onAdded()
  }

  const hasSelection = !manualMode && name && imageUrl

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{adminMode ? 'Ajouter directement' : 'Proposer un titre'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <p className="modal-subtitle">
          {adminMode
            ? 'Ajout direct dans la liste, sans passer par les Propositions.'
            : "Ça partira dans l'onglet Propositions, en attente de validation."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!manualMode ? (
            <div className="field">
              <span>Rechercher (films & séries)</span>
              <div className="search-box">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setName('')
                    setImageUrl('')
                  }}
                  placeholder="Ex : Severance"
                />

                {searching && <p className="search-hint">Recherche…</p>}
                {searchFailed && (
                  <p className="search-hint search-hint--error">
                    Recherche indisponible. Tu peux ajouter le titre à la main.
                  </p>
                )}

                {results.length > 0 && (
                  <ul className="search-results">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button type="button" onClick={() => pickResult(r)}>
                          {r.image_url ? (
                            <img src={r.image_url} alt="" />
                          ) : (
                            <div className="search-result-noimg" />
                          )}
                          <span>
                            {r.name}
                            {r.year && <span className="search-result-year"> · {r.year}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {hasSelection && (
                <p className="search-selected">
                  ✓ « {name} » sélectionné
                  {totalSeasons && ` · ${totalSeasons} saison${totalSeasons > 1 ? 's' : ''}`}
                </p>
              )}

              <button type="button" className="link-btn" onClick={switchToManual}>
                Pas trouvé ? Ajouter à la main (utile pour les mangas)
              </button>
            </div>
          ) : (
            <>
              <label className="field">
                <span>Titre</span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : One Piece"
                />
              </label>

              <label className="field">
                <span>Image (URL d'affiche, optionnel)</span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>

              {HAS_SEASONS.has(type) && (
                <label className="field">
                  <span>Nombre de saisons (si tu le sais)</span>
                  <input
                    type="number"
                    min="1"
                    value={totalSeasons || ''}
                    onChange={(e) => setTotalSeasons(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Ex : 5"
                  />
                </label>
              )}

              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setManualMode(false)
                  setQuery('')
                  setName('')
                  setImageUrl('')
                  setTotalSeasons(null)
                }}
              >
                ← Revenir à la recherche
              </button>
            </>
          )}

          <label className="field">
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          {adminMode && (
            <label className="field">
              <span>Statut</span>
              <select value={directStatus} onChange={(e) => setDirectStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          )}

          {adminMode && directStatus === 'en_cours' && HAS_SEASONS.has(type) && (
            <label className="field">
              <span>Saison actuelle</span>
              <input
                type="number"
                min="1"
                value={currentSeason}
                onChange={(e) => setCurrentSeason(parseInt(e.target.value) || 1)}
              />
            </label>
          )}

          {error && <p className="auth-message auth-message--error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Envoi…' : adminMode ? 'Ajouter' : 'Proposer'}
          </button>
        </form>
      </div>
    </div>
  )
}
