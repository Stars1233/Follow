/**
 * Describes a CLI invocation for logs and error messages without its secrets. `execFile`
 * puts the whole command line into the message of a failed command, which is how a session
 * token once ended up in the main-process log.
 */
const SECRET_FLAGS = new Set(["--token"])

export const getCliCommandSecrets = (args: string[]) =>
  args.filter((arg, index) => index > 0 && SECRET_FLAGS.has(args[index - 1]!))

export const describeCliCommand = (command: string, args: string[]) =>
  [
    command,
    ...args.map((arg, index) =>
      index > 0 && SECRET_FLAGS.has(args[index - 1]!) ? "<redacted>" : arg,
    ),
  ].join(" ")

/** Strips every secret argument from free text, such as the output of the failed command. */
export const redactCliSecrets = (text: string, args: string[]) =>
  getCliCommandSecrets(args).reduce(
    (result, secret) => (secret ? result.split(secret).join("<redacted>") : result),
    text,
  )
