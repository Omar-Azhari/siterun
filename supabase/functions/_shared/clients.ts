// Supabase clients for the Edge Functions (Deno only).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL') ?? ''

/** The project's key of one kind: the new keys when present, otherwise the legacy one. */
function key(kind: 'publishable' | 'secret'): string {
  const json = Deno.env.get(
    kind === 'publishable' ? 'SUPABASE_PUBLISHABLE_KEYS' : 'SUPABASE_SECRET_KEYS',
  )
  if (json) {
    try {
      const keys = JSON.parse(json) as Record<string, string>
      if (keys.default) return keys.default
    } catch {
      // fall through to the legacy key
    }
  }
  return (
    Deno.env.get(kind === 'publishable' ? 'SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/** Bypasses Row Level Security. Only for the service-only database functions. */
export const admin: SupabaseClient = createClient(url, key('secret'), noSession)

/**
 * Acts as the person who made the request, so the database's own checks apply. Returns
 * null when the request has no session token.
 */
export function asCaller(req: Request): SupabaseClient | null {
  const auth = req.headers.get('Authorization') ?? ''
  if (!/^Bearer eyJ/.test(auth)) return null
  return createClient(url, key('publishable'), {
    ...noSession,
    global: { headers: { Authorization: auth } },
  })
}
