// Les deux comptes du site. Pas d'inscription publique : ce sont les seuls
// pseudos utilisables, créés à la main dans Supabase (voir README).
export const ACCOUNTS = [
  { pseudo: 'Thomas', avatar: '/avatars/thomas.png' },
  { pseudo: 'Flo', avatar: '/avatars/flo.png' },
]

export function pseudoToEmail(pseudo) {
  const clean = pseudo.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return `${clean}@watchlist.local`
}

export function emailToPseudo(email) {
  if (!email) return null
  const localPart = email.split('@')[0]
  const account = ACCOUNTS.find((a) => a.pseudo.toLowerCase() === localPart)
  return account ? account.pseudo : localPart
}

export function avatarForEmail(email) {
  if (!email) return null
  const localPart = email.split('@')[0]
  const account = ACCOUNTS.find((a) => a.pseudo.toLowerCase() === localPart)
  return account ? account.avatar : null
}
