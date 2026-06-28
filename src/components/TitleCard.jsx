import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { emailToPseudo } from '../accounts'
import { hasUnwatchedSeason } from '../seasonUtils'
import { useConfirm } from '../ConfirmContext'
import { logActivity } from '../activityLog'

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

// Formate une date ISO (YYYY-MM-DD) en JJ/MM/AA, pour l'affichage du badge "à venir".
function formatShortDate(isoDate) {
  if (!isoDate) return null
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year.slice(-2)}`
}

// Un FILM n'est pas encore sorti en salle si sa date de sortie est dans le futur,
// ou si elle n'est pas encore connue du tout. Uniquement pour les films : les
// séries/mangas gèrent ça saison par saison, pas avec une seule date globale.
function isUnreleasedMovie(title) {
  if (title.type !== 'film') return false
  if (!title.release_date) return true
  const today = new Date().toISOString().slice(0, 10)
  return title.release_date > today
}

export default function TitleCard({ title, currentUserEmail, onChanged, onOpen, readOnly = false, alreadyRated = false }) {
  const [busy, setBusy] = useState(false)
  const confirmAction = useConfirm()

  const proposedBy = emailToPseudo(title.added_by_email)
  const isOwnProposal = title.added_by_email === currentUserEmail

  async function update(fields) {
    setBusy(true)
    // Dès qu'un titre passe (ou repasse) en "En cours", on le marque comme ayant déjà
    // été en cours — ça lui ouvre l'accès au menu Notes, même s'il change de statut après.
    const finalFields = fields.status === 'en_cours' ? { ...fields, has_been_in_progress: true } : fields
    await supabase.from('titles').update(finalFields).eq('id', title.id)
    setBusy(false)
    onChanged()
  }

  // Demande confirmation avant chaque action de changement de statut, puis journalise
  // l'action dans le journal d'activité (si un libellé est fourni).
  async function confirmAndUpdate(message, fields, logLabel = null) {
    const ok = await confirmAction(message)
    if (!ok) return
    update(fields)
    if (logLabel) logActivity(currentUserEmail, logLabel, title.name)
  }

  async function handleDelete() {
    const ok = await confirmAction(`« ${title.name} » disparaît de la liste, c'est sûr ?`)
    if (!ok) return
    setBusy(true)
    await supabase.from('titles').delete().eq('id', title.id)
    setBusy(false)
    onChanged()
    logActivity(currentUserEmail, 'a supprimé', title.name)
  }

  function changeSeason(e) {
    update({ current_season: parseInt(e.target.value) })
  }

  const seasonLabel = title.current_season
    ? `Saison ${title.current_season}${title.total_seasons ? ` / ${title.total_seasons}` : ''}`
    : null

  async function watchNewSeason() {
    const ok = await confirmAction(`Une nouvelle saison de « ${title.name} » est sortie ! On la met dans À voir ?`)
    if (!ok) return
    update({
      status: 'a_voir',
      current_season: (title.current_season || 0) + 1,
      new_season_available: false,
    })
    logActivity(currentUserEmail, 'a découvert une nouvelle saison de', title.name)
  }

  const showNewSeasonButton = title.status === 'vu' && hasUnwatchedSeason(title)

  return (
    <article className="title-card">
      <div className="title-card-poster" onClick={onOpen} role="button" tabIndex={0}>
        {title.image_url ? (
          <img src={title.image_url} alt="" loading="lazy" />
        ) : (
          <div className="title-card-poster-placeholder">
            <span>{title.name.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
        <span className="title-card-type">{TYPE_LABELS[title.type]}</span>
      </div>

      <div className="title-card-body">
        <h3 className="title-card-title-clickable" onClick={onOpen}>{title.name}</h3>

        {title.status === 'proposition' && proposedBy && (
          <p className="title-card-meta">Proposé par {proposedBy}</p>
        )}

        {seasonLabel && title.status !== 'proposition' && (
          <p className="title-card-meta">{seasonLabel}</p>
        )}

        {title.status === 'vu' && hasUnwatchedSeason(title) && (
          <p className="title-card-season-notice title-card-season-notice--new">
            <span className="title-card-season-dot" />
            Nouvelle saison disponible
          </p>
        )}

        {title.status === 'vu' && !hasUnwatchedSeason(title) && title.upcoming_season_date && (
          <p className="title-card-season-notice">
            <span className="title-card-season-dot" />
            Saison {title.upcoming_season_number} le {formatShortDate(title.upcoming_season_date)}
          </p>
        )}

        {readOnly ? (
          <div className="title-card-actions">
            <button className="btn btn-action" onClick={onOpen}>
              {alreadyRated ? 'Voir / Modifier' : 'Noter'}
            </button>
          </div>
        ) : (
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
                    onClick={() => confirmAndUpdate(`Top, on valide « ${title.name} » ?`, { status: 'a_voir' }, 'a validé la proposition')}
                  >
                    Valider
                  </button>
                  <button
                    className="btn btn-refuse"
                    disabled={busy}
                    onClick={() => confirmAndUpdate(`Bon, on laisse tomber « ${title.name} » ?`, { status: 'refusee' }, 'a refusé la proposition')}
                  >
                    Refuser
                  </button>
                </>
              )
            )}

            {/* --- À VOIR : on commence (sauf film pas encore sorti en salle) --- */}
            {title.status === 'a_voir' && (
              isUnreleasedMovie(title) ? (
                <p className="title-card-not-released">
                  {title.release_date
                    ? `En salle le ${formatShortDate(title.release_date)}`
                    : 'En salle prochainement'}
                </p>
              ) : (
                <button
                  className="btn btn-action"
                  disabled={busy}
                  onClick={() => confirmAndUpdate(
                    `Prêt à lancer « ${title.name} » ?`,
                    { status: 'en_cours', current_season: hasSeasons(title) ? (title.current_season || 1) : null },
                    'a commencé'
                  )}
                >
                  On commence
                </button>
              )
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
                        Saison {n}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className="btn btn-action"
                  disabled={busy}
                  onClick={() => confirmAndUpdate(`« ${title.name} » fini, bravo ! On valide ?`, { status: 'vu' }, 'a terminé')}
                >
                  Terminé
                </button>
                <button
                  className="btn btn-abandon"
                  disabled={busy}
                  onClick={() => confirmAndUpdate(`On laisse « ${title.name} » de côté pour l'instant ?`, { status: 'jamais_fini' }, 'a abandonné')}
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
                onClick={() => confirmAndUpdate(`On s'y remet, « ${title.name} » ?`, { status: 'en_cours' }, 'a repris')}
              >
                Reprendre
              </button>
            )}

            {/* --- TERMINÉ : voir la nouvelle saison (si dispo) et/ou revoir depuis le début --- */}
            {showNewSeasonButton && (
              <button className="btn btn-action" disabled={busy} onClick={watchNewSeason}>
                Voir la nouvelle saison
              </button>
            )}

            {title.status === 'vu' && (
              <button
                className="btn btn-action"
                disabled={busy}
                onClick={() => confirmAndUpdate(
                  `Envie de redécouvrir « ${title.name} » depuis le début ?`,
                  { status: 'en_cours', current_season: hasSeasons(title) ? 1 : null },
                  'a relancé'
                )}
              >
                Revoir
              </button>
            )}

            <button className="icon-btn icon-btn--danger" onClick={handleDelete} aria-label="Supprimer" disabled={busy}>
              ✕
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
