import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { searchTitles } from '../tmdb'

const TYPES = [
  { value: 'serie', label: 'Série' },
  { value: 'serie_animee', label: 'Série animée' },
  { value: 'film', label: 'Film' },
  { value: 'manga', label: 'Manga' },
]

export default function AddTitleForm({ user, defaultStatus, onAdded, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)

  // Le titre sélectionné (depuis TMDB ou saisi à la main)
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [type, setType] = useState('serie')
  const [status, setStatus] = useState(defaultStatus || 'a_voir')
  const [manualMode, setManualMode] = useState(false)

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

  function pickResult(result) {
    setName(result.name)
    setImageUrl(result.image_url || '')
    setType(result.tmdbType)
    setQuery(result.name + (result.year ? ` (${result.year})` : ''))
    setResults([])
  }

  function switchToManual() {
    setManualMode(true)
    setResults([])
    setName(query)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const finalName = manualMode ? name.trim() : (name.trim() || query.trim())
    if (!finalName) return
    setLoading(true)
    setError('')

    const { error } = await supabase.from('titles').insert({
      name: finalName,
      image_url: imageUrl.trim() || null,
      type,
      status,
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
          <h2>Ajouter un titre</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

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
                <p className="search-selected">✓ « {name} » sélectionné</p>
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

              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setManualMode(false)
                  setQuery('')
                  setName('')
                  setImageUrl('')
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

          <label className="field">
            <span>Statut</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="a_voir">À voir (proposition)</option>
              <option value="en_cours">En cours</option>
              <option value="vu">Déjà vu</option>
            </select>
          </label>

          {error && <p className="auth-message auth-message--error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Ajout…' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  )
}
