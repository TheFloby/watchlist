import { createClient } from '@supabase/supabase-js'

// Cette fonction est appelée automatiquement une fois par jour par Vercel (voir vercel.json).
// Elle compare le nombre de saisons connu de chaque série "Terminé" avec celui actuel sur TMDB,
// et marque les séries qui ont une nouvelle saison disponible.
//
// Variables d'environnement nécessaires (à configurer dans Vercel, jamais dans le code) :
// - SUPABASE_URL            : l'URL de ton projet Supabase
// - SUPABASE_SERVICE_ROLE_KEY : la clé "service_role" (PAS la clé publique) — permet d'écrire
//                               en base sans authentification utilisateur. Très sensible, ne
//                               jamais l'exposer côté navigateur.
// - TMDB_API_KEY            : la même clé que celle utilisée côté site
// - CRON_SECRET             : générée automatiquement par Vercel, sert à vérifier que l'appel
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

  // On récupère toutes les séries/séries animées marquées "Terminé" (status = 'vu')
  const { data: titles, error: fetchError } = await supabase
    .from('titles')
    .select('id, name, type, tmdb_id, total_seasons, current_season, new_season_available')
    .eq('status', 'vu')
    .in('type', ['serie', 'serie_animee'])

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message })
  }

  const results = []

  for (const title of titles) {
    // Si on n'a pas de tmdb_id enregistré (séries ajoutées avant cette fonctionnalité,
    // ou ajoutées à la main), on tente de le retrouver par une recherche sur le nom.
    let tmdbId = title.tmdb_id

    if (!tmdbId) {
      tmdbId = await findTmdbIdByName(title.name, TMDB_API_KEY)
      if (tmdbId) {
        // On l'enregistre pour la prochaine fois, pas besoin de re-chercher
        await supabase.from('titles').update({ tmdb_id: tmdbId }).eq('id', title.id)
      }
    }

    if (!tmdbId) {
      results.push({ name: title.name, status: 'tmdb_id introuvable, ignoré' })
      continue
    }

    const currentSeasonCount = await fetchSeasonCount(tmdbId, TMDB_API_KEY)

    if (!currentSeasonCount) {
      results.push({ name: title.name, status: 'nombre de saisons TMDB introuvable' })
      continue
    }

    // Si on n'avait encore jamais de total_seasons enregistré, on l'enregistre simplement
    // sans déclencher de badge (on n'a rien à comparer la première fois).
    if (!title.total_seasons) {
      await supabase.from('titles').update({ total_seasons: currentSeasonCount }).eq('id', title.id)
      results.push({ name: title.name, status: `total_seasons initialisé à ${currentSeasonCount}` })
      continue
    }

    if (currentSeasonCount > title.total_seasons) {
      // Nouvelle saison détectée !
      await supabase
        .from('titles')
        .update({
          total_seasons: currentSeasonCount,
          new_season_available: true,
        })
        .eq('id', title.id)

      results.push({ name: title.name, status: `nouvelle saison ! ${title.total_seasons} → ${currentSeasonCount}` })
    } else {
      results.push({ name: title.name, status: 'pas de changement' })
    }
  }

  return res.status(200).json({ checked: titles.length, results })
}

async function fetchSeasonCount(tmdbId, apiKey) {
  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=fr-FR`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const realSeasons = (data.seasons || []).filter((s) => s.season_number > 0)
    return realSeasons.length || data.number_of_seasons || null
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
