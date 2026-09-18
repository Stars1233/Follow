import { describe, expect, it } from "vitest"

import { describeCliCommand, redactCliSecrets } from "./cli-command"

describe("cli command redaction", () => {
  const args = [
    "--yes",
    "folocli@latest",
    "login",
    "--token",
    "s3cret-token",
    "--api-url",
    "https://api.folo.is",
  ]

  it("hides the token when describing the command", () => {
    expect(describeCliCommand("npx", args)).toBe(
      "npx --yes folocli@latest login --token <redacted> --api-url https://api.folo.is",
    )
    expect(describeCliCommand("npx", ["--yes", "folocli@latest", "logout"])).toBe(
      "npx --yes folocli@latest logout",
    )
  })

  it("strips the token from command output", () => {
    expect(
      redactCliSecrets("Command failed: npx login --token s3cret-token\nlogged s3cret-token", args),
    ).toBe("Command failed: npx login --token <redacted>\nlogged <redacted>")
    expect(redactCliSecrets("nothing here", ["logout"])).toBe("nothing here")
  })
})
