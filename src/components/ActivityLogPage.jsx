import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { emailToPseudo, avatarForEmail } from '../accounts'

// Formate une date complète en français, lisible : "28 juin 2026 à 14h32"
function formatFullDate(isoDate) {
  const d = new Date(isoDate)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ActivityLogPage({ onBack }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setEntries(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <main className="main-content activity-log-page">
      <button className="link-btn rating-page-back" onClick={onBack}>← Retour</button>

      <h1>Journal d'activité</h1>
      <p className="activity-log-subtitle">Historique des 200 dernières actions sur la Watchlist.</p>

      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="empty-state">Rien à afficher pour l'instant.</p>
      ) : (
        <div className="activity-log-list">
          {entries.map((entry) => {
            const pseudo = emailToPseudo(entry.user_email)
            const avatar = avatarForEmail(entry.user_email)
            return (
              <div key={entry.id} className="activity-log-entry">
                {avatar && <img src={avatar} alt="" className="activity-log-avatar" />}
                <div className="activity-log-entry-text">
                  <p>
                    <strong>{pseudo}</strong> {entry.action} « {entry.title_name} »
                    {entry.details && <span className="activity-log-details"> · {entry.details}</span>}
                  </p>
                  <span className="activity-log-date">{formatFullDate(entry.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
