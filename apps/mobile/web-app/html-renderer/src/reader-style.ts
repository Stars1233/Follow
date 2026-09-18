import type { ReaderStylePayload } from "@follow/shared/settings/reader-style"
import type { CSSProperties } from "react"

export const READER_TEXT_COLOR_CLASS = "reader-text-color"

/**
 * Convert the reader style payload into inline styles for the article root.
 * Text colors are exposed as CSS variables so `index.css` can switch between the
 * light and dark values with `prefers-color-scheme`.
 */
export const getReaderArticleStyle = (style: ReaderStylePayload | null): CSSProperties => {
  if (!style) return {}

  const css: Record<string, string | number> = {}

  if (style.fontFamily && style.fontFamily !== "inherit") {
    css.fontFamily = style.fontFamily
  }
  if (typeof style.lineHeight === "number" && Number.isFinite(style.lineHeight)) {
    css.lineHeight = style.lineHeight
  }
  if (style.textColor) {
    css["--reader-body-light"] = style.textColor.light.body
    css["--reader-strong-light"] = style.textColor.light.strong
    css["--reader-body-dark"] = style.textColor.dark.body
    css["--reader-strong-dark"] = style.textColor.dark.strong
  }

  return css as CSSProperties
}
