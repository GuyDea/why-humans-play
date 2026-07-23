import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const APP_DIRECTORY = 'whp-script-creator';

export interface AppDirs {
  dataDir: string;
  stateDir: string;
  jobsRoot: string;
  runtimeFile: string;
}

export interface AppDirEnvironment {
  HOME?: string;
  XDG_DATA_HOME?: string;
  XDG_STATE_HOME?: string;
}

export function resolveAppDirs(repoRoot: string, env: AppDirEnvironment): AppDirs {
  const absoluteRepoRoot = resolve(repoRoot);
  const repoId = createHash('sha256').update(absoluteRepoRoot).digest('hex').slice(0, 12);
  const home = env.HOME;
  const dataHome = env.XDG_DATA_HOME || (home ? join(home, '.local', 'share') : undefined);
  const stateHome = env.XDG_STATE_HOME || (home ? join(home, '.local', 'state') : undefined);

  if (!dataHome || !stateHome) {
    throw new Error('HOME is required when XDG_DATA_HOME or XDG_STATE_HOME is not set');
  }

  const dataDir = join(dataHome, APP_DIRECTORY, repoId) + sep;
  const stateDir = join(stateHome, APP_DIRECTORY, repoId) + sep;
  const jobsRoot = join(stateDir, 'jobs') + sep;
  const runtimeFile = join(stateDir, 'daemon.json');

  for (const dir of [dataDir, stateDir, jobsRoot]) mkdirSync(dir, { recursive: true });

  return { dataDir, stateDir, jobsRoot, runtimeFile };
}
