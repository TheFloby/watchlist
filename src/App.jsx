import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import AddTitleForm from './components/AddTitleForm'
import TitleCard from './components/TitleCard'
import { emailToPseudo, avatarForEmail } from './accounts'
import './App.css'

const TABS = [
  { key: 'en_cours', label: 'En cours', icon: '◷', empty: 'Rien en cours pour l’instant.' },
  { key: 'a_voir', label: 'À voir', icon: '◎', empty: 'Rien à voir pour le moment.' },
  { key: 'proposition', label: 'Propositions', icon: '✉', empty: 'Aucune proposition en attente.' },
  { key: 'vu', label: 'Terminé', icon: '✓', empty: 'Rien de terminé encore. Ça va vite changer.' },
  { key: 'jamais_fini', label: 'Jamais fini', icon: '⊘', empty: 'Aucun abandon, bravo la persévérance.' },
  { key: 'refusee', label: 'Refusées', icon: '✕', empty: 'Aucune proposition refusée.' },
]

const VALID_TABS = TABS.map((t) => t.key)

// Récupère le dernier onglet visité (sauvegardé dans le navigateur), pour ne pas
// retomber sur "En cours" à chaque rechargement de la page.
function getInitialTab() {
  try {
    const saved = localStorage.getItem('watchlist_active_tab')
    return VALID_TABS.includes(saved) ? saved : 'en_cours'
  } catch {
    return 'en_cours'
  }
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(getInitialTab)
  const [titles, setTitles] = useState([])
  const [loadingTitles, setLoadingTitles] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormAdminMode, setAddFormAdminMode] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const pseudo = emailToPseudo(session.user.email)
  const avatar = avatarForEmail(session.user.email)

  // Dans l'onglet Terminé : 0 = nouvelle saison sortie (le plus prioritaire),
  // 1 = saison annoncée mais pas encore sortie, 2 = rien de particulier.
  function seasonPriority(t) {
    if (t.new_season_available) return 0
    if (t.upcoming_season_date) return 1
    return 2
  }

  const visibleTitles = titles
    .filter(
      (t) =>
        t.status === activeTab &&
        (typeFilter === 'all' || t.type === typeFilter) &&
        (searchQuery.trim() === '' || t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    )
    .sort((a, b) => {
      if (activeTab === 'vu') {
        return seasonPriority(a) - seasonPriority(b)
      }
      return 0
    })

  const currentTab = TABS.find((t) => t.key === activeTab)

  function selectTab(key) {
    setActiveTab(key)
    setSidebarOpen(false)
    try {
      localStorage.setItem('watchlist_active_tab', key)
    } catch {
      // Si le navigateur bloque localStorage (mode privé strict, etc.), on continue
      // sans bloquer l'app — la persistance ne fonctionnera juste pas cette fois.
    }
  }

  return (
    <div className="app-shell">
      <div className="app-portal-glow" aria-hidden="true" />

      {/* Sidebar (desktop : fixe à gauche / mobile : tiroir) */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Ouvrir le menu"
      >
        ☰
      </button>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu">✕</button>

        <div className="sidebar-brand">
          <img src="/logo.png" alt="TFCU" />
          <div className="sidebar-brand-title">Watchlist</div>
          <div className="sidebar-brand-sub">TFCU</div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((tab) => {
            const count = titles.filter((t) => t.status === tab.key).length
            return (
              <button
                key={tab.key}
                className={`sidebar-link ${activeTab === tab.key ? 'sidebar-link--active' : ''}`}
                onClick={() => selectTab(tab.key)}
              >
                <span className="sidebar-link-icon">{tab.icon}</span>
                {tab.label}
                <span className="sidebar-count">{count}</span>
              </button>
            )
          })}
        </nav>

        <button className="sidebar-add" onClick={() => { setAddFormAdminMode(false); setShowAddForm(true); setSidebarOpen(false) }}>
          + Proposer un titre
        </button>

        {pseudo === 'Flo' && (
          <button
            className="sidebar-add sidebar-add--admin"
            onClick={() => { setAddFormAdminMode(true); setShowAddForm(true); setSidebarOpen(false) }}
          >
            + Ajouter directement
          </button>
        )}

        <div className="sidebar-user">
          {avatar && <img src={avatar} alt="" className="sidebar-user-avatar" />}
          <div className="sidebar-user-info">
            <div className="sidebar-user-label">Connecté en tant que</div>
            <div className="sidebar-user-name">{pseudo}</div>
          </div>
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} aria-label="Déconnexion">
            ⏻
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="main-content">
        <header className="content-header">
          <h1>{currentTab.label}</h1>
          <div className="content-header-filters">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un titre…"
              className="search-input"
              aria-label="Rechercher un titre"
            />
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
        </header>

        <div className="title-grid-wrap">
          {loadingTitles ? (
            <p className="empty-state">Chargement des titres…</p>
          ) : visibleTitles.length === 0 ? (
            <div className="empty-state">
              <p>{searchQuery.trim() ? `Aucun résultat pour « ${searchQuery.trim()} ».` : currentTab.empty}</p>
            </div>
          ) : (
            <div className="title-grid">
              {visibleTitles.map((title) => (
                <TitleCard
                  key={title.id}
                  title={title}
                  currentUserEmail={session.user.email}
                  onChanged={fetchTitles}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAddForm && (
        <AddTitleForm
          user={session.user}
          adminMode={addFormAdminMode}
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
