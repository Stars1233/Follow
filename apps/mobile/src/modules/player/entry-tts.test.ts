import type { MediaItem } from "@rntp/player"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  activeItem: null as MediaItem | null,
  nativePlaying: false,
  fileUrl: "file:///var/mobile/Library/Caches/tts/entry-1.mp3",
  requestTtsFile: vi.fn(),
  play: vi.fn(async () => {}),
  pause: vi.fn(async () => {}),
  streamPlay: vi.fn(async () => {
    throw new Error("TTS streaming player is not ready")
  }),
  toastFetchError: vi.fn(),
}))

vi.mock("@follow/store/entry/getter", () => ({
  getEntry: () => ({ feedId: "feed-1", title: "Article", media: [] }),
}))

vi.mock("@follow/store/feed/getter", () => ({
  getFeedById: () => ({ title: "Feed" }),
}))

vi.mock("@rntp/player", () => ({
  default: { getActiveMediaItem: () => mocks.activeItem },
}))

vi.mock("@/src/atoms/settings/general", () => ({
  getGeneralSettings: () => ({ voice: "en-US-AvaMultilingualNeural" }),
}))

vi.mock("@/src/lib/error-parser", () => ({
  toastFetchError: mocks.toastFetchError,
}))

vi.mock("@/src/lib/player", () => ({
  player: {
    isPlaying: () => mocks.nativePlaying,
    play: mocks.play,
    pause: mocks.pause,
  },
}))

vi.mock("./tts-service", () => ({
  getEntryTtsText: () => "Article text",
  requestTtsFile: mocks.requestTtsFile,
}))

vi.mock("./tts-stream-controller", () => ({
  ttsStreamController: {
    canToggleEntry: () => false,
    play: mocks.streamPlay,
  },
}))

describe("playEntryTts", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.activeItem = null
    mocks.nativePlaying = false
    mocks.requestTtsFile.mockResolvedValue(mocks.fileUrl)
  })

  it("toggles a cached TTS file using its stable ID after iOS normalizes the URL", async () => {
    const { playEntryTts } = await import("./entry-tts")
    const options = { toastTitle: "Read article" }

    await playEntryTts("entry-1", options)

    expect(mocks.requestTtsFile).toHaveBeenCalledOnce()
    expect(mocks.play).toHaveBeenCalledWith(expect.objectContaining({ url: mocks.fileUrl }))

    mocks.activeItem = {
      mediaId: mocks.fileUrl,
      url: "/var/mobile/Library/Caches/tts/entry-1.mp3",
    }
    mocks.nativePlaying = true

    await playEntryTts("entry-1", options)

    expect(mocks.pause).toHaveBeenCalledOnce()
    expect(mocks.requestTtsFile).toHaveBeenCalledOnce()
    expect(mocks.streamPlay).toHaveBeenCalledOnce()

    mocks.nativePlaying = false
    await playEntryTts("entry-1", options)

    expect(mocks.play).toHaveBeenLastCalledWith()
    expect(mocks.play).toHaveBeenCalledTimes(2)
    expect(mocks.requestTtsFile).toHaveBeenCalledOnce()
    expect(mocks.toastFetchError).not.toHaveBeenCalled()
  })
})
