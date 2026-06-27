import { useState } from 'react'
import { supabase } from '../supabaseClient'

// Supabase a besoin d'un email pour fonctionner, mais on ne veut montrer
// qu'un pseudo à l'utilisateur. On transforme donc le pseudo en
// "faux email" en interne, invisible pour la personne qui utilise le site.
function pseudoToEmail(pseudo) {
  const clean = pseudo.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return `${clean}@watchlist.local`
}

export default function Auth() {
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanPseudo = pseudo.trim()
    if (!cleanPseudo) {
      setError('Entre ton pseudo.')
      return
    }

    setLoading(true)
    const email = pseudoToEmail(cleanPseudo)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(traduireErreur(error.message))

    setLoading(false)
  }

  function traduireErreur(msg) {
    if (msg.includes('Invalid login credentials')) return 'Pseudo ou mot de passe incorrect.'
    return msg
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            src="/logo.png"
            alt=""
            className="brand-logo brand-logo--lg"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1>Watchlist</h1>
        </div>
        <p className="auth-subtitle">Content de te revoir.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Pseudo</span>
            <input
              type="text"
              required
              autoFocus
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="flo"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="auth-message auth-message--error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Un instant…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
