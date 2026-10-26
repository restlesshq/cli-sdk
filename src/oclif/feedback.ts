import { createInterface } from 'node:readline/promises';
import { Command, Flags } from '@oclif/core';

import { SDK_UA, describeOutcome, isEmail, resolveFeedbackUrl, sendFeedback, type FeedbackTarget } from '../index.js';

export default class Feedback extends Command {
  static override summary = "Tell this API's maintainers what confused you.";

  static override description =
    'Sends a short note to the people who maintain this API: an unclear error, a missing capability, ' +
    'docs that contradict the behavior. Run it bare to be prompted, or pass --message (use "-" to read stdin).';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --message "the --since flag ignores timezones"',
    '<%= config.bin %> <%= command.id %> --message "create returned 500" --request-id req_123',
  ];

  static override enableJsonFlag = true;

  static override flags = {
    message: Flags.string({ char: 'm', summary: 'What to tell the maintainers. "-" reads it from stdin.' }),
    context: Flags.string({ summary: 'What you were doing, if it helps: the command, the endpoint.' }),
    email: Flags.string({ summary: 'An email the maintainers can reply to (optional).' }),
    'request-id': Flags.string({
      summary: 'The x-request-id of a call this is about, so the maintainers can open its log.',
      multiple: true,
    }),
  };

  async run(): Promise<{ ok: boolean; message: string }> {
    const { flags } = await this.parse(Feedback);

    const block = (this.config.pjson as { restless?: FeedbackTarget }).restless;
    const endpoint = resolveFeedbackUrl(block, process.env);
    if ('error' in endpoint) {
      const line =
        endpoint.reason === 'no-project'
          ? 'This CLI has no Restless project configured. Add "restless": { "project": "<slug>" } to its package.json.'
          : endpoint.error;
      this.error(line, { exit: 2 });
    }

    let message = flags.message === '-' ? await readStdin() : (flags.message ?? '').trim();
    let email = (flags.email ?? '').trim();
    if (email && !isEmail(email)) this.error(`"${email}" doesn't look like an email address.`, { exit: 2 });

    if (!message) {
      // Never prompt off a TTY: an agent or a pipe would hang waiting for an answer.
      if (!process.stdin.isTTY || this.jsonEnabled()) {
        this.error(`Nothing to send. Pass the note with --message, e.g. ${this.config.bin} ${this.id} --message "..."`, {
          exit: 2,
        });
      }
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      try {
        message = (await rl.question("What should this API's maintainers know?\n> ")).trim();
        if (message && !flags.email) {
          const answer = (await rl.question('Email for a reply (optional, Enter to skip): ')).trim();
          if (answer && isEmail(answer)) email = answer;
        }
      } finally {
        rl.close();
      }
      if (!message) this.error('Nothing sent.', { exit: 1 });
    }

    const result = await sendFeedback(
      endpoint.url,
      { message, context: flags.context?.trim(), email, requestIds: flags['request-id'] },
      `${this.config.userAgent} ${SDK_UA}`,
    );
    const outcome = describeOutcome(result);
    if (!outcome.ok) this.error(outcome.line, { exit: 1 });
    this.log(outcome.line);
    return { ok: true, message: outcome.line };
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8').trim();
}
