import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ahevmeblkcetnxqedjal.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZXZtZWJsa2NldG54cWVkamFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjI2MTEsImV4cCI6MjA5NjI5ODYxMX0.5283LtCqzQ3jKAhDrwUnoZJbPycmWNAt_Js8VHaXqGk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helpers directos (evitamos wrappers con estado que dieron problemas en Fitlab)
export const sb = {
  get: (table, query = '') => supabase.from(table).select(query || '*'),
  post: (table, payload) => supabase.from(table).insert(payload),
  update: (table, payload, match) => supabase.from(table).update(payload).match(match),
  remove: (table, match) => supabase.from(table).delete().match(match),
}
