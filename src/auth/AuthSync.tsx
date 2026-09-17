import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getApi } from '@/data/client'
import { useMe, useRealtimeRefresh } from '@/data/hooks'

/** Refetches the session when auth changes and clears cached data on sign-out. */
export function AuthSync() {
  const qc = useQueryClient()
  const last = useRef<string | null | undefined>(undefined)
  const me = useMe()
  useRealtimeRefresh(!!me.data)

  useEffect(() => {
    return getApi().onAuthChange((profileId) => {
      if (last.current !== undefined && last.current !== profileId) {
        qc.removeQueries({
          predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'categories',
        })
      }
      last.current = profileId
      void qc.invalidateQueries({ queryKey: ['me'] })
    })
  }, [qc])

  return null
}
