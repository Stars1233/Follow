import { t } from "i18next"
import { useEffect } from "react"

import { useApiUnreachable } from "@/src/atoms/api-connection"

import { toast } from "../lib/toast"

/**
 * Requests can fail before the app is on screen, so the connection state lives in an atom
 * and the prompt is shown from here.
 */
export const ApiConnectionNotice = () => {
  const unreachable = useApiUnreachable()

  useEffect(() => {
    if (!unreachable) return

    toast.error(t("common:app.api_unreachable"), { duration: 4000 })
  }, [unreachable])

  return null
}
