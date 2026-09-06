import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Riot/account data doesn't change second-to-second — this avoids a
      // refetch storm every time a component using the same query remounts
      // (e.g. switching tabs) while still picking up changes on focus/tab
      // switch after that window.
      staleTime: 30_000,
      retry: 1,
    },
  },
})
