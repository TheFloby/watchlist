import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zkkfomckqijuoaerudoy.supabase.co'
const supabaseKey = 'sb_publishable_rDAqh-Jn40CDNYHEfHTxgg_AVYG3C6S'

export const supabase = createClient(supabaseUrl, supabaseKey)
