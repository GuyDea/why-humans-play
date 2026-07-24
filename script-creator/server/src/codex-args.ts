import type { JobEnvelope, RunnerPaths } from './types.js';

export function buildCodexArgs(env: JobEnvelope, paths: RunnerPaths): string[] {
  const args = env.resumeThreadId
    ? ['exec', 'resume', env.resumeThreadId]
    : ['exec'];
  args.push('--json', '-C', env.cwd, '-s', env.sandbox, '-o', paths.finalMessageFile);
  if (env.outputSchema) args.push('--output-schema', paths.schemaFile);
  if (env.model) args.push('-m', env.model);
  if (env.effort) args.push('-c', `model_reasoning_effort=${env.effort}`);
  args.push('-');
  return args;
}
