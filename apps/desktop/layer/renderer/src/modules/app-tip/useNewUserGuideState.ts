import { useWhoami } from "@follow/store/user/hooks"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAuthQuery } from "~/hooks/common/useBizQuery"
import { settings } from "~/queries/settings"

import { APP_TIP_DISMISS_EVENT, APP_TIP_STORAGE_PREFIX } from "./constants"

export type AppTipDismissChangeDetail = {
  key: string
  dismissed: boolean
}

export const useNewUserGuideState = () => {
  const user = useWhoami()

  const dismissKey = useMemo(() => (user ? `${APP_TIP_STORAGE_PREFIX}:${user.id}` : null), [user])
  const [hasDismissed, setHasDismissed] = useState(() => readDismissed(dismissKey))
  // An account that has synced settings once can never count as new again. Remembering that
  // keeps this hook, which is mounted with the entry list, from requesting `/settings` on
  // every launch just to find out that there is nothing to show.
  const existingUserKey = dismissKey ? `${dismissKey}:existing` : null
  const [isKnownExistingUser, setIsKnownExistingUser] = useState(() =>
    readDismissed(existingUserKey),
  )

  const { data: remoteSettings, isLoading } = useAuthQuery(settings.get(), {
    ...((!user || hasDismissed || isKnownExistingUser) && { enabled: false }),
  })

  useEffect(() => {
    setHasDismissed(readDismissed(dismissKey))
    setIsKnownExistingUser(readDismissed(existingUserKey))
  }, [dismissKey, existingUserKey])

  useEffect(() => {
    if (!existingUserKey || !remoteSettings) return
    if (Object.keys(remoteSettings.updated ?? {}).length === 0) return
    try {
      window.localStorage.setItem(existingUserKey, "1")
    } catch {
      /* empty */
    }
    setIsKnownExistingUser(true)
  }, [existingUserKey, remoteSettings])

  useEffect(() => {
    if (!dismissKey || typeof window === "undefined") return
    const listener: EventListener = (event) => {
      const { detail } = event as CustomEvent<AppTipDismissChangeDetail>
      if (!detail || detail.key !== dismissKey) {
        return
      }
      setHasDismissed(detail.dismissed)
    }
    window.addEventListener(APP_TIP_DISMISS_EVENT, listener)
    return () => {
      window.removeEventListener(APP_TIP_DISMISS_EVENT, listener)
    }
  }, [dismissKey])

  const persistDismissState = useCallback(
    (next: boolean) => {
      if (!dismissKey || typeof window === "undefined") return

      if (next) {
        window.localStorage.setItem(dismissKey, "1")
      } else {
        window.localStorage.removeItem(dismissKey)
      }
      window.dispatchEvent(
        new CustomEvent<AppTipDismissChangeDetail>(APP_TIP_DISMISS_EVENT, {
          detail: { key: dismissKey, dismissed: next },
        }),
      )
    },
    [dismissKey],
  )

  const isNewUser =
    !isLoading && remoteSettings && Object.keys(remoteSettings.updated ?? {}).length === 0
  const eligibleForGuide = Boolean(user && isNewUser)
  const shouldShowNewUserGuide = eligibleForGuide && !hasDismissed

  return {
    user,
    isNewUser,
    eligibleForGuide,
    shouldShowNewUserGuide,
    hasDismissed,
    setHasDismissed,
    persistDismissState,
    dismissKey,
    isLoading,
  }
}

function readDismissed(key: string | null) {
  if (!key) return false
  try {
    return window.localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}
