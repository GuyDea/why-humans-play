import { afterEach, describe, expect, it, vi } from 'vitest';
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
});
