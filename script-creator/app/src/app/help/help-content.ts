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

export interface HelpComponent {
  id: string;
  title: string;
  summary: string;
  controls: string[];
  unlockedBy?: string;
}

export interface HelpPage {
  title: string;
  goal: string;
  components: HelpComponent[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const HELP_PAGES: Record<HelpRoute, HelpPage> = {
  '/': {
    title: 'Studio',
    goal:
      'Studio opens working drafts. Its rails expose draft selection, revisions, ' +
      'architecture, narration controls, findings, production state, and pending ' +
      'milestones for the active draft.',
    components: [
      {
        id: 'studio.drafts',
        title: 'Drafts library',
        summary:
          'Lists narration drafts and opens one into the writing surface. Opening a ' +
          'draft loads its architecture and populates the page.',
        controls: [
          'Create draft — makes a blank narration draft from a title and optional slug; an empty title is rejected.',
          'Draft card — opens that draft; the active card is highlighted.',
          'Import — brings in existing Markdown from the Revisions & transfer rail.',
        ],
      },
      {
        id: 'studio.milestones',
        title: 'Milestones',
        summary:
          'Staged Git commits for this episode’s repository, prepared by the daemon. Each ' +
          'pending milestone carries an immutable commit message, a fixed file list, and a ' +
          'diff. Nothing is committed until you confirm.',
        controls: [
          'Choose where this episode lives — repository work is blocked until a workspace exists. Pick the recommended managed branch (using the editable task name), or explicitly tick and confirm the current branch.',
          'Refresh milestones — re-fetches repository status and the pending list.',
          'Confirm this exact file list and immutable commit message — the per-milestone checkbox that arms its commit.',
          'Commit milestone — commits the staged change; enabled only after that milestone’s confirm checkbox is ticked. There is no discard button — an unconfirmed milestone simply stays pending.',
        ],
        unlockedBy:
          'A chosen workspace. Commit milestone additionally requires that milestone’s confirmation checkbox.',
      },
      {
        id: 'studio.architecture',
        title: 'Architecture',
        summary:
          'Generates, reviews, refines, and approves the episode’s section cards from the ' +
          'stored brief. A status ribbon shows whether it needs architecture, is approved, ' +
          'or is paused.',
        controls: [
          'Generate architecture — builds sections from the brief plus any supplied constraints.',
          'Review architecture — runs a review pass; needs at least one section.',
          'Accept proposal / Reject proposal — resolve a proposed section change; an optional reason can accompany it.',
          'Refine section — applies an instruction to one section.',
          'Approve architecture — locks the structure; enabled only with sections and no pending proposals.',
          'Reopen / Resume — reopen an approved architecture (narration is preserved but must be reconciled) or resume a paused approval.',
        ],
        unlockedBy:
          'Editing is disabled while an approval is locked or a saga is paused — Reopen or Resume first.',
      },
      {
        id: 'studio.narration',
        title: 'Narration actions',
        summary:
          'Turns approved architecture into whole-episode narration and moves it toward Promote.',
        controls: [
          'Generate episode — produces a whole-document proposal you accept or reject into the editor.',
          'Mark narration reconciled — clears the reconciliation requirement left by a reopen.',
          'Promote — hands the approved narration to production.',
        ],
        unlockedBy:
          'Generate episode unlocks when architecture is approved. Promote additionally needs approved narration and no pending reconciliation.',
      },
      {
        id: 'studio.editor',
        title: 'Editor',
        summary:
          'The narration editor plus its floating tools, inline agent proposals, the agent ' +
          'console, and a per-beat pacing rail. It autosaves shortly after edits.',
        controls: [
          'Selection toolbar — on a text selection: Review, Rewrite, Alternatives, a count and model picker, custom instruction, Lock, Annotate, and Flag for evidence.',
          'Inline proposal — Accept, Reject, or Re-roll a drafted replacement; conflicts show base, current, and proposed.',
          'Agent console — per-operation phase and telemetry, with Cancel and Re-roll.',
          'Pacing rail — words against target for each beat.',
        ],
        unlockedBy:
          'Editing and autosave are blocked while an architecture saga is pending (“Architecture action paused — resume or resolve first”).',
      },
      {
        id: 'studio.production',
        title: 'Production document',
        summary:
          'The staged Promote workflow: approve the complete narration, promote to Phase 2, ' +
          'and run the validator before completing.',
        controls: [
          'Clean narration — hides production-only sections in the editor.',
          'Approve complete narration — freezes the current narration; blocked by unsaved changes or an existing promotion.',
          'Production target + Promote to Phase 2 — stages the production document; needs approved narration and a non-empty target.',
          'Run validator / Complete Promote — validate the staged document; Complete unlocks only on a passing validator.',
          'Personal input queue — integrate a supplied response, then accept or reject the resulting proposal.',
        ],
        unlockedBy:
          'Each step gates the next: approve narration, then promote, then a passing validator, then complete.',
      },
      {
        id: 'studio.brief',
        title: 'Brief & approval',
        summary:
          'The factual boundary that feeds generation: topic, supplied facts, and claims the ' +
          'draft must not invent. It autosaves on change.',
        controls: [
          'Topic, Factual anchors, Open unknowns — the editable boundary fields.',
          'Creative phase — read-only here; it is set before an operation launches.',
          'Legacy direction approval — read-only; complete-narration approval lives in the Production document panel.',
        ],
      },
      {
        id: 'studio.findings',
        title: 'Review findings',
        summary:
          'A read-only, pinned list of review findings. Each shows a severity, the quoted ' +
          'anchor text, and whether it is still anchored or orphaned (its original text was ' +
          'removed). Blocking findings carry an accent border.',
        controls: [],
      },
      {
        id: 'studio.parking',
        title: 'Variants & parking',
        summary:
          'Manages unresolved alternative-variant sets and keeps discarded (parked) variants ' +
          'recoverable.',
        controls: [
          'Option button / Make active — choose which variant is active in a set.',
          'Pick active — resolves the set to the active choice; the losers move to the parked list.',
        ],
        unlockedBy:
          'Variant edits route through the editor and are ignored while narration is blocked.',
      },
      {
        id: 'studio.revisions',
        title: 'Revisions & transfer',
        summary:
          'The revision timeline with compare and restore, and the repository import/export bridge.',
        controls: [
          'Refresh — reloads the revision list; needs an active draft.',
          'Compare checkboxes — select up to two revisions to see a word-level narration diff.',
          'Restore — saves a past revision’s document as a new revision.',
          'Import draft / Choose file — load Markdown into a draft.',
          'Export active draft / Write artifact — export narration; artifact writes are limited to whp-youtube/topics/ or whp-youtube/drafts/.',
        ],
      },
    ],
  },
  '/welcome': {
    title: 'Welcome',
    goal:
      'Welcome explains the workbench surfaces and reads existing topic-run, ' +
      'pipeline, and draft state to show live first-episode progress.',
    components: [],
  },
  '/discover': {
    title: 'Discover',
    goal:
      'Discover is a cold-start ideation surface that needs no seed idea. Supply ' +
      'audience and constraints, and the topic skill proposes subject-and-angle ' +
      'suggestions. Send ones you want to the Topics inbox, or launch a full ' +
      'researched run to hand off to a draft.',
    components: [
      {
        id: 'discover.suggest',
        title: 'Suggest ideas',
        summary:
          'Cold-start ideation: proposes subjects and angles from optional constraints, with ' +
          'no seed required. Leaving the box empty is a valid cold start.',
        controls: [
          'Constraints — optional guardrails such as audience, timing, or topics to avoid.',
          'Suggest ideas — asks the topic studio for subject-and-angle cards.',
          'Send to inbox — copies a suggestion into the Topics idea inbox.',
        ],
      },
    ],
  },
  '/topics': {
    title: 'Topics',
    goal:
      'Topics stores captured ideas, topic operations, candidate boards, package ' +
      'tests, durable run history, and the explicit handoff that creates a Studio draft.',
    components: [
      {
        id: 'topics.brief',
        title: 'Repository selection brief',
        summary:
          'A read-only Markdown brief for a topic already in the repository, shown when the ' +
          'page is opened for a specific topic reference.',
        controls: [],
        unlockedBy: 'Shown only when a topic and ref are supplied in the page address.',
      },
      {
        id: 'topics.inbox',
        title: 'Idea inbox',
        summary:
          'The captured-ideas store. Capture raw hunches, mark their status, select them for ' +
          'ideation, and run a quick six-gate read.',
        controls: [
          'Capture idea — stores a hunch as an inbox card.',
          'Use for ideation — the checkbox that feeds a card into the ideate stage.',
          'Status — Open, Promoted, or Discarded (Discarded parks a card).',
          'Gate-check — runs a six-gate read for one idea and pins the verdict to the card.',
        ],
      },
      {
        id: 'topics.ideate',
        title: 'Ideate angles',
        summary:
          'Combines the checked inbox ideas with an optional fresh thread and asks the topic ' +
          'skill for subjects and angles. Each returned angle is also saved back to the inbox.',
        controls: [
          'Fresh thread — an optional extra question or constraint for this pass.',
          'Ideate angles — returns angle cards; enabled with at least one checked idea or some fresh-thread text.',
        ],
      },
    ],
  },
  '/pipeline': {
    title: 'Pipeline',
    goal:
      'Pipeline is a read-only lifecycle board. Each card opens the working draft ' +
      'in Studio or the repository-backed topic material in Topics.',
    components: [
      {
        id: 'pipeline.board',
        title: 'Production pipeline',
        summary:
          'A read-only board of every episode’s lifecycle stage across eleven columns ' +
          '(Idea, Candidate, Selected, Architecture, Architecture approved, Prototyping, ' +
          'Creative approved, Production, Record ready, Recorded, Published). Each column ' +
          'shows a live count, and the board never changes the pipeline. Each card shows an ' +
          'episode’s stage, title, slug, and source — a working Draft or repository Topic ' +
          'material.',
        controls: [
          'Open a card — opens the working draft in Studio, or the topic material in Topics, depending on the card’s source.',
        ],
      },
      {
        id: 'pipeline.diagnostics',
        title: 'Pipeline diagnostics',
        summary:
          'Notices about the pipeline file: episodes in an unrecognized state that cannot be ' +
          'placed, and per-row problems that need attention.',
        controls: [
          'Try again — reloads the pipeline after a load error.',
        ],
        unlockedBy: 'Shown only when the pipeline reports unmapped states or diagnostics.',
      },
    ],
  },
  '/lessons': {
    title: 'Lessons',
    goal:
      'Lessons shows captured decisions, distillation runs, reviewable lesson ' +
      'proposals, episode-local activation, and durable reconciliation handoffs.',
    components: [
      {
        id: 'lessons.draftpicker',
        title: 'Episode draft',
        summary:
          'Chooses which episode draft’s decisions, sessions, and lessons the page shows.',
        controls: [
          'Episode draft — selects the draft; loading its data is disabled while a load is in flight.',
        ],
      },
      {
        id: 'lessons.decisions',
        title: 'Decisions & sessions',
        summary:
          'The decision windows (sessions) and the exact decision feed for the selected draft. ' +
          'Read-only provenance.',
        controls: [],
      },
      {
        id: 'lessons.distillation',
        title: 'Distillation',
        summary:
          'Runs the read-only distillation skill over the open decision window to propose ' +
          'lessons. Neither action runs on navigation or unload.',
        controls: [
          'Distill now — snapshots the open window and proposes lessons.',
          'End session & distill — closes the current session’s cursor, then distills.',
        ],
        unlockedBy: 'Both need a selected draft and no run already in flight.',
      },
      {
        id: 'lessons.queue',
        title: 'Lesson review queue',
        summary:
          'Lesson proposals stay proposals until explicitly decided. Each card shows its ' +
          'classification (episode-local or durable), state, evidence, and provenance. Saving ' +
          'reviewed text does not approve it.',
        controls: [
          'Save review — stores edited lesson text without approving it.',
          'Approve / Reject — record the decision; each routes through a confirmation step.',
          'Predecessor lesson ID + Supersede — replace an existing lesson.',
          'Retire — retire an approved lesson; blocked while repository provenance is unresolved.',
        ],
        unlockedBy: 'Available actions depend on the card’s state, and every action confirms first.',
      },
      {
        id: 'lessons.reconcile',
        title: 'Reconcile-whp handoff',
        summary:
          'For durable lessons, the external handoff to apply doctrine in the repository. ' +
          'Script Creator does not edit or commit doctrine.',
        controls: [
          'Copy handoff — copies the prepared proposal to run externally.',
          'I started external reconciliation — marks the handoff awaiting; the repository is unchanged.',
          'Verify external commit — records the reviewed reconciliation commit hash.',
        ],
        unlockedBy: 'Appears on durable lessons that carry a reconciliation record.',
      },
    ],
  },
  '/console': {
    title: 'Console',
    goal:
      'Console lists durable operations and their state, events, usage, inputs, ' +
      'recovery controls, and supplied lesson provenance across the workbench.',
    components: [],
  },
};

export const HELP_MASTHEAD: readonly HelpComponent[] = [
  {
    id: 'masthead.nav',
    title: 'Workbench navigation',
    summary:
      'The row of surfaces that make up the workbench. Each link opens one surface; ' +
      'the active surface is underlined.',
    controls: [
      'Studio — the working draft: architecture, narration, production, and repository milestones.',
      'Discover — cold-start ideation with no seed; proposes subjects and angles.',
      'Topics — captured ideas, topic runs, candidate boards, package tests, and the handoff that creates a draft.',
      'Pipeline — a read-only board of every episode’s lifecycle stage.',
      'Lessons — captured decisions and the lesson proposals distilled from them.',
      'Console — durable operation history, telemetry, and recovery controls.',
      'Welcome — orientation and a live first-episode checklist.',
    ],
  },
  {
    id: 'masthead.model',
    title: 'Default model',
    summary:
      'Sets the default model and effort that operations use across the workbench. It ' +
      'writes the shared default preference the editor’s per-selection picker also reads.',
    controls: [
      'Default — no override; codex uses its global configuration.',
      'Sol · xhigh — gpt-5.6-sol at xhigh effort.',
      'Sol · medium — gpt-5.6-sol at medium effort.',
    ],
  },
];

export const HELP_FULLRUN: readonly HelpComponent[] = [
  {
    id: 'fullrun.launcher',
    title: 'Full topic run',
    summary:
      'Runs the topic-selection skill’s full protocol and renders its work; durable runs ' +
      'are re-selectable. The skill owns the research, gates, scoring, and recommendation — ' +
      'this surface only transports inputs and shows output.',
    controls: [
      'Refresh runs / Select run — reload durable run history and load a saved run’s snapshot; a still-running run resumes polling.',
      'Starting territory + Constraints — the run inputs; Starting territory is required.',
      'Launch full run — starts the run and polls until it finishes.',
      'Checklist and Research report — the live protocol steps and the returned report (read-only).',
    ],
  },
  {
    id: 'fullrun.shortlist',
    title: 'Shortlist',
    summary:
      'The scored candidate board from a completed run. Sort by total or any criterion; ' +
      'each candidate can carry six-gate chips.',
    controls: [
      'Column-header buttons — sort by Total, Demand, Opening, Package, Satisfaction, WHP, Evidence, or Feasibility.',
      'Test packages — start a focused package test for that candidate, one at a time.',
    ],
    unlockedBy: 'Appears only when the run produced a structured summary.',
  },
  {
    id: 'fullrun.packages',
    title: 'Packaging directions',
    summary:
      'The run’s packaging table plus the focused package tester for a finalist. Each ' +
      'saved test lists three promises and whether they survive honestly.',
    controls: [
      'Use this package — selects a winning direction from a saved test; one selection per test.',
    ],
    unlockedBy: 'The focused tester appears after Test packages is pressed on a candidate.',
  },
  {
    id: 'fullrun.handoff',
    title: 'Winner & handoff',
    summary:
      'The winner card and the acceptance-gate handoff that creates a Studio draft. ' +
      'Handoffs are durable and resumable.',
    controls: [
      'Preview handoff — prepares the selected-topic brief; needs a winner with subject and angle.',
      'Confirm handoff — creates the draft, writes the brief, records the pipeline milestone, promotes the idea, and opens the draft in Studio.',
      'Resume handoff — continues an incomplete handoff from its stored state.',
    ],
    unlockedBy: 'Requires a selected durable run before confirming.',
  },
];

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

export function findHelpComponent(id: string): HelpComponent | undefined {
  for (const route of HELP_ROUTES) {
    const hit = HELP_PAGES[route].components.find((component) => component.id === id);
    if (hit) return hit;
  }
  return (
    HELP_MASTHEAD.find((component) => component.id === id)
    ?? HELP_FULLRUN.find((component) => component.id === id)
  );
}

export function helpRoute(url: string): HelpRoute {
  const path = url.split(/[?#]/u, 1)[0]?.replace(/\/+$/u, '') || '/';
  return HELP_ROUTES.includes(path as HelpRoute)
    ? path as HelpRoute
    : '/';
}
