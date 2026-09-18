import { afterEach, describe, expect, test, vi } from "vitest"

import {
  getEffectiveEntrySortOrder,
  getMarkReadTimeRange,
  isTimelineEntriesSource,
  mergeEntriesHead,
  trimTrailingEmptyPages,
} from "./utils"

describe("getEffectiveEntrySortOrder", () => {
  test.each([
    [true, true, "asc"],
    [false, true, "desc"],
    [true, false, "desc"],
    [false, false, "desc"],
  ] as const)(
    "returns %s unread and %s timeline source as %s",
    (unreadOnly, isTimelineSource, expected) => {
      expect(
        getEffectiveEntrySortOrder({
          sortOrder: "asc",
          unreadOnly,
          isTimelineSource,
        }),
      ).toBe(expected)
    },
  )

  test("defaults supported unread timelines to newest first", () => {
    expect(
      getEffectiveEntrySortOrder({
        unreadOnly: true,
        isTimelineSource: true,
      }),
    ).toBe("desc")
  })
})

describe("isTimelineEntriesSource", () => {
  test("supports root, feed, folder, multi-feed, and list timeline sources", () => {
    expect(isTimelineEntriesSource({})).toBe(true)
    expect(isTimelineEntriesSource({ feedId: "feed-1" })).toBe(true)
    expect(isTimelineEntriesSource({ feedId: "folder-news" })).toBe(true)
    expect(isTimelineEntriesSource({ feedId: "feed-1,feed-2" })).toBe(true)
    expect(isTimelineEntriesSource({ feedId: "list-list-1" })).toBe(true)
  })

  test("excludes inbox and collection sources", () => {
    expect(isTimelineEntriesSource({ inboxId: "inbox-1" })).toBe(false)
    expect(isTimelineEntriesSource({ isCollection: true })).toBe(false)
    expect(isTimelineEntriesSource({ feedId: "collections" })).toBe(false)
  })
})

describe("getMarkReadTimeRange", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test.each([
    ["desc", "above", { startTime: 101, endTime: 1_000 }],
    ["desc", "below", { startTime: 1, endTime: 99 }],
    ["asc", "above", { startTime: 1, endTime: 99 }],
    ["asc", "below", { startTime: 101, endTime: 1_000 }],
  ] as const)("uses the %s sort range for entries visually %s", (sortOrder, position, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)

    expect(
      getMarkReadTimeRange({
        publishedAt: new Date(100),
        position,
        sortOrder,
      }),
    ).toEqual(expected)
  })
})

const page = (...ids: string[]) => ({ data: ids.map((id) => ({ entries: { id } })) })
const idsOf = (
  loaded: ReturnType<typeof mergeEntriesHead<ReturnType<typeof page>, string | undefined>>,
) => loaded?.pages.map((item) => item.data.map((entry) => entry.entries.id))

describe("mergeEntriesHead", () => {
  test("puts new entries in front and keeps every loaded page", () => {
    const current = {
      pages: [page("c", "b", "a"), page("z", "y", "x")],
      pageParams: [undefined, "cursor-a"],
    }

    const merged = mergeEntriesHead(current, page("e", "d", "c"))

    expect(idsOf(merged)).toEqual([
      ["e", "d", "c", "b", "a"],
      ["z", "y", "x"],
    ])
    expect(merged?.pageParams).toEqual([undefined, "cursor-a"])
  })

  test("returns the cached object when the head brought nothing new", () => {
    const current = { pages: [page("c", "b", "a"), page("z")], pageParams: [undefined, "cursor-a"] }

    expect(mergeEntriesHead(current, page("c", "b"))).toBe(current)
  })

  test("lets the fresh page decide the range it covers", () => {
    // "b" is gone on the server (read in an unread-only list, or deleted).
    const current = { pages: [page("c", "b", "a"), page("z")], pageParams: [undefined, "cursor-a"] }

    const merged = mergeEntriesHead(current, page("d", "c", "a"))

    expect(idsOf(merged)).toEqual([["d", "c", "a"], ["z"]])
  })

  test("drops the loaded pages when a gap may separate them from the fresh page", () => {
    const current = { pages: [page("c", "b", "a"), page("z")], pageParams: [undefined, "cursor-a"] }

    const merged = mergeEntriesHead(current, page("h", "g", "f"))

    expect(idsOf(merged)).toEqual([["h", "g", "f"]])
    expect(merged?.pageParams).toEqual([undefined])
  })

  test("removes pages the fresh page covers completely", () => {
    const current = {
      pages: [page("b"), page("a"), page("z")],
      pageParams: [undefined, "p1", "p2"],
    }

    const merged = mergeEntriesHead(current, page("c", "b", "a"))

    expect(idsOf(merged)).toEqual([["c", "b", "a"], ["z"]])
    expect(merged?.pageParams).toEqual([undefined, "p2"])
  })

  test("leaves a query without data alone", () => {
    expect(mergeEntriesHead(undefined, page("a"))).toBeUndefined()
  })
})

describe("trimTrailingEmptyPages", () => {
  test("drops the empty pages that marked the end of a list", () => {
    const current = {
      pages: [page("a", "b"), page("c"), page(), page()],
      pageParams: [undefined, "p1", "p2", "p3"],
    }

    const trimmed = trimTrailingEmptyPages(current)

    expect(idsOf(trimmed)).toEqual([["a", "b"], ["c"]])
    expect(trimmed?.pageParams).toEqual([undefined, "p1"])
  })

  test("keeps a list that still ends with entries, and never removes the first page", () => {
    const full = { pages: [page("a"), page("b")], pageParams: [undefined, "p1"] }
    expect(trimTrailingEmptyPages(full)).toBe(full)

    const empty = { pages: [page()], pageParams: [undefined] }
    expect(trimTrailingEmptyPages(empty)).toBe(empty)
    expect(trimTrailingEmptyPages(undefined)).toBeUndefined()
  })
})
