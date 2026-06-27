import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { ACCOUNTS, pseudoToEmail } from '../accounts'

export default function Auth() {
  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function selectAccount(pseudo) {
    setSelected(pseudo)
    setPassword('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selected) return
    setError('')
    setLoading(true)

    const email = pseudoToEmail(selected)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) setError('Mot de passe incorrect.')
    setLoading(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-portal" aria-hidden="true" />

      <div className="auth-card">
        <img src="/logo.png" alt="TFCU" className="auth-logo" />

        <h1 className="auth-title">Watchlist</h1>
        <p className="auth-subtitle">
          {selected ? `Content de te revoir, ${selected}.` : 'Qui es-tu ?'}
        </p>

        <div className="auth-avatars">
          {ACCOUNTS.map((account) => (
            <button
              key={account.pseudo}
              type="button"
              className={`auth-avatar-btn ${selected === account.pseudo ? 'auth-avatar-btn--active' : ''}`}
              onClick={() => selectAccount(account.pseudo)}
            >
              <img src={account.avatar} alt="" />
              <span>{account.pseudo}</span>
            </button>
          ))}
        </div>

        {selected && (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field">
              <span>Mot de passe</span>
              <input
                type="password"
                required
                autoFocus
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
        )}
      </div>
    </div>
  )
}
