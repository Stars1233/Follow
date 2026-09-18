import { describe, expect, test } from "vitest"

import {
  isReaderTextColorPreset,
  READER_FONT_PRESETS,
  READER_LINE_HEIGHT_PRESETS,
  READER_TEXT_COLOR_PRESETS,
  resolveReaderTextColor,
} from "./reader-style"

describe("reader style presets", () => {
  test("default text color keeps renderer defaults", () => {
    expect(resolveReaderTextColor("default")).toBeNull()
  })

  test("unknown text color falls back to renderer defaults", () => {
    expect(resolveReaderTextColor("neon")).toBeNull()
    expect(resolveReaderTextColor(undefined)).toBeNull()
    expect(isReaderTextColorPreset("neon")).toBe(false)
  })

  test("every non-default preset resolves to light and dark colors", () => {
    for (const preset of READER_TEXT_COLOR_PRESETS) {
      if (preset === "default") continue
      const resolved = resolveReaderTextColor(preset)
      expect(resolved).not.toBeNull()
      expect(resolved?.light.body).toMatch(/^#[0-9a-f]{6}$/i)
      expect(resolved?.light.strong).toMatch(/^#[0-9a-f]{6}$/i)
      expect(resolved?.dark.body).toMatch(/^#[0-9a-f]{6}$/i)
      expect(resolved?.dark.strong).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  test("font presets start with the inherit default", () => {
    expect(READER_FONT_PRESETS[0]).toEqual({ key: "default", value: "inherit" })
    expect(new Set(READER_FONT_PRESETS.map((preset) => preset.value)).size).toBe(
      READER_FONT_PRESETS.length,
    )
  })

  test("line height presets are sorted ascending and include the default", () => {
    const values = READER_LINE_HEIGHT_PRESETS.map((preset) => preset.value)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(values).toContain(1.75)
  })
})
