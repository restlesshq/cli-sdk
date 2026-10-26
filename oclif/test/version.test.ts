import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

import { PLUGIN_VERSION } from '../src/lib/version.js';

it('PLUGIN_VERSION matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  expect(PLUGIN_VERSION).toBe(pkg.version);
});
