/**
 * A `?next=` value is only followed when it is a path on this site: it must start with a
 * single "/" (not "//" or "/\", which browsers treat as another host) and contain no
 * control characters. Anything else returns null.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null
  if (!/^\/(?![/\\])/.test(next)) return null
  for (let i = 0; i < next.length; i++) {
    const c = next.charCodeAt(i)
    if (c < 0x20 || c === 0x7f) return null
  }
  return next
}
