import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Command } from '@oclif/core';

import Feedback from './feedback.js';

/**
 * The commands this plugin gives an oclif CLI. Each is opt-in by name in the
 * host's `restless.commands`, so upgrading the package never adds a command to
 * someone's CLI on its own. A host with no list gets `feedback`, the original one.
 */

const OWN_NAME = '@restlessai/cli-sdk';
const ALL: Record<string, Command.Class> = { feedback: Feedback };
export const DEFAULT_COMMANDS = ['feedback'];

function readPjson(dir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** The nearest oclif CLI's package.json above any of `starts`, skipping this package's own. */
export function findHostPjson(starts: string[]): Record<string, unknown> | null {
  for (const start of starts) {
    for (let dir = start; ; dir = dirname(dir)) {
      const pjson = readPjson(dir);
      if (pjson && pjson.name !== OWN_NAME && pjson.oclif && typeof pjson.oclif === 'object') return pjson;
      if (dir === dirname(dir)) break;
    }
  }
  return null;
}

/** Names from `restless.commands`, or the default when the host doesn't say. Unknown names are ignored. */
export function enabledCommands(host: Record<string, unknown> | null): string[] {
  const block = host?.restless as { commands?: unknown } | undefined;
  const listed = Array.isArray(block?.commands) ? block.commands.filter((c): c is string => typeof c === 'string') : DEFAULT_COMMANDS;
  return listed.filter((name) => name in ALL);
}

export function selectCommands(host: Record<string, unknown> | null): Record<string, Command.Class> {
  return Object.fromEntries(enabledCommands(host).map((name) => [name, ALL[name]]));
}

function hostStarts(): string[] {
  const starts: string[] = [];
  // The host's own bin script is the surest pointer; this file's location covers a linked or global install.
  try {
    if (process.argv[1]) starts.push(dirname(realpathSync(process.argv[1])));
  } catch {}
  starts.push(dirname(fileURLToPath(import.meta.url)));
  return starts;
}

export const COMMANDS = selectCommands(findHostPjson(hostStarts()));
