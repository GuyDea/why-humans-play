export interface WelcomeStage {
  name: 'Topic' | 'Architecture' | 'Narration' | 'Production' | 'Milestone';
  description: string;
}

export interface WelcomePrinciple {
  title: string;
  description: string;
}

export const WELCOME_STAGES: readonly WelcomeStage[] = [
  {
    name: 'Topic',
    description:
      'Topics keeps ideas, durable topic runs, package tests, and the handoff into Studio.',
  },
  {
    name: 'Architecture',
    description:
      'Architecture keeps the draft section cards and the explicit architecture approval.',
  },
  {
    name: 'Narration',
    description:
      'Studio keeps narration edits, proposals, findings, revisions, and creative approval.',
  },
  {
    name: 'Production',
    description:
      'Production assembles and validates the production document before promotion.',
  },
  {
    name: 'Milestone',
    description:
      'A milestone is an explicit repository write and commit action that you confirm.',
  },
];

export const WELCOME_PRINCIPLES: readonly WelcomePrinciple[] = [
  {
    title: 'Nothing commits without you',
    description:
      'Working state persists in the local workbench. Repository writes and commits happen only through an explicit action you confirm.',
  },
  {
    title: 'Editorial method stays in the skills',
    description:
      'Script Creator shows workflow state and controls. It does not contain the editorial rules owned by the repository skills.',
  },
  {
    title: 'Decisions become lessons you approve',
    description:
      'Explicit decisions can become lesson proposals. You review any lesson and approve its application before it becomes durable.',
  },
];

export const WELCOME_SKILL_POINTERS = [
  {
    name: 'choosing-whp-video-topic',
    purpose: 'Owns the method for researching and selecting a video topic.',
    path: '.agents/skills/choosing-whp-video-topic/SKILL.md',
  },
  {
    name: 'writing-whp-youtube-scripts',
    purpose: 'Owns the method for drafting and revising WHP scripts.',
    path: '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
  },
] as const;
