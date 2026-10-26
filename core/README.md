# @restlessai/cli-feedback

Add a `feedback` command to any Node CLI, whatever it's built with. Your users, and the coding agents driving your CLI for them, can tell you what confused them. Notes land in your Restless dashboard under **API Feedback**, labelled with your CLI's name and version.

No framework and no dependencies. Using oclif? [`@restlessai/oclif-plugin-feedback`](../oclif) does all of this for you.

## Let your coding agent wire it up

Paste this into Claude Code, Codex, Cursor or similar, from your CLI's repo:

```text
Add a `feedback` command to this CLI using @restlessai/cli-feedback, for the Restless project "your-project-slug".
Install the package, then read node_modules/@restlessai/cli-feedback/install.md and follow it.
```

`install.md` ships inside the package. It tells the agent to match your CLI's existing command, flag, help and exit-code conventions, and not to send anything the user didn't type.

## Or do it by hand

```sh
npm install @restlessai/cli-feedback
```

```js
import { submitFeedback } from '@restlessai/cli-feedback';

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

Your project's docs don't need to be public for notes to be accepted.

The lower-level pieces (`resolveFeedbackUrl`, `sendFeedback`, `describeOutcome`, `isEmail`) are exported too, if you want to build the command differently.

## What is sent

Only the fields you pass, plus a `User-Agent` of your `client` value and this package's version. Nothing is read from the user's machine or environment. Notes are rate limited per IP address.

## Environment

| variable | |
| --- | --- |
| `RESTLESS_FEEDBACK_URL` | Send notes to this exact URL instead. For local testing. |

## Requirements

Node 18+. ESM only; from CommonJS, use `await import('@restlessai/cli-feedback')`.
