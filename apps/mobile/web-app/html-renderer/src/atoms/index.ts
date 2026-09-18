import type { ReaderStylePayload } from "@follow/shared/settings/reader-style"
import { atom } from "jotai"

import type { EntryModel, SpotlightState } from "../../types"

export const entryAtom = atom<EntryModel | null>(null)
export const spotlightAtom = atom<SpotlightState["spotlights"]>([])

export const codeThemeLightAtom = atom<string | null>(null)
export const codeThemeDarkAtom = atom<string | null>(null)
export const readerRenderInlineStyleAtom = atom<boolean>(false)
export const noMediaAtom = atom<boolean>(false)
export const readerStyleAtom = atom<ReaderStylePayload | null>(null)
