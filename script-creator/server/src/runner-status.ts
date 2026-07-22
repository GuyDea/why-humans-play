import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunnerPaths, RunnerStatus } from './types.js';

export function jobPaths(jobDir: string): RunnerPaths {
  return {
    jobDir,
    eventsFile: join(jobDir, 'events.jsonl'),
    statusFile: join(jobDir, 'status.json'),
    finalMessageFile: join(jobDir, 'final-message.txt'),
    schemaFile: join(jobDir, 'schema.json'),
  };
}

export function writeStatus(file: string, status: RunnerStatus): void {
  const tmp = file + '.tmp';
  writeFileSync(tmp, JSON.stringify(status, null, 2));
  renameSync(tmp, file);
}

export function readStatus(file: string): RunnerStatus | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as RunnerStatus;
  } catch {
    return null;
  }
}
