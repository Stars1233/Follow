import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ApiConnectionHandlers } from "./api-connection"
import { trackApiConnection } from "./api-connection"

type ResponseInterceptor = (ctx: { response: Response }) => Response
type ErrorInterceptor = (ctx: {
  response: Response | null
  options: { signal?: AbortSignal | null }
}) => void

const setup = (options: Partial<ApiConnectionHandlers> = {}) => {
  let onResponse!: ResponseInterceptor
  let onError!: ErrorInterceptor
  const handlers = { onUnreachable: vi.fn(), onRecovered: vi.fn(), ...options }

  trackApiConnection(
    {
      addResponseInterceptor: (interceptor) => {
        onResponse = interceptor
      },
      addErrorInterceptor: (interceptor) => {
        onError = interceptor
      },
    },
    handlers,
  )

  return {
    handlers,
    respond: (status = 200) => onResponse({ response: new Response(null, { status }) }),
    fail: (ctx: Partial<Parameters<ErrorInterceptor>[0]> = {}) =>
      onError({ response: null, options: {}, ...ctx }),
  }
}

const settle = () => vi.advanceTimersByTimeAsync(0)

describe("trackApiConnection with a probe", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("does not react to a request that failed while the API answers the probe", async () => {
    const probe = vi.fn(async () => true)
    const { handlers, fail } = setup({ probe })

    fail()
    fail()
    expect(probe).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2000)

    expect(probe).toHaveBeenCalledTimes(1)
    expect(handlers.onUnreachable).not.toHaveBeenCalled()
  })

  it("reports an outage only after every probe failed, once, and lifts it on the next answer", async () => {
    const probe = vi.fn(async () => false)
    const { handlers, fail, respond } = setup({ probe })

    fail()
    await vi.advanceTimersByTimeAsync(2000)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(handlers.onUnreachable).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2000)
    expect(probe).toHaveBeenCalledTimes(2)
    expect(handlers.onUnreachable).toHaveBeenCalledTimes(1)

    // Further failures while the outage is known change nothing.
    fail()
    fail()
    await vi.advanceTimersByTimeAsync(2000)
    expect(handlers.onUnreachable).toHaveBeenCalledTimes(1)

    respond(401)
    expect(handlers.onRecovered).toHaveBeenCalledTimes(1)
  })

  it("keeps probing during an outage and recovers when the probe gets through", async () => {
    let answers = false
    const probe = vi.fn(async () => answers)
    const { handlers, fail } = setup({ probe })

    fail()
    await vi.advanceTimersByTimeAsync(4000)
    expect(handlers.onUnreachable).toHaveBeenCalledTimes(1)

    answers = true
    await vi.advanceTimersByTimeAsync(15_000)

    expect(handlers.onRecovered).toHaveBeenCalledTimes(1)
    expect(handlers.onUnreachable).toHaveBeenCalledTimes(1)
  })

  it("drops a pending probe when an ordinary request gets an answer first", async () => {
    const probe = vi.fn(async () => false)
    const { handlers, fail, respond } = setup({ probe })

    fail()
    await vi.advanceTimersByTimeAsync(1000)
    respond()
    await vi.advanceTimersByTimeAsync(5000)

    expect(probe).not.toHaveBeenCalled()
    expect(handlers.onUnreachable).not.toHaveBeenCalled()
  })

  it("ignores a probe that was under way when an answer arrived", async () => {
    let resolveProbe!: (value: boolean) => void
    const probe = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveProbe = resolve
        }),
    )
    const { handlers, fail, respond } = setup({ probe, probeAttempts: 1 })

    fail()
    await vi.advanceTimersByTimeAsync(2000)
    expect(probe).toHaveBeenCalledTimes(1)

    respond()
    resolveProbe(false)
    await settle()

    expect(handlers.onUnreachable).not.toHaveBeenCalled()
  })

  it("treats a thrown probe as a failed one and a timeout as a failed request", async () => {
    const probe = vi.fn(async () => {
      throw new Error("offline")
    })
    const { handlers, fail } = setup({ probe, probeAttempts: 1 })

    // The SDK aborts its own controller on timeout, the caller's signal stays untouched.
    fail({ options: { signal: new AbortController().signal } })
    await vi.advanceTimersByTimeAsync(2000)

    expect(handlers.onUnreachable).toHaveBeenCalledTimes(1)
  })
})

describe("trackApiConnection without a probe", () => {
  it("needs several failures in a row and resets the count on any answer", () => {
    const { handlers, fail, respond } = setup()

    fail()
    fail()
    expect(handlers.onUnreachable).not.toHaveBeenCalled()

    respond(500)
    fail()
    fail()
    expect(handlers.onUnreachable).not.toHaveBeenCalled()

    fail()
    expect(handlers.onUnreachable).toHaveBeenCalledTimes(1)

    respond()
    expect(handlers.onRecovered).toHaveBeenCalledTimes(1)
  })

  it("ignores requests cancelled by the caller and errors that carry a response", () => {
    const { handlers, fail } = setup({ failureThreshold: 1 })
    const controller = new AbortController()
    controller.abort()

    fail({ options: { signal: controller.signal } })
    fail({ response: new Response(null, { status: 500 }) })

    expect(handlers.onUnreachable).not.toHaveBeenCalled()
  })

  it("passes the response through and keeps the SDK's default error handling", () => {
    const { fail, respond } = setup()
    const result = respond()

    expect(result).toBeInstanceOf(Response)
    expect(fail()).toBeUndefined()
  })
})
