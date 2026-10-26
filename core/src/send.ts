export interface FeedbackPayload {
  message: string;
  context?: string;
  email?: string;
  requestIds?: string[];
}

export interface SendResult {
  status: number;
  body: unknown;
  retryAfter: number | null;
  error?: 'timed out' | 'unreachable';
}

const TIMEOUT_MS = 10_000;

/** POST one note. Never throws: an unreachable server is `status: 0`. */
export async function sendFeedback(
  url: string,
  payload: FeedbackPayload,
  userAgent: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<SendResult> {
  const body: FeedbackPayload = { message: payload.message };
  if (payload.context) body.context = payload.context;
  if (payload.email) body.email = payload.email;
  if (payload.requestIds?.length) body.requestIds = payload.requestIds;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': userAgent },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => '');
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {}
    return { status: res.status, body: parsed, retryAfter: Number(res.headers.get('retry-after')) || null };
  } catch (err) {
    const timedOut = (err as Error)?.name === 'AbortError';
    return { status: 0, body: null, retryAfter: null, error: timedOut ? 'timed out' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** One line per outcome, worded for the person (or agent) who ran the command. */
export function describeOutcome(result: SendResult): { ok: boolean; line: string } {
  const b = result.body as { error?: unknown } | null;
  const serverSaid = b && typeof b.error === 'string' ? b.error : '';
  switch (result.status) {
    case 201:
      return { ok: true, line: "Feedback sent to this API's maintainers. Thanks!" };
    case 400:
      return { ok: false, line: `The feedback was rejected${serverSaid ? `: ${serverSaid}` : '.'}` };
    case 404:
      // An unknown slug or a wrong docsUrl: either way the CLI's author has to fix it, not the user.
      return { ok: false, line: "This CLI's Restless project wasn't found. Its maintainers need to check the configured project slug." };
    case 413:
      return { ok: false, line: 'That is too long to send. Keep the message and context under 32KB together.' };
    case 429:
      return {
        ok: false,
        line: `Too many notes from this machine. Try again in ${result.retryAfter ? `${result.retryAfter} seconds` : 'a minute'}.`,
      };
    case 0:
      return { ok: false, line: `Couldn't reach the feedback server (${result.error}). Check your connection and try again.` };
    default:
      return { ok: false, line: `The feedback server returned ${result.status}. Your note was not saved.` };
  }
}
