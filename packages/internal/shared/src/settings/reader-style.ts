/**
 * Shared reader style presets used by the mobile reading view.
 *
 * The values are consumed by the React Native layer (to render the settings UI)
 * and forwarded to the HTML renderer WebView, which applies them to the article.
 */

export type ReaderColorScheme = "light" | "dark"

export interface ReaderTextColorValue {
  /** Body copy color. */
  body: string
  /** Headings and emphasized text color. */
  strong: string
}

export type ReaderTextColorPair = Record<ReaderColorScheme, ReaderTextColorValue>

export type ReaderTextColorPreset = "default" | "soft" | "warm" | "contrast"

export const READER_TEXT_COLOR_PRESETS = [
  "default",
  "soft",
  "warm",
  "contrast",
] as const satisfies readonly ReaderTextColorPreset[]

const READER_TEXT_COLOR_VALUES: Record<
  Exclude<ReaderTextColorPreset, "default">,
  ReaderTextColorPair
> = {
  soft: {
    light: { body: "#525252", strong: "#262626" },
    dark: { body: "#a3a3a3", strong: "#e5e5e5" },
  },
  warm: {
    light: { body: "#5c4b37", strong: "#3b2f21" },
    dark: { body: "#d9c7a7", strong: "#f1e6d0" },
  },
  contrast: {
    light: { body: "#000000", strong: "#000000" },
    dark: { body: "#ffffff", strong: "#ffffff" },
  },
}

export const isReaderTextColorPreset = (value: unknown): value is ReaderTextColorPreset =>
  typeof value === "string" && (READER_TEXT_COLOR_PRESETS as readonly string[]).includes(value)

/**
 * Resolve a text color preset into concrete light/dark colors.
 * Returns `null` for the default preset (or unknown values) so the renderer keeps
 * the built-in typography colors.
 */
export const resolveReaderTextColor = (preset: unknown): ReaderTextColorPair | null => {
  if (!isReaderTextColorPreset(preset) || preset === "default") return null
  return READER_TEXT_COLOR_VALUES[preset]
}

export type ReaderFontPresetKey = "default" | "serif" | "rounded" | "monospace"

/**
 * Font stacks are generic families with platform specific first choices so the same
 * value renders reasonably on both iOS (WebKit) and Android (Chromium) WebViews.
 */
export const READER_FONT_PRESETS: readonly { key: ReaderFontPresetKey; value: string }[] = [
  { key: "default", value: "inherit" },
  {
    key: "serif",
    value:
      'ui-serif, Georgia, "Songti SC", "Songti TC", "Hiragino Mincho ProN", "Noto Serif CJK SC", "Noto Serif", serif',
  },
  { key: "rounded", value: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' },
  { key: "monospace", value: 'ui-monospace, Menlo, "Roboto Mono", monospace' },
]

export type ReaderLineHeightPresetKey = "tight" | "snug" | "normal" | "relaxed" | "loose"

export const READER_LINE_HEIGHT_PRESETS: readonly {
  key: ReaderLineHeightPresetKey
  value: number
}[] = [
  { key: "tight", value: 1.25 },
  { key: "snug", value: 1.375 },
  { key: "normal", value: 1.5 },
  { key: "relaxed", value: 1.75 },
  { key: "loose", value: 2 },
]

/**
 * Payload sent from React Native to the HTML renderer WebView.
 */
export interface ReaderStylePayload {
  /** CSS `font-family` value, `inherit` keeps the renderer default. */
  fontFamily: string
  /** Unitless CSS `line-height`. */
  lineHeight: number
  /** Resolved text colors, `null` keeps the renderer default. */
  textColor: ReaderTextColorPair | null
}
