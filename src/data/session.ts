/**
 * True when a Supabase or demo session is stored, i.e. the visitor is probably
 * signed in. Used before the backend has loaded to decide what to paint first.
 */
export function hasStoredSession(): boolean {
  try {
    const keys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
    return keys.some((k) => /^sb-.+-auth-token$/.test(k) || k === 'siterun-demo-session')
  } catch {
    return false
  }
}
