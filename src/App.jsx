import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import AddTitleForm from './components/AddTitleForm'
import TitleCard from './components/TitleCard'
import TitleModal from './components/TitleModal'
import RatingPage from './components/RatingPage'
import { emailToPseudo, avatarForEmail } from './accounts'
import { hasUnwatchedSeason } from './seasonUtils'
import './App.css'

const TABS = [
  { key: 'en_cours', label: 'En cours', icon: '◷', empty: 'Rien en cours pour l’instant.' },
  { key: 'a_voir', label: 'À voir', icon: '◎', empty: 'Rien à voir pour le moment.' },
  { key: 'proposition', label: 'Propositions', icon: '✉', empty: 'Aucune proposition en attente.' },
  { key: 'vu', label: 'Terminé', icon: '✓', empty: 'Rien de terminé encore. Ça va vite changer.' },
  { key: 'jamais_fini', label: 'Jamais fini', icon: '⊘', empty: 'Aucun abandon, bravo la persévérance.' },
  { key: 'refusee', label: 'Refusées', icon: '✕', empty: 'Aucune proposition refusée.' },
]

const VALID_TABS = [...TABS.map((t) => t.key), 'notes']

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
  const [notesSubTab, setNotesSubTab] = useState('a_noter')
  const [ratingsByTitle, setRatingsByTitle] = useState({})
  const [openTitleId, setOpenTitleId] = useState(null)
  const [ratingPageTitleId, setRatingPageTitleId] = useState(null)
  const [hasUnsavedRating, setHasUnsavedRating] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const ratingPageRef = useRef(null)

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

  const fetchMyRatings = useCallback(async (email) => {
    if (!email) return
    const { data } = await supabase.from('ratings').select('title_id').eq('user_email', email)
    const map = {}
    for (const r of data || []) map[r.title_id] = true
    setRatingsByTitle(map)
  }, [])

  useEffect(() => {
    if (session) {
      fetchTitles()
      fetchMyRatings(session.user.email)
    }
  }, [session, fetchTitles, fetchMyRatings])

  if (authLoading) {
    return <div className="page-loading">Chargement…</div>
  }

  if (!session) {
    return <Auth />
  }

  const pseudo = emailToPseudo(session.user.email)
  const avatar = avatarForEmail(session.user.email)

  // Dans l'onglet Terminé : 0 = nouvelle saison disponible (le plus prioritaire),
  // 1 = saison annoncée mais pas encore sortie, 2 = rien de particulier.
  function seasonPriority(t) {
    if (hasUnwatchedSeason(t)) return 0
    if (t.upcoming_season_date) return 1
    return 2
  }

  const visibleTitles = titles
    .filter((t) => {
      if (activeTab === 'notes') {
        if (!t.has_been_in_progress) return false
        const alreadyRated = Boolean(ratingsByTitle[t.id])
        if (notesSubTab === 'a_noter' && alreadyRated) return false
        if (notesSubTab === 'deja_note' && !alreadyRated) return false
      } else if (t.status !== activeTab) {
        return false
      }
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (searchQuery.trim() && !t.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (activeTab === 'vu') {
        return seasonPriority(a) - seasonPriority(b)
      }
      return 0
    })

  const currentTab = activeTab === 'notes'
    ? {
        label: 'Notes',
        empty: notesSubTab === 'a_noter'
          ? 'Rien à noter pour le moment.'
          : "Tu n'as encore rien noté.",
      }
    : TABS.find((t) => t.key === activeTab)

  // Quand on essaie de naviguer ailleurs (changer d'onglet, ouvrir une fiche...) alors
  // qu'il y a des modifications non enregistrées sur la page de notation, on stocke
  // l'action de navigation en attente, et on affiche une popup avec 3 choix.
  function guardedNavigate(action) {
    if (!hasUnsavedRating) {
      action()
      return
    }
    setPendingNavigation(() => action)
  }

  function selectTab(key) {
    guardedNavigate(() => {
      setRatingPageTitleId(null)
      setActiveTab(key)
      setSidebarOpen(false)
      try {
        localStorage.setItem('watchlist_active_tab', key)
      } catch {
        // Si le navigateur bloque localStorage (mode privé strict, etc.), on continue
        // sans bloquer l'app — la persistance ne fonctionnera juste pas cette fois.
      }
    })
  }

  // Spécifique au bouton "Notes" de la sidebar : sur mobile, on ne ferme pas le tiroir
  // tout de suite, pour laisser le temps de choisir entre "À noter" et "Déjà noté"
  // (qui eux ferment vraiment le tiroir une fois le choix fait).
  function selectNotesMainTab() {
    guardedNavigate(() => {
      setRatingPageTitleId(null)
      setActiveTab('notes')
      try {
        localStorage.setItem('watchlist_active_tab', 'notes')
      } catch {
        // Pas grave si le navigateur bloque localStorage.
      }
    })
  }

  // Choix du sous-onglet Notes : ferme le tiroir mobile cette fois, puisque c'est
  // le vrai point de destination.
  function selectNotesSubTab(sub) {
    setNotesSubTab(sub)
    setSidebarOpen(false)
  }

  // Les 3 choix possibles de la popup "modifications non enregistrées" :
  async function handleSaveAndLeave() {
    const ok = await ratingPageRef.current?.save()
    if (ok) {
      pendingNavigation?.()
    }
    setPendingNavigation(null)
  }

  function handleLeaveWithoutSaving() {
    setHasUnsavedRating(false)
    pendingNavigation?.()
    setPendingNavigation(null)
  }

  function handleCancelNavigation() {
    setPendingNavigation(null)
  }

  // Ouvre la page de notation pour un titre, et bascule le menu sur Notes
  // (avec le bon sous-onglet) pour que la sidebar reste cohérente avec ce qu'on regarde,
  // peu importe l'onglet depuis lequel on arrive. Protégé par guardedNavigate : si on est
  // déjà en train de noter autre chose avec des modifications en attente, on demande
  // confirmation avant de changer de titre.
  function openRatingPage(titleId) {
    guardedNavigate(() => {
      setRatingPageTitleId(titleId)
      setNotesSubTab(ratingsByTitle[titleId] ? 'deja_note' : 'a_noter')
      setActiveTab('notes')
      try {
        localStorage.setItem('watchlist_active_tab', 'notes')
      } catch {
        // Pas grave si le navigateur bloque localStorage.
      }
    })
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

          <div className="sidebar-divider" />

          {(() => {
            const ratable = titles.filter((t) => t.has_been_in_progress)
            const toRateCount = ratable.filter((t) => !ratingsByTitle[t.id]).length
            return (
              <button
                className={`sidebar-link ${activeTab === 'notes' ? 'sidebar-link--active' : ''}`}
                onClick={selectNotesMainTab}
              >
                <span className="sidebar-link-icon">★</span>
                Notes
                <span className="sidebar-count">{toRateCount}</span>
              </button>
            )
          })()}

          {activeTab === 'notes' && (
            <div className="sidebar-subnav">
              <button
                className={`sidebar-sublink ${notesSubTab === 'a_noter' ? 'sidebar-sublink--active' : ''}`}
                onClick={() => selectNotesSubTab('a_noter')}
              >
                À noter
              </button>
              <button
                className={`sidebar-sublink ${notesSubTab === 'deja_note' ? 'sidebar-sublink--active' : ''}`}
                onClick={() => selectNotesSubTab('deja_note')}
              >
                Déjà noté
              </button>
            </div>
          )}
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
      {ratingPageTitleId && titles.find((t) => t.id === ratingPageTitleId) ? (
        <RatingPage
          ref={ratingPageRef}
          title={titles.find((t) => t.id === ratingPageTitleId)}
          currentUserEmail={session.user.email}
          onBack={() => guardedNavigate(() => setRatingPageTitleId(null))}
          onSaved={() => fetchMyRatings(session.user.email)}
          onDirtyChange={setHasUnsavedRating}
        />
      ) : (
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
                    onChanged={() => { fetchTitles(); fetchMyRatings(session.user.email) }}
                    onOpen={() => activeTab === 'notes' ? openRatingPage(title.id) : setOpenTitleId(title.id)}
                    readOnly={activeTab === 'notes'}
                    alreadyRated={Boolean(ratingsByTitle[title.id])}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

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

      {openTitleId && titles.find((t) => t.id === openTitleId) && (
        <TitleModal
          title={titles.find((t) => t.id === openTitleId)}
          currentUserEmail={session.user.email}
          onClose={() => setOpenTitleId(null)}
          onChanged={() => fetchMyRatings(session.user.email)}
          onRate={() => {
            setOpenTitleId(null)
            openRatingPage(openTitleId)
          }}
        />
      )}

      {pendingNavigation && (
        <div className="modal-overlay" onClick={handleCancelNavigation}>
          <div className="confirm-leave-card" onClick={(e) => e.stopPropagation()}>
            <h2>Modifications non enregistrées</h2>
            <p>Tu as des changements non enregistrés sur cette note. Que veux-tu faire ?</p>
            <div className="confirm-leave-actions">
              <button className="btn btn-primary" onClick={handleSaveAndLeave}>Enregistrer et quitter</button>
              <button className="btn btn-abandon" onClick={handleLeaveWithoutSaving}>Quitter sans enregistrer</button>
              <button className="btn btn-ghost" onClick={handleCancelNavigation}>Rester sur la page</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
