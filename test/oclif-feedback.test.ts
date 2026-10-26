import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Config } from '@oclif/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Feedback from '../src/oclif/feedback.js';

// A stand-in host CLI: only its package.json matters to the command.
function hostCli(pjson: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'host-cli-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'petcli', version: '2.3.0', oclif: {}, ...pjson }));
  return dir;
}

async function run(argv: string[], pjson: Record<string, unknown> = { restless: { project: 'pets' } }) {
  const config = await Config.load(hostCli(pjson));
  return new Feedback(argv, config).run();
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('feedback command', () => {
  it('posts an id-less note to the project host, stamped with the host CLI', async () => {
    await expect(run(['--message', 'the --since flag ignores timezones'])).resolves.toMatchObject({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://pets.restlessdocs.com/feedback');
    expect(JSON.parse(init.body as string)).toEqual({ message: 'the --since flag ignores timezones' });
    const ua = (init.headers as Record<string, string>)['user-agent'];
    expect(ua.startsWith('petcli/2.3.0 ')).toBe(true);
    expect(ua).toContain('restless-cli-sdk/');
  });

  it('passes request ids and context through', async () => {
    await run(['-m', 'create 500d', '--request-id', 'req_1', '--request-id', 'req_2', '--context', 'pets create']);
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ message: 'create 500d', context: 'pets create', requestIds: ['req_1', 'req_2'] });
  });

  it('refuses to prompt off a TTY and says how to pass the note', async () => {
    await expect(run([])).rejects.toThrow(/--message/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails before sending when the host CLI has no project configured', async () => {
    await expect(run(['-m', 'hi'], {})).rejects.toThrow(/"restless": \{ "project"/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email up front', async () => {
    await expect(run(['-m', 'hi', '--email', 'nope'])).rejects.toThrow(/email/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exits non-zero with the mapped line when the server refuses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"Not found"}', { status: 404 }));
    await expect(run(['-m', 'hi'])).rejects.toThrow(/wasn't found/);
  });
});
