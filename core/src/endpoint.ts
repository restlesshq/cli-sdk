export const DOCS_DOMAIN = 'restlessdocs.com';

/** Which Restless project a CLI's notes belong to. One of the two is enough. */
export interface FeedbackTarget {
  project?: string;
  docsUrl?: string;
}

// A slug becomes a hostname label, so anything else is a typo, not a project.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type EndpointError = { error: string; reason: 'no-project' | 'bad-slug' | 'bad-url' };
export type Endpoint = { url: string } | EndpointError;

/** Where notes go: `RESTLESS_FEEDBACK_URL`, then `docsUrl`, then `<project>.restlessdocs.com`. */
export function resolveFeedbackUrl(target: FeedbackTarget | null | undefined, env: NodeJS.ProcessEnv = process.env): Endpoint {
  const override = env.RESTLESS_FEEDBACK_URL?.trim();
  if (override) return parseUrl(override, 'RESTLESS_FEEDBACK_URL');

  const cfg: FeedbackTarget = target && typeof target === 'object' ? target : {};

  if (typeof cfg.docsUrl === 'string' && cfg.docsUrl.trim()) {
    const base = parseUrl(cfg.docsUrl.trim(), 'docsUrl');
    return 'error' in base ? base : { url: `${base.url.replace(/\/+$/, '')}/feedback` };
  }

  const project = typeof cfg.project === 'string' ? cfg.project.trim().toLowerCase() : '';
  if (!project) return { error: 'No Restless project configured. Pass project: "<slug>".', reason: 'no-project' };
  if (!SLUG_RE.test(project)) return { error: `"${project}" is not a valid Restless project slug.`, reason: 'bad-slug' };
  return { url: `https://${project}.${DOCS_DOMAIN}/feedback` };
}

function parseUrl(raw: string, source: string): Endpoint {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol');
    u.search = '';
    u.hash = '';
    return { url: u.toString() };
  } catch {
    return { error: `${source} is not a valid URL: ${raw}`, reason: 'bad-url' };
  }
}
