// Un titre "Terminé" a une nouvelle saison à voir si :
// - le cron l'a détecté automatiquement (new_season_available), OU
// - la saison où on s'est arrêté est inférieure au nombre total de saisons connu
//   (cas d'un historique rentré directement, où on n'a pas forcément vu la toute
//   dernière saison sortie au moment de l'ajout — ex: Wakfu vu jusqu'à la saison 3/4).
export function hasUnwatchedSeason(title) {
  return Boolean(
    title.new_season_available ||
    (title.total_seasons && title.current_season && title.current_season < title.total_seasons)
  )
}

// Calcule la moyenne pondérée d'un avis à partir des 3 critères :
// le ressenti général compte double, les deux autres comptent chacun pour 1.
// Résultat arrondi au dixième le plus proche (cohérent avec le pas de 0.5 des notes).
export function weightedAverage(rating) {
  if (!rating) return null
  const { score_general, score_scenario, score_personnages } = rating
  const total = score_general * 2 + score_scenario + score_personnages
  return Math.round((total / 4) * 10) / 10
}
