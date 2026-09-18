import { createAtomHooks } from "@follow/utils/jotai"
import { atom } from "jotai"

export const [, , useApiUnreachable, , , setApiUnreachable] = createAtomHooks(atom(false))
