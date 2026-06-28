import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { fetchTitleDetails } from '../tmdb'
import { emailToPseudo, avatarForEmail } from '../accounts'

const TYPE_LABELS = {
  serie: 'Série',
  serie_animee: 'Série animée',
  film: 'Film',
  manga: 'Manga',
}

// Affiche 10 étoiles cliquables, avec prise en charge des demi-étoiles (pas de 0.5).
// value : note actuelle (0.5 à 10). onChange : appelé avec la nouvelle note au clic.
function StarRating({ value, onChange, readOnly = false }) {
  const [hoverValue, setHoverValue] = useState(null)
  const displayValue = hoverValue ?? value ?? 0

  function handleClick(starIndex, e) {
    if (readOnly) return
    const rect = e.currentTarget.getBoundingClientRect()
    const isHalf = e.clientX - rect.left < rect.width / 2
    onChange(isHalf ? starIndex + 0.5 : starIndex + 1)
  }

  function handleMouseMove(starIndex, e) {
    if (readOnly) return
    const rect = e.currentTarget.getBoundingClientRect()
    const isHalf = e.clientX - rect.left < rect.width / 2
    setHoverValue(isHalf ? starIndex + 0.5 : starIndex + 1)
  }

  return (
    <div
      className={`star-rating ${readOnly ? 'star-rating--readonly' : ''}`}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const fillRatio = Math.max(0, Math.min(1, displayValue - i))
        return (
          <span
            key={i}
            className="star-rating-star"
            onMouseMove={(e) => handleMouseMove(i, e)}
            onClick={(e) => handleClick(i, e)}
          >
            <span className="star-rating-star-empty">★</span>
            <span className="star-rating-star-fill" style={{ width: `${fillRatio * 100}%` }}>★</span>
          </span>
        )
      })}
    </div>
  )
}

export default function TitleModal({ title, currentUserEmail, onClose, onChanged }) {
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [ratings, setRatings] = useState([])
  const [loadingRatings, setLoadingRatings] = useState(true)

  const [myScore, setMyScore] = useState(null)
  const [myComment, setMyComment] = useState('')
  const [editingComment, setEditingComment] = useState(false)
  const [savingRating, setSavingRating] = useState(false)

  // Charge les infos TMDB (synopsis, casting, etc.) si le titre a un tmdb_id.
  useEffect(() => {
    if (!title.tmdb_id) return
    setLoadingDetails(true)
    fetchTitleDetails(title.tmdb_id, title.type === 'film')
      .then(setDetails)
      .finally(() => setLoadingDetails(false))
  }, [title.tmdb_id, title.type])

  // Charge les notes/avis existants pour ce titre (tous comptes confondus).
  useEffect(() => {
    setLoadingRatings(true)
    supabase
      .from('ratings')
      .select('*')
      .eq('title_id', title.id)
      .then(({ data }) => {
        setRatings(data || [])
        const mine = (data || []).find((r) => r.user_email === currentUserEmail)
        if (mine) {
          setMyScore(mine.score)
          setMyComment(mine.comment || '')
        }
        setLoadingRatings(false)
      })
  }, [title.id, currentUserEmail])

  async function saveRating(score, comment) {
    setSavingRating(true)
    await supabase.from('ratings').upsert(
      {
        title_id: title.id,
        user_email: currentUserEmail,
        score,
        comment: comment?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'title_id,user_email' }
    )
    const { data } = await supabase.from('ratings').select('*').eq('title_id', title.id)
    setRatings(data || [])
    setSavingRating(false)
    setEditingComment(false)
    onChanged?.()
  }

  function handleStarChange(newScore) {
    setMyScore(newScore)
    saveRating(newScore, myComment)
  }

  function handleCommentSave() {
    saveRating(myScore || 0.5, myComment)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="title-modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn title-modal-close" onClick={onClose} aria-label="Fermer">✕</button>

        <div className="title-modal-header">
          <div className="title-modal-poster">
            {title.image_url ? (
              <img src={title.image_url} alt="" />
            ) : (
              <div className="title-card-poster-placeholder">
                <span>{title.name.slice(0, 1).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="title-modal-headline">
            <span className="title-card-type title-modal-type">{TYPE_LABELS[title.type]}</span>
            <h2>{title.name}</h2>
            {details?.originalTitle && details.originalTitle !== title.name && (
              <p className="title-modal-original">{details.originalTitle}</p>
            )}
            <div className="title-modal-meta-row">
              {details?.year && <span>{details.year}</span>}
              {details?.runtime && <span>{details.runtime} min</span>}
              {details?.voteAverage && <span>★ {details.voteAverage}/10 (TMDB)</span>}
            </div>
            {details?.genres?.length > 0 && (
              <div className="title-modal-genres">
                {details.genres.map((g) => (
                  <span key={g} className="title-modal-genre-tag">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {loadingDetails && <p className="title-modal-loading">Chargement des infos…</p>}

        {details?.overview && (
          <p className="title-modal-overview">{details.overview}</p>
        )}

        {details?.cast?.length > 0 && (
          <div className="title-modal-section">
            <h3>Casting</h3>
            <div className="title-modal-cast">
              {details.cast.map((c, i) => (
                <div key={i} className="title-modal-cast-member">
                  {c.photo ? (
                    <img src={c.photo} alt="" />
                  ) : (
                    <div className="title-modal-cast-noimg">{c.name.slice(0, 1)}</div>
                  )}
                  <span className="title-modal-cast-name">{c.name}</span>
                  {c.character && <span className="title-modal-cast-character">{c.character}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {details?.trailerUrl && (
          <a
            href={details.trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost title-modal-trailer-link"
          >
            ▶ Voir la bande-annonce
          </a>
        )}

        <div className="title-modal-section">
          <h3>Ma note</h3>
          <StarRating value={myScore} onChange={handleStarChange} />
          {myScore && <p className="title-modal-score-value">{myScore} / 10</p>}

          {editingComment ? (
            <div className="title-modal-comment-edit">
              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder="Ton avis sur cette série/film…"
                rows={3}
              />
              <button className="btn btn-primary" disabled={savingRating} onClick={handleCommentSave}>
                {savingRating ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          ) : (
            <button className="link-btn" onClick={() => setEditingComment(true)}>
              {myComment ? 'Modifier mon commentaire' : '+ Ajouter un commentaire'}
            </button>
          )}
        </div>

        <div className="title-modal-section">
          <h3>Avis</h3>
          {loadingRatings ? (
            <p className="title-modal-loading">Chargement…</p>
          ) : (
            <div className="title-modal-reviews">
              {ratings.length === 0 && (
                <p className="title-modal-no-review">Personne n'a encore noté ce titre.</p>
              )}
              {ratings.map((r) => {
                const pseudo = emailToPseudo(r.user_email)
                const avatar = avatarForEmail(r.user_email)
                return (
                  <div key={r.id} className="review-bubble-row">
                    {avatar && <img src={avatar} alt="" className="review-bubble-avatar" />}
                    <div className="review-bubble">
                      <div className="review-bubble-header">
                        <strong>{pseudo}</strong>
                        <span className="review-bubble-score">{r.score} / 10</span>
                      </div>
                      {r.comment && <p className="review-bubble-text">{r.comment}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
