import { createClient } from '@supabase/supabase-js'

// Cette fonction est appelée automatiquement une fois par jour par Vercel (voir vercel.json).
// Elle vérifie sur TMDB, pour chaque titre suivi :
// - le nombre de saisons RÉELLEMENT SORTIES (date de diffusion déjà passée) ;
// - si une prochaine saison est ANNONCÉE mais pas encore diffusée, sa date de sortie prévue.
//
// - new_season_available (+ total_seasons mis à jour) : la saison est sortie, regardable.
//   Le badge "Nouvelle saison" + bouton ne s'affichent que sur les titres "Terminé".
// - upcoming_season_date / upcoming_season_number : une saison est annoncée mais pas encore
//   sortie. Affichage purement informatif ("Saison X le JJ/MM"), pas d'action possible.
//
// Variables d'environnement nécessaires (à configurer dans Vercel, jamais dans le code) :
// - SUPABASE_URL              : l'URL de ton projet Supabase
// - SUPABASE_SERVICE_ROLE_KEY : la clé "service_role" (PAS la clé publique) — permet d'écrire
//                               en base sans authentification utilisateur. Très sensible, ne
//                               jamais l'exposer côté navigateur.
// - TMDB_API_KEY              : la même clé que celle utilisée côté site
// - CRON_SECRET               : générée automatiquement par Vercel, sert à vérifier que l'appel
//                               vient bien de Vercel et pas de quelqu'un d'autre sur internet
//
// Pour tester manuellement sans attendre l'horaire planifié, ouvre dans ton navigateur :
// https://ton-site.vercel.app/api/check-new-seasons?secret=LA_VALEUR_DE_CRON_SECRET
// (la valeur de CRON_SECRET se trouve dans Vercel → Settings → Environment Variables)

export default async function handler(req, res) {
  // Autorise soit l'appel automatique de Vercel (header), soit un test manuel via ?secret=...
  const authHeader = req.headers.authorization
  const expected = process.env.CRON_SECRET
  const provided = req.query.secret

  const isVercelCron = authHeader === `Bearer ${expected}`
  const isManualTest = provided === expected

  // Mode diagnostic : ajoute &debug=1 à l'URL pour voir, sans révéler les vraies valeurs,
  // si la variable d'environnement existe bien et si la comparaison correspond.
  if (req.query.debug === '1') {
    return res.status(200).json({
      env_var_exists: !!expected,
      env_var_length: expected ? expected.length : 0,
      provided_length: provided ? provided.length : 0,
      env_var_preview: expected ? `${expected.slice(0, 3)}...${expected.slice(-3)}` : null,
      provided_preview: provided ? `${provided.slice(0, 3)}...${provided.slice(-3)}` : null,
      match: isManualTest,
    })
  }

  if (!isVercelCron && !isManualTest) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const TMDB_API_KEY = process.env.TMDB_API_KEY
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD, comparable directement aux air_date de TMDB

  // Mode diagnostic ciblé : ajoute &debugTitle=Ao%20Ashi à l'URL pour voir en détail
  // ce que la base de données ET TMDB renvoient pour un titre précis, sans rien modifier.
  if (req.query.debugTitle) {
    const { data: match } = await supabase
      .from('titles')
      .select('id, name, status, type, tmdb_id, total_seasons, current_season, new_season_available, upcoming_season_date, upcoming_season_number')
      .ilike('name', `%${req.query.debugTitle}%`)
      .limit(1)
      .single()

    if (!match) {
      return res.status(200).json({ error: 'Titre introuvable en base' })
    }

    let rawTmdb = null
    if (match.tmdb_id) {
      const url = `https://api.themoviedb.org/3/tv/${match.tmdb_id}?api_key=${TMDB_API_KEY}&language=fr-FR`
      const r = await fetch(url)
      const data = await r.json()
      rawTmdb = {
        number_of_seasons: data.number_of_seasons,
        seasons: (data.seasons || []).map((s) => ({
          season_number: s.season_number,
          air_date: s.air_date,
          name: s.name,
        })),
      }
    }

    return res.status(200).json({
      today,
      db_row: match,
      tmdb_raw: rawTmdb,
    })
  }

  // On récupère :
  // - tous les titres qui ont déjà un tmdb_id enregistré (peu importe leur type affiché,
  //   y compris "Manga" si l'oeuvre a été trouvée via TMDB puis reclassée) ;
  // - ET les séries/séries animées qui n'ont pas encore de tmdb_id (ajoutées avant cette
  //   fonctionnalité, ou via le mode manuel) — pour elles, on va tenter de le retrouver
  //   par une recherche sur le nom un peu plus bas.
  const selectFields = 'id, name, status, type, tmdb_id, total_seasons, current_season, new_season_available, upcoming_season_date, upcoming_season_number'

  const { data: withTmdbId, error: errorA } = await supabase
    .from('titles')
    .select(selectFields)
    .not('tmdb_id', 'is', null)

  const { data: seriesWithoutTmdbId, error: errorB } = await supabase
    .from('titles')
    .select(selectFields)
    .is('tmdb_id', null)
    .in('type', ['serie', 'serie_animee'])

  if (errorA || errorB) {
    return res.status(500).json({ error: (errorA || errorB).message })
  }

  const titles = [...withTmdbId, ...seriesWithoutTmdbId]

  const results = []

  for (const title of titles) {
    // Si on n'a pas de tmdb_id enregistré (séries ajoutées avant cette fonctionnalité,
    // ou ajoutées à la main), on tente de le retrouver par une recherche sur le nom.
    let tmdbId = title.tmdb_id

    if (!tmdbId) {
      tmdbId = await findTmdbIdByName(title.name, TMDB_API_KEY)
      if (tmdbId) {
        await supabase.from('titles').update({ tmdb_id: tmdbId }).eq('id', title.id)
      }
    }

    if (!tmdbId) {
      results.push({ name: title.name, status: 'tmdb_id introuvable, ignoré' })
      continue
    }

    const seasonInfo = await fetchSeasonInfo(tmdbId, TMDB_API_KEY, today)

    if (!seasonInfo) {
      results.push({ name: title.name, status: 'infos TMDB introuvables' })
      continue
    }

    const { airedSeasonsCount, nextAnnounced } = seasonInfo
    const fields = {}
    let resultStatus = 'pas de changement'

    // Une prochaine saison est annoncée avec une date dans le futur : on l'enregistre
    // pour affichage informatif, sans toucher total_seasons (elle n'est pas sortie).
    if (nextAnnounced) {
      if (title.upcoming_season_number !== nextAnnounced.seasonNumber || title.upcoming_season_date !== nextAnnounced.airDate) {
        fields.upcoming_season_date = nextAnnounced.airDate
        fields.upcoming_season_number = nextAnnounced.seasonNumber
        resultStatus = `saison ${nextAnnounced.seasonNumber} annoncée pour le ${nextAnnounced.airDate}`
      }
    } else if (title.upcoming_season_date) {
      // Plus aucune saison annoncée en attente (ou elle est devenue obsolète) : on nettoie.
      fields.upcoming_season_date = null
      fields.upcoming_season_number = null
    }

    // Première fois qu'on enregistre le nombre de saisons sorties : pas de badge,
    // on n'a rien à comparer.
    if (!title.total_seasons) {
      fields.total_seasons = airedSeasonsCount
      resultStatus = `total_seasons initialisé à ${airedSeasonsCount}`
    } else if (airedSeasonsCount > title.total_seasons) {
      // Une saison annoncée est désormais réellement sortie !
      fields.total_seasons = airedSeasonsCount
      if (title.status === 'vu') {
        fields.new_season_available = true
      }
      resultStatus = `nouvelle saison sortie ! ${title.total_seasons} → ${airedSeasonsCount}${title.status === 'vu' ? ' (badge activé)' : ' (mise à jour silencieuse)'}`
    }

    if (Object.keys(fields).length > 0) {
      await supabase.from('titles').update(fields).eq('id', title.id)
    }

    results.push({ name: title.name, status: resultStatus })
  }

  return res.status(200).json({ checked: titles.length, results })
}

// Récupère le détail des saisons d'une série sur TMDB, et distingue :
// - airedSeasonsCount : nombre de saisons dont la date de sortie est déjà passée
// - nextAnnounced : la prochaine saison connue mais dont la date de sortie est dans le futur
async function fetchSeasonInfo(tmdbId, apiKey, today) {
  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=fr-FR`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()

    const realSeasons = (data.seasons || []).filter((s) => s.season_number > 0)

    const aired = realSeasons.filter((s) => s.air_date && s.air_date <= today)
    const announced = realSeasons
      .filter((s) => s.air_date && s.air_date > today)
      .sort((a, b) => a.air_date.localeCompare(b.air_date))

    // Si TMDB ne donne de date pour aucune saison (rare), on retombe sur le total brut
    // plutôt que de tout considérer comme "non sorti".
    const airedSeasonsCount = aired.length || (announced.length === 0 ? realSeasons.length : aired.length)

    const nextAnnounced = announced.length > 0
      ? { seasonNumber: announced[0].season_number, airDate: announced[0].air_date }
      : null

    return { airedSeasonsCount, nextAnnounced }
  } catch {
    return null
  }
}

async function findTmdbIdByName(name, apiKey) {
  try {
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&language=fr-FR&query=${encodeURIComponent(name)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.[0]?.id || null
  } catch {
    return null
  }
}
