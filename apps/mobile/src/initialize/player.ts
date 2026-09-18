import TrackPlayer, { PlayerCommand } from "@rntp/player"
import { AppState, Platform } from "react-native"

export let PlayerRegistered = false

function waitForForeground(): Promise<void> {
  if (AppState.currentState === "active") return Promise.resolve()
  return new Promise((resolve) => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        sub.remove()
        resolve()
      }
    })
  })
}

export async function initializePlayer() {
  if (PlayerRegistered) return

  // On Android, setupPlayer must be called in the foreground to avoid
  // ForegroundServiceStartNotAllowedException
  if (Platform.OS === "android") {
    await waitForForeground()
  }

  if (PlayerRegistered) return

  try {
    TrackPlayer.setupPlayer()
    TrackPlayer.setCommands({
      capabilities: [
        PlayerCommand.PlayPause,
        PlayerCommand.Next,
        PlayerCommand.Previous,
        PlayerCommand.Stop,
        PlayerCommand.Seek,
      ],
      handling: "native",
    })
    PlayerRegistered = true
  } catch (error) {
    console.error("Failed to setup player:", error)
  }
}
