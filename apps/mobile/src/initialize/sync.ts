import { syncEngine } from "@follow/store/sync/sync-engine"
import { transactionQueue } from "@follow/store/sync/transaction-queue"
import { AppState } from "react-native"

/**
 * Retry pending mutations and pull server changes whenever the app returns to the foreground.
 * The web build listens to `online` and `visibilitychange` on its own.
 */
export const initSyncTriggers = () => {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      transactionQueue.resume()
      syncEngine.resume()
    }
  })
}
