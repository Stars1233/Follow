import type { FeedViewType } from "@follow/constants"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"

import {
  ensureSyncedThroughEngine,
  isSyncEngineActive,
  requestUnreadCalibration,
} from "../../sync/sync-status"
import { getEntry } from "../entry/getter"
import { useListFeedIds } from "../list/hooks"
import { useSubscriptionIdsByView } from "../subscription/hooks"
import { useIsLoggedIn } from "../user/hooks"
import { unreadCountAllSelector, unreadCountIdSelector, unreadCountIdsSelector } from "./selectors"
import { unreadSyncService, useUnreadStore } from "./store"

export const usePrefetchUnread = () => {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ["unread"],
    queryFn: async () => {
      // With a sync cursor the counters are the local snapshot plus the delta feed; the
      // recount is only needed when the engine cannot provide that.
      if (await ensureSyncedThroughEngine()) return null
      return unreadSyncService.resetFromRemote()
    },
    staleTime: 5 * 1000 * 60, // 5 minutes
    enabled: isLoggedIn,
  })
}

const hasUnreadMismatch = (entryIds: string[]) => {
  const unreadCountMap: Record<string, number> = {}
  for (const entryId of entryIds) {
    const entry = getEntry(entryId)
    if (entry && entry.feedId && !entry.read) {
      unreadCountMap[entry.feedId] = (unreadCountMap[entry.feedId] || 0) + 1
    }
  }

  const unread = useUnreadStore.getState().data
  return Object.keys(unreadCountMap).some(
    (feedId) =>
      !unread[feedId] || (unreadCountMap[feedId] && unreadCountMap[feedId] > unread[feedId]),
  )
}

/**
 * Notice counters that are lower than the unread entries on screen. Without the sync engine
 * the counters are fetched again. With it, the list is usually just ahead of the next pull,
 * so the delta feed is applied first and a recount is only asked for if that did not help.
 */
export const useSyncUnreadWhenUnMatch = (entryIds: string[]) => {
  useEffect(() => {
    if (!hasUnreadMismatch(entryIds)) return

    if (!isSyncEngineActive()) {
      unreadSyncService.resetFromRemote()
      return
    }

    void (async () => {
      await ensureSyncedThroughEngine()
      if (hasUnreadMismatch(entryIds)) {
        await requestUnreadCalibration()
      }
    })()
  }, [entryIds.toString()])
}

export const useAutoMarkAsRead = (entryId: string, enabled: boolean) => {
  const { mutate } = useMutation({
    mutationFn: (entryId: string) => unreadSyncService.markEntryAsRead(entryId),
  })
  useEffect(() => {
    if (enabled) {
      mutate(entryId)
    }
  }, [enabled, entryId, mutate])
}

export const useUnreadById = (id: string) => {
  return useUnreadStore(
    useCallback(
      (state) => {
        return unreadCountIdSelector(id)(state)
      },
      [id],
    ),
  )
}

export const useUnreadByIds = (ids: string[]): number => {
  return useUnreadStore(
    useCallback(
      (state) => {
        return unreadCountIdsSelector(ids)(state)
      },
      [ids?.toString()],
    ),
  )
}

export const useUnreadAll = (): number => {
  return useUnreadStore(unreadCountAllSelector)
}

export const useUnreadByListId = (listId: string) => {
  const feedIds = useListFeedIds(listId)
  return useUnreadByIds(feedIds ?? [])
}

export const useUnreadByView = (view: FeedViewType) => {
  const subscriptionIds = useSubscriptionIdsByView(view)
  return useUnreadByIds(subscriptionIds)
}

export const useSortedIdsByUnread = (ids: string[], isDesc?: boolean) => {
  return useUnreadStore(
    useCallback(
      (state) =>
        ids.sort((a, b) => {
          const unreadCompare = (state.data[b] || 0) - (state.data[a] || 0)
          if (unreadCompare !== 0) {
            return isDesc ? unreadCompare : -unreadCompare
          }
          return a.localeCompare(b)
        }),
      [ids.toString(), isDesc],
    ),
  )
}

/**
 * @param categories key: category name, value: array of ids
 * @returns array of tuples [category, ids]
 */
export const useSortedCategoriesByUnread = (
  categories: Record<string, string[]>,
  isDesc?: boolean,
) => {
  return useUnreadStore(
    useCallback(
      (state) => {
        const sortedList = [] as [string, string[]][]

        const folderUnread = {} as Record<string, number>
        // Calc total unread count for each folder
        for (const category in categories) {
          folderUnread[category] = categories[category]!.reduce(
            (acc, cur) => (state.data[cur] || 0) + acc,
            0,
          )
        }

        // Sort by unread count
        Object.keys(folderUnread)
          .sort((a, b) => folderUnread[b]! - folderUnread[a]!)
          .forEach((key) => {
            sortedList.push([key, categories[key]!.concat()])
          })

        if (!isDesc) {
          sortedList.reverse()
        }
        return sortedList
      },
      [categories, isDesc],
    ),
  )
}
