import type { SyncAction } from "./types"

/**
 * Models the sync engine does not own itself: action rules in the store package, settings
 * and the push token registration in the apps. Kept free of runtime imports, like
 * `sync-status.ts`, so any module can register a handler without creating an import cycle.
 *
 * Register at module load. A handler that shows up after the engine already skipped actions
 * of its model is not lost: the engine forgets that the model was bootstrapped, and the
 * next pull loads it in full again.
 */
export interface SyncModelHandler {
  /**
   * Load the model in full. Runs once per account before the change log is relied on, and
   * again whenever the engine has to start over. It must be safe to run more than once, and
   * it must throw when the model could not be loaded: a bootstrap that resolves is final.
   */
  bootstrap?: () => void | Promise<void>
  /** Apply one change-log action. Actions arrive in the order the server recorded them. */
  apply: (action: SyncAction) => void | Promise<void>
}

const handlers = new Map<string, SyncModelHandler>()

export const registerSyncModel = (model: string, handler: SyncModelHandler) => {
  handlers.set(model, handler)
  return () => {
    if (handlers.get(model) === handler) {
      handlers.delete(model)
    }
  }
}

export const getSyncModelHandler = (model: string) => handlers.get(model)

export const getSyncModelHandlers = (): ReadonlyMap<string, SyncModelHandler> => handlers
