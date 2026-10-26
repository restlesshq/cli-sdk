import { resolveFeedbackUrl, type FeedbackTarget } from './endpoint.js';
import { describeOutcome, sendFeedback, type FeedbackPayload } from './send.js';
import { CORE_UA } from './version.js';

export { DOCS_DOMAIN, resolveFeedbackUrl, type Endpoint, type EndpointError, type FeedbackTarget } from './endpoint.js';
export { describeOutcome, sendFeedback, type FeedbackPayload, type SendResult } from './send.js';
export { CORE_UA, CORE_VERSION } from './version.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export interface SubmitOptions extends FeedbackTarget, FeedbackPayload {
  /** Your CLI as `name/version`, e.g. `petcli/2.3.0`. The dashboard labels notes with it. */
  client?: string;
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
}

export interface SubmitResult {
  ok: boolean;
  /** One line to print as-is, worded for whoever ran the command. */
  line: string;
  /** HTTP status, or 0 when nothing was sent or the server was unreachable. */
  status: number;
}

/** Resolve, validate and send one note. Never throws, so a feedback command can never crash its CLI. */
export async function submitFeedback(opts: SubmitOptions): Promise<SubmitResult> {
  try {
    return await submit(opts);
  } catch {
    return { ok: false, line: 'Something went wrong sending the feedback. Your note was not saved.', status: 0 };
  }
}

async function submit(opts: SubmitOptions): Promise<SubmitResult> {
  const endpoint = resolveFeedbackUrl(opts, opts.env ?? process.env);
  if ('error' in endpoint) return { ok: false, line: endpoint.error, status: 0 };

  const message = (opts.message ?? '').trim();
  if (!message) return { ok: false, line: 'Nothing to send: the message is empty.', status: 0 };
  const email = opts.email?.trim();
  if (email && !isEmail(email)) return { ok: false, line: `"${email}" doesn't look like an email address.`, status: 0 };

  // The server labels the note from the FIRST name/version token, so the host CLI goes first.
  const userAgent = [opts.client?.trim(), CORE_UA].filter(Boolean).join(' ');
  const result = await sendFeedback(
    endpoint.url,
    { message, context: opts.context?.trim(), email, requestIds: opts.requestIds },
    userAgent,
    opts.fetch,
  );
  return { ...describeOutcome(result), status: result.status };
}
