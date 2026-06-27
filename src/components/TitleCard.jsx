import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { emailToPseudo } from '../accounts'

const TYPE_LABELS = {
  serie: 'Série',
  serie_animee: 'Série animée',
  film: 'Film',
  manga: 'Manga',
}

const HAS_SEASONS = new Set(['serie', 'serie_animee'])

// Un titre a des saisons à suivre si c'est une série/série animée par défaut,
// OU si on a déjà un total_seasons enregistré pour lui (cas d'un manga dont
// l'adaptation animée a été trouvée sur TMDB — ex: Ao Ashi).
// Les films restent exclus dans tous les cas, par définition ils n'ont pas de saisons.
function hasSeasons(title) {
  if (title.type === 'film') return false
  return HAS_SEASONS.has(title.type) || Boolean(title.total_seasons)
}

export default function TitleCard({ title, currentUserEmail, onChanged }) {
  const [busy, setBusy] = useState(false)

  const proposedBy = emailToPseudo(title.added_by_email)
  const isOwnProposal = title.added_by_email === currentUserEmail

  async function update(fields) {
    setBusy(true)
    await supabase.from('titles').update(fields).eq('id', title.id)
    setBusy(false)
    onChanged()
  }

  // Demande confirmation avant chaque action de changement de statut.
  function confirmAndUpdate(message, fields) {
    if (!confirm(message)) return
    update(fields)
  }

  async function handleDelete() {
    if (!confirm(`Retirer « ${title.name} » de la liste ?`)) return
    setBusy(true)
    await supabase.from('titles').delete().eq('id', title.id)
    setBusy(false)
    onChanged()
  }

  function changeSeason(e) {
    update({ current_season: parseInt(e.target.value) })
  }

  const seasonLabel = title.current_season
    ? `Saison ${title.current_season}${title.total_seasons ? ` / ${title.total_seasons}` : ''}`
    : null

  function watchNewSeason() {
    if (!confirm(`Une nouvelle saison de « ${title.name} » est sortie. La mettre dans À voir ?`)) return
    update({
      status: 'a_voir',
      current_season: (title.current_season || 0) + 1,
      new_season_available: false,
    })
  }

  return (
    <article className="title-card">
      <div className="title-card-poster">
        {title.image_url ? (
          <img src={title.image_url} alt="" loading="lazy" />
        ) : (
          <div className="title-card-poster-placeholder">
            <span>{title.name.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
        <span className="title-card-type">{TYPE_LABELS[title.type]}</span>
        {title.new_season_available && (
          <span className="title-card-badge">Nouvelle saison</span>
        )}
      </div>

      <div className="title-card-body">
        <h3>{title.name}</h3>

        {title.status === 'proposition' && proposedBy && (
          <p className="title-card-meta">Proposé par {proposedBy}</p>
        )}

        {seasonLabel && title.status !== 'proposition' && (
          <p className="title-card-meta">{seasonLabel}</p>
        )}

        <div className="title-card-actions">
          {/* --- PROPOSITION : seule l'autre personne peut valider/refuser --- */}
          {title.status === 'proposition' && (
            isOwnProposal ? (
              <p className="title-card-waiting">En attente de validation</p>
            ) : (
              <>
                <button
                  className="btn btn-validate"
                  disabled={busy}
                  onClick={() => confirmAndUpdate(`Valider la proposition « ${title.name} » ?`, { status: 'a_voir' })}
                >
                  Valider
                </button>
                <button
                  className="btn btn-refuse"
                  disabled={busy}
                  onClick={() => confirmAndUpdate(`Refuser la proposition « ${title.name} » ?`, { status: 'refusee' })}
                >
                  Refuser
                </button>
              </>
            )
          )}

          {/* --- À VOIR : on commence --- */}
          {title.status === 'a_voir' && (
            <button
              className="btn btn-action"
              disabled={busy}
              onClick={() => confirmAndUpdate(
                `Commencer « ${title.name} » ?`,
                { status: 'en_cours', current_season: hasSeasons(title) ? 1 : null }
              )}
            >
              On commence
            </button>
          )}

          {/* --- EN COURS : menu saison (si applicable) + terminé/abandonner --- */}
          {title.status === 'en_cours' && (
            <>
              {hasSeasons(title) && (
                <select
                  className="status-select"
                  value={title.current_season || 1}
                  onChange={changeSeason}
                  aria-label="Saison en cours"
                >
                  {Array.from({ length: Math.max(title.total_seasons || 1, title.current_season || 1) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Saison {n}{title.total_seasons ? ` / ${title.total_seasons}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="btn btn-action"
                disabled={busy}
                onClick={() => confirmAndUpdate(`Marquer « ${title.name} » comme terminé ?`, { status: 'vu' })}
              >
                Terminé
              </button>
              <button
                className="btn btn-abandon"
                disabled={busy}
                onClick={() => confirmAndUpdate(`Abandonner « ${title.name} » ?`, { status: 'jamais_fini' })}
              >
                Abandonner
              </button>
            </>
          )}

          {/* --- JAMAIS FINI : reprendre, à la saison où on s'était arrêté --- */}
          {title.status === 'jamais_fini' && (
            <button
              className="btn btn-action"
              disabled={busy}
              onClick={() => confirmAndUpdate(`Reprendre « ${title.name} » ?`, { status: 'en_cours' })}
            >
              Reprendre
            </button>
          )}

          {/* --- TERMINÉ : voir la nouvelle saison (si dispo) et/ou revoir depuis le début --- */}
          {title.status === 'vu' && title.new_season_available && (
            <button className="btn btn-action" disabled={busy} onClick={watchNewSeason}>
              Voir la nouvelle saison
            </button>
          )}

          {title.status === 'vu' && (
            <button
              className="btn btn-action"
              disabled={busy}
              onClick={() => confirmAndUpdate(
                `Revoir « ${title.name} » depuis le début ?`,
                { status: 'en_cours', current_season: hasSeasons(title) ? 1 : null }
              )}
            >
              Revoir
            </button>
          )}

          <button className="icon-btn icon-btn--danger" onClick={handleDelete} aria-label="Supprimer" disabled={busy}>
            ✕
          </button>
        </div>
      </div>
    </article>
  )
}
