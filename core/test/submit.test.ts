import { describe, expect, it, vi } from 'vitest';

import { submitFeedback } from '../src/index.js';

const created = () => vi.fn(async () => new Response('{"ok":true}', { status: 201 }));

describe('submitFeedback', () => {
  it('sends to the project host, with the host CLI first in the user agent', async () => {
    const f = created();
    const r = await submitFeedback({ project: 'pets', client: 'petcli/2.3.0', message: ' hi ', env: {}, fetch: f });
    expect(r).toMatchObject({ ok: true, status: 201 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://pets.restlessdocs.com/feedback');
    expect(JSON.parse(init.body as string)).toEqual({ message: 'hi' });
    expect((init.headers as Record<string, string>)['user-agent']).toMatch(/^petcli\/2\.3\.0 restless-cli-feedback\//);
  });

  it('refuses without sending: no project, an empty message, a bad email', async () => {
    const f = created();
    for (const opts of [
      { message: 'hi' },
      { project: 'pets', message: '  ' },
      { project: 'pets', message: 'hi', email: 'nope' },
    ]) {
      expect(await submitFeedback({ ...opts, env: {}, fetch: f })).toMatchObject({ ok: false, status: 0 });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('never throws, even when the injected fetch does something unexpected', async () => {
    const f = vi.fn(() => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    await expect(submitFeedback({ project: 'pets', message: 'hi', env: {}, fetch: f })).resolves.toMatchObject({ ok: false });
  });
});
