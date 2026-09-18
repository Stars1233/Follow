/**
 * Wire types of the server's `/sync` endpoints. They mirror the `sync` module of the client
 * SDK, so the apps hand `followApi.sync` to the store through `syncApiContext`.
 */

export type SyncActionModelName =
  | "subscription"
  | "list_subscription"
  | "collection"
  | "timeline"
  | "list"
  | "inbox"
  | "inbox_entry"
  // Models handled through `registerSyncModel`: "action", "setting", "messaging", ...
  | (string & {})

export type SyncActionType = "I" | "U" | "D" | "N"

export interface SyncAction {
  /** Global, monotonically increasing sync id */
  id: number
  model: SyncActionModelName
  /** feedId, listId or entryId; null for batch timeline updates */
  modelId: string | null
  action: SyncActionType
  data: unknown
  createdAt: string
}

export interface SyncStateResponse {
  code: 0
  data: {
    lastSyncId: number
  }
}

export interface SyncDeltaQuery {
  lastSyncId: number
  limit?: number
}

export interface SyncDeltaResponse {
  code: 0
  data: {
    actions: SyncAction[]
    lastSyncId: number
    hasMore: boolean
    /** The cursor predates the retained log; fetch a fresh snapshot and start over */
    reset: boolean
  }
}

export interface SyncAPI {
  state: () => Promise<SyncStateResponse>
  delta: (query: SyncDeltaQuery) => Promise<SyncDeltaResponse>
}

export interface TimelineReadActionData {
  /** Entries whose read state really flipped on the server. */
  entryIds: string[]
  read: boolean
  isInbox?: boolean
  /**
   * Flipped rows per feed id or inbox handle. Absent on actions logged by older servers,
   * which leaves a recount as the only way to learn the unread counters.
   */
  feeds?: Record<string, number>
}

export interface TimelineNewEntriesActionData {
  /** Set for entries delivered by a feed or a list */
  feedId?: string
  /** Set together with `isInbox` for entries delivered to an inbox */
  inboxId?: string
  isInbox?: boolean
  /** Rows really written to the user's timeline. */
  count: number
  /** How many of them arrived unread. Absent on actions logged by older servers. */
  unread?: number
  latestPublishedAt: string
  from: string[]
}

export interface ListActionData {
  title?: string
  description?: string | null
  image?: string | null
  view?: number
  fee?: number
  feedIds?: string[]
}

export interface InboxEntryActionData {
  inboxId?: string
  /** Whether the deleted entry was unread. Absent on actions logged by older servers. */
  unread?: boolean
}

export interface CollectionActionData {
  entryId: string
  feedId: string
  view: number
  createdAt: string
}
