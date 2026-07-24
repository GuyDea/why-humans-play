export interface GenerateArchitectureContext<
  TopicBrief = unknown,
  ApprovedLessons = unknown,
  UserConstraints = unknown,
> {
  topicBrief: TopicBrief;
  approvedLessons: ApprovedLessons;
  userConstraints: UserConstraints;
}

export interface GenerateArchitectureInputs<
  TopicBrief = unknown,
  ApprovedLessons = unknown,
  UserConstraints = unknown,
> {
  topic_brief: TopicBrief;
  approved_lessons: ApprovedLessons;
  user_constraints: UserConstraints;
}

export interface ReviewArchitectureContext<TopicBrief = unknown> {
  architectureMd: string;
  topicBrief: TopicBrief;
}

export interface ReviewArchitectureInputs<TopicBrief = unknown> {
  architecture_md: string;
  topic_brief: TopicBrief;
}

export interface RewriteArchitectureContext<TopicBrief = unknown> {
  sectionKey: string;
  sectionMarkdown: string;
  architectureMd: string;
  topicBrief: TopicBrief;
  userInstruction: string;
}

export interface RewriteArchitectureInputs<TopicBrief = unknown> {
  section_key: string;
  section_markdown: string;
  architecture_md: string;
  topic_brief: TopicBrief;
  user_instruction: string;
}

export function buildGenerateArchitectureInputs<
  TopicBrief,
  ApprovedLessons,
  UserConstraints,
>(
  context: GenerateArchitectureContext<
    TopicBrief,
    ApprovedLessons,
    UserConstraints
  >,
): GenerateArchitectureInputs<
  TopicBrief,
  ApprovedLessons,
  UserConstraints
> {
  return {
    topic_brief: context.topicBrief,
    approved_lessons: context.approvedLessons,
    user_constraints: context.userConstraints,
  };
}

export function buildReviewArchitectureInputs<TopicBrief>(
  context: ReviewArchitectureContext<TopicBrief>,
): ReviewArchitectureInputs<TopicBrief> {
  return {
    architecture_md: context.architectureMd,
    topic_brief: context.topicBrief,
  };
}

export function buildRewriteArchitectureInputs<TopicBrief>(
  context: RewriteArchitectureContext<TopicBrief>,
): RewriteArchitectureInputs<TopicBrief> {
  return {
    section_key: context.sectionKey,
    section_markdown: context.sectionMarkdown,
    architecture_md: context.architectureMd,
    topic_brief: context.topicBrief,
    user_instruction: context.userInstruction,
  };
}
