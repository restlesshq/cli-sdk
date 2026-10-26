import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DEFAULT_COMMANDS, enabledCommands, findHostPjson, selectCommands } from '../src/oclif/commands.js';

describe('enabledCommands', () => {
  it('gives feedback to a host that lists nothing', () => {
    expect(enabledCommands({ name: 'petcli', oclif: {} })).toEqual(DEFAULT_COMMANDS);
    expect(enabledCommands(null)).toEqual(DEFAULT_COMMANDS);
  });

  it('gives exactly what the host lists, ignoring names it does not know', () => {
    expect(enabledCommands({ restless: { commands: ['feedback', 'teleport'] } })).toEqual(['feedback']);
    expect(enabledCommands({ restless: { commands: [] } })).toEqual([]);
  });

  it('maps names to command classes', () => {
    expect(Object.keys(selectCommands({ restless: { commands: ['feedback'] } }))).toEqual(['feedback']);
  });
});

describe('findHostPjson', () => {
  it('walks up past this package to the oclif CLI that installed it', () => {
    const root = mkdtempSync(join(tmpdir(), 'host-'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'petcli', oclif: { bin: 'pets' } }));
    const own = join(root, 'node_modules', '@restlessai', 'cli-sdk');
    mkdirSync(join(own, 'dist', 'oclif'), { recursive: true });
    writeFileSync(join(own, 'package.json'), JSON.stringify({ name: '@restlessai/cli-sdk', oclif: {} }));
    expect(findHostPjson([join(own, 'dist', 'oclif')])).toMatchObject({ name: 'petcli' });
  });

  it('is null outside any oclif CLI', () => {
    expect(findHostPjson([mkdtempSync(join(tmpdir(), 'nohost-'))])).toBeNull();
  });
});
