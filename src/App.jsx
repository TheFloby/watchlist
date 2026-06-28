import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import AddTitleForm from './components/AddTitleForm'
import TitleCard from './components/TitleCard'
import TitleModal from './components/TitleModal'
import RatingPage from './components/RatingPage'
import ActivityLogPage from './components/ActivityLogPage'
import ChangePasswordModal from './components/ChangePasswordModal'
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
  const [sortOption, setSortOption] = useState('default')
  const [sortDirection, setSortDirection] = useState('desc')
  const [averageRatingByTitle, setAverageRatingByTitle] = useState({})
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const avatarTapCountRef = useRef(0)
  const avatarTapTimerRef = useRef(null)
  const ratingPageRef = useRef(null)
  const wasLoggedOutRef = useRef(true)

  // Empêche le navigateur de restaurer automatiquement une ancienne position de
  // scroll au chargement (comportement fréquent sur mobile, notamment en PWA),
  // qui pouvait laisser le titre de page coupé en haut au premier affichage.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      // Si une session existe déjà au chargement (page rechargée en étant connecté),
      // on ne considère pas ça comme "était déconnecté" — donc le futur SIGNED_IN
      // éventuel (ex: token rafraîchi) ne déclenchera pas de reset inutile.
      wasLoggedOutRef.current = !session
    })

    // SIGNED_IN ne doit déclencher le reset sur "En cours" que si on vient vraiment
    // de se reconnecter après avoir été déconnecté (saisie du mot de passe) — pas à
    // chaque petit événement interne (changement d'onglet, rafraîchissement de token...)
    // qui pourrait aussi porter ce nom selon le navigateur/la version du client.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && wasLoggedOutRef.current) {
        setActiveTab('en_cours')
        setSidebarOpen(false)
        try {
          localStorage.setItem('watchlist_active_tab', 'en_cours')
        } catch {
          // Pas grave si le navigateur bloque localStorage.
        }
        // On attend que le contenu principal ait remplacé l'écran de connexion à
        // l'écran avant de forcer le scroll — sinon ça s'exécute trop tôt et n'a
        // aucun effet visible. Un court délai laisse le temps au DOM de se mettre à jour.
        setTimeout(() => window.scrollTo(0, 0), 50)
      }
      wasLoggedOutRef.current = !session
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
    const { data } = await supabase.from('ratings').select('title_id, score_general, score_scenario, score_personnages').eq('user_email', email)
    const map = {}
    for (const r of data || []) map[r.title_id] = true
    setRatingsByTitle(map)
  }, [])

  // Charge TOUS les avis (Thomas + Flo), pour calculer la moyenne combinée par titre,
  // utilisée pour le tri "Votre note".
  const fetchAllRatingsAverage = useCallback(async () => {
    const { data } = await supabase.from('ratings').select('title_id, score_general, score_scenario, score_personnages')
    const byTitle = {}
    for (const r of data || []) {
      const weighted = (r.score_general * 2 + r.score_scenario + r.score_personnages) / 4
      if (!byTitle[r.title_id]) byTitle[r.title_id] = []
      byTitle[r.title_id].push(weighted)
    }
    const avg = {}
    for (const [titleId, scores] of Object.entries(byTitle)) {
      avg[titleId] = scores.reduce((a, b) => a + b, 0) / scores.length
    }
    setAverageRatingByTitle(avg)
  }, [])

  useEffect(() => {
    if (session) {
      fetchTitles()
      fetchMyRatings(session.user.email)
      fetchAllRatingsAverage()
    }
  }, [session, fetchTitles, fetchMyRatings, fetchAllRatingsAverage])

  if (authLoading) {
    return <div className="page-loading">Chargement…</div>
  }

  if (!session) {
    return <Auth />
  }

  const pseudo = emailToPseudo(session.user.email)
  const avatar = avatarForEmail(session.user.email)

  // Dans l'onglet Terminé, uniquement pour le tri "par défaut" : 0 = nouvelle saison
  // disponible (le plus prioritaire), 1 = saison annoncée mais pas encore sortie,
  // 2 = rien de particulier. Les autres tris (alpha, date, note...) ignorent cette
  // priorité — l'utilisateur a explicitement demandé un autre ordre.
  function seasonPriority(t) {
    if (hasUnwatchedSeason(t)) return 0
    if (t.upcoming_season_date) return 1
    return 2
  }

  const TYPE_ORDER = { serie: 0, serie_animee: 1, film: 2, manga: 3 }

  // Place toujours les titres sans valeur (null/undefined) en bas, peu importe le
  // sens du tri demandé — sinon ils remonteraient artificiellement en "ascendant".
  function compareWithNullsLast(aVal, bVal, direction) {
    const aMissing = aVal === null || aVal === undefined
    const bMissing = bVal === null || bVal === undefined
    if (aMissing && bMissing) return 0
    if (aMissing) return 1
    if (bMissing) return -1
    return direction === 'desc' ? bVal - aVal : aVal - bVal
  }

  function applySortOption(list) {
    if (sortOption === 'default') {
      // Seul ce tri applique la priorité "nouvelle saison" dans Terminé ; sinon,
      // ordre d'ajout tel que renvoyé par la base (déjà trié par created_at desc).
      if (activeTab === 'vu') {
        return [...list].sort((a, b) => seasonPriority(a) - seasonPriority(b))
      }
      return list
    }

    switch (sortOption) {
      case 'alpha':
        return [...list].sort((a, b) =>
          sortDirection === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
        )
      case 'release_year':
        return [...list].sort((a, b) => compareWithNullsLast(a.release_year, b.release_year, sortDirection))
      case 'type':
        return [...list].sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9))
      case 'tmdb_rating':
        return [...list].sort((a, b) => compareWithNullsLast(a.tmdb_vote_average, b.tmdb_vote_average, sortDirection))
      case 'our_rating':
        return [...list].sort((a, b) => compareWithNullsLast(averageRatingByTitle[a.id], averageRatingByTitle[b.id], sortDirection))
      default:
        return list
    }
  }

  const visibleTitles = applySortOption(
    titles.filter((t) => {
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
  )

  // Les tris qui acceptent un sens (alpha, date, note) ont un bouton dédié pour
  // inverser l'ordre, à côté du menu déroulant.
  const REVERSIBLE_SORTS = new Set(['alpha', 'release_year', 'tmdb_rating', 'our_rating'])

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

  // Réinitialise le filtre de type et le tri à chaque vrai changement de vue
  // (changement d'onglet, de sous-onglet Notes...) — un filtre actif depuis un
  // autre onglet n'a pas de raison de persister silencieusement ailleurs. On force
  // aussi le retour en haut de page, pour ne pas garder le scroll de la page d'avant.
  function resetFilters() {
    setTypeFilter('all')
    setSortOption('default')
    setSortDirection('desc')
    window.scrollTo(0, 0)
  }

  function selectTab(key) {
    guardedNavigate(() => {
      setRatingPageTitleId(null)
      setShowActivityLog(false)
      setActiveTab(key)
      setSidebarOpen(false)
      resetFilters()
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
      setShowActivityLog(false)
      setActiveTab('notes')
      resetFilters()
      try {
        localStorage.setItem('watchlist_active_tab', 'notes')
      } catch {
        // Pas grave si le navigateur bloque localStorage.
      }
    })
  }

  // Choix du sous-onglet Notes : ferme le tiroir mobile cette fois, puisque c'est
  // le vrai point de destination. Protégé par guardedNavigate, comme selectTab :
  // si on est en train de noter avec des changements non enregistrés, on demande
  // confirmation avant de quitter la page de notation pour revenir à la grille.
  function selectNotesSubTab(sub) {
    guardedNavigate(() => {
      setRatingPageTitleId(null)
      setShowActivityLog(false)
      setNotesSubTab(sub)
      setSidebarOpen(false)
      resetFilters()
    })
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
      setShowActivityLog(false)
      setNotesSubTab(ratingsByTitle[titleId] ? 'deja_note' : 'a_noter')
      setActiveTab('notes')
      resetFilters()
      try {
        localStorage.setItem('watchlist_active_tab', 'notes')
      } catch {
        // Pas grave si le navigateur bloque localStorage.
      }
    })
  }

  // Triple-tap sur l'avatar (n'importe quel compte) : ouvre le journal d'activité caché.
  // Pas dans la sidebar pour rester discret — juste ce petit geste à connaître.
  function handleAvatarTap() {
    avatarTapCountRef.current += 1
    clearTimeout(avatarTapTimerRef.current)

    if (avatarTapCountRef.current >= 3) {
      avatarTapCountRef.current = 0
      guardedNavigate(() => {
        setRatingPageTitleId(null)
        setShowActivityLog(true)
        setSidebarOpen(false)
        window.scrollTo(0, 0)
      })
      return
    }

    // Si on ne tape pas 3 fois en moins d'une seconde, on remet le compteur à zéro.
    avatarTapTimerRef.current = setTimeout(() => {
      avatarTapCountRef.current = 0
    }, 1000)
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
          {avatar && (
            <img
              src={avatar}
              alt=""
              className="sidebar-user-avatar"
              onClick={handleAvatarTap}
              role="button"
              tabIndex={0}
            />
          )}
          <div className="sidebar-user-info">
            <div className="sidebar-user-label">Connecté en tant que</div>
            <div className="sidebar-user-name">{pseudo}</div>
          </div>
          <button
            className="icon-btn"
            onClick={() => setShowChangePassword(true)}
            aria-label="Changer mon mot de passe"
            title="Changer mon mot de passe"
          >
            ⚙
          </button>
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} aria-label="Déconnexion">
            ⏻
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      {showActivityLog ? (
        <ActivityLogPage onBack={() => { setShowActivityLog(false); window.scrollTo(0, 0) }} />
      ) : ratingPageTitleId && titles.find((t) => t.id === ratingPageTitleId) ? (
        <RatingPage
          ref={ratingPageRef}
          title={titles.find((t) => t.id === ratingPageTitleId)}
          currentUserEmail={session.user.email}
          onBack={() => guardedNavigate(() => { setRatingPageTitleId(null); window.scrollTo(0, 0) })}
          onSaved={() => { fetchMyRatings(session.user.email); fetchAllRatingsAverage() }}
          onDirtyChange={setHasUnsavedRating}
        />
      ) : (
        <main className="main-content">
          <header className="content-header">
            <div className="content-header-top">
              <h1>{currentTab.label}</h1>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un titre…"
                className="search-input"
                aria-label="Rechercher un titre"
              />
            </div>
            <div className="content-header-filters">
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
              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value)
                  setSortDirection('desc')
                }}
                className="status-select"
                aria-label="Trier"
              >
                <option value="default">Tri par défaut</option>
                <option value="alpha">Alphabétique</option>
                <option value="release_year">Date de sortie</option>
                <option value="type">Type</option>
                <option value="tmdb_rating">Note TMDB</option>
                <option value="our_rating">Notre note</option>
              </select>
              {REVERSIBLE_SORTS.has(sortOption) && (
                <button
                  className="icon-btn sort-direction-btn"
                  onClick={() => setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
                  aria-label="Inverser l'ordre du tri"
                  title="Inverser l'ordre"
                >
                  {sortDirection === 'desc' ? '↓' : '↑'}
                </button>
              )}
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
                    onChanged={() => { fetchTitles(); fetchMyRatings(session.user.email); fetchAllRatingsAverage() }}
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
          onChanged={() => { fetchMyRatings(session.user.email); fetchAllRatingsAverage() }}
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

      {showChangePassword && (
        <ChangePasswordModal userEmail={session.user.email} onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
