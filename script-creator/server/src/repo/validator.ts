import { spawn } from 'node:child_process';
import { isAbsolute, resolve, win32 } from 'node:path';

export interface ValidatorDiagnostic {
  message: string;
  line: number | null;
}

export interface ValidatorResult {
  ok: boolean;
  errors: ValidatorDiagnostic[];
}

export interface RunValidatorJsonOptions {
  scriptsDir?: string;
  absoluteTargetForTests?: string;
}

export class InvalidValidatorPathError extends Error {
  constructor(scriptRelPath: string) {
    super(`invalid or non-whitelisted validator path: ${scriptRelPath}`);
    this.name = 'InvalidValidatorPathError';
  }
}

export function assertValidatorScriptPath(scriptRelPath: string): void {
  if (
    scriptRelPath.length === 0
    || scriptRelPath.includes('\0')
    || scriptRelPath.includes('\\')
    || scriptRelPath.includes('..')
    || isAbsolute(scriptRelPath)
    || win32.isAbsolute(scriptRelPath)
    || !scriptRelPath.startsWith('whp-youtube/')
    || scriptRelPath.length === 'whp-youtube/'.length
  ) {
    throw new InvalidValidatorPathError(scriptRelPath);
  }
}

function isValidatorResult(value: unknown): value is ValidatorResult {
  if (
    typeof value !== 'object'
    || value === null
    || typeof (value as { ok?: unknown }).ok !== 'boolean'
    || !Array.isArray((value as { errors?: unknown }).errors)
  ) {
    return false;
  }

  return (value as { errors: unknown[] }).errors.every((error) => (
    typeof error === 'object'
    && error !== null
    && typeof (error as { message?: unknown }).message === 'string'
    && (
      (error as { line?: unknown }).line === null
      || Number.isInteger((error as { line?: unknown }).line)
    )
  ));
}

function stderrTail(stderr: string): string {
  const tail = stderr.trim().slice(-4_096);
  return tail || '<empty>';
}

export async function runValidatorJson(
  repoRoot: string,
  scriptRelPath: string,
  options: RunValidatorJsonOptions = {},
): Promise<ValidatorResult> {
  assertValidatorScriptPath(scriptRelPath);

  const scriptsDir = options.scriptsDir ?? resolve(
    repoRoot,
    '.agents/skills/writing-whp-youtube-scripts/scripts',
  );
  const target = options.absoluteTargetForTests ?? resolve(
    repoRoot,
    scriptRelPath,
  );
  if (
    options.absoluteTargetForTests !== undefined
    && !isAbsolute(options.absoluteTargetForTests)
  ) {
    throw new Error('absoluteTargetForTests must be absolute');
  }

  return new Promise((resolveResult, reject) => {
    const child = spawn(
      'python3',
      ['validate_annotated_script.py', '--json', '--', target],
      { cwd: scriptsDir },
    );
    let stdout = '';
    let stderr = '';
    let settled = false;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(new Error(
        `validator spawn failed: ${error.message}; stderr tail: ${stderrTail(stderr)}`,
        { cause: error },
      ));
    });

    child.on('close', () => {
      if (settled) return;
      settled = true;
      try {
        const parsed: unknown = JSON.parse(stdout);
        if (!isValidatorResult(parsed)) {
          throw new Error('stdout did not match the validator JSON contract');
        }
        resolveResult(parsed);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'unknown JSON parse failure';
        reject(new Error(
          `validator returned unparseable output: ${message}; stderr tail: ${stderrTail(stderr)}`,
          { cause: error },
        ));
      }
    });
  });
}
