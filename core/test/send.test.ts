import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { describeOutcome, sendFeedback } from '../src/send.js';
import { CORE_VERSION } from '../src/version.js';

function fakeFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers }));
}

describe('sendFeedback', () => {
  it('posts only the fields that are set, with the caller user agent', async () => {
    const f = fakeFetch(201, { ok: true });
    const r = await sendFeedback('https://x/feedback', { message: 'hi', context: '', requestIds: [] }, 'mycli/1.0', f);
    expect(r.status).toBe(201);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x/feedback');
    expect(JSON.parse(init.body as string)).toEqual({ message: 'hi' });
    expect((init.headers as Record<string, string>)['user-agent']).toBe('mycli/1.0');
  });

  it('never throws when the server is unreachable', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await sendFeedback('https://x/feedback', { message: 'hi' }, 'ua', f)).toMatchObject({
      status: 0,
      error: 'unreachable',
    });
  });

  it('reads Retry-After for a 429', async () => {
    const r = await sendFeedback('https://x', { message: 'hi' }, 'ua', fakeFetch(429, {}, { 'retry-after': '30' }));
    expect(describeOutcome(r).line).toContain('30 seconds');
  });
});

describe('describeOutcome', () => {
  it('is ok only on 201', () => {
    expect(describeOutcome({ status: 201, body: {}, retryAfter: null }).ok).toBe(true);
    for (const status of [0, 400, 404, 413, 500]) {
      expect(describeOutcome({ status, body: {}, retryAfter: null }).ok).toBe(false);
    }
  });

  it("echoes the server's reason on a 400", () => {
    expect(describeOutcome({ status: 400, body: { error: 'message is required' }, retryAfter: null }).line).toContain(
      'message is required',
    );
  });
});

it('CORE_VERSION matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  expect(CORE_VERSION).toBe(pkg.version);
});
