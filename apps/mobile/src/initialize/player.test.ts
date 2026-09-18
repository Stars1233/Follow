import type { AppStateStatus } from "react-native"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const listeners = new Set<(state: AppStateStatus) => void>()
  return {
    listeners,
    appState: {
      currentState: "background" as AppStateStatus,
      addEventListener: vi.fn((_event: string, listener: (state: AppStateStatus) => void) => {
        listeners.add(listener)
        return { remove: () => listeners.delete(listener) }
      }),
    },
    platform: { OS: "android" },
    setupPlayer: vi.fn(),
    setCommands: vi.fn(),
  }
})

vi.mock("react-native", () => ({
  AppState: mocks.appState,
  Platform: mocks.platform,
}))

vi.mock("@rntp/player", () => ({
  default: {
    setupPlayer: mocks.setupPlayer,
    setCommands: mocks.setCommands,
  },
  PlayerCommand: {
    PlayPause: "playPause",
    Next: "next",
    Previous: "previous",
    Stop: "stop",
    Seek: "seek",
  },
}))

function changeAppState(state: AppStateStatus) {
  mocks.appState.currentState = state
  for (const listener of mocks.listeners) {
    listener(state)
  }
}

describe("initializePlayer", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.listeners.clear()
    mocks.appState.currentState = "background"
    mocks.platform.OS = "android"
    mocks.setupPlayer.mockReset()
    mocks.setCommands.mockReset()
    mocks.appState.addEventListener.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("waits for the Android foreground before enabling native remote controls", async () => {
    const player = await import("./player")
    const initialization = player.initializePlayer()

    expect(mocks.setupPlayer).not.toHaveBeenCalled()
    expect(player.PlayerRegistered).toBe(false)

    changeAppState("inactive")
    await Promise.resolve()
    expect(mocks.setupPlayer).not.toHaveBeenCalled()

    changeAppState("active")
    await initialization

    expect(mocks.setupPlayer).toHaveBeenCalledOnce()
    expect(mocks.setCommands).toHaveBeenCalledWith({
      capabilities: ["playPause", "next", "previous", "stop", "seek"],
      handling: "native",
    })
    expect(player.PlayerRegistered).toBe(true)
    expect(mocks.listeners.size).toBe(0)
  })

  it("initializes once when callers are waiting for the same foreground transition", async () => {
    const player = await import("./player")
    const first = player.initializePlayer()
    const second = player.initializePlayer()

    changeAppState("active")
    await Promise.all([first, second])
    changeAppState("background")
    await player.initializePlayer()

    expect(mocks.setupPlayer).toHaveBeenCalledOnce()
    expect(mocks.setCommands).toHaveBeenCalledOnce()
    expect(mocks.listeners.size).toBe(0)
  })

  it("does not require a foreground transition on iOS", async () => {
    mocks.platform.OS = "ios"
    const player = await import("./player")

    await player.initializePlayer()

    expect(mocks.setupPlayer).toHaveBeenCalledOnce()
    expect(mocks.appState.addEventListener).not.toHaveBeenCalled()
    expect(player.PlayerRegistered).toBe(true)
  })

  it("keeps a failed setup unregistered so a later call can retry", async () => {
    mocks.appState.currentState = "active"
    const error = new Error("Native setup failed")
    mocks.setupPlayer.mockImplementationOnce(() => {
      throw error
    })
    const logError = vi.spyOn(console, "error").mockImplementation(() => {})
    const player = await import("./player")

    await player.initializePlayer()

    expect(player.PlayerRegistered).toBe(false)
    expect(mocks.setCommands).not.toHaveBeenCalled()
    expect(logError).toHaveBeenCalledWith("Failed to setup player:", error)

    await player.initializePlayer()

    expect(mocks.setupPlayer).toHaveBeenCalledTimes(2)
    expect(player.PlayerRegistered).toBe(true)
  })
})
