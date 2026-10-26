# @restlessai/cli-sdk

Restless for the CLI you ship with your API. Today it adds a `feedback` command, so your CLI's users (and the coding agents driving it for them) can tell you what confused them: an unclear error, a missing flag, docs that contradict the behavior. Notes land in your Restless dashboard under **API Feedback**, labelled with your CLI's name and version.

```
$ petcli feedback --message "the --since flag ignores timezones"
Feedback sent to this API's maintainers. Thanks!
```

The quickest way in is `npx restless init cli` in your CLI's repo, which works out which of the setups below fits and does it for you. Otherwise, pick one by hand.

## oclif CLIs

This package is also an oclif plugin. Install it and register it, with your Restless project slug:

```sh
npm install @restlessai/cli-sdk
```

```json
{
  "oclif": {
    "plugins": ["@restlessai/cli-sdk"]
  },
  "restless": {
    "project": "your-project-slug",
    "commands": ["feedback"]
  }
}
```

`restless.commands` names the commands the plugin adds to your CLI. Nothing outside that list ever appears, so upgrading the package can't add a command you didn't ask for. Leave the list out and you get `feedback`; set it to `[]` to turn the plugin's commands off.

If your docs are served from a custom domain or a subpath, `"docsUrl": "https://docs.example.com"` in the same block points notes there instead of the slug's host.

### Usage

```
petcli feedback                              # prompts for the note (interactive terminals only)
petcli feedback -m "what went wrong"         # non-interactive
echo "what went wrong" | petcli feedback -m -
petcli feedback -m "create returned 500" --request-id req_123 --request-id req_456
petcli feedback -m "..." --json              # machine-readable result
```

| flag | |
| --- | --- |
| `-m, --message` | The note. `-` reads it from stdin. Required when not running in a terminal. |
| `--context` | What the user was doing: the command, the endpoint. |
| `--email` | A contact address, so you can reply. Optional. |
| `--request-id` | The `x-request-id` of a call the note is about, so you can open its log. Repeatable. |
| `--json` | Print the result as JSON. |

The command never prompts when stdin isn't a terminal, so a script or an agent gets a clear error instead of a hang. It exits `0` when the note was saved and non-zero otherwise.

## Any other Node CLI

### Let your coding agent wire it up

Paste this into Claude Code, Codex, Cursor or similar, from your CLI's repo:

```text
Add a `feedback` command to this CLI using @restlessai/cli-sdk, for the Restless project "your-project-slug".
Install the package, then read node_modules/@restlessai/cli-sdk/install.md and follow it.
```

`install.md` ships inside the package. It tells the agent to match your CLI's existing command, flag, help and exit-code conventions, and not to send anything the user didn't type.

### Or do it by hand

```sh
npm install @restlessai/cli-sdk
```

```js
import { submitFeedback } from '@restlessai/cli-sdk';

const result = await submitFeedback({
  project: 'your-project-slug',
  client: 'petcli/2.3.0',
  message: 'the --since flag ignores timezones',
});
console.log(result.line); // "Feedback sent to this API's maintainers. Thanks!"
process.exitCode = result.ok ? 0 : 1;
```

`submitFeedback` never throws. It returns `{ ok, line, status }`, where `line` is ready to print to whoever ran the command.

| option | |
| --- | --- |
| `project` | Your Restless project slug. |
| `docsUrl` | Use instead of `project` if your docs are on a custom domain or a subpath, e.g. `https://docs.example.com`. |
| `client` | Your CLI as `name/version`. Labels the note in the dashboard. |
| `message` | The note. Required. |
| `context` | What the user was doing. Optional. |
| `email` | A reply address. Optional, validated before sending. |
| `requestIds` | `x-request-id` values the note is about. Optional. |
| `fetch` | A `fetch` to use instead of the global one, for tests. |

The lower-level pieces (`resolveFeedbackUrl`, `sendFeedback`, `describeOutcome`, `isEmail`) are exported too, if you want to build the command differently. Using the package this way never loads oclif, and doesn't install it.

## What is sent

Only what the user typed (`message`, and `context`, `email` and request ids when given), plus a `User-Agent` naming your CLI, its version and this package. Nothing is read from the user's machine or environment. Your project's docs don't need to be public for notes to be accepted. Notes are rate limited per IP address.

## Environment

| variable | |
| --- | --- |
| `RESTLESS_FEEDBACK_URL` | Send notes to this exact URL instead. For local testing. |

## Requirements

Node 18+. ESM only; from CommonJS, use `await import('@restlessai/cli-sdk')`. As an oclif plugin, `@oclif/core` 4 or later.
