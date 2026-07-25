export const HELP_ROUTES = [
  '/',
  '/welcome',
  '/discover',
  '/topics',
  '/pipeline',
  '/lessons',
  '/console',
] as const;

export type HelpRoute = typeof HELP_ROUTES[number];

export interface HelpTopic {
  title: string;
  description: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const HELP_TOPICS: Record<HelpRoute, HelpTopic> = {
  '/': {
    title: 'Studio',
    description:
      'Studio opens working drafts. Its rails expose draft selection, revisions, architecture, narration controls, findings, production state, and pending milestones for the active draft.',
  },
  '/welcome': {
    title: 'Welcome',
    description:
      'Welcome explains the workbench surfaces and reads existing topic-run, pipeline, and draft state to show live first-episode progress.',
  },
  '/discover': {
    title: 'Discover',
    description:
      'Discover is a cold-start ideation surface that needs no seed idea. Supply audience and constraints, and the topic skill proposes subject-and-angle suggestions. Send ones you want to the Topics inbox, or launch a full researched run to hand off to a draft.',
  },
  '/topics': {
    title: 'Topics',
    description:
      'Topics stores captured ideas, topic operations, candidate boards, package tests, durable run history, and the explicit handoff that creates a Studio draft.',
  },
  '/pipeline': {
    title: 'Pipeline',
    description:
      'Pipeline is a read-only lifecycle board. Each card opens the working draft in Studio or the repository-backed topic material in Topics.',
  },
  '/lessons': {
    title: 'Lessons',
    description:
      'Lessons shows captured decisions, distillation runs, reviewable lesson proposals, episode-local activation, and durable reconciliation handoffs.',
  },
  '/console': {
    title: 'Console',
    description:
      'Console lists durable operations and their state, events, usage, inputs, recovery controls, and supplied lesson provenance across the workbench.',
  },
};

export const HELP_GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'beat',
    definition:
      'An addressable narration unit in a draft. Its stable ID keeps edits and production data attached to the same unit.',
  },
  {
    term: 'architecture',
    definition:
      'The stored set of named section cards for a draft, including its revision and explicit approval state.',
  },
  {
    term: 'gate',
    definition:
      'A visible workflow boundary that keeps later controls unavailable until the required workbench state exists.',
  },
  {
    term: 'package',
    definition:
      'A stored title-and-visual direction created, tested, and selected on the Topics surface.',
  },
  {
    term: 'candidate board',
    definition:
      'The saved shortlist, comparisons, package directions, and winner state from a durable topic run.',
  },
  {
    term: 'handoff',
    definition:
      'The explicit Topics action that creates a working draft and connects the selected episode to the pipeline.',
  },
  {
    term: 'promote',
    definition:
      'The production action that stages the approved narration as a production document and runs its mechanical checks.',
  },
  {
    term: 'milestone',
    definition:
      'A pending, hash-pinned repository change that becomes a commit only after explicit confirmation.',
  },
  {
    term: 'decision',
    definition:
      'A captured explicit disposition tied to the operation, revision, or workflow event where it occurred.',
  },
  {
    term: 'lesson',
    definition:
      'A reviewable proposal distilled from captured decisions, with scope, evidence, version, and application state.',
  },
  {
    term: 'reconcile',
    definition:
      'The repository process that applies an approved durable lesson to the appropriate steering or skill files outside the app.',
  },
];

export const EDITORIAL_METHOD = {
  summary:
    'The app does not contain those rules. Editorial method stays in the repository skills that own it.',
  skills: [
    {
      name: 'choosing-whp-video-topic',
      owns: 'Topic research and selection method.',
      path: '.agents/skills/choosing-whp-video-topic/SKILL.md',
    },
    {
      name: 'writing-whp-youtube-scripts',
      owns: 'WHP script ideation, drafting, review, and revision method.',
      path: '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
    },
  ],
} as const;

export function helpRoute(url: string): HelpRoute {
  const path = url.split(/[?#]/u, 1)[0]?.replace(/\/+$/u, '') || '/';
  return HELP_ROUTES.includes(path as HelpRoute)
    ? path as HelpRoute
    : '/';
}
