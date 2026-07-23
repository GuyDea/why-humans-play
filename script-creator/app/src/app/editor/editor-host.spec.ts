import { afterEach, describe, expect, it, vi } from 'vitest';
import { DaemonClientError } from '../api/client';
import { DebouncedAutosave } from './editor-host';

afterEach(() => {
  vi.useRealTimers();
});

describe('DebouncedAutosave', () => {
  it('serializes saves so an older snapshot cannot finish after a newer one', async () => {
    vi.useFakeTimers();
    let finishFirst: (() => void) | undefined;
    const saves: string[] = [];
    const autosave = new DebouncedAutosave<string>(async (snapshot) => {
      saves.push(snapshot);
      if (snapshot === 'first') {
        await new Promise<void>((resolve) => {
          finishFirst = resolve;
        });
      }
    });

    autosave.schedule('first');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(saves).toEqual(['first']);

    autosave.schedule('second');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(saves).toEqual(['first']);

    finishFirst?.();
    await autosave.whenIdle();
    expect(saves).toEqual(['first', 'second']);
  });

  it('flushes a pending debounce immediately and only once', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (_snapshot: string) => undefined);
    const autosave = new DebouncedAutosave<string>(save);

    autosave.schedule('pending');
    autosave.flush();
    await autosave.whenIdle();
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith('pending');

    await vi.advanceTimersByTimeAsync(1_000);
    expect(save).toHaveBeenCalledOnce();
  });

  it('retains and retries a failed snapshot before later queue work', async () => {
    vi.useFakeTimers();
    const saves: string[] = [];
    let attempts = 0;
    const autosave = new DebouncedAutosave<string>(async (snapshot) => {
      saves.push(snapshot);
      attempts += 1;
      if (attempts === 1) throw new Error('daemon unavailable');
    });

    autosave.schedule('recoverable');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(saves).toEqual(['recoverable']);

    await vi.advanceTimersByTimeAsync(1_000);
    await autosave.whenIdle();
    expect(saves).toEqual(['recoverable', 'recoverable']);
  });

  it('lets the newest snapshot supersede queued work after a permanent failure', async () => {
    vi.useFakeTimers();
    let rejectFirst!: (error: unknown) => void;
    const firstAttempt = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const saves: string[] = [];
    const autosave = new DebouncedAutosave<string>(async (snapshot) => {
      saves.push(snapshot);
      if (snapshot === 'first') await firstAttempt;
    });

    autosave.schedule('first');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(saves).toEqual(['first']);

    autosave.schedule('second');
    autosave.schedule('newest');
    await vi.advanceTimersByTimeAsync(1_000);
    rejectFirst(new DaemonClientError(422, {
      error: 'draft failed validation',
    }));
    await autosave.whenIdle();

    expect(saves).toEqual(['first', 'newest']);
  });

  it('uses capped exponential backoff for retryable failures', async () => {
    vi.useFakeTimers();
    const attempts: number[] = [];
    const autosave = new DebouncedAutosave<string>(
      async () => {
        attempts.push(Date.now());
        if (attempts.length < 4) {
          throw new DaemonClientError(503, { error: 'daemon unavailable' });
        }
      },
      1_000,
      100,
      () => undefined,
      250,
    );

    autosave.schedule('retryable');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(attempts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(attempts).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(200);
    expect(attempts).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(250);
    await autosave.whenIdle();

    expect(attempts).toHaveLength(4);
    expect(attempts.slice(1).map((time, index) =>
      time - attempts[index]!)).toEqual([100, 200, 250]);
  });

  it('cancels retry activity without reporting the dirty snapshot as saved', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {
      throw new DaemonClientError(503, { error: 'daemon unavailable' });
    });
    const queueSizes: number[] = [];
    const autosave = new DebouncedAutosave<string>(
      save,
      1_000,
      100,
      (size) => queueSizes.push(size),
    );

    autosave.schedule('unsaved');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(save).toHaveBeenCalledOnce();

    autosave.cancel();
    await vi.advanceTimersByTimeAsync(10_000);
    await autosave.whenIdle();

    expect(save).toHaveBeenCalledOnce();
    expect(queueSizes.at(-1)).toBe(0);
  });
});
