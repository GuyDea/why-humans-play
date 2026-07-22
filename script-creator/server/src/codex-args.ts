import type { JobEnvelope, RunnerPaths } from './types.js';

export function buildCodexArgs(env: JobEnvelope, paths: RunnerPaths): string[] {
  const args = env.resumeThreadId
    ? ['exec', 'resume', env.resumeThreadId]
    : ['exec'];
  args.push('--json', '-C', env.cwd, '-s', env.sandbox, '-o', paths.finalMessageFile);
  if (env.outputSchema) args.push('--output-schema', paths.schemaFile);
  args.push('-');
  return args;
}
