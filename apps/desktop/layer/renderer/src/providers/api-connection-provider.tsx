import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useApiUnreachable } from "~/atoms/api-connection"

/**
 * Requests can fail before the toaster is mounted, so the connection state lives in an atom
 * and the prompt is shown from here.
 */
export const ApiConnectionProvider = () => {
  const unreachable = useApiUnreachable()
  const { t } = useTranslation("common")
  const toastIdRef = useRef<string | number>(undefined)

  useEffect(() => {
    if (unreachable) {
      // Re-runs update the toast in place. Sonner defers dismissals, so dismissing and
      // recreating it under the same id would let the stale dismissal remove the new toast.
      toastIdRef.current = toast.error(t("app.api_unreachable"), {
        id: toastIdRef.current,
        duration: Infinity,
        closeButton: true,
      })
    } else if (toastIdRef.current !== undefined) {
      toast.dismiss(toastIdRef.current)
      toastIdRef.current = undefined
    }
  }, [unreachable, t])

  return null
}
