interface ErrorContext {
  response: Response | null
  options: { signal?: AbortSignal | null }
}

interface ApiConnectionClient {
  addResponseInterceptor: (interceptor: (ctx: { response: Response }) => Response) => unknown
  addErrorInterceptor: (interceptor: (ctx: ErrorContext) => void) => unknown
}

export interface ApiConnectionHandlers {
  onUnreachable: () => void
  onRecovered?: () => void
  /**
   * A cheap request that says whether the API can be reached at all: resolve to `true` on
   * any HTTP answer, whatever its status, and `false` or throw when nothing came back. With
   * it, a failed request only schedules a probe; the probe decides.
   */
  probe?: () => Promise<boolean>
  /** Wait before the first probe, so a request that merely hit a hiccup is not judged at once. */
  probeDelayMs?: number
  /** Probes that must fail in a row before the API counts as unreachable. */
  probeAttempts?: number
  /** While unreachable, probe again this often so the prompt goes as soon as the API answers. */
  recheckIntervalMs?: number
  /** Without a probe: failed requests in a row that count as unreachable. */
  failureThreshold?: number
}

const DEFAULT_PROBE_DELAY_MS = 2000
const DEFAULT_PROBE_ATTEMPTS = 2
const DEFAULT_RECHECK_INTERVAL_MS = 15_000
const DEFAULT_FAILURE_THRESHOLD = 3

/**
 * A request that fails without any response never reached the server: DNS failure, refused or
 * reset connection, offline device, or a timeout. Requests cancelled by the caller don't count.
 */
const isConnectionFailure = ({ response, options }: ErrorContext) =>
  !response && !options.signal?.aborted

/**
 * Tells the app when the API cannot be reached at all, and when it answers again.
 *
 * One request failing proves little: an endpoint may be slow or briefly broken while the
 * API is fine. So a failure only starts a probe, a cheap request made a moment later and
 * repeated once; the API counts as unreachable when every probe fails and no other request
 * got an answer in the meantime. Any answer, from a probe or from an ordinary request, ends
 * the outage. Without a probe, several failures in a row are needed instead of one.
 */
export const trackApiConnection = (
  client: ApiConnectionClient,
  handlers: ApiConnectionHandlers,
) => {
  const probeDelayMs = handlers.probeDelayMs ?? DEFAULT_PROBE_DELAY_MS
  const probeAttempts = Math.max(1, handlers.probeAttempts ?? DEFAULT_PROBE_ATTEMPTS)
  const recheckIntervalMs = handlers.recheckIntervalMs ?? DEFAULT_RECHECK_INTERVAL_MS
  const failureThreshold = Math.max(1, handlers.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD)

  let unreachable = false
  let consecutiveFailures = 0
  let probeTimer: ReturnType<typeof setTimeout> | null = null
  let probing = false
  // Bumped whenever the API is known to answer, so a probe that was under way is dropped.
  let generation = 0

  const clearProbeTimer = () => {
    if (probeTimer) {
      clearTimeout(probeTimer)
      probeTimer = null
    }
  }

  const markUnreachable = () => {
    if (unreachable) return
    unreachable = true
    handlers.onUnreachable()
  }

  const markReachable = () => {
    generation += 1
    consecutiveFailures = 0
    clearProbeTimer()
    if (!unreachable) return
    unreachable = false
    handlers.onRecovered?.()
  }

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  const runProbe = async (attempts: number) => {
    if (probing || !handlers.probe) return
    probing = true
    const startedIn = generation
    let outcome: "answered" | "failed" | "abandoned" = "failed"
    try {
      for (let attempt = 1; attempt <= attempts; attempt++) {
        const answered = await handlers.probe().catch(() => false)
        if (startedIn !== generation) {
          outcome = "abandoned"
          break
        }
        if (answered) {
          outcome = "answered"
          break
        }
        if (attempt < attempts) await sleep(probeDelayMs)
      }
    } finally {
      probing = false
    }

    if (outcome === "answered") {
      markReachable()
    } else if (outcome === "failed") {
      markUnreachable()
      // Keep checking so the prompt disappears as soon as the API is back.
      scheduleProbe(recheckIntervalMs, 1)
    }
  }

  const scheduleProbe = (delayMs: number, attempts: number) => {
    if (probeTimer || probing) return
    probeTimer = setTimeout(() => {
      probeTimer = null
      void runProbe(attempts)
    }, delayMs)
  }

  client.addResponseInterceptor(({ response }) => {
    markReachable()
    return response
  })

  client.addErrorInterceptor((ctx) => {
    if (!isConnectionFailure(ctx)) return
    consecutiveFailures += 1
    if (unreachable) return
    if (handlers.probe) {
      scheduleProbe(probeDelayMs, probeAttempts)
    } else if (consecutiveFailures >= failureThreshold) {
      markUnreachable()
    }
    // Returning nothing keeps the SDK's default error handling.
  })
}
