import {
  computed,
  inject,
  Inject,
  Injectable,
  signal,
} from '@angular/core';
import type {
  DaemonClient,
  DraftSummary,
  PipelineItem,
  TopicRunSummary,
} from '../api/client';
import { STUDIO_SESSION, StudioSession } from '../studio-session';

export const ONBOARDING_STORAGE_KEY = 'sc.onboarding.v1';

interface StoredOnboardingPreference {
  dismissedAt: string;
}

export interface OnboardingStep {
  id:
    | 'topic-run'
    | 'handoff'
    | 'architecture'
    | 'narration'
    | 'production';
  label: string;
  detail: string;
  done: boolean;
  href: string;
}

export interface OnboardingSnapshot {
  steps: OnboardingStep[];
  isFreshInstall: boolean;
}

export type OnboardingReadClient = Pick<
  DaemonClient,
  'listTopicRuns' | 'getPipeline' | 'list'
>;

const STAGE_ORDER = [
  'idea',
  'candidate',
  'selected',
  'architecture',
  'architecture-approved',
  'prototyping',
  'creative-approved',
  'production',
  'record-ready',
  'recorded',
  'published',
] as const;

@Injectable({ providedIn: 'root' })
export class OnboardingPreferenceService {
  private readonly dismissedAtState = signal<string | null>(
    readStoredPreference()?.dismissedAt ?? null,
  );

  readonly dismissedAt = this.dismissedAtState.asReadonly();
  readonly dismissed = computed(() => this.dismissedAtState() !== null);

  isDismissed(): boolean {
    return this.dismissed();
  }

  dismiss(): void {
    const dismissedAt = new Date().toISOString();
    this.dismissedAtState.set(dismissedAt);
    writeStoredPreference({ dismissedAt });
  }
}

@Injectable({ providedIn: 'root' })
export class OnboardingState {
  private readonly client: OnboardingReadClient;
  private readonly preference: OnboardingPreferenceService;
  private readonly stepsState = signal<OnboardingStep[]>(
    deriveSteps([], [], []),
  );
  private readonly freshInstallState = signal(false);

  readonly steps = this.stepsState.asReadonly();
  readonly isFreshInstall = this.freshInstallState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dismissed = computed(() => this.preference.isDismissed());

  constructor(
    @Inject(STUDIO_SESSION)
    source: StudioSession | OnboardingReadClient,
    preference: OnboardingPreferenceService =
      inject(OnboardingPreferenceService),
  ) {
    this.client = source instanceof StudioSession ? source.client : source;
    this.preference = preference;
  }

  async load(): Promise<OnboardingSnapshot> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [topicRuns, pipeline, drafts] = await Promise.all([
        this.client.listTopicRuns(),
        this.client.getPipeline(),
        this.client.list(),
      ]);
      const snapshot = {
        steps: deriveSteps(topicRuns, pipeline.rows, drafts),
        isFreshInstall: drafts.length === 0 && topicRuns.length === 0,
      };
      this.stepsState.set(snapshot.steps);
      this.freshInstallState.set(snapshot.isFreshInstall);
      return snapshot;
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Onboarding progress could not be loaded.',
      );
      this.freshInstallState.set(false);
      return {
        steps: this.stepsState(),
        isFreshInstall: false,
      };
    } finally {
      this.loading.set(false);
    }
  }

  async shouldAutoShow(): Promise<boolean> {
    const snapshot = await this.load();
    return snapshot.isFreshInstall && !this.preference.isDismissed();
  }

  dismiss(): void {
    this.preference.dismiss();
  }
}

function deriveSteps(
  topicRuns: readonly TopicRunSummary[],
  pipelineRows: readonly PipelineItem[],
  drafts: readonly DraftSummary[],
): OnboardingStep[] {
  const activeDraftId = pipelineRows
    .filter((row) => row.draftId !== null)
    .sort((left, right) => stageRank(right) - stageRank(left))[0]
    ?.draftId ?? drafts[0]?.id ?? null;
  const studioHref = activeDraftId === null
    ? '/'
    : `/?draft=${encodeURIComponent(activeDraftId)}`;

  return [
    {
      id: 'topic-run',
      label: 'Complete a topic run',
      detail: 'A completed durable run appears in the Topics workbench.',
      done: topicRuns.some((run) => run.state === 'completed'),
      href: '/topics',
    },
    {
      id: 'handoff',
      label: 'Hand off a selected episode',
      detail: 'A handoff creates the working draft used by Studio.',
      done: drafts.length > 0
        || pipelineRows.some((row) => stageRank(row) >= stageIndex('selected')),
      href: '/topics',
    },
    {
      id: 'architecture',
      label: 'Approve the architecture',
      detail: 'The approved stage is recorded in the episode pipeline.',
      done: pipelineRows.some(
        (row) => stageRank(row) >= stageIndex('architecture-approved'),
      ),
      href: studioHref,
    },
    {
      id: 'narration',
      label: 'Approve the narration',
      detail: 'Creative approval freezes the current complete narration.',
      done: pipelineRows.some(
        (row) => stageRank(row) >= stageIndex('creative-approved'),
      ),
      href: studioHref,
    },
    {
      id: 'production',
      label: 'Reach production',
      detail: 'Production begins after the approved narration is promoted.',
      done: pipelineRows.some(
        (row) => stageRank(row) >= stageIndex('production'),
      ),
      href: studioHref,
    },
  ];
}

function stageRank(row: PipelineItem): number {
  return Math.max(stageIndex(row.state), stageIndex(row.milestone));
}

function stageIndex(value: string | null): number {
  if (value === null) return -1;
  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-');
  return STAGE_ORDER.indexOf(
    normalized as typeof STAGE_ORDER[number],
  );
}

function readStoredPreference(): StoredOnboardingPreference | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const dismissedAt = (parsed as Record<string, unknown>)['dismissedAt'];
    return typeof dismissedAt === 'string' && dismissedAt.trim() !== ''
      ? { dismissedAt }
      : null;
  } catch {
    return null;
  }
}

function writeStoredPreference(
  preference: StoredOnboardingPreference,
): void {
  try {
    localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify(preference),
    );
  } catch {
    // The signal remains the preference source for the current browser session.
  }
}
