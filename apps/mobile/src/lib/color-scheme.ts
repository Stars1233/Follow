import { useEffect } from "react"
import { Appearance } from "react-native"

import type { AppColorScheme } from "@/src/atoms/settings/ui"
import { getUISettings, useUISettingKey } from "@/src/atoms/settings/ui"

/**
 * Apply the user selected color scheme to the whole app.
 *
 * `Appearance.setColorScheme` overrides the OS appearance for every RN window, which
 * also propagates to the reader WebView (`prefers-color-scheme`), the status bar and
 * the UIKit color variables.
 */
export const applyAppColorScheme = (scheme: AppColorScheme) => {
  try {
    Appearance.setColorScheme(scheme === "system" ? "unspecified" : scheme)
  } catch (error) {
    console.warn("Failed to apply color scheme", error)
  }
}

export const applyStoredAppColorScheme = () => {
  applyAppColorScheme(getUISettings().colorScheme ?? "system")
}

/**
 * Keep the native appearance in sync with the persisted setting.
 */
export const useSyncAppColorScheme = () => {
  const colorScheme = useUISettingKey("colorScheme")

  useEffect(() => {
    applyAppColorScheme(colorScheme ?? "system")
  }, [colorScheme])
}
