import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const TYPE_LABELS = {
  serie: 'Série',
  serie_animee: 'Série animée',
  film: 'Film',
  manga: 'Manga',
}

const CRITERIA = [
  { key: 'score_general', label: 'Ressenti général', hint: 'Ton avis global, ce que tu en retiens' },
  { key: 'score_scenario', label: 'Scénario', hint: "L'histoire, l'écriture, l'intrigue" },
  { key: 'score_personnages', label: 'Personnages', hint: "L'attachement aux personnages, le jeu d'acteur" },
]

// Étoiles cliquables avec demi-étoiles, en plus grand format pour la page dédiée.
function StarRatingLarge({ value, onChange }) {
  const [hoverValue, setHoverValue] = useState(null)
  const displayValue = hoverValue ?? value ?? 0

  function valueFromEvent(starIndex, e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const isHalf = e.clientX - rect.left < rect.width / 2
    return isHalf ? starIndex + 0.5 : starIndex + 1
  }

  return (
    <div className="star-rating star-rating--large" onMouseLeave={() => setHoverValue(null)}>
      {Array.from({ length: 10 }, (_, i) => {
        const fillRatio = Math.max(0, Math.min(1, displayValue - i))
        return (
          <span
            key={i}
            className="star-rating-star"
            onMouseMove={(e) => setHoverValue(valueFromEvent(i, e))}
            onClick={(e) => onChange(valueFromEvent(i, e))}
          >
            <span className="star-rating-star-empty">★</span>
            <span className="star-rating-star-fill" style={{ width: `${fillRatio * 100}%` }}>★</span>
          </span>
        )
      })}
    </div>
  )
}

export default function RatingPage({ title, currentUserEmail, onBack, onSaved }) {
  const [scores, setScores] = useState({ score_general: 0, score_scenario: 0, score_personnages: 0 })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('ratings')
      .select('*')
      .eq('title_id', title.id)
      .eq('user_email', currentUserEmail)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setScores({
            score_general: data.score_general,
            score_scenario: data.score_scenario,
            score_personnages: data.score_personnages,
          })
          setComment(data.comment || '')
        }
        setLoading(false)
      })
  }, [title.id, currentUserEmail])

  const allFilled = scores.score_general > 0 && scores.score_scenario > 0 && scores.score_personnages > 0

  async function handleSave() {
    if (!allFilled) return
    setSaving(true)
    await supabase.from('ratings').upsert(
      {
        title_id: title.id,
        user_email: currentUserEmail,
        score_general: scores.score_general,
        score_scenario: scores.score_scenario,
        score_personnages: scores.score_personnages,
        comment: comment.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'title_id,user_email' }
    )
    setSaving(false)
    setSaved(true)
    onSaved?.()
  }

  return (
    <main className="main-content rating-page">
      <button className="link-btn rating-page-back" onClick={onBack}>← Retour</button>

      <div className="rating-page-header">
        <div className="rating-page-poster">
          {title.image_url ? (
            <img src={title.image_url} alt="" />
          ) : (
            <div className="title-card-poster-placeholder">
              <span>{title.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div>
          <span className="title-card-type title-modal-type">{TYPE_LABELS[title.type]}</span>
          <h1>{title.name}</h1>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : (
        <>
          <div className="rating-page-criteria">
            {CRITERIA.map((c) => (
              <div key={c.key} className="rating-page-criterion">
                <div className="rating-page-criterion-label">
                  <strong>{c.label}</strong>
                  <span>{c.hint}</span>
                </div>
                <StarRatingLarge
                  value={scores[c.key]}
                  onChange={(v) => { setScores((s) => ({ ...s, [c.key]: v })); setSaved(false) }}
                />
                {scores[c.key] > 0 && <span className="rating-page-criterion-value">{scores[c.key]} / 10</span>}
              </div>
            ))}
          </div>

          <div className="rating-page-comment">
            <label htmlFor="rating-comment"><strong>Ton avis (optionnel)</strong></label>
            <textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => { setComment(e.target.value); setSaved(false) }}
              placeholder="Qu'est-ce que tu en as pensé ?"
              rows={5}
            />
          </div>

          {!allFilled && (
            <p className="rating-page-warning">Note les 3 critères pour pouvoir enregistrer.</p>
          )}

          <button className="btn btn-primary rating-page-save" disabled={!allFilled || saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer ma note'}
          </button>
        </>
      )}
    </main>
  )
}
