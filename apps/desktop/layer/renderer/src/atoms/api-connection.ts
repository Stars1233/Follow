import { atom } from "jotai"

import { createAtomHooks } from "~/lib/jotai"

export const [, , useApiUnreachable, , , setApiUnreachable] = createAtomHooks(atom(false))
