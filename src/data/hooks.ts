import { useEffect } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast/toastContext'
import type { Api, TimeRange } from './api'
import { getApi } from './client'
import type { SearchFilters } from './types'

function q<T>(key: QueryKey, fn: (api: Api) => Promise<T>, enabled = true) {
  return { queryKey: key, queryFn: () => fn(getApi()), enabled }
}

// ---- queries ----------------------------------------------------------------------
export const useMe = () => useQuery(q(['me'], (a) => a.getMe()))
export const useSites = () => useQuery(q(['sites'], (a) => a.listSites()))
export const useSite = (id?: string) => useQuery(q(['site', id], (a) => a.getSite(id ?? ''), !!id))
export const useMembers = () => useQuery(q(['members'], (a) => a.listMembers()))
export const useInvitations = () => useQuery(q(['invitations'], (a) => a.listInvitations()))
export const useSubscription = () => useQuery(q(['subscription'], (a) => a.getSubscription()))
export const useCategories = () =>
  useQuery({ ...q(['categories'], (a) => a.listCategories()), staleTime: 10 * 60_000 })
export const useSearch = (filters: SearchFilters) =>
  useQuery({
    ...q(['search', filters], (a) => a.searchMachines(filters)),
    placeholderData: keepPreviousData,
  })
export const useMachine = (id?: string) =>
  useQuery(q(['machine', id], (a) => a.getMachine(id ?? ''), !!id))
export const useBooking = (id?: string) =>
  useQuery(q(['booking', id], (a) => a.getBooking(id ?? ''), !!id))
export const useMyBookings = () => useQuery(q(['bookings', 'mine'], (a) => a.listMyBookings()))
export const useActiveHires = () => useQuery(q(['hires'], (a) => a.listActiveHires()))
export const useDelivery = (id?: string) =>
  useQuery(q(['delivery', id], (a) => a.getDelivery(id ?? ''), !!id))
export const useConversations = (enabled = true) =>
  useQuery(q(['conversations'], (a) => a.listConversations(), enabled))
export const useConversation = (id?: string) =>
  useQuery(q(['conversation', id], (a) => a.getConversation(id ?? ''), !!id))
export const useMessages = (id?: string) =>
  useQuery(q(['messages', id], (a) => a.listMessages(id ?? ''), !!id))
export const useBalance = () => useQuery(q(['balance'], (a) => a.getAccountBalance()))
export const usePaymentMethods = () =>
  useQuery(q(['paymentMethods'], (a) => a.listPaymentMethods()))
export const useInvoices = () => useQuery(q(['invoices'], (a) => a.listInvoices()))
export const useNotifications = (enabled = true) =>
  useQuery(q(['notifications'], (a) => a.listNotifications(), enabled))
export const useMyMachines = () => useQuery(q(['myMachines'], (a) => a.listMyMachines()))
export const useRequirements = () =>
  useQuery({ ...q(['requirements'], (a) => a.listRequirements()), staleTime: 10 * 60_000 })
export const useDocuments = (filter: { machineId?: string; profileId?: string }, enabled = true) =>
  useQuery(q(['documents', filter], (a) => a.listDocuments(filter), enabled))
export const useOrgDocuments = () => useQuery(q(['orgDocuments'], (a) => a.listOrgDocuments()))
export const useSupplierBookings = () =>
  useQuery(q(['supplierBookings'], (a) => a.listSupplierBookings()))
export const usePayoutSummary = () => useQuery(q(['payoutSummary'], (a) => a.getPayoutSummary()))
export const usePayouts = () => useQuery(q(['payouts'], (a) => a.listPayouts()))
export const usePerformance = (range: '30d' | '90d' | '1y') =>
  useQuery({
    ...q(['performance', range], (a) => a.getPerformance(range)),
    placeholderData: keepPreviousData,
  })
export const useOperatorBookings = () =>
  useQuery(q(['operatorBookings'], (a) => a.listOperatorBookings()))
export const useTickets = () => useQuery(q(['tickets'], (a) => a.listTickets()))
export const useAdminStats = (range: TimeRange) =>
  useQuery({
    ...q(['admin', 'stats', range], (a) => a.getAdminStats(range)),
    placeholderData: keepPreviousData,
  })
export const useAdminActivity = () =>
  useQuery(q(['admin', 'activity'], (a) => a.listAdminActivity()))
export const usePendingMachines = () =>
  useQuery(q(['admin', 'pendingMachines'], (a) => a.listPendingMachines()))
export const usePendingDocuments = () =>
  useQuery(q(['admin', 'pendingDocs'], (a) => a.listPendingDocuments()))
export const useSupplierOrgs = () =>
  useQuery(q(['admin', 'suppliers'], (a) => a.listSupplierOrgs()))
export const useAllBookings = () => useQuery(q(['admin', 'bookings'], (a) => a.listAllBookings()))

// ---- mutations ---------------------------------------------------------------------
/**
 * Wraps an Api call as a mutation. On success every cached query is refreshed
 * (data sets are small); on failure the error is shown as a toast unless the
 * caller handles it with `silent`.
 */
export function useApiMutation<TVars, TResult>(
  fn: (api: Api, vars: TVars) => Promise<TResult>,
  opts: { success?: string | ((r: TResult) => string); silent?: boolean } = {},
) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (vars: TVars) => fn(getApi(), vars),
    onSuccess: async (result) => {
      await qc.invalidateQueries({
        predicate: (query) => !['categories', 'requirements'].includes(String(query.queryKey[0])),
      })
      if (opts.success)
        toast.success(typeof opts.success === 'function' ? opts.success(result) : opts.success)
    },
    onError: (err) => {
      if (!opts.silent)
        toast.error('Something went wrong', err instanceof Error ? err.message : String(err))
    },
  })
}

/** Keeps notification and message badges fresh from realtime events. */
export function useRealtimeRefresh(enabled: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    return getApi().subscribeNotifications(() => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    })
  }, [enabled, qc])
}
