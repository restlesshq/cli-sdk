# Adding a `feedback` command with @restlessai/cli-feedback

These are instructions for a coding agent wiring a `feedback` command into a Node CLI that does not use oclif (a hand-rolled dispatcher, Commander, yargs, citty, cac, or anything else). For oclif, install `@restlessai/oclif-plugin-feedback` instead and stop here.

The command lets the CLI's users, and the agents driving it, send a short note to the API's maintainers. It must feel like every other command in this CLI.

## 1. Find out before changing anything

- **The Restless project slug.** The person asking you to do this should have given it to you. If they didn't, ask. Don't guess one, and don't read it from `.env*` files.
- **How commands are registered.** Find where the CLI maps a command name to its handler, how flags are parsed, how help text is generated, and how other commands print output and set exit codes. Copy those patterns.
- **The module system.** This package is ESM only. In an ESM CLI, use a static `import`. In a CommonJS CLI, load it with `await import('@restlessai/cli-feedback')` inside the handler. Don't convert the CLI to ESM for this.
- **The Node version floor.** The package needs Node 18 or later (it uses the global `fetch`). If the CLI supports older versions, tell the person rather than raising the floor yourself.

Never read `.env*` files or anything in `node_modules/` other than this file.

## 2. Install

Use the CLI's own package manager, as a runtime dependency:

```sh
npm install @restlessai/cli-feedback
```

## 3. Add the command

Call `submitFeedback` once. It resolves the endpoint, validates the input, sends the note, and returns a line to print. It never throws.

```js
import { submitFeedback } from '@restlessai/cli-feedback';

const result = await submitFeedback({
  project: 'your-project-slug',   // the slug from step 1, as a constant in the CLI's source
  client: `${name}/${version}`,   // this CLI's own name and version, e.g. read from its package.json
  message,                        // required
  context,                        // optional: what the user was doing
  email,                          // optional: a reply address
  requestIds,                     // optional: string[] of x-request-id values
});

if (result.ok) {
  print(result.line);             // however this CLI prints to stdout
} else {
  printError(result.line);        // however this CLI prints errors
  exit(1);
}
```

Set `client` to this CLI's name and version. The dashboard uses it to label each note. If the docs are served from a custom domain or a subpath, `docsUrl: 'https://docs.example.com'` can be passed instead of `project`.

### Flags

Use this CLI's own flag style, with these names:

| flag | meaning |
| --- | --- |
| `--message`, `-m` | The note. The value `-` means read it from stdin. |
| `--context` | What the user was doing: the command, the endpoint. |
| `--email` | A reply address. Optional. |
| `--request-id` | The `x-request-id` of a call the note is about. Repeatable, collected into `requestIds`. |

If the CLI has a global `--json` convention, honor it: print `{ "ok": result.ok, "message": result.line }`.

### Prompting

When `--message` is missing:

- **Interactive terminal** (`process.stdin.isTTY` is true and `--json` is off): ask "What should this API's maintainers know?" on stderr, then optionally ask for an email. Use whatever prompt library the CLI already has, or `node:readline/promises`.
- **Anything else**: exit with code 2 and an error saying to pass `--message`. Never prompt when stdin isn't a TTY, because a script or an agent would hang waiting for an answer.

### Exit codes

`0` when `result.ok` is true, `1` when the server refused or was unreachable, `2` for usage errors (no message off a TTY, a bad flag).

## 4. Make it discoverable

- Add `feedback` to the CLI's help listing with a one-line summary: "Tell this API's maintainers what confused you."
- If the CLI has a README with a command list, add the command there with one example.
- If the CLI prints a hint after an error, you may add "Run `<bin> feedback` to tell the maintainers" to it. Only do this if the person asks.

## 5. Don't

- Don't send anything the user didn't type. No environment variables, file contents, command history or machine identifiers.
- Don't intercept HTTP calls or capture request ids automatically. That's a separate, opt-in feature.
- Don't add a write key or any secret. This endpoint needs only the project slug.

## 6. Check your work

- Set `RESTLESS_FEEDBACK_URL` to a local catcher (for example, a tiny `node:http` server that prints the body and returns 201) and run the command with `--message`. Confirm the body and that the `User-Agent` starts with this CLI's `name/version`.
- Run it with no `--message` and stdin piped (`echo | <bin> feedback`), and confirm it exits 2 without hanging.
- Run the CLI's existing tests and add one for the new command, following how other commands are tested.

Finish by telling the person which files you changed, and the command to try: `<bin> feedback -m "testing the feedback command"`.
