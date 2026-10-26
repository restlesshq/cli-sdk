import { describe, expect, it } from 'vitest';

import { resolveFeedbackUrl } from '../src/endpoint.js';

describe('resolveFeedbackUrl', () => {
  it('builds the project host from the slug', () => {
    expect(resolveFeedbackUrl({ project: 'Pets' }, {})).toEqual({ url: 'https://pets.restlessdocs.com/feedback' });
  });

  it('prefers docsUrl, keeping a subpath mount prefix', () => {
    const r = resolveFeedbackUrl({ project: 'pets', docsUrl: 'https://acme.com/docs/?x=1' }, {});
    expect(r).toEqual({ url: 'https://acme.com/docs/feedback' });
  });

  it('lets RESTLESS_FEEDBACK_URL override everything, used as-is', () => {
    const r = resolveFeedbackUrl({ project: 'pets' }, { RESTLESS_FEEDBACK_URL: 'http://pets.localhost:4099/feedback' });
    expect(r).toEqual({ url: 'http://pets.localhost:4099/feedback' });
  });

  it('names a missing project with a reason the caller can reword', () => {
    expect(resolveFeedbackUrl({}, {})).toMatchObject({ reason: 'no-project' });
    expect(resolveFeedbackUrl(null, {})).toMatchObject({ reason: 'no-project' });
  });

  it('refuses a slug that cannot be a hostname label, and a non-http URL', () => {
    expect(resolveFeedbackUrl({ project: 'evil.com/x' }, {})).toMatchObject({ reason: 'bad-slug' });
    expect(resolveFeedbackUrl({ docsUrl: 'file:///etc/passwd' }, {})).toMatchObject({ reason: 'bad-url' });
  });
});
