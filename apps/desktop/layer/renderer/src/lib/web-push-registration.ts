import { registerSyncModel } from "@follow/store/sync/model-registry"
import { isSyncEngineActive } from "@follow/store/sync/sync-status"
import { getStorageNS } from "@follow/utils/ns"

/**
 * Remembers the push token this browser registered, so a launch does not register it again.
 *
 * The server keeps a single token per user and channel: the last browser to register receives
 * the notifications. Skipping the request is therefore only safe while nobody else has taken
 * the slot. The sync engine's change log says so: a registration answers with its sync id, and
 * a later `messaging` action for the channel means another browser registered or the token
 * was removed. Without a change log every launch registers, as before.
 *
 * This module has no Firebase import on purpose. It is loaded with the app so the handler is
 * registered before the sync engine starts, while the push code itself stays lazy.
 */
const STORAGE_KEY = getStorageNS("web_push_registration")
export const WEB_PUSH_CHANNEL = "web"

interface WebPushRegistration {
  userId: string
  token: string
  /** Sync id of this browser's registration. Later actions for the channel are someone else's. */
  syncId: number
  stale?: boolean
}

const read = (): WebPushRegistration | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WebPushRegistration>
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.token !== "string" ||
      typeof parsed.syncId !== "number"
    ) {
      return null
    }
    return parsed as WebPushRegistration
  } catch {
    return null
  }
}

const write = (registration: WebPushRegistration | null) => {
  try {
    if (registration) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registration))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* empty */
  }
}

const markStale = () => {
  const registration = read()
  if (registration && !registration.stale) {
    write({ ...registration, stale: true })
  }
}

export const rememberWebPushRegistration = ({
  userId,
  token,
  syncId,
}: {
  userId: string
  token: string
  /** Missing when the server has no change log; the registration is then not remembered. */
  syncId: number | undefined
}) => {
  write(syncId === undefined ? null : { userId, token, syncId })
}

/** Call after the sync engine caught up, so a takeover by another browser is already known. */
export const isWebPushRegistrationCurrent = (userId: string, token: string) => {
  if (!isSyncEngineActive()) return false
  const registration = read()
  return (
    !!registration &&
    !registration.stale &&
    registration.userId === userId &&
    registration.token === token
  )
}

registerSyncModel("messaging", {
  // Nothing is known about the time before the change log was read: register once more.
  bootstrap: markStale,
  apply: (action) => {
    if (action.modelId !== WEB_PUSH_CHANNEL) return
    const registration = read()
    if (!registration || action.id <= registration.syncId) return
    markStale()
  },
})
