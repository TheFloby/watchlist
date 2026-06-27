import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import AddTitleForm from './components/AddTitleForm'
import TitleCard from './components/TitleCard'
import './App.css'

const TABS = [
  { key: 'en_cours', label: 'En cours', empty: 'Rien en cours pour l’instant.' },
  { key: 'a_voir', label: 'Propositions', empty: 'Aucune proposition. Lance-en une !' },
  { key: 'vu', label: 'Déjà vu', empty: 'Rien de regardé encore. Ça va vite changer.' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('en_cours')
  const [titles, setTitles] = useState([])
  const [loadingTitles, setLoadingTitles] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const fetchTitles = useCallback(async () => {
    setLoadingTitles(true)
    const { data, error } = await supabase
      .from('titles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setTitles(data)
    setLoadingTitles(false)
  }, [])

  useEffect(() => {
    if (session) fetchTitles()
  }, [session, fetchTitles])

  if (authLoading) {
    return <div className="page-loading">Chargement…</div>
  }

  if (!session) {
    return <Auth />
  }

  const visibleTitles = titles.filter(
    (t) => t.status === activeTab && (typeFilter === 'all' || t.type === typeFilter)
  )

  const currentTab = TABS.find((t) => t.key === activeTab)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <img
            src="/logo.png"
            alt=""
            className="brand-logo"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1>Watchlist</h1>
        </div>
        <div className="app-header-actions">
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            + Ajouter
          </button>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="tab-count">
              {titles.filter((t) => t.status === tab.key).length}
            </span>
          </button>
        ))}
      </nav>

      <div className="filter-row">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="status-select"
          aria-label="Filtrer par type"
        >
          <option value="all">Tous les types</option>
          <option value="serie">Séries</option>
          <option value="serie_animee">Séries animées</option>
          <option value="film">Films</option>
          <option value="manga">Mangas</option>
        </select>
      </div>

      <main className="title-grid-wrap">
        {loadingTitles ? (
          <p className="empty-state">Chargement des titres…</p>
        ) : visibleTitles.length === 0 ? (
          <div className="empty-state">
            <p>{currentTab.empty}</p>
          </div>
        ) : (
          <div className="title-grid">
            {visibleTitles.map((title) => (
              <TitleCard key={title.id} title={title} onChanged={fetchTitles} />
            ))}
          </div>
        )}
      </main>

      {showAddForm && (
        <AddTitleForm
          user={session.user}
          defaultStatus={activeTab}
          onAdded={() => {
            setShowAddForm(false)
            fetchTitles()
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}
