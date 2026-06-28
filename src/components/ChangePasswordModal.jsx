import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ChangePasswordModal({ userEmail, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    // On vérifie d'abord que l'ancien mot de passe est correct, en tentant une
    // reconnexion avec — Supabase ne demande pas nativement l'ancien mot de passe
    // pour updateUser, donc on fait cette vérification nous-mêmes avant d'autoriser
    // le changement.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })

    if (signInError) {
      setLoading(false)
      setError('Mot de passe actuel incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    setLoading(false)

    if (updateError) {
      setError("Impossible de changer le mot de passe. Réessaie.")
      return
    }

    setSuccess(true)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Changer mon mot de passe</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {success ? (
          <>
            <p className="auth-message auth-message--success">Mot de passe mis à jour !</p>
            <button className="btn btn-primary" onClick={onClose}>Fermer</button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field">
              <span>Mot de passe actuel</span>
              <input
                type="password"
                required
                autoFocus
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Nouveau mot de passe</span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Confirmer le nouveau mot de passe</span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {error && <p className="auth-message auth-message--error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Changement…' : 'Changer mon mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
