import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import type { CodexEvent } from './types.js';

export class EventLog {
  constructor(private readonly file: string) {}

  append(raw: string): void {
    appendFileSync(this.file, raw.endsWith('\n') ? raw : raw + '\n');
  }

  read(fromSeq = 0): CodexEvent[] {
    if (!existsSync(this.file)) return [];
    const lines = readFileSync(this.file, 'utf8').split('\n').filter((l) => l.length > 0);
    return lines.map((rawLine, i): CodexEvent => {
      let parsed: CodexEvent['parsed'];
      try {
        const p = JSON.parse(rawLine);
        if (p && typeof p.type === 'string') parsed = p;
      } catch { /* malformed lines stay raw */ }
      return { seq: i + 1, raw: rawLine, parsed };
    }).filter((e) => e.seq > fromSeq);
  }

  count(): number {
    return this.read().length;
  }
}
