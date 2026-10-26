# @restlessai/oclif-plugin-feedback

Adds a `feedback` command to your [oclif](https://oclif.io) CLI. Your users, and the coding agents driving your CLI for them, can tell you what confused them: an unclear error, a missing flag, docs that contradict the behavior. Notes land in your Restless dashboard under **API Feedback**, labelled with your CLI's name and version.

```
$ petcli feedback --message "the --since flag ignores timezones"
Feedback sent to this API's maintainers. Thanks!
```

## Install

```sh
npm install @restlessai/oclif-plugin-feedback
```

Then add it to your CLI's `package.json`, along with your Restless project slug:

```json
{
  "oclif": {
    "plugins": ["@restlessai/oclif-plugin-feedback"]
  },
  "restless": {
    "project": "your-project-slug"
  }
}
```

That's all. Your project's docs don't need to be public for notes to be accepted.

If your docs are served from a custom domain or a subpath, you can point the plugin there instead with `"docsUrl": "https://docs.example.com"`. The slug works either way.

## Usage

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

## What is sent

Only what the user typed (`message`, and `context`, `email` and request ids when given), plus a `User-Agent` naming your CLI, its version, the platform and this plugin. Nothing is read from the user's machine or environment.

Notes are rate limited per IP address.

## Environment

| variable | |
| --- | --- |
| `RESTLESS_FEEDBACK_URL` | Send notes to this exact URL instead. For local testing. |

## Requirements

Node 18+ and `@oclif/core` 4 or later.
