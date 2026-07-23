#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mode = process.env.FAKE_CODEX_MODE ?? 'happy';
const argv = process.argv.slice(2);
const oIdx = argv.indexOf('-o');
const outFile = oIdx >= 0 ? argv[oIdx + 1] : null;
const resumeIdx = argv.indexOf('resume');
const resumeId = resumeIdx >= 0 ? argv[resumeIdx + 1] : null;
const schemaIdx = argv.indexOf('--output-schema');
const hasSchema = schemaIdx >= 0;
const schemaFile = hasSchema ? argv[schemaIdx + 1] : null;
let attemptMode = mode;
if (mode === 'slow-operation-schema') attemptMode = 'operation-schema';
if (
  mode === 'invalid-schema-once'
  || mode === 'invalid-schema-then-hang'
) {
  const marker = process.env.FAKE_CODEX_ATTEMPT_FILE;
  if (!marker) throw new Error(`${mode} requires FAKE_CODEX_ATTEMPT_FILE`);
  if (existsSync(marker)) {
    attemptMode = mode === 'invalid-schema-once'
      ? 'operation-schema'
      : 'hang';
  } else {
    writeFileSync(marker, 'first attempt failed schema validation');
    attemptMode = 'bad-schema-output';
  }
}

const fixture = join(import.meta.dirname, 'fixtures',
  mode === 'turn-failed'
    ? 'events-failed.jsonl'
    : hasSchema ? 'events-schema.jsonl' : 'events-plain.jsonl');
let lines = readFileSync(fixture, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

if (mode === 'full-topic-run') lines = fullTopicRunEvents();
if (resumeId) lines = lines.map((e) => e.type === 'thread.started' ? { ...e, thread_id: resumeId } : e);
if (mode === 'no-usage') lines = lines.map((e) => e.type === 'turn.completed' ? { type: 'turn.completed' } : e);
if (mode === 'partial-usage') {
  lines = lines.map((e) => e.type === 'turn.completed'
    ? { type: 'turn.completed', usage: { input_tokens: e.usage.input_tokens } }
    : e);
}
if (attemptMode === 'bad-schema-output') {
  lines = lines.map((e) =>
    e.type === 'item.completed' && e.item?.type === 'agent_message'
      ? { ...e, item: { ...e.item, text: '{"unexpected":true}' } } : e);
}
if (hasSchema && attemptMode !== 'bad-schema-output') {
  if (!schemaFile) throw new Error('--output-schema requires a schema file');
  const schema = JSON.parse(readFileSync(schemaFile, 'utf8'));
  const output = synthesizeSchema(schema);
  if (attemptMode === 'operation-guardrail') {
    output.status = process.env.FAKE_OPERATION_STATUS ?? 'declined';
    output.guardrail_markdown = 'This request crosses the approved scope.';
    if ('replacement_markdown' in output) output.replacement_markdown = '';
  }
  lines = lines.map((e) =>
    e.type === 'item.completed' && e.item?.type === 'agent_message'
      ? {
          ...e,
          item: {
            ...e.item,
            text: JSON.stringify(output),
          },
        }
      : e);
}

process.stdin.on('data', () => {});
process.stdin.resume();

if (mode === 'surviving-descendant') {
  const readyFile = join(tmpdir(), `fake-descendant-${process.pid}-${Date.now()}`);
  const descendant = spawn(process.execPath, [
    '--input-type=module',
    '-e',
    "import { writeFileSync } from 'node:fs'; process.on('SIGINT', () => {}); writeFileSync(process.argv[1], 'ready'); setInterval(() => {}, 60000)",
    readyFile,
  ], { stdio: 'ignore' });
  const readyDeadline = Date.now() + 5000;
  while (!existsSync(readyFile)) {
    if (Date.now() > readyDeadline) throw new Error('descendant did not become ready');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  unlinkSync(readyFile);
  descendant.unref();
}

const finalText = () => {
  const msgs = lines.filter((e) => e.type === 'item.completed' && e.item?.type === 'agent_message');
  return msgs.length ? msgs[msgs.length - 1].item.text : '';
};

const lateUsage = mode === 'late-usage'
  ? lines.find((e) => e.type === 'turn.completed')
  : undefined;
if (lateUsage) lines = lines.filter((e) => e !== lateUsage);

if (mode === 'ignore-sigint') process.on('SIGINT', () => {});
const delay = mode === 'slow' || mode === 'slow-operation-schema'
  ? 400
  : mode === 'full-topic-run' ? 100 : 10;
let emitted = 0;
for (const e of lines) {
  writeSync(process.stdout.fd, JSON.stringify(e) + '\n');
  emitted += 1;
  if (mode === 'malformed-json' && emitted === 2) writeSync(process.stdout.fd, '{broken\n');
  if (attemptMode === 'hang' && emitted === 2) { setInterval(() => {}, 60_000); await new Promise(() => {}); }
  await new Promise((r) => setTimeout(r, delay));
  if (mode === 'ignore-sigint' && emitted === 2) {
    await new Promise((r) => setTimeout(r, 60_000)); // survives SIGINT; SIGKILL only
  }
  if (mode === 'surviving-descendant' && emitted === 2) {
    await new Promise((r) => setTimeout(r, 60_000)); // parent exits on SIGINT; descendant does not
  }
}
if (outFile) writeFileSync(outFile, finalText());
if (lateUsage) {
  const writer = spawn(process.execPath, [
    '--input-type=module',
    '-e',
    "import { writeSync } from 'node:fs'; setTimeout(() => writeSync(1, process.argv[1] + '\\n'), 300)",
    JSON.stringify(lateUsage),
  ], { detached: true, stdio: ['ignore', process.stdout, 'ignore'] });
  writer.unref();
}
process.exit(0);

function fullTopicRunEvents() {
  const steps = [
    ['01-frame', 'Record the decision frame and current WHP context.'],
    ['02-mode', 'Select and state the evidence mode.'],
    ['03-signals', 'Collect independent audience-demand, competitive-supply, and timing signals.'],
    ['04-pool', 'Record at least 30 distinct, diverse subjects before ranking.'],
    ['05-angles', 'Develop materially different angles for promising subjects.'],
    ['06-proof-cases', 'Identify a first-hearing opening proof case and any needed current echo for each finalist.'],
    ['07-gates', 'Audit every advancing angle against all six hard gates.'],
    ['08-shallow', 'Run a shallow scan and narrow to roughly 8–12 candidates.'],
    ['09-deep', 'Deeply research the finalists with multiple signals.'],
    ['10-shortlist', 'Rank a shortlist of roughly five with the required scorecard.'],
    ['11-packages', 'Test three package promises for each top-three finalist.'],
    ['12-winner', 'Resolve winner status: select exactly one final topic only with at least two responsibly supported, winner-eligible finalists; otherwise return the required incomplete result.'],
    ['13-audit', 'Complete the output and evidence audit.'],
  ];
  const event = (text) => ({
    type: 'item.completed',
    item: { type: 'agent_message', text },
  });
  const events = [
    { type: 'thread.started', thread_id: 'fake-full-topic-thread' },
    { type: 'turn.started' },
    event(steps.map(([id, text]) =>
      `WHP_PROGRESS/2 ${id} pending :: ${text}`).join('\n')),
  ];

  for (const [id, text] of steps) {
    events.push(
      event(`WHP_PROGRESS/2 ${id} active :: ${text}`),
      {
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: `fake-topic-step ${id}`,
          exit_code: 0,
        },
      },
      event(`WHP_PROGRESS/2 ${id} done :: ${text}`),
    );
  }

  events.push(
    event(fullTopicReport()),
    {
      type: 'turn.completed',
      usage: {
        input_tokens: 24000,
        cached_input_tokens: 12000,
        output_tokens: 3600,
        reasoning_output_tokens: 1800,
      },
    },
  );
  return events;
}

function fullTopicReport() {
  const gates = (subject) => [
    {
      gate: 'game_play_centrality',
      verdict: 'pass',
      reason_markdown: `${subject} uses a game mechanic as the explanatory core.`,
    },
    {
      gate: 'human_revelation',
      verdict: 'pass',
      reason_markdown: `${subject} reveals a recognizable human choice.`,
    },
    {
      gate: 'recognized_payoff',
      verdict: 'pass',
      reason_markdown: 'The intended viewer can state the earned takeaway.',
    },
    {
      gate: 'evidence_path',
      verdict: 'pass',
      reason_markdown: 'The fake fixture records multiple independent signals.',
    },
    {
      gate: 'production_reality',
      verdict: 'pass',
      reason_markdown: 'The central mechanism has a filmable visual form.',
    },
    {
      gate: 'portfolio_fit',
      verdict: 'pass',
      reason_markdown: 'The fake fixture does not overlap a committed episode.',
    },
  ];
  const candidates = [
    {
      subject: 'The Queue Game',
      angle_markdown: 'How waiting lines turn patience into a strategic choice.',
      gates: gates('The Queue Game'),
      disposition: 'deep-research finalist',
    },
    {
      subject: 'Rules That Travel',
      angle_markdown: 'Why a few portable constraints can make a puzzle spread.',
      gates: gates('Rules That Travel'),
      disposition: 'deep-research finalist',
    },
    {
      subject: 'The Workplace Scoreboard',
      angle_markdown: 'What visible targets change about cooperation at work.',
      gates: gates('The Workplace Scoreboard'),
      disposition: 'deep-research finalist',
    },
  ];
  const shortlist = [
    {
      rank: 1,
      subject: candidates[0].subject,
      angle_markdown: candidates[0].angle_markdown,
      scores: {
        demand: { score: 21, grade: 'A' },
        opening: { score: 13, grade: 'A' },
        package: { score: 17, grade: 'B' },
        satisfaction: { score: 13, grade: 'A' },
        whp: { score: 9, grade: 'A' },
        evidence: { score: 9, grade: 'A' },
        feasibility: { score: 5, grade: 'A' },
      },
      total: 87,
      confidence: 'high',
      decisive_risk_markdown: 'The opening must make the strategic choice visible immediately.',
    },
    {
      rank: 2,
      subject: candidates[1].subject,
      angle_markdown: candidates[1].angle_markdown,
      scores: {
        demand: { score: 18, grade: 'B' },
        opening: { score: 12, grade: 'B' },
        package: { score: 16, grade: 'B' },
        satisfaction: { score: 12, grade: 'B' },
        whp: { score: 9, grade: 'A' },
        evidence: { score: 8, grade: 'B' },
        feasibility: { score: 5, grade: 'A' },
      },
      total: 80,
      confidence: 'medium',
      decisive_risk_markdown: 'The familiar puzzle may overpower the human revelation.',
    },
    {
      rank: 3,
      subject: candidates[2].subject,
      angle_markdown: candidates[2].angle_markdown,
      scores: {
        demand: { score: 16, grade: 'B' },
        opening: { score: 10, grade: 'B' },
        package: { score: 14, grade: 'B' },
        satisfaction: { score: 12, grade: 'B' },
        whp: { score: 8, grade: 'B' },
        evidence: { score: 8, grade: 'B' },
        feasibility: { score: 5, grade: 'A' },
      },
      total: 73,
      confidence: 'medium',
      decisive_risk_markdown: 'The framing could become an abstract management lecture.',
    },
  ];
  const packages = [
    {
      finalist: 'The Queue Game',
      direction: 'Every line is a game',
      working_title: 'The Secret Game You Play in Every Queue',
      intended_viewer: 'Anyone who has chosen the apparently faster line',
      familiar_markdown: 'The everyday choice between two queues.',
      surprise_markdown: 'Everyone choosing strategically can make the system worse.',
      visual_promise_markdown: 'Two animated lines repeatedly overtaking each other.',
      delivered_payoff_markdown: 'A practical way to see the incentives hidden in waiting.',
      survives_honestly: true,
      reason_markdown: 'The episode directly demonstrates the promised strategic trap.',
    },
    {
      finalist: 'The Queue Game',
      direction: 'Why the other line wins',
      working_title: 'Why the Other Line Always Moves Faster',
      intended_viewer: 'People drawn to counterintuitive everyday explanations',
      familiar_markdown: 'The frustration of watching another line move.',
      surprise_markdown: 'Attention and switching distort the remembered result.',
      visual_promise_markdown: 'One person switching between diverging queue paths.',
      delivered_payoff_markdown: 'Why the losing-line feeling is powerful but misleading.',
      survives_honestly: true,
      reason_markdown: 'The evidence can support the perception claim without overpromising.',
    },
    {
      finalist: 'The Queue Game',
      direction: 'Designing fair waits',
      working_title: 'Can You Design a Fair Queue?',
      intended_viewer: 'Viewers interested in systems and fairness',
      familiar_markdown: 'The single line and the many-line checkout.',
      surprise_markdown: 'Faster and fairer are different design goals.',
      visual_promise_markdown: 'Competing queue layouts filling and draining.',
      delivered_payoff_markdown: 'How queue rules trade speed, choice, and perceived fairness.',
      survives_honestly: false,
      reason_markdown: 'The design survey is broader than the strongest episode angle.',
    },
    ...shortlist.slice(1).flatMap((finalist) =>
      Array.from({ length: 3 }, (_, index) => ({
        finalist: finalist.subject,
        direction: `${['Origins', 'Human stakes', 'Design test'][index]} direction`,
        working_title: `${finalist.subject}: ${['Where It Came From', 'The Human Game', 'Can the Rules Change?'][index]}`,
        intended_viewer: 'Curious viewers who recognize the underlying situation',
        familiar_markdown: `A familiar entry point for ${finalist.subject}.`,
        surprise_markdown: `Direction ${index + 1} exposes a distinct tension.`,
        visual_promise_markdown: `A filmable comparison for direction ${index + 1}.`,
        delivered_payoff_markdown: `A bounded payoff for ${finalist.subject}.`,
        survives_honestly: index !== 2,
        reason_markdown: index === 2
          ? 'The broadest direction outruns the strongest available evidence.'
          : 'The available evidence can deliver this direction honestly.',
      }))),
  ];
  const summary = {
    candidates,
    shortlist,
    packages,
    winner: {
      decision_status: 'winner-selected',
      subject: 'The Queue Game',
      angle_markdown: 'How waiting lines turn patience into a strategic choice.',
      confidence: 'high',
      why_now_markdown: 'It is an evergreen, instantly recognizable entry point.',
      strongest_package_markdown: 'The Secret Game You Play in Every Queue.',
    },
  };

  return [
    '# Fake WHP next-video recommendation',
    '',
    'This deterministic report exercises Topic Studio without making a real editorial decision.',
    '',
    '```whp-summary',
    JSON.stringify(summary, null, 2),
    '```',
  ].join('\n');
}

function synthesizeSchema(schema, propertyName = '', itemIndex = 0) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`cannot synthesize schema property ${propertyName || '<root>'}`);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    if (propertyName === 'status' && schema.enum.includes('complete')) {
      return 'complete';
    }
    return schema.enum[itemIndex % schema.enum.length];
  }

  if (
    Array.isArray(schema.type)
    && schema.type.length === 2
    && schema.type.includes('string')
    && schema.type.includes('null')
  ) {
    return null;
  }

  switch (schema.type) {
    case 'object': {
      const properties = schema.properties;
      const required = Array.isArray(schema.required) ? schema.required : [];
      if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
        throw new Error(`object schema property ${propertyName || '<root>'} has no properties`);
      }
      return Object.fromEntries(required.map((name) => [
        name,
        synthesizeSchema(properties[name], name, itemIndex),
      ]));
    }
    case 'array': {
      const count = Number.isInteger(schema.minItems) && schema.minItems >= 0
        ? schema.minItems
        : 1;
      return Array.from(
        { length: count },
        (_, index) => synthesizeSchema(schema.items, propertyName, index),
      );
    }
    case 'string':
      return propertyName === 'replacement_markdown'
        ? 'Rewritten passage.'
        : `Fake ${propertyName}.`;
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return false;
    case 'null':
      return null;
    default:
      throw new Error(
        `unsupported schema type for property ${propertyName || '<root>'}`,
      );
  }
}
