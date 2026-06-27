import { supabase } from '../supabaseClient'

const TYPE_LABELS = {
  serie: 'Série',
  serie_animee: 'Série animée',
  film: 'Film',
  manga: 'Manga',
}

const STATUS_LABELS = {
  a_voir: 'À voir',
  en_cours: 'En cours',
  vu: 'Vu',
}

export default function TitleCard({ title, onChanged }) {
  async function updateStatus(newStatus) {
    await supabase.from('titles').update({ status: newStatus }).eq('id', title.id)
    onChanged()
  }

  async function handleDelete() {
    if (!confirm(`Retirer « ${title.name} » de la liste ?`)) return
    await supabase.from('titles').delete().eq('id', title.id)
    onChanged()
  }

  const who = title.added_by_email ? title.added_by_email.split('@')[0] : null

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
      </div>

      <div className="title-card-body">
        <h3>{title.name}</h3>
        {who && <p className="title-card-meta">Proposé par {who}</p>}

        <div className="title-card-actions">
          <select
            value={title.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="status-select"
            aria-label="Changer le statut"
          >
            <option value="a_voir">{STATUS_LABELS.a_voir}</option>
            <option value="en_cours">{STATUS_LABELS.en_cours}</option>
            <option value="vu">{STATUS_LABELS.vu}</option>
          </select>
          <button className="icon-btn icon-btn--danger" onClick={handleDelete} aria-label="Supprimer">
            ✕
          </button>
        </div>
      </div>
    </article>
  )
}
