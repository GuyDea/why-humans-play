import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path';

export interface ValidatorDiagnostic {
  message: string;
  line: number | null;
}

export interface ValidatorResult {
  ok: boolean;
  errors: ValidatorDiagnostic[];
  path: string;
  hash: string;
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

function resolveValidatorTarget(
  repoRoot: string,
  scriptRelPath: string,
): string {
  try {
    const canonicalRepoRoot = realpathSync(repoRoot);
    const components = scriptRelPath.split('/');
    let current = canonicalRepoRoot;
    for (const [index, component] of components.entries()) {
      current = join(current, component);
      const stat = lstatSync(current);
      const isFinal = index === components.length - 1;
      if (
        stat.isSymbolicLink()
        || (isFinal ? !stat.isFile() : !stat.isDirectory())
      ) {
        throw new InvalidValidatorPathError(scriptRelPath);
      }
    }

    const canonicalWhpRoot = realpathSync(
      join(canonicalRepoRoot, 'whp-youtube'),
    );
    const canonicalTarget = realpathSync(current);
    const targetWithinWhp = relative(canonicalWhpRoot, canonicalTarget);
    if (
      targetWithinWhp === ''
      || targetWithinWhp === '..'
      || targetWithinWhp.startsWith(`..${sep}`)
      || isAbsolute(targetWithinWhp)
    ) {
      throw new InvalidValidatorPathError(scriptRelPath);
    }
    return canonicalTarget;
  } catch (error) {
    if (error instanceof InvalidValidatorPathError) throw error;
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
  const target = options.absoluteTargetForTests
    ?? resolveValidatorTarget(repoRoot, scriptRelPath);
  if (
    options.absoluteTargetForTests !== undefined
    && !isAbsolute(options.absoluteTargetForTests)
  ) {
    throw new Error('absoluteTargetForTests must be absolute');
  }
  const validatorScript = resolve(
    scriptsDir,
    'validate_annotated_script.py',
  );
  const validatedBytes = readFileSync(target);
  const hash = createHash('sha256').update(validatedBytes).digest('hex');

  return new Promise((resolveResult, reject) => {
    const child = spawn(
      'python3',
      [validatorScript, '--json', '--', target],
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
        const currentBytes = readFileSync(target);
        if (!currentBytes.equals(validatedBytes)) {
          throw new Error('target changed while validator was running');
        }
        resolveResult({
          ...parsed,
          path: scriptRelPath,
          hash,
        });
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
