import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createDaemonContext,
  type DaemonSignalTarget,
  generateNonce,
  parsePort,
  type RuntimeHandshake,
  startDaemonContext,
  writeRuntimeFile,
} from '../src/daemon.js';
import { JobStore } from '../src/job-store.js';
import { OperationService } from '../src/operations/service.js';
import { JobSupervisor } from '../src/supervisor.js';

const FAKE_CODEX = join(import.meta.dirname, 'fake-codex.mjs');

describe('generateNonce', () => {
  it('returns a 32-character hexadecimal launch nonce', () => {
    expect(generateNonce()).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('parsePort', () => {
  it('uses an ephemeral port when --port is omitted', () => {
    expect(parsePort([])).toBe(0);
  });

  it('uses the port passed after --port', () => {
    expect(parsePort(['--port', '4310'])).toBe(4310);
  });

  it.each(['', '-1', '1.5', '65536', 'not-a-port'])(
    'rejects invalid port %j',
    (port) => {
      expect(() => parsePort(['--port', port])).toThrow('invalid port');
    },
  );
});

describe('writeRuntimeFile', () => {
  it('atomically replaces the handshake with mode 0600', () => {
    const stateDir = mkdtempSync(join(tmpdir(), 'daemon-runtime-'));
    const runtimeFile = join(stateDir, 'daemon.json');
    const handshake: RuntimeHandshake = {
      port: 4310,
      nonce: '0123456789abcdef0123456789abcdef',
      pid: 1234,
      startedAt: '2026-07-23T07:00:00.000Z',
    };
    writeFileSync(runtimeFile, 'stale', { mode: 0o644 });

    writeRuntimeFile(runtimeFile, handshake);

    expect(JSON.parse(readFileSync(runtimeFile, 'utf8'))).toEqual(handshake);
    expect(statSync(runtimeFile).mode & 0o777).toBe(0o600);
    expect(readdirSync(stateDir)).toEqual(['daemon.json']);
  });
});

describe('createDaemonContext', () => {
  it('reopens the same state database across context recreations', async () => {
    const root = mkdtempSync(join(tmpdir(), 'daemon-reopen-'));
    const repoRoot = join(root, 'repo');
    mkdirSync(repoRoot);
    const env = {
      XDG_DATA_HOME: join(root, 'data'),
      XDG_STATE_HOME: join(root, 'state'),
    };
    const first = createDaemonContext({ repoRoot, env });
    await first.close();
    const second = createDaemonContext({ repoRoot, env });
    await second.close();
  });

  it('serves the built Angular browser output when it exists', async () => {
    const root = mkdtempSync(join(tmpdir(), 'daemon-static-root-'));
    const repoRoot = join(root, 'repo');
    const browserRoot = join(
      repoRoot,
      'script-creator',
      'app',
      'dist',
      'app',
      'browser',
    );
    mkdirSync(browserRoot, { recursive: true });
    writeFileSync(
      join(browserRoot, 'index.html'),
      '<!doctype html><title>Angular Script Studio</title>',
    );
    const context = createDaemonContext({
      repoRoot,
      env: {
        XDG_DATA_HOME: join(root, 'data'),
        XDG_STATE_HOME: join(root, 'state'),
      },
    });

    try {
      const response = await context.app.inject({
        method: 'GET',
        url: '/',
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('<title>Angular Script Studio</title>');
    } finally {
      await context.close();
    }
  });

  it('threads SC_CODEX_BIN into submitted job envelopes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'daemon-codex-bin-'));
    const repoRoot = join(root, 'repo');
    const codexBin = `${process.execPath} ${FAKE_CODEX}`;
    mkdirSync(repoRoot);
    const context = createDaemonContext({
      repoRoot,
      env: {
        XDG_DATA_HOME: join(root, 'data'),
        XDG_STATE_HOME: join(root, 'state'),
        SC_CODEX_BIN: codexBin,
      },
    });
    let reader: JobStore | undefined;

    try {
      const response = await context.app.inject({
        method: 'POST',
        url: '/api/ops',
        headers: { 'x-sc-nonce': context.nonce },
        payload: {
          operation: 'quick-gate-check',
          inputs: { selection: 'Use the deterministic test binary.' },
        },
      });
      expect(response.statusCode).toBe(200);

      const { id } = response.json<{ id: string }>();
      reader = new JobStore(context.stateDbFile);
      const envelope = JSON.parse(reader.get(id)!.envelopeJson);
      expect(envelope.codexBin).toBe(codexBin);
    } finally {
      reader?.close();
      await context.close();
    }
  });

  it('wires XDG state into the services and reattaches without listening', async () => {
    const root = mkdtempSync(join(tmpdir(), 'daemon-context-'));
    const repoRoot = join(root, 'repo');
    const xdgData = join(root, 'data');
    const xdgState = join(root, 'state');
    mkdirSync(repoRoot);
    const enforce = vi.spyOn(
      OperationService.prototype,
      'enforceDeadlinesAtBoot',
    );
    const reattach = vi.spyOn(JobSupervisor.prototype, 'reattach');
    const sweep = vi.spyOn(
      OperationService.prototype,
      'reconcileTimedOutAttempts',
    );
    const dispose = vi.spyOn(OperationService.prototype, 'dispose');
    const stop = vi.spyOn(JobSupervisor.prototype, 'stop');
    const context = createDaemonContext({
      repoRoot,
      env: {
        XDG_DATA_HOME: xdgData,
        XDG_STATE_HOME: xdgState,
      },
    });

    try {
      expect(reattach).toHaveBeenCalledOnce();
      expect(enforce).toHaveBeenCalledOnce();
      expect(sweep).toHaveBeenCalledOnce();
      expect(enforce.mock.invocationCallOrder[0]).toBeLessThan(
        reattach.mock.invocationCallOrder[0]!,
      );
      expect(reattach.mock.invocationCallOrder[0]).toBeLessThan(
        sweep.mock.invocationCallOrder[0]!,
      );
      expect(context.stateDbFile).toBe(
        join(context.dirs.stateDir, 'state.sqlite3'),
      );
      expect(existsSync(context.stateDbFile)).toBe(true);
      const response = await context.app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { 'x-sc-nonce': context.nonce },
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await context.close();
      expect(dispose).toHaveBeenCalledOnce();
      expect(stop).toHaveBeenCalledOnce();
      expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(
        stop.mock.invocationCallOrder[0]!,
      );
      enforce.mockRestore();
      reattach.mockRestore();
      sweep.mockRestore();
      dispose.mockRestore();
      stop.mockRestore();
    }
  });
});

describe('startDaemonContext', () => {
  it('publishes the actual loopback port and shuts down on either signal without listening', async () => {
    const root = mkdtempSync(join(tmpdir(), 'daemon-start-'));
    const repoRoot = join(root, 'repo');
    mkdirSync(repoRoot);
    const context = createDaemonContext({
      repoRoot,
      env: {
        XDG_DATA_HOME: join(root, 'data'),
        XDG_STATE_HOME: join(root, 'state'),
      },
    });
    const listen = vi.spyOn(context.app, 'listen')
      .mockResolvedValue('http://127.0.0.1:80' as never);
    const stop = vi.spyOn(context.supervisor, 'stop');
    let releaseClose = () => {};
    const close = vi.spyOn(context.app, 'close').mockImplementation(
      () => new Promise<void>((resolve) => {
        releaseClose = resolve;
      }) as never,
    );
    const log = vi.fn();
    const listeners = new Map<string, () => void>();
    const signalTarget: DaemonSignalTarget = {
      once(signal, listener) {
        listeners.set(signal, listener);
      },
      removeListener(signal, listener) {
        if (listeners.get(signal) === listener) listeners.delete(signal);
      },
    };
    let running: Awaited<ReturnType<typeof startDaemonContext>> | undefined;

    try {
      running = await startDaemonContext(context, {
        port: 0,
        pid: 1234,
        now: () => new Date('2026-07-23T07:00:00.000Z'),
        log,
        signalTarget,
      });

      expect(listen).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 0,
      });
      expect(JSON.parse(readFileSync(context.dirs.runtimeFile, 'utf8')))
        .toEqual({
          port: 80,
          nonce: context.nonce,
          pid: 1234,
          startedAt: '2026-07-23T07:00:00.000Z',
        });
      expect(log).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledWith(
        `Script Creator daemon listening at http://127.0.0.1:80/#nonce=${context.nonce}`,
      );
      expect(running.url).toBe('http://127.0.0.1:80');
      expect([...listeners.keys()].sort()).toEqual(['SIGINT', 'SIGTERM']);

      listeners.get('SIGTERM')!();
      await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce());
      try {
        expect(existsSync(context.dirs.runtimeFile)).toBe(false);
      } finally {
        releaseClose();
      }
      await running.shutdown();

      expect(stop.mock.invocationCallOrder[0]).toBeLessThan(
        close.mock.invocationCallOrder[0]!,
      );
      expect(listeners.size).toBe(0);
    } finally {
      const closing = running ? running.shutdown() : context.close();
      releaseClose();
      await closing;
    }
  });
});
