import { getSyncModelHandler } from "@follow/store/sync/model-registry"
import { setSyncEngineActive } from "@follow/store/sync/sync-status"
import type { SyncAction } from "@follow/store/sync/types"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import {
  isWebPushRegistrationCurrent,
  rememberWebPushRegistration,
  WEB_PUSH_CHANNEL,
} from "./web-push-registration"

const messagingAction = (id: number, channel = WEB_PUSH_CHANNEL): SyncAction => ({
  id,
  model: "messaging",
  modelId: channel,
  action: "U",
  data: { channel },
  createdAt: "2026-09-17T00:00:00.000Z",
})

describe("web push registration", () => {
  beforeEach(() => {
    localStorage.clear()
    setSyncEngineActive(true)
  })

  afterEach(() => {
    setSyncEngineActive(false)
    localStorage.clear()
  })

  test("a remembered registration makes the next launch skip the request", () => {
    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(false)

    rememberWebPushRegistration({ userId: "user-1", token: "token-a", syncId: 10 })

    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(true)
    // A new token or another account always registers.
    expect(isWebPushRegistrationCurrent("user-1", "token-b")).toBe(false)
    expect(isWebPushRegistrationCurrent("user-2", "token-a")).toBe(false)
  })

  test("every launch registers when there is no change log to watch the channel", () => {
    rememberWebPushRegistration({ userId: "user-1", token: "token-a", syncId: undefined })
    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(false)

    rememberWebPushRegistration({ userId: "user-1", token: "token-a", syncId: 10 })
    setSyncEngineActive(false)
    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(false)
  })

  test("a later registration on the channel means another browser took it over", async () => {
    const handler = getSyncModelHandler("messaging")!
    rememberWebPushRegistration({ userId: "user-1", token: "token-a", syncId: 10 })

    // This browser's own registration, and another channel, change nothing.
    await handler.apply(messagingAction(10))
    await handler.apply(messagingAction(11, "ios"))
    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(true)

    await handler.apply(messagingAction(12))
    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(false)

    // Registering again clears it.
    rememberWebPushRegistration({ userId: "user-1", token: "token-a", syncId: 13 })
    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(true)
  })

  test("losing the place in the change log registers once more", async () => {
    const handler = getSyncModelHandler("messaging")!
    rememberWebPushRegistration({ userId: "user-1", token: "token-a", syncId: 10 })

    await handler.bootstrap?.()

    expect(isWebPushRegistrationCurrent("user-1", "token-a")).toBe(false)
  })
})
