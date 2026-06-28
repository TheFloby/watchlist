import { supabase } from './supabaseClient'

// Ajoute une ligne au journal d'activité. Ne bloque jamais le reste de l'app si ça échoue
// (le journal est secondaire — une erreur ici ne doit jamais empêcher l'action principale).
export async function logActivity(userEmail, action, titleName, details = null) {
  try {
    await supabase.from('activity_log').insert({
      user_email: userEmail,
      action,
      title_name: titleName,
      details,
    })
  } catch {
    // On ignore silencieusement : le journal est un bonus, pas une fonctionnalité critique.
  }
}
