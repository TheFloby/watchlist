import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(traduireErreur(error.message))
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(traduireErreur(error.message))
      } else {
        setInfo('Compte créé. Tu peux te connecter.')
        setMode('signin')
      }
    }
    setLoading(false)
  }

  function traduireErreur(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
    if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email.'
    if (msg.includes('Password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.'
    if (msg.includes('Unable to validate email address')) return 'Adresse email invalide.'
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
        <p className="auth-subtitle">
          {mode === 'signin' ? 'Content de te revoir.' : 'Crée ton compte pour commencer.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="auth-message auth-message--error">{error}</p>}
          {info && <p className="auth-message auth-message--info">{info}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : "Créer mon compte"}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setInfo('')
          }}
        >
          {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}
