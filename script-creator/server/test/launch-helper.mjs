import { spawn } from 'node:child_process';
import { writeSync } from 'node:fs';
import { join } from 'node:path';

const jobDir = process.argv[2];
const mode = process.argv[3] ?? 'slow';
const runner = join(import.meta.dirname, '..', 'src', 'runner.ts');
const child = spawn(process.execPath, ['--import', 'tsx', runner, jobDir], {
  detached: true, stdio: 'ignore',
  env: { ...process.env, FAKE_CODEX_MODE: mode },
});
writeSync(1, String(child.pid) + '\n');
child.unref();
process.exit(0); // launcher dies; runner must live on
