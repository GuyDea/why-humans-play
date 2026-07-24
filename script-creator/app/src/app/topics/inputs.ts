export interface TopicOperationContext<
  UserConstraints = unknown,
  RunArtifacts = unknown,
  SelectedWinner = unknown,
> {
  ideaText: string;
  userConstraints: UserConstraints;
  runArtifacts: RunArtifacts;
  selectedWinner: SelectedWinner;
}

export type TopicOperation =
  | 'ideate'
  | 'quick-gate-check'
  | 'package-test'
  | 'full-topic-run'
  | 'handoff-preview';

export interface IdeaOperationInputs<UserConstraints = unknown> {
  idea_text: string;
  user_constraints: UserConstraints;
}

export interface PackageTestInputs<
  UserConstraints = unknown,
  RunArtifacts = unknown,
> extends IdeaOperationInputs<UserConstraints> {
  run_artifacts: RunArtifacts;
}

export interface FullTopicRunInputs<UserConstraints = unknown>
  extends IdeaOperationInputs<UserConstraints> {
  progress_transport: 'WHP_PROGRESS/3';
  summary_transport: 'fenced-whp-summary';
}

export interface HandoffPreviewInputs<
  RunArtifacts = unknown,
  SelectedWinner = unknown,
> {
  selected_winner: SelectedWinner;
  run_artifacts: RunArtifacts;
}

export type TopicOperationInputs<
  UserConstraints = unknown,
  RunArtifacts = unknown,
  SelectedWinner = unknown,
> =
  | IdeaOperationInputs<UserConstraints>
  | PackageTestInputs<UserConstraints, RunArtifacts>
  | FullTopicRunInputs<UserConstraints>
  | HandoffPreviewInputs<RunArtifacts, SelectedWinner>;

export function buildTopicOperationInputs<
  UserConstraints,
  RunArtifacts,
  SelectedWinner,
>(
  context: TopicOperationContext<
    UserConstraints,
    RunArtifacts,
    SelectedWinner
  >,
  operation: 'ideate' | 'quick-gate-check',
): IdeaOperationInputs<UserConstraints>;
export function buildTopicOperationInputs<
  UserConstraints,
  RunArtifacts,
  SelectedWinner,
>(
  context: TopicOperationContext<
    UserConstraints,
    RunArtifacts,
    SelectedWinner
  >,
  operation: 'package-test',
): PackageTestInputs<UserConstraints, RunArtifacts>;
export function buildTopicOperationInputs<
  UserConstraints,
  RunArtifacts,
  SelectedWinner,
>(
  context: TopicOperationContext<
    UserConstraints,
    RunArtifacts,
    SelectedWinner
  >,
  operation: 'full-topic-run',
): FullTopicRunInputs<UserConstraints>;
export function buildTopicOperationInputs<
  UserConstraints,
  RunArtifacts,
  SelectedWinner,
>(
  context: TopicOperationContext<
    UserConstraints,
    RunArtifacts,
    SelectedWinner
  >,
  operation: 'handoff-preview',
): HandoffPreviewInputs<RunArtifacts, SelectedWinner>;
export function buildTopicOperationInputs<
  UserConstraints,
  RunArtifacts,
  SelectedWinner,
>(
  context: TopicOperationContext<
    UserConstraints,
    RunArtifacts,
    SelectedWinner
  >,
  operation: TopicOperation,
): TopicOperationInputs<UserConstraints, RunArtifacts, SelectedWinner>;
export function buildTopicOperationInputs(
  context: TopicOperationContext,
  operation: TopicOperation,
): TopicOperationInputs {
  switch (operation) {
    case 'ideate':
    case 'quick-gate-check':
      return {
        idea_text: context.ideaText,
        user_constraints: context.userConstraints,
      };
    case 'package-test':
      return {
        idea_text: context.ideaText,
        user_constraints: context.userConstraints,
        run_artifacts: context.runArtifacts,
      };
    case 'full-topic-run':
      return {
        idea_text: context.ideaText,
        user_constraints: context.userConstraints,
        progress_transport: 'WHP_PROGRESS/3',
        summary_transport: 'fenced-whp-summary',
      };
    case 'handoff-preview':
      return {
        selected_winner: context.selectedWinner,
        run_artifacts: context.runArtifacts,
      };
  }
}
