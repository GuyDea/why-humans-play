import type { CodexEvent } from '../types.js';

export const WHP_PROGRESS_VERSION = 'WHP_PROGRESS/2';

export const WHP_PROGRESS_ROWS = [
  {
    id: '01-frame',
    text: 'Record the decision frame and current WHP context.',
  },
  {
    id: '02-mode',
    text: 'Select and state the evidence mode.',
  },
  {
    id: '03-signals',
    text: 'Collect independent audience-demand, competitive-supply, and timing signals.',
  },
  {
    id: '04-pool',
    text: 'Record at least 30 distinct, diverse subjects before ranking.',
  },
  {
    id: '05-angles',
    text: 'Develop materially different angles for promising subjects.',
  },
  {
    id: '06-proof-cases',
    text: 'Identify a first-hearing opening proof case and any needed current echo for each finalist.',
  },
  {
    id: '07-gates',
    text: 'Audit every advancing angle against all six hard gates.',
  },
  {
    id: '08-shallow',
    text: 'Run a shallow scan and narrow to roughly 8–12 candidates.',
  },
  {
    id: '09-deep',
    text: 'Deeply research the finalists with multiple signals.',
  },
  {
    id: '10-shortlist',
    text: 'Rank a shortlist of roughly five with the required scorecard.',
  },
  {
    id: '11-packages',
    text: 'Test three package promises for each top-three finalist.',
  },
  {
    id: '12-winner',
    text: 'Resolve winner status: select exactly one final topic only with at least two responsibly supported, winner-eligible finalists; otherwise return the required incomplete result.',
  },
  {
    id: '13-audit',
    text: 'Complete the output and evidence audit.',
  },
] as const;

export const WHP_PROGRESS_IDS = WHP_PROGRESS_ROWS.map(({ id }) => id);

export type WhpProgressStatus = 'pending' | 'active' | 'done' | 'unknown';

export interface ChecklistItem {
  id: string;
  status: WhpProgressStatus;
  text: string;
}

export type ChecklistState = ChecklistItem[];

export type ConsoleKind =
  | 'thread'
  | 'turn'
  | 'message'
  | 'tool'
  | 'warning'
  | 'failure'
  | 'other';

export interface ConsoleEntry {
  seq: number;
  kind: ConsoleKind;
  text: string;
}

const PROGRESS_LINE =
  /^WHP_PROGRESS\/2 (\S+) (pending|active|done|unknown) :: (.*)$/;
const KNOWN_IDS = new Set<string>(WHP_PROGRESS_IDS);
const TOOL_ITEM_TYPES = new Set([
  'command_execution',
  'file_change',
  'mcp_tool_call',
  'todo_list',
  'web_search',
]);

export function parseWhpProgress(events: readonly CodexEvent[]): ChecklistState {
  const items = new Map<string, ChecklistItem>();

  for (const event of events) {
    const parsed = event.parsed;
    if (parsed?.type !== 'item.completed') continue;
    const item = parsed.item;
    if (!item || typeof item !== 'object') continue;
    const message = item as Record<string, unknown>;
    if (message.type !== 'agent_message' || typeof message.text !== 'string') {
      continue;
    }

    for (const line of message.text.split(/\r?\n/)) {
      const match = PROGRESS_LINE.exec(line);
      if (!match) continue;
      const [, id, status, text] = match;
      items.set(id!, {
        id: id!,
        status: status as WhpProgressStatus,
        text: text!,
      });
    }
  }

  const known = WHP_PROGRESS_IDS.flatMap((id) => {
    const item = items.get(id);
    return item ? [item] : [];
  });
  const unknown = [...items.values()].filter((item) => !KNOWN_IDS.has(item.id));
  return [...known, ...unknown];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : undefined;
}

function firstString(
  record: Record<string, unknown>,
  fields: readonly string[],
  fallback: string,
): string {
  for (const field of fields) {
    if (typeof record[field] === 'string') return record[field];
  }
  return fallback;
}

export function mapConsoleEvents(
  events: readonly CodexEvent[],
): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];

  for (const event of events) {
    const parsed = event.parsed;
    if (!parsed) {
      entries.push({ seq: event.seq, kind: 'other', text: event.raw });
      continue;
    }

    if (parsed.type === 'thread.started') {
      entries.push({
        seq: event.seq,
        kind: 'thread',
        text: firstString(parsed, ['thread_id'], parsed.type),
      });
      continue;
    }

    if (parsed.type === 'turn.failed') {
      const error = asRecord(parsed.error);
      entries.push({
        seq: event.seq,
        kind: 'failure',
        text: error
          ? firstString(error, ['message'], parsed.type)
          : firstString(parsed, ['message'], parsed.type),
      });
      continue;
    }

    if (parsed.type === 'turn.started' || parsed.type === 'turn.completed') {
      entries.push({ seq: event.seq, kind: 'turn', text: parsed.type });
      continue;
    }

    if (parsed.type === 'error') {
      entries.push({
        seq: event.seq,
        kind: 'warning',
        text: firstString(parsed, ['message'], parsed.type),
      });
      continue;
    }

    if (parsed.type.startsWith('item.')) {
      const item = asRecord(parsed.item);
      const itemType = typeof item?.type === 'string' ? item.type : undefined;

      if (itemType === 'reasoning') continue;

      if (item && itemType === 'agent_message') {
        entries.push({
          seq: event.seq,
          kind: 'message',
          text: firstString(item, ['text'], itemType),
        });
        continue;
      }

      if (item && itemType === 'error') {
        entries.push({
          seq: event.seq,
          kind: 'warning',
          text: firstString(item, ['message'], itemType),
        });
        continue;
      }

      if (item && itemType && TOOL_ITEM_TYPES.has(itemType)) {
        entries.push({
          seq: event.seq,
          kind: 'tool',
          text: firstString(
            item,
            ['command', 'name', 'query', 'path', 'message'],
            itemType,
          ),
        });
        continue;
      }
    }

    entries.push({ seq: event.seq, kind: 'other', text: event.raw });
  }

  return entries;
}
