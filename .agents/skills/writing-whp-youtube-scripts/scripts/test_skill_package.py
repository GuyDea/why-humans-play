from __future__ import annotations

import hashlib
import re
import unittest
from pathlib import Path

from validate_script_pair import resolve_pair, validate_pair


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL_MD = SKILL_ROOT / "SKILL.md"
ARCHITECTURE_MD = SKILL_ROOT / "references/script-architecture.md"
STORY_METHOD_MD = SKILL_ROOT / "references/story-and-hook-method.md"
RAPID_MD = SKILL_ROOT / "references/rapid-prototyping.md"
PAIR_METHOD_MD = SKILL_ROOT / "references/script-artifact-pair.md"
BLUEPRINT_WORKFLOW_MD = SKILL_ROOT / "references/script-blueprint-workflow.md"
FORMAT_MD = SKILL_ROOT / "references/annotated-script-format.md"
RUBRIC_MD = SKILL_ROOT / "references/quality-rubric.md"
TEMPLATE_MD = SKILL_ROOT / "assets/annotated-script-template.md"
STEERING_MD = REPO_ROOT / "whp-youtube" / "STEERING.md"
EPISODE_ONE_DESIGN_MD = (
    REPO_ROOT
    / "docs"
    / "superpowers"
    / "specs"
    / "2026-07-27-episode-1-story-rebuild-design.md"
)
EPISODE_ONE_PROGRESSION_MD = (
    REPO_ROOT
    / "docs"
    / "superpowers"
    / "plans"
    / "2026-07-27-episode-1-v2-story-progression.md"
)
AGENTS_MD = REPO_ROOT / "AGENTS.md"
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"
RECONCILE_MD = REPO_ROOT / ".agents" / "skills" / "reconcile-whp" / "SKILL.md"
CLAUDE_LINK = REPO_ROOT / ".claude" / "skills" / SKILL_ROOT.name
PAIR_EVIDENCE_RE = re.compile(r"\s*\[F-\d{3}\]\([^)]+\)")
PAIR_STORY_MARKUP_RE = re.compile(r"</?u>|\*{1,3}")

PAIR_CONSUMER_PATHS = {
    "skill": SKILL_MD,
    "blueprint": BLUEPRINT_WORKFLOW_MD,
    "rapid": RAPID_MD,
    "story": STORY_METHOD_MD,
    "rubric": RUBRIC_MD,
    "steering": STEERING_MD,
}
PAIR_OWNER_LINKS = {
    "skill": "(references/script-artifact-pair.md)",
    "blueprint": "(script-artifact-pair.md)",
    "rubric": "(script-artifact-pair.md)",
    "steering": (
        "(../.agents/skills/writing-whp-youtube-scripts/"
        "references/script-artifact-pair.md)"
    ),
}
ACTIVE_DOCUMENT_PATHS = {
    "agents": AGENTS_MD,
    "claude": CLAUDE_MD,
    "reconcile": RECONCILE_MD,
    "pair": PAIR_METHOD_MD,
    **PAIR_CONSUMER_PATHS,
}


def normalize_text(text: str) -> str:
    return " ".join(text.split())


def read_documents(
    paths: dict[str, Path], *, normalized: bool = False
) -> dict[str, str]:
    documents = {
        name: path.read_text(encoding="utf-8")
        for name, path in paths.items()
    }
    if normalized:
        return {
            name: normalize_text(text)
            for name, text in documents.items()
        }
    return documents


def pair_consumer_documents(*, normalized: bool = False) -> dict[str, str]:
    return read_documents(PAIR_CONSUMER_PATHS, normalized=normalized)


def active_workflow_documents(*, normalized: bool = False) -> dict[str, str]:
    documents = read_documents(ACTIVE_DOCUMENT_PATHS)
    documents["steering"] = documents["steering"].split("\n# PART 2", 1)[0]
    if normalized:
        return {
            name: normalize_text(text)
            for name, text in documents.items()
        }
    return documents


def markdown_section(text: str, heading: str) -> str:
    marker = f"{heading}\n"
    remainder = text.split(marker, 1)[1]
    level = len(heading) - len(heading.lstrip("#"))
    next_heading = re.search(rf"(?m)^#{{1,{level}}} ", remainder)
    if next_heading:
        return remainder[: next_heading.start()]
    return remainder


def spoken_digest(path: Path) -> str:
    spoken = " ".join(
        line[1:].lstrip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.startswith(">")
    )
    spoken = PAIR_EVIDENCE_RE.sub("", spoken)
    spoken = PAIR_STORY_MARKUP_RE.sub("", spoken)
    normalized = " ".join(spoken.split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class SkillPackageTests(unittest.TestCase):
    def test_active_episode_one_routes_only_to_episode_first_artifacts(self) -> None:
        active_episode_one_documents = read_documents(
            {
                "steering": STEERING_MD,
                "design": EPISODE_ONE_DESIGN_MD,
                "progression": EPISODE_ONE_PROGRESSION_MD,
            }
        )

        for retired_path in (
            "whp-youtube/"
            "predrafts/",
            "whp-youtube/drafts/"
            "ep1_v2.md",
            "episodes/01-why-ai-"
            "makes-bad-advice-feel-right.md",
        ):
            for document_name, document in active_episode_one_documents.items():
                with self.subTest(
                    document=document_name,
                    retired_path=retired_path,
                ):
                    self.assertNotIn(retired_path, document)

        active_text = "\n".join(active_episode_one_documents.values())
        for current_path in (
            "episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md",
            "episodes/ep001-ai-dangerous-advice/final/script.extended.md",
        ):
            with self.subTest(current_path=current_path):
                self.assertIn(current_path, active_text)

    def test_episode_one_legacy_artifacts_are_archived_byte_for_byte(self) -> None:
        archive = (
            REPO_ROOT
            / "whp-youtube"
            / "episodes"
            / "ep001-ai-dangerous-advice"
            / "archive"
        )
        expected = {
            "throughline-experiment.md": (
                "c203c1bca16707a4ebd331d612d02fddaa38ec7ec2c1d0baa9580b96453c89b3"
            ),
            "full-prototype.md": (
                "4a8761e823173ee391240205b0580b5a94096a29fa7226d6ead0b675a65c08ed"
            ),
            "v2-preworkflow-narration.md": (
                "dd2e7074bc321673077dae213caf350e5698c25dd3bfce52b3153ee0c2bbf5d1"
            ),
        }
        for name, digest in expected.items():
            with self.subTest(name=name):
                self.assertEqual(
                    hashlib.sha256((archive / name).read_bytes()).hexdigest(),
                    digest,
                )

    def test_episode_one_final_pair_is_valid_and_old_path_is_retired(self) -> None:
        final = (
            REPO_ROOT
            / "whp-youtube"
            / "episodes"
            / "ep001-ai-dangerous-advice"
            / "final"
        )
        self.assertTrue((final / "script.raw.md").is_file())
        self.assertTrue((final / "script.extended.md").is_file())
        self.assertFalse(
            (
                REPO_ROOT
                / "whp-youtube"
                / "episodes"
                / "01-why-ai-makes-bad-advice-feel-right.md"
            ).exists()
        )
        self.assertEqual(validate_pair(resolve_pair(final)), [])
        self.assertEqual(
            spoken_digest(final / "script.raw.md"),
            "eeb641adbe95ac6d5d2c12a606973d63488dfa9fc4e9ea0c55eb385016e1b07d",
        )

    def test_episode_one_blueprint_pair_is_valid(self) -> None:
        stage = (
            REPO_ROOT
            / "whp-youtube"
            / "episodes"
            / "ep001-ai-dangerous-advice"
            / "blueprint"
        )
        self.assertTrue((stage / "script.raw.md").is_file())
        self.assertTrue((stage / "script.extended.md").is_file())
        self.assertEqual(validate_pair(resolve_pair(stage)), [])
        self.assertEqual(
            spoken_digest(stage / "script.raw.md"),
            "2aab7032779db2d5c94ee24379588902c4c9d8804830840e1b0a00d5958ce2a1",
        )

    def test_episode_blueprint_contract_is_intro_first(self) -> None:
        skill = SKILL_MD.read_text(encoding="utf-8")
        normalized = " ".join(skill.split())

        for required in (
            "A Script Blueprint is not a rough full script.",
            "one polished spoken intro",
            "one bullet-only body logic map",
            "Do not draft body narration in a Script Blueprint.",
            "No independent AI review is required during this stage",
        ):
            with self.subTest(required=required):
                self.assertIn(required, normalized)

        self.assertNotIn(
            "For a Script Blueprint, return the requested architecture, narration, passage",
            normalized,
        )

    def test_blueprint_workflow_owns_shape_and_drift_guards(self) -> None:
        workflow = " ".join(
            BLUEPRINT_WORKFLOW_MD.read_text(encoding="utf-8").split()
        )
        skill = SKILL_MD.read_text(encoding="utf-8")
        steering = STEERING_MD.read_text(encoding="utf-8")

        self.assertIn("script-blueprint-workflow.md", skill)
        self.assertIn("script-blueprint-workflow.md", steering)

        required = (
            "What the viewer learns",
            "Why this beat comes here",
            "Incoming transition",
            "Outgoing transition",
            "Promise or loop payoff",
            "consider the complete applicable technique inventory",
            "evidence-earned",
            "No independent AI review is required during this stage",
        )
        for phrase in required:
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, workflow)

        for retired_gate in (
            "strongest available independent model",
            "REVIEW-BLOCKED",
            "independent local-AI review",
        ):
            with self.subTest(retired_gate=retired_gate):
                self.assertNotIn(retired_gate, workflow)
                self.assertNotIn(retired_gate, skill)
                self.assertNotIn(retired_gate, steering)

    def test_blueprint_intro_promises_must_map_to_body_payoffs(self) -> None:
        workflow = BLUEPRINT_WORKFLOW_MD.read_text(encoding="utf-8")
        normalized = " ".join(workflow.split())

        self.assertIn(
            "Every promise, question, and open loop in the intro must point to a named "
            "payoff in the body logic map.",
            normalized,
        )
        self.assertIn(
            "narrow or remove the opening promise before polishing it",
            normalized,
        )

    def test_script_artifact_pair_is_the_single_detailed_owner(self) -> None:
        self.assertTrue(PAIR_METHOD_MD.is_file())
        self.assertTrue(BLUEPRINT_WORKFLOW_MD.is_file())

        pair = normalize_text(PAIR_METHOD_MD.read_text(encoding="utf-8"))
        consumers = pair_consumer_documents(normalized=True)
        contracts = (
            "## Episode-first directory contract",
            "## Raw script contract",
            "## Extended script contract",
            "## Storytelling markup",
            "## Stage appendices",
            "## Validate the pair before review or promotion",
            "`script.raw.md` is the source of truth",
            "Do not underline a mini-hook.",
        )

        for contract in contracts:
            with self.subTest(owner="pair", contract=contract):
                self.assertIn(contract, pair)
            for consumer_name, consumer in consumers.items():
                with self.subTest(consumer=consumer_name, excluded=contract):
                    self.assertNotIn(contract, consumer)

        raw_consumers = pair_consumer_documents()
        for consumer_name, owner_link in PAIR_OWNER_LINKS.items():
            with self.subTest(consumer=consumer_name, owner_link=owner_link):
                self.assertIn(owner_link, raw_consumers[consumer_name])

    def test_pair_owner_locks_complete_raw_source_of_truth(self) -> None:
        pair = normalize_text(PAIR_METHOD_MD.read_text(encoding="utf-8"))
        consumers = pair_consumer_documents(normalized=True)
        contract = (
            "`script.raw.md` is the source of truth for every spoken word; paragraph "
            "order; beat titles, headings, and their order; and bold, italic, and "
            "underline storytelling markup."
        )

        self.assertIn(contract, pair)
        for consumer_name, consumer in consumers.items():
            with self.subTest(consumer=consumer_name):
                self.assertNotIn(contract, consumer)

    def test_pair_owner_locks_literal_stage_appendix_schemas(self) -> None:
        pair = PAIR_METHOD_MD.read_text(encoding="utf-8")
        stage_appendices = markdown_section(pair, "## Stage appendices")
        appendix_sections = {
            "blueprint": markdown_section(stage_appendices, "### BLUEPRINT"),
            "draft": markdown_section(stage_appendices, "### DRAFT"),
            "final": markdown_section(stage_appendices, "### Final"),
        }
        required_tokens = {
            "blueprint": (
                "stage metadata",
                "approved baselines",
                "factual boundary",
                "unresolved dependencies",
                "intro design record",
                "bullet-only body logic map",
                "promise and loop payoff destinations",
                "approval state",
            ),
            "draft": (
                "stage metadata",
                "approved baselines",
                "story-progression and payoff audit",
                "evidence boundaries",
                "open verification dependencies",
                "spoken-readability result",
                "unresolved personal-input decision",
                "creative-approval state",
            ),
            "final": (
                "complete final extended appendix",
                "annotated-script format",
                "[that format](annotated-script-format.md)",
            ),
        }

        self.assertIn(
            "Every extended file ends with exactly one literal `## Appendix`.",
            stage_appendices,
        )
        for section_name, tokens in required_tokens.items():
            section = normalize_text(appendix_sections[section_name]).lower()
            for token in tokens:
                with self.subTest(section=section_name, required=token):
                    self.assertIn(token.lower(), section)

        consumers = pair_consumer_documents(normalized=True)
        for consumer_name, consumer in consumers.items():
            for owner_contract in (
                "## Stage appendices",
                "Every extended file ends with exactly one literal `## Appendix`.",
            ):
                with self.subTest(
                    consumer=consumer_name, forbidden_owner_contract=owner_contract
                ):
                    self.assertNotIn(owner_contract, consumer)

        blueprint = consumers["blueprint"]
        for forbidden_schema in (
            "owns the exact episode-scale Script Blueprint contents",
            "**Status and baselines:**",
            "`BLUEPRINT` status",
            "approved architecture and progression references",
            "factual boundary, and any unresolved dependency",
            "**Approval:**",
            "current intro and body-map approval state",
        ):
            with self.subTest(
                consumer="blueprint", forbidden_schema=forbidden_schema
            ):
                self.assertNotIn(forbidden_schema, blueprint)
        for editorial_contract in (
            "editorial design",
            "polished intro",
            "bullet-only body logic map",
            "literal appendix structure",
            "required sections",
            "owner-defined `BLUEPRINT` appendix",
        ):
            with self.subTest(
                consumer="blueprint", editorial_contract=editorial_contract
            ):
                self.assertIn(editorial_contract, blueprint)

    def test_pair_validator_command_is_owner_only_and_runs_first(self) -> None:
        pair = PAIR_METHOD_MD.read_text(encoding="utf-8")
        validation = markdown_section(
            pair, "## Validate the pair before review or promotion"
        )
        command = (
            'python3 scripts/validate_script_pair.py -- "<stage-or-pair-path>"'
        )

        self.assertIn("mandatory first command", validation)
        self.assertEqual(pair.count(command), 1)
        self.assertIn(command, validation)
        self.assertLess(validation.index(command), validation.index("spoken-readability"))
        self.assertLess(
            validation.index(command), validation.index("annotated-script validator")
        )
        for consumer_name, consumer in pair_consumer_documents().items():
            with self.subTest(consumer=consumer_name):
                self.assertNotIn(command, consumer)

    def test_pair_owner_defines_literal_multi_tag_annotation_grammar(self) -> None:
        pair = PAIR_METHOD_MD.read_text(encoding="utf-8")
        extended = markdown_section(pair, "## Extended script contract")
        normalized_extended = normalize_text(extended)
        grammar = "`[TAG | TAG — episode-specific purpose]`"
        example = (
            "`[MAIN HOOK | LOCKED WORDING — Opens the episode's central question in "
            "wording that must be delivered exactly.]`"
        )

        self.assertIn(grammar, normalized_extended)
        self.assertIn(example, normalized_extended)
        match = re.search(
            r"`\[(MAIN HOOK) \| (LOCKED WORDING) — ([^]]+)\]`",
            normalized_extended,
        )
        self.assertIsNotNone(match)
        for tag in match.group(1, 2):
            with self.subTest(allowed_tag=tag):
                self.assertIn(f"- `{tag}`", extended)
        self.assertTrue(match.group(3).strip())
        for consumer_name, consumer in pair_consumer_documents().items():
            with self.subTest(consumer=consumer_name):
                self.assertNotIn(grammar, consumer)

    def test_active_workflow_uses_blueprint_not_predraft(self) -> None:
        self.assertTrue(BLUEPRINT_WORKFLOW_MD.is_file())

        active_documents = active_workflow_documents()
        for retired in (
            "predraft-intro-"
            "workflow.md",
            "whp-youtube/"
            "predrafts/",
            "pre-draft",
        ):
            for document_name, document in active_documents.items():
                with self.subTest(document=document_name, retired=retired):
                    self.assertNotIn(retired, document.lower())

        active_text = "\n".join(active_documents.values()).lower()
        for active in (
            "script blueprint",
            "blueprint/script.raw.md",
            "blueprint/script.extended.md",
        ):
            with self.subTest(active=active):
                self.assertIn(active, active_text)

        lifecycle_contract = (
            "Edits to an episode's Script Blueprint pair under its episode-first "
            "`blueprint/` stage are exploratory and never definite decisions; only "
            "validated promotion from `blueprint/` into that episode's `draft/` pair "
            "is reconciled."
        )
        for root_document in ("agents", "claude"):
            with self.subTest(root_document=root_document):
                self.assertIn(
                    lifecycle_contract,
                    normalize_text(active_documents[root_document]),
                )

        reconcile = normalize_text(active_documents["reconcile"])
        for lifecycle_token in (
            "Script Blueprint pair",
            "exploratory",
            "never as definite decisions",
            "validated promotion",
            "`blueprint/`",
            "`draft/`",
        ):
            with self.subTest(document="reconcile", lifecycle=lifecycle_token):
                self.assertIn(lifecycle_token, reconcile)

    def test_unresolved_template_personal_scaffold_stays_conditional(self) -> None:
        template = (
            SKILL_ROOT / "assets/annotated-script-template.md"
        ).read_text(encoding="utf-8")
        personal_input = template.split("### Personal input\n", 1)[1].split(
            "\n### Viewer application", 1
        )[0]

        conditional_contract = (
            "- **Story purpose:** If Martin has a truthful relevant memory, use it to surface an initial interpretation and let the evidence—not the anecdote—revise the viewer's intuition.",
            "- **Primary prompt:** Do you remember a specific animal behavior you first interpreted one way and later reconsidered as possible play? If not, say so.",
            "- **Follow-up prompts:** If a moment comes to mind: what did you see; what did you initially think it was; did your interpretation change; which detail do you recall clearly?",
            "- **Bridge in:** A real encounter can make that abstract question concrete.",
            "- **Bridge out:** But a personal reaction is not evidence, so the experiment has to do the real work.",
        )
        for line in conditional_contract:
            with self.subTest(contract=line):
                self.assertIn(line, personal_input)

        invented_phrases = (
            "Martin initially dismissed insect play",
            "My first reaction was to call this random movement",
        )
        for phrase in invented_phrases:
            with self.subTest(forbidden=phrase):
                self.assertNotIn(phrase, personal_input)

    def test_template_personal_marker_precedes_the_evidence_turn(self) -> None:
        template = (
            SKILL_ROOT / "assets/annotated-script-template.md"
        ).read_text(encoding="utf-8")
        narration = template.split("## 1. The detour\n", 1)[1].split(
            "\n## Appendix", 1
        )[0]
        marker = "> <!-- PI-001: Martin input -->"
        evidence_turn = (
            "The researchers said this met their operational play criteria."
        )

        self.assertEqual(narration.count(marker), 1)
        self.assertLess(narration.index("food reward."), narration.index(marker))
        self.assertLess(narration.index(marker), narration.index(evidence_turn))

    def test_personal_and_application_contract_is_distributed(self) -> None:
        sources = {
            "skill": SKILL_MD.read_text(encoding="utf-8"),
            "story": (SKILL_ROOT / "references/story-and-hook-method.md").read_text(encoding="utf-8"),
            "research": (SKILL_ROOT / "references/research-and-rights.md").read_text(encoding="utf-8"),
            "format": (SKILL_ROOT / "references/annotated-script-format.md").read_text(encoding="utf-8"),
            "rubric": (SKILL_ROOT / "references/quality-rubric.md").read_text(encoding="utf-8"),
        }
        required = {
            "skill": ("INPUT-REQUESTED", "COMPLETED", "OMIT", "viewer application"),
            "story": ("Primary prompt", "Bridge in", "Bridge out", "larger benefit"),
            "research": ("first-person source", "personal photos", "observation-only"),
            "format": ("Deliverable", "Useful viewer change", "### Personal input", "### Viewer application"),
            "rubric": ("personal", "application", "INPUT-REQUESTED"),
        }
        for source, tokens in required.items():
            with self.subTest(source=source):
                for token in tokens:
                    self.assertIn(token, sources[source])

    def test_editorial_guidance_scopes_deliverables_and_explains_omit_fields(self) -> None:
        rubric = (
            SKILL_ROOT / "references/quality-rubric.md"
        ).read_text(encoding="utf-8")
        format_text = (
            SKILL_ROOT / "references/annotated-script-format.md"
        ).read_text(encoding="utf-8")
        story = (
            SKILL_ROOT / "references/story-and-hook-method.md"
        ).read_text(encoding="utf-8")

        normalized_rubric = " ".join(rubric.split())
        scope_contract = (
            "Apply personal-input and viewer-application requirements in full to a "
            "`FULL-SCRIPT`. Review a `TARGETED-ARTIFACT` only against its assigned or "
            "inherited scope. The absence of optional personal-input or "
            "viewer-application blocks is not itself a deficiency and must not lower "
            "a score or trigger insertion of out-of-scope content. When a targeted "
            "artifact includes either block, or is assigned to preserve an inherited "
            "personal-input or viewer-application contract, evaluate the in-scope "
            "material against every applicable anchor. A targeted artifact cannot "
            "promote the parent script's readiness."
        )
        with self.subTest(contract="deliverable-scope"):
            self.assertIn(scope_contract, normalized_rubric)

        dimensions = re.findall(r"^### (\d+)\. ", rubric, re.MULTILINE)
        with self.subTest(contract="ten-dimensions"):
            self.assertEqual(dimensions, [str(number) for number in range(1, 11)])

        omit_contract = (
            "For `OMIT`, keep every field non-empty. In `Primary prompt`, `Follow-up "
            "prompts`, `Bridge in`, `Bridge out`, and `Personal visuals`, give a "
            "concise, story-specific explanation of why that field is not applicable. "
            "Do not use generic `N/A` or placeholder copy, invent a memory, or write a "
            "transition that will be narrated."
        )
        for source_name, source_text in (
            ("format", format_text),
            ("story", story),
        ):
            with self.subTest(source=source_name):
                self.assertIn(omit_contract, " ".join(source_text.split()))

    def test_guidance_closes_personal_input_and_spoken_application_loopholes(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )
        format_text = " ".join(
            (SKILL_ROOT / "references/annotated-script-format.md")
            .read_text(encoding="utf-8")
            .split()
        )
        template = " ".join(
            (SKILL_ROOT / "assets/annotated-script-template.md")
            .read_text(encoding="utf-8")
            .split()
        )

        personal_input_default = (
            "Missing supplied personal material, or a short runtime, is not by itself "
            "a reason to choose `OMIT`. When a specific truthful memory could "
            "plausibly do real story work, choose `INPUT-REQUESTED`. Reserve `OMIT` "
            "for an assignment-established lack of personal connection or a "
            "story-specific removal-test conclusion that no personal sequence would "
            "improve the story."
        )
        with self.subTest(contract="missing-input-default"):
            self.assertIn(personal_input_default, story)

        spoken_application_contracts = {
            "skill-workflow": (
                "Voice all five elements in narration—the insight; the low-risk "
                "action, observation, or reflection; the observable signal; the "
                "boundary; and the larger benefit—not only in the structured block."
            ),
            "skill-non-negotiable": (
                "For every `FULL-SCRIPT`, voice all five viewer-application elements "
                "in narration: evidence-bounded insight; low-risk action, observation, "
                "or reflection; observable signal; real boundary; and larger benefit. "
                "The structured block does not substitute for spoken copy."
            ),
            "story": (
                "Narration—not only the structured block—must voice all five "
                "application elements: the insight; the action, observation, or "
                "reflection to try; the observable signal; the boundary; and the "
                "larger benefit."
            ),
            "format": (
                "Voice all five application elements in narration: insight; action, "
                "observation, or reflection; observable signal; boundary; and larger "
                "benefit. The structured block is the production contract, not a "
                "substitute for spoken copy."
            ),
        }
        sources = {
            "skill-workflow": skill,
            "skill-non-negotiable": skill,
            "story": story,
            "format": format_text,
        }
        for source_name, contract in spoken_application_contracts.items():
            with self.subTest(contract=source_name):
                self.assertIn(contract, sources[source_name])

    def test_reverse_claim_audit_contract_is_explicit(self) -> None:
        research_text = (
            SKILL_ROOT / "references/research-and-rights.md"
        ).read_text(encoding="utf-8")
        research = " ".join(research_text.split())
        rubric = " ".join(
            (SKILL_ROOT / "references/quality-rubric.md")
            .read_text(encoding="utf-8")
            .split()
        )

        with self.subTest(contract="contents-link"):
            self.assertIn(
                "- [Run the reverse claim audit](#run-the-reverse-claim-audit)",
                research_text,
            )

        research_contracts = (
            "Before finalizing, reverse-audit every narrated material claim against "
            "its evidence record.",
            "Compare the narration word for word with `Exact claim`, `Scope`, "
            "`Caveat`, and `Approved wording`. Retain every limiting scope or modal "
            "term; if it does not fit, weaken the narration rather than strengthening "
            "the record.",
            "Open every `Cross-checks` source and scan it for material wording that "
            "conflicts on origin, date, chronology, causality, or scope, even when "
            "that source supports a different subclaim. Record every discovered "
            "material conflict in `Contradictions`, using the per-source outcome "
            "strings and no-conflict rule owned by [the annotated script format]"
            "(annotated-script-format.md#evidence-records), and explain how each "
            "conflict changes or bounds the status or wording.",
            "For `CORROBORATED`, trace whether the sources have genuinely independent "
            "evidence chains. If they converge on the same originating investigation, "
            "record the dependence and re-evaluate the claim under the existing status "
            "thresholds: use `VERIFIED` only when the primary or authoritative source "
            "type can establish the exact claim and no unresolved credible conflict "
            "remains; use `REPORTED` when one identifiable plausible account remains; "
            "and retain `CORROBORATED` only when another genuinely independent chain "
            "supports the exact wording. A material credible conflict takes precedence "
            "over `VERIFIED`: resolve it by narrowing the wording, use `DISPUTED`, or "
            "omit the claim; never assign `VERIFIED` while that conflict remains.",
            "Use stable, source-native locators: page, section, table, figure, "
            "timestamp, or a descriptive paragraph anchor. Never use browser-rendered "
            "or search-result line numbers as source locators.",
        )
        for contract in research_contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, research)

        rubric_reminder = (
            "Across passes 2 and 8, reverse-audit narration against its claim cards "
            "and every cross-check source: preserve limiting scope and modal terms, "
            "record every material conflict in `Contradictions` and bound its "
            "consequences, re-evaluate dependent evidence chains under the status "
            "thresholds, and require stable source-native locators."
        )
        with self.subTest(contract="rubric-reminder"):
            self.assertIn(rubric_reminder, rubric)

        # The research method owns the audit procedure; the rubric routes to it and
        # scores the result instead of restating the steps.
        with self.subTest(contract="rubric-delegates"):
            self.assertIn(
                "[the reverse claim audit]"
                "(research-and-rights.md#run-the-reverse-claim-audit) in full; it owns "
                "the per-source `COMPLETE`/`INCOMPLETE` outcome strings, the "
                "dependent-chain status re-evaluation, and the source-native locator "
                "rule.",
                rubric,
            )
        with self.subTest(contract="rubric-does-not-restate"):
            self.assertNotIn(
                "use `REPORTED` when one identifiable plausible account remains",
                rubric,
            )

    def test_source_audit_syntax_and_compound_split_rule_are_consistent(self) -> None:
        sources = {
            name: " ".join((SKILL_ROOT / path).read_text(encoding="utf-8").split())
            for name, path in {
                "research": "references/research-and-rights.md",
                "rubric": "references/quality-rubric.md",
                "format": "references/annotated-script-format.md",
            }.items()
        }
        outcome_syntax = (
            "`{source} — COMPLETE — [coverage or source-native locator checked; "
            "concrete material support/conflict findings; consequence for "
            "wording/status]`",
            "`{source} — INCOMPLETE — [reason; portions/locators checked; unresolved "
            "consequence]`",
        )
        unresolved_rule = (
            "Any material `Original URL` or cross-check marked `INCOMPLETE` keeps the "
            "conflict review unresolved and forbids a no-conflict assertion."
        )
        # The format owns the outcome strings; every other file routes to it, so the
        # three copies that previously drifted now cannot.
        for syntax in outcome_syntax:
            with self.subTest(source="format", contract=syntax):
                self.assertIn(syntax, sources["format"])
        with self.subTest(source="format", contract="incomplete-blocks"):
            self.assertIn(unresolved_rule, sources["format"])
        for source_name in ("research", "rubric"):
            for syntax in outcome_syntax:
                with self.subTest(
                    source=source_name, contract="delegates-syntax", syntax=syntax
                ):
                    self.assertNotIn(syntax, sources[source_name])
        for source_name, source_text in sources.items():
            with self.subTest(source=source_name, contract="one-syntax-only"):
                self.assertNotIn("Conflict scan incomplete —", source_text)

        # The research method owns the compound-claim thresholds.
        split_rule = (
            "If narrated subclaims do not all meet the normal threshold for the same "
            "status, split the compound claim into separate evidence records."
        )
        corroborated_rule = (
            "Assign `CORROBORATED` only when every narrated subclaim independently "
            "meets the `CORROBORATED` threshold."
        )
        with self.subTest(source="research", contract="split-compound"):
            self.assertIn(split_rule, sources["research"])
        with self.subTest(source="research", contract="corroborated-compound"):
            self.assertIn(corroborated_rule, sources["research"])
        with self.subTest(source="rubric", contract="delegates-compound"):
            self.assertNotIn(split_rule, sources["rubric"])
        for source_name in ("research", "rubric"):
            with self.subTest(source=source_name, contract="no-weakest-status"):
                self.assertNotIn(
                    "assign the whole record the weakest applicable status",
                    sources[source_name].lower(),
                )

    def test_annotated_format_requires_named_per_source_audit_outcomes(self) -> None:
        format_text = " ".join(
            (SKILL_ROOT / "references/annotated-script-format.md")
            .read_text(encoding="utf-8")
            .split()
        )

        self.assertIn(
            "- **Contradictions:** Named `COMPLETE` or `INCOMPLETE` outcomes for the "
            "`Original URL` and every listed `Cross-checks` source",
            format_text,
        )
        self.assertIn(
            "Blanket statements such as `none found` or `all sources agree` do not "
            "substitute for named per-source outcomes.",
            format_text,
        )
        self.assertNotIn(
            "Conflicting evidence or an explicit record that none were found",
            format_text,
        )

    def test_worked_template_demonstrates_auditable_source_outcomes(self) -> None:
        template = (
            SKILL_ROOT / "assets/annotated-script-template.md"
        ).read_text(encoding="utf-8")
        evidence = template.split("#### F-001", 1)[1].split(
            "\n### Visual and archival sources", 1
        )[0]
        match = re.search(r"^- \*\*Contradictions:\*\* (.+)$", evidence, re.MULTILINE)
        self.assertIsNotNone(match)
        outcomes = match.group(1)

        expected_sources = (
            "Galpayage Dona et al. paper (Original URL)",
            "Queen Mary University of London study summary (Cross-check)",
        )
        self.assertEqual(outcomes.count("— COMPLETE — ["), len(expected_sources))
        self.assertNotIn("Conflict scan incomplete —", outcomes)
        self.assertNotIn("No direct contradiction located", outcomes)
        for source in expected_sources:
            with self.subTest(source=source):
                self.assertRegex(
                    outcomes,
                    rf"{re.escape(source)} — COMPLETE — "
                    rf"\[[^\]\n]+;[^\]\n]+;[^\]\n]+\]",
                )

    def test_rapid_mode_is_the_default_and_skips_production_overhead(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Default to this mode for ideas, openings, hooks, rough drafts, short "
            "narration, humor or voice passes, and scoped refinement.",
            "Return the requested artifact directly.",
            "Outside the bounded architecture concept-discovery scan and the targeted "
            "viewer-vulnerability proof-case lookup below, do not perform web "
            "research, write an assignment contract or evidence packet, force three "
            "opening candidates, create annotated-script scaffolding, plan visuals or "
            "rights, run the production rubric, or invoke final-format validation "
            "unless Martin explicitly asks for that work. Episode-stage pairs still "
            "require pair validation before review.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, skill)

    def test_episode_scale_generation_requires_approved_architecture_and_progression(
        self,
    ) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        architecture = " ".join(
            ARCHITECTURE_MD.read_text(encoding="utf-8").split()
        )
        contracts = (
            "For a new episode or a thesis-level rethink, produce and refine the "
            "script architecture before writing any opening or narration.",
            "Stop after returning the architecture. Do not draft the hook, beats, or "
            "narration until Martin explicitly approves it.",
            "Approval of a topic, title, isolated insight, or earlier script does not "
            "approve the architecture.",
            "Once Martin approves the architecture, return one visible Story "
            "Progression Plan and stop.",
            "Do not order beats or draft narration until Martin explicitly approves "
            "the complete plan or directly instructs you to build the Script Blueprint from "
            "that displayed complete plan.",
            "Preserve the approved architecture as the intellectual baseline and the "
            "approved progression as the story baseline.",
            "Scoped work on existing narration does not rebuild either artifact unless "
            "it changes the central message or crosses the central-progression trigger.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, skill)

        self.assertIn(
            "Preserve its central question, core answer, belief shift, insight ladder, "
            "earned reframe, boundaries, payoff, final lesson, and learning-and-action "
            "contract.",
            architecture,
        )
        self.assertNotIn(
            "use it as the content baseline for the first narration "
            "prototype",
            skill,
        )

    def test_story_progression_gate_is_phase_aware_and_ordered(self) -> None:
        skill = SKILL_MD.read_text(encoding="utf-8")
        normalized = " ".join(skill.split())

        required = (
            "central-progression work",
            "Reach this stage only with both the architecture and the Story Progression Plan approved.",
            "Scoped Blueprint work returns directly until it crosses the central-progression trigger",
            "return one visible Story Progression Plan and stop",
            "directly instructs you to build the Script Blueprint from that displayed complete plan",
            "If no visible approved plan is supplied, treat the progression as unapproved",
            "Story-progression approval precedes and does not replace creative approval",
        )
        for contract in required:
            with self.subTest(contract=contract):
                self.assertIn(contract, normalized)

        self.assertLess(
            skill.index("## Architecture approval gate"),
            skill.index("## Story progression approval gate"),
        )
        self.assertLess(
            skill.index("## Story progression approval gate"),
            skill.index("## Creative approval gate"),
        )

    def test_story_progression_method_owns_the_complete_plan_schema(self) -> None:
        story = STORY_METHOD_MD.read_text(encoding="utf-8")
        consumers = {
            "skill": SKILL_MD.read_text(encoding="utf-8"),
            "rapid": RAPID_MD.read_text(encoding="utf-8"),
        }

        headings = (
            "## Plan story progression before beats",
            "### Story engine",
            "### Story-material inventory",
            "### Technique selection",
            "### Beat-progression blocks",
            "### Full causal read",
            "### Retention map",
            "### Natural bridge seeds",
            "### Loop and payoff check",
            "### Throughline decision",
            "### Anti-shoehorn check",
            "### Approval",
        )
        for heading in headings:
            with self.subTest(heading=heading):
                self.assertIn(heading, story)
            for consumer_name, consumer in consumers.items():
                with self.subTest(consumer=consumer_name, forbidden_schema=heading):
                    self.assertNotIn(heading, consumer)

        for field in (
            "#### Progression beat SP01 — Descriptive name",
            "**Starting question or expectation:**",
            "**Event or evidence:**",
            "**BUT — complication:**",
            "**THEREFORE — consequence or required next step:**",
            "**Selected technique:**",
            "**Loop or payoff:**",
            "**Proof job and evidence boundary:**",
            "`AWAITING-APPROVAL`",
            "`NONE`",
            "`NOT APPLICABLE`",
        ):
            with self.subTest(field=field):
                self.assertIn(field, story)

    def test_story_progression_handoffs_route_through_the_owner(self) -> None:
        sources = {
            "skill": SKILL_MD.read_text(encoding="utf-8"),
            "architecture": ARCHITECTURE_MD.read_text(encoding="utf-8"),
            "rapid": RAPID_MD.read_text(encoding="utf-8"),
            "steering": (
                REPO_ROOT / "whp-youtube/STEERING.md"
            ).read_text(encoding="utf-8"),
        }
        normalized = {
            source_name: " ".join(source.split())
            for source_name, source in sources.items()
        }

        self.assertIn(
            "[the story and hook method](references/story-and-hook-method.md)",
            sources["skill"],
        )
        self.assertIn(
            "Architecture approval authorizes story planning, not beat ordering or narration.",
            normalized["architecture"],
        )
        self.assertIn(
            "## Draft from the approved architecture and story progression",
            sources["rapid"],
        )
        self.assertIn(
            "[story-progression method](story-and-hook-method.md#plan-story-progression-before-beats)",
            sources["rapid"],
        )
        self.assertIn(
            "Planning creates no additional scoped-mode research exception.",
            normalized["rapid"],
        )
        workflow = normalized["steering"].split(
            "### Develop the message, then the voice, before the production package",
            1,
        )[1].split(
            "The architecture must go beyond a competent summary of familiar material.",
            1,
        )[0]
        architecture_approval = (
            "obtain explicit approval of the complete intellectual payload"
        )
        progression_plan = (
            "Return that plan as the default visible artifact and stop"
        )
        intro_blueprint = (
            "Build one intro-first Script Blueprint pair from both approved baselines"
        )
        complete_narration = (
            "Preserve the approved intro and expand the map into one complete "
            "narration in the episode's `draft/` pair"
        )

        for anchor in (
            architecture_approval,
            progression_plan,
            intro_blueprint,
            complete_narration,
        ):
            self.assertIn(anchor, workflow)
        self.assertLess(
            workflow.index(architecture_approval),
            workflow.index(progression_plan),
        )
        self.assertLess(
            workflow.index(progression_plan),
            workflow.index(intro_blueprint),
        )
        self.assertLess(
            workflow.index(intro_blueprint),
            workflow.index(complete_narration),
        )
        self.assertIn(
            "This gate applies to a new episode, thesis-level rethink, or other "
            "central-progression work.",
            workflow,
        )
        self.assertIn(
            "Continue only after Martin gives explicit whole-plan approval or directly "
            "instructs building the Script Blueprint from the displayed complete plan.",
            workflow,
        )
        self.assertIn(
            "A load-bearing progression change reopens whole-plan approval.",
            workflow,
        )
        self.assertIn(
            "Do not design the intro, map the body, or draft narration before that "
            "approval.",
            workflow,
        )
        self.assertIn(
            "Do not draft body narration.",
            workflow,
        )
        self.assertIn(
            "Use the paired-script and Script Blueprint owners linked in Law 2.",
            workflow,
        )

    def test_canonical_steering_does_not_restore_detailed_story_owner(
        self,
    ) -> None:
        steering = " ".join(
            (REPO_ROOT / "whp-youtube/STEERING.md")
            .read_text(encoding="utf-8")
            .split()
        )
        decisions = " ".join(
            (REPO_ROOT / "DECISIONS.md").read_text(encoding="utf-8").split()
        )

        with self.subTest(regression="long steering mirror"):
            stale_story_owner = (
                "Design the storytelling engine before writing the beat structure."
            )
            self.assertFalse(
                stale_story_owner in steering,
                "STEERING still contains the detailed story-owner mirror",
            )
        with self.subTest(regression="repeated direct-instruction wording"):
            direct_instruction = (
                "directly instructs building the Script Blueprint from the displayed complete plan"
            )
            self.assertEqual(
                steering.count(direct_instruction),
                1,
                "STEERING must state the direct-instruction exception exactly once",
            )
        with self.subTest(regression="stale future-tense decision"):
            stale_future_decision = (
                "The writing-skill implementation will follow the approved design"
            )
            self.assertFalse(
                stale_future_decision in decisions,
                "DECISIONS still describes the writing-skill implementation as "
                "future work",
            )

    def test_story_progression_uses_stable_architecture_evidence_ids(self) -> None:
        architecture = " ".join(
            ARCHITECTURE_MD.read_text(encoding="utf-8").split()
        )
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())

        architecture_contracts = (
            "Assign every row a stable ID in `E-##` form (`E-01`, `E-02`, and so on).",
            "Preserve an ID when the row's wording or status changes, and never recycle "
            "an ID after deletion.",
            "The Story Progression Plan references these IDs instead of copying "
            "evidence-map entries.",
            "Architecture `E-##` row IDs remain separate from production `F-###` "
            "claim-evidence IDs.",
        )
        for contract in architecture_contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, architecture)

        self.assertIn(
            "Reference the approved architecture's stable `E-##` evidence-row IDs and "
            "inherit their factual statuses.",
            story,
        )

    def test_story_progression_direct_instruction_records_scoped_approval(
        self,
    ) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "architecture": " ".join(
                ARCHITECTURE_MD.read_text(encoding="utf-8").split()
            ),
            "story": " ".join(
                STORY_METHOD_MD.read_text(encoding="utf-8").split()
            ),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
        }

        self.assertIn(
            "Explicit approval—or Martin's direct instruction to plan from that "
            "displayed complete version—records that architecture as the approved "
            "intellectual baseline for story planning only.",
            sources["architecture"],
        )
        self.assertIn(
            "Neither route authorizes beat ordering, hook writing, or narration; those "
            "still require story-progression approval.",
            sources["architecture"],
        )
        self.assertIn(
            "Explicit approval—or a direct instruction to build the Script Blueprint from that "
            "displayed complete plan—records that plan as `APPROVED` by Martin and "
            "authorizes the polished intro and bullet-only body logic map only.",
            sources["skill"],
        )
        self.assertIn(
            "It does not authorize body narration or approve the complete narration or "
            "direction.",
            sources["skill"],
        )
        self.assertIn(
            "Explicit approval—or a direct instruction to build the Script Blueprint from that "
            "displayed complete plan—records it as `APPROVED` by Martin and makes it the "
            "visible story baseline for the polished intro and bullet-only body logic "
            "map.",
            sources["story"],
        )
        self.assertIn(
            "It does not authorize body narration or replace later creative approval of "
            "the complete narration and direction.",
            sources["story"],
        )
        for contract in (
            "Build the intro-first Script Blueprint only when both complete artifacts are "
            "visible and the architecture "
            "has explicit approval or Martin's direct instruction to plan from that "
            "displayed complete version, and the Story Progression Plan has explicit "
            "approval or Martin's direct instruction to build the Script Blueprint from that displayed "
            "complete plan.",
            "the complete architecture is visible and has explicit approval or Martin's "
            "direct instruction to plan from that displayed complete version",
            "the complete Story Progression Plan is visible and has explicit approval or "
            "Martin's direct instruction to build the Script Blueprint from that displayed "
            "complete plan",
            "Each direct instruction counts only as approval of that artifact for the "
            "named next stage.",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, sources["rapid"])

    def test_story_progression_targeted_revision_resets_approval(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(
                STORY_METHOD_MD.read_text(encoding="utf-8").split()
            ),
        }
        contracts = (
            "Return the complete revised plan with `AWAITING-APPROVAL` and `PENDING`, "
            "then stop. Prior approval does not carry across a progression revision.",
            "Re-entry requires renewed whole-plan approval or a direct instruction to "
            "build the Script Blueprint from that newly displayed complete revised plan; the revision "
            "request itself does not count as renewed approval.",
        )
        for source_name, source in sources.items():
            for contract in contracts:
                with self.subTest(source=source_name, contract=contract):
                    self.assertIn(contract, source)

    def test_story_progression_record_and_rubric_are_scope_aware(self) -> None:
        format_text = FORMAT_MD.read_text(encoding="utf-8")
        template = TEMPLATE_MD.read_text(encoding="utf-8")
        rubric = RUBRIC_MD.read_text(encoding="utf-8")
        normalized_format = " ".join(format_text.split())
        normalized_rubric = " ".join(rubric.split())

        record_fields = (
            "### Approved story progression",
            "**Plan status:** APPROVED",
            "**Approved by:** Martin",
            "**Story engine:**",
            "**Full causal read:**",
            "**Selected techniques:**",
            "**Global loop / payoff closure:**",
            "**Throughline decision:**",
            "**Open evidence dependencies:**",
            "**Plan-change tradeoffs:**",
        )
        for source_name, source in (("format", format_text), ("template", template)):
            for field in record_fields:
                with self.subTest(source=source_name, field=field):
                    self.assertIn(field, source)

        self.assertIn(
            "Populate the Narrative throughline audit from the approved plan's "
            "Throughline decision",
            normalized_format,
        )
        self.assertIn(
            "Do not fabricate or backfill a plan for a legacy script",
            normalized_format,
        )
        self.assertIn(
            "When no approved progression is in scope, score intrinsic causal movement",
            normalized_rubric,
        )
        self.assertIn(
            "Do not penalize a legacy script or scoped `TARGETED-ARTIFACT` for the "
            "absence of a plan it was never required to contain.",
            normalized_rubric,
        )

    def test_story_progression_method_preserves_honesty_and_targeted_revision(self) -> None:
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "But and Therefore are structural fields, not required spoken words.",
            "Record rows only for selected moves and notable rejections",
            "Every Natural bridge seed must cite the inventory item or architecture row "
            "that makes it true.",
            "Do not invent “I almost gave up,” surprise, frustration, a failed "
            "hypothesis, or chronology",
            "change only the addressed progression beat or field",
            "Name every downstream causal consequence instead of silently rewriting "
            "later beats.",
            "If planning exposes a flat insight ladder, missing proof job, or other "
            "load-bearing architecture defect, return to architecture approval.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, story)

    def test_script_architecture_has_the_complete_message_contract(self) -> None:
        self.assertTrue(ARCHITECTURE_MD.is_file())
        architecture = ARCHITECTURE_MD.read_text(encoding="utf-8")
        for heading in (
            "## Architecture artifact",
            "### Central question",
            "### Core answer",
            "### Viewer belief shift",
            "### Insight ladder",
            "### Phenomenon and paradox map",
            "### Earned reframe",
            "### Real-world evidence map",
            "### Practical payoff",
            "### Final lesson",
            "### Scope boundary",
        ):
            with self.subTest(heading=heading):
                self.assertIn(heading, architecture)

        normalized = " ".join(architecture.split())
        for insight_field in (
            "**Claim:**",
            "**Why it is surprising:**",
            "**Mechanism:**",
            "**Real-world case or example:**",
            "**Human consequence:**",
            "**Boundary:**",
        ):
            with self.subTest(insight_field=insight_field):
                self.assertIn(insight_field, architecture)

        earned_reframe_fields = (
            "Conventional explanation",
            "Hidden assumption",
            "Mechanism that breaks it",
            "Surprising conclusion",
            "What it predicts",
            "Where it stops",
        )
        for field in earned_reframe_fields:
            with self.subTest(earned_reframe=field):
                self.assertIn(field, architecture)

        self.assertIn(
            "The architecture is the episode's intellectual payload, not a prose "
            "outline.",
            normalized,
        )

    def test_architecture_requires_a_new_learning_and_concrete_action_contract(
        self,
    ) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "architecture": " ".join(
                ARCHITECTURE_MD.read_text(encoding="utf-8").split()
            ),
            "rapid": " ".join(
                (SKILL_ROOT / "references/rapid-prototyping.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "rubric": " ".join(
                (SKILL_ROOT / "references/quality-rubric.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }

        gate = (
            "An architecture cannot be approved unless it contains both a non-obvious "
            "understanding and a concrete, evidence-bounded viewer response with an "
            "observable result."
        )
        for source_name in ("skill", "architecture"):
            with self.subTest(source=source_name, contract="approval-gate"):
                self.assertIn(gate, sources[source_name])

        self.assertIn("### Learning and action contract", sources["architecture"])
        for field in (
            "**New understanding:**",
            "**Prior model revised:**",
            "**Concrete response:**",
            "**Decision rule or sequence:**",
            "**Observable result:**",
            "**Boundary:**",
            "**Transfer:**",
        ):
            with self.subTest(field=field):
                self.assertIn(field, sources["architecture"])

        transformation = (
            "Before, I thought X. Now, I understand Y. Next time, I will do Z. I will "
            "know it helped when I observe W."
        )
        for source_name in ("skill", "architecture"):
            with self.subTest(source=source_name, contract="transformation"):
                self.assertIn(transformation, sources[source_name])

        vague_payoff = (
            "`Be careful`, `think critically`, `ask better questions`, and a loose "
            "checklist without a decision rule, sequence, or observable result do not "
            "pass."
        )
        for source_name in ("architecture", "rapid", "rubric"):
            with self.subTest(source=source_name, contract="vague-payoff"):
                self.assertIn(vague_payoff, sources[source_name])

        self.assertIn(
            "Carry the approved learning-and-action contract into the opening promise, "
            "explanation, viewer application, and final lesson.",
            sources["rapid"],
        )
        self.assertIn(
            "The narration must teach the new model before asking the viewer to use "
            "the response.",
            sources["rapid"],
        )
        self.assertIn(
            "Full credit requires the finished script to preserve the approved "
            "situation, decision rule or sequence, observable result, boundary, and "
            "transfer case.",
            sources["rubric"],
        )
        self.assertIn(
            "Compare the finished payoff with the approved learning-and-action "
            "contract: preserve the named situation, decision rule or sequence, "
            "observable result, boundary, and transfer case.",
            sources["rubric"],
        )

    def test_architecture_requires_an_earned_deeper_insight(self) -> None:
        architecture = " ".join(
            ARCHITECTURE_MD.read_text(encoding="utf-8").split()
        )
        contracts = (
            "Do not settle for a competent summary of what is already commonly said "
            "about the topic.",
            "A controversial conclusion must be earned by the preceding mechanism "
            "and bounded by what would make it false.",
            "The earned reframe must help the viewer reinterpret or predict at least "
            "one situation beyond the opening example.",
            "If the reframe could sit unchanged in the first paragraph of a generic "
            "explainer, deepen it before scripting.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, architecture)

    def test_architecture_maps_known_phenomena_without_a_jargon_parade(self) -> None:
        architecture = " ".join(
            ARCHITECTURE_MD.read_text(encoding="utf-8").split()
        )
        contracts = (
            "Map every useful established phenomenon, paradox, bias, law, or tension "
            "to the exact insight it explains.",
            "Distinguish the primary mechanism from supporting concepts and nearby "
            "terms that are similar but less precise.",
            "Demonstrate a phenomenon through the story before naming it in "
            "narration.",
            "Do not create a Wikipedia parade: include a name only when it compresses "
            "understanding, sharpens the reframe, or lets the viewer recognize the "
            "pattern elsewhere.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, architecture)

    def test_architecture_requires_sourced_concept_discovery_across_explanations_and_interventions(
        self,
    ) -> None:
        architecture_text = ARCHITECTURE_MD.read_text(encoding="utf-8")
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "architecture": " ".join(architecture_text.split()),
            "rapid": " ".join(
                (SKILL_ROOT / "references/rapid-prototyping.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }

        gate = (
            "Before presenting a new or thesis-level architecture, run a bounded "
            "primary-source concept-discovery scan even in scoped mode."
        )
        for source_name in ("skill", "architecture", "rapid"):
            with self.subTest(source=source_name, contract="discovery-gate"):
                self.assertIn(gate, sources[source_name])

        with self.subTest(contract="inventory-first"):
            self.assertLess(
                architecture_text.index("### Concept inventory"),
                architecture_text.index("### Package and audience"),
            )

        category_contracts = (
            "core mechanisms",
            "human cognitive and social biases",
            "AI- or system-specific behaviors",
            "named laws, rules, paradoxes, and effects",
            "authority, trust, and anthropomorphism effects",
            "interventions, debiasing tools, decision methods, and countermeasures",
            "near-neighbors and tempting but imprecise labels",
        )
        for category in category_contracts:
            with self.subTest(category=category):
                self.assertIn(category, sources["architecture"])

        architecture_contracts = (
            "Build query vocabulary from the topic's plain-language mechanism, "
            "synonyms, causes, consequences, and possible remedies.",
            "Continue until two materially different query passes add no new "
            "decision-relevant concept.",
            "Treat this as systematic best-effort coverage, not a literal guarantee "
            "that no term exists.",
            "A concept-discovery source establishes that a named concept exists and "
            "what it means; it does not verify every episode claim or example.",
            "Distinguish established terms from original labels or novel synthesis.",
            "If research is unavailable or Martin explicitly requests an offline pass, "
            "label the map `INCOMPLETE—DISCOVERY NOT RUN`; never present recall as a "
            "complete map.",
            "Use at most three broad discovery batches and two targeted saturation "
            "batches.",
            "Treat each batch as one grouped research round trip, for no more than five "
            "research round trips total.",
            "Batch independent queries and source opens wherever possible.",
            "If that budget ends while a materially relevant lead remains unresolved, "
            "label the map `INCOMPLETE—SEARCH BUDGET REACHED` and list the unresolved "
            "lead.",
            "whether it explains the problem, predicts a consequence, or supplies an "
            "intervention or countermeasure",
            "a primary or authoritative source or attribution",
            "the reason to include or exclude it",
        )
        for contract in architecture_contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, sources["architecture"])

    def test_architecture_gate_prevents_premature_script_fluff(self) -> None:
        architecture = " ".join(
            ARCHITECTURE_MD.read_text(encoding="utf-8").split()
        )
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        contracts = (
            "Do not write hook copy, jokes, transitions, scene direction, or complete "
            "narration inside the architecture artifact.",
            "Refine weak, redundant, obvious, or disconnected ideas at architecture "
            "level before spending prose on them.",
            "Treat examples, stories, humor, and hooks as the delivery system for an "
            "approved payload, not as substitutes for that payload.",
        )
        for source_name, source in (
            ("architecture", architecture),
            ("rapid", rapid),
        ):
            for contract in contracts:
                with self.subTest(source=source_name, contract=contract):
                    self.assertIn(contract, source)

    def test_rapid_mode_defers_verification_without_permitting_fabrication(
        self,
    ) -> None:
        rapid_path = SKILL_ROOT / "references/rapid-prototyping.md"
        self.assertTrue(rapid_path.is_file())
        rapid = " ".join(rapid_path.read_text(encoding="utf-8").split())
        self.assertIn("Deferred verification permits speed, never fabrication.", rapid)
        for factual_atom in (
            "date",
            "person",
            "experiment",
            "quotation",
            "chronology",
            "motive",
            "mechanism",
        ):
            with self.subTest(factual_atom=factual_atom):
                self.assertIn(factual_atom, rapid)
        self.assertIn(
            "Omit unavailable specificity or write around it; do not fill the gap.",
            rapid,
        )

    def test_reward_outcome_does_not_establish_the_scoring_mechanism(self) -> None:
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        self.assertIn(
            "A reported reward outcome does not by itself establish the scoring "
            "mechanism, what the agent optimized, or why the reward was issued.",
            rapid,
        )
        self.assertIn(
            "Until evidence supplies that link, describe only the outcome and frame "
            "the mechanism as a question or hypothesis.",
            rapid,
        )
        self.assertIn(
            "Confirmed factual anchors outrank assertions already present in a draft "
            "or selected passage.",
            rapid,
        )
        self.assertIn(
            "When the mechanism is unknown, use no declarative score, metric, or "
            "optimization claim, even as a joke; turn it into a question.",
            rapid,
        )

    def test_rapid_operations_are_independent_and_selection_scoped(self) -> None:
        rapid_path = SKILL_ROOT / "references/rapid-prototyping.md"
        self.assertTrue(rapid_path.is_file())
        rapid = " ".join(
            rapid_path.read_text(encoding="utf-8").split()
        )
        for heading in (
            "### Generate",
            "### Review",
            "### Rewrite selection",
            "### Generate alternatives",
            "### Promote",
        ):
            with self.subTest(heading=heading):
                self.assertIn(heading, rapid)
        contracts = (
            "Return findings only; do not rewrite the supplied text.",
            "Return only the replacement for the supplied selection unless Martin "
            "requests commentary.",
            "Keep the source selection unchanged and return clearly separated, "
            "genuinely distinct choices for the same narrative job.",
            "Do not depend on hidden conversational state.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, rapid)

    def test_topic_input_boundary_routes_only_raw_subjects_through_angle_proposals(
        self,
    ) -> None:
        skill_text = SKILL_MD.read_text(encoding="utf-8")
        required_context_heading = "## Required project context\n"
        choose_operation_heading = "## Choose the operation\n"
        self.assertTrue(
            required_context_heading in skill_text,
            "script skill is missing the Required project context heading",
        )
        self.assertTrue(
            choose_operation_heading in skill_text,
            "script skill is missing the Choose the operation heading",
        )
        required_context_start = skill_text.index(required_context_heading)
        choose_operation_start = skill_text.index(choose_operation_heading)
        self.assertLess(
            required_context_start,
            choose_operation_start,
            "Required project context must precede Choose the operation",
        )
        required_context = skill_text[
            required_context_start + len(required_context_heading) :
            choose_operation_start
        ]
        normalized_required_context = " ".join(required_context.split())

        contracts = (
            "A raw subject alone is not a selected topic brief.",
            "For a new episode supplied only as a raw subject, invoke the bounded "
            "`choosing-whp-video-topic` `Ideate subjects/angles` operation and return "
            "multiple exact angle proposals without choosing a winner.",
            "Stop after returning the proposals; do not begin architecture until "
            "Martin supplies or approves one exact angle.",
            "Preserve a supplied or approved angle without reopening selection.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertTrue(
                    contract in normalized_required_context,
                    f"required project context is missing input boundary: {contract}",
                )
        self.assertNotIn(
            "return the exact angle proposal before architecture.",
            normalized_required_context,
            "raw-subject routing must not collapse bounded ideation to one proposal",
        )

        link_pattern = re.compile(
            r"(?<!!)\[[^\]\n]+\]\(\s*"
            r"(?P<destination><[^>\n]+>|[^)\s]+)"
            r"(?:\s+(?:\"[^\"]*\"|'[^']*'|\([^)]*\)))?\s*\)"
        )
        expected_target = (
            SKILL_ROOT.parent
            / "choosing-whp-video-topic/references/research-method.md"
        ).resolve()
        expected_fragment = "subject-to-angle-development"
        owner_links = []
        for match in link_pattern.finditer(required_context):
            destination = match.group("destination")
            if destination.startswith("<") and destination.endswith(">"):
                destination = destination[1:-1]
            target_ref, separator, fragment = destination.partition("#")
            if not separator or not target_ref:
                continue
            target_path = (SKILL_MD.parent / target_ref).resolve()
            if (
                target_path == expected_target
                and fragment == expected_fragment
            ):
                owner_links.append((target_path, fragment))

        self.assertEqual(
            owner_links,
            [(expected_target, expected_fragment)],
            "required project context must contain exactly one resolvable "
            "subject-to-angle owner link",
        )
        self.assertTrue(
            expected_target.is_file(),
            f"subject-to-angle owner target does not exist: {expected_target}",
        )
        expected_heading = "## Subject-to-angle development"
        self.assertIn(
            expected_heading,
            expected_target.read_text(encoding="utf-8").splitlines(),
            f"subject-to-angle owner target lacks {expected_heading}",
        )

    def test_selected_topic_brief_is_consumed_without_rerunning_ideation(self) -> None:
        rapid_path = SKILL_ROOT / "references/rapid-prototyping.md"
        self.assertTrue(rapid_path.is_file())
        rapid = " ".join(
            rapid_path.read_text(encoding="utf-8").split()
        )
        self.assertIn(
            "Treat a supplied selected topic brief as the handoff from topic "
            "selection; do not rerun topic ideation unless Martin explicitly asks.",
            rapid,
        )
        for field in (
            "topic and angle",
            "audience",
            "title and thumbnail promise",
            "core tension or open question",
            "by-end viewer promise",
            "intended payoff",
            "factual anchors",
            "important unknowns",
        ):
            with self.subTest(field=field):
                self.assertIn(field, rapid)

    def test_rapid_hook_contract_includes_question_relevance_and_promise(self) -> None:
        rapid_path = SKILL_ROOT / "references/rapid-prototyping.md"
        self.assertTrue(rapid_path.is_file())
        rapid = " ".join(
            rapid_path.read_text(encoding="utf-8").split()
        )
        hook = (
            "event → joke → paradox → meaning → consequential question → viewer "
            "relevance → by-end promise"
        )
        self.assertIn(hook, rapid)
        for contract in (
            "Open with a concrete event",
            "State the big question",
            "Connect the problem to the viewer",
            "Promise what the viewer will understand, recognize, identify, or be able "
            "to do by the end",
            "Follow every non-obvious abstraction with a concrete example, image, or "
            "consequence",
            "term as promise → story as evidence → analogy as recognition → application",
            "Push mechanism-derived humor to the stronger second or third beat",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, rapid)
        self.assertIn(
            "For every generated episode opening or full narration, state the by-end "
            "promise inside the opening; a later takeaway does not substitute for it.",
            rapid,
        )
        self.assertIn(
            "establish the event and consequential question before delivering the "
            "by-end promise",
            rapid,
        )
        self.assertIn(
            "Do not lead with the promise before the question it answers.",
            rapid,
        )

    def test_problem_led_intro_uses_the_five_move_anti_skip_contract(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        sequence = (
            "intriguing question → narrator's former defense → evidence that "
            "overturned it → early remedy promise → real case"
        )
        ordering = (
            "Complete the first four moves before detailed case exposition."
        )
        teaser_boundary = (
            "A short sourced result may tease the case during the disarm; develop "
            "the real story only after the promise."
        )

        for contract in (sequence, ordering, teaser_boundary):
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, sources["rapid"])
            for consumer in ("skill", "story", "steering"):
                with self.subTest(consumer=consumer, contract=contract):
                    self.assertNotIn(contract, sources[consumer])

        consumer_contracts = {
            "skill": (
                "Keep the narrator stance truthful, ground the disarm in observed "
                "behavior rather than attributed inner states, and place a literal "
                "remedy before detailed case exposition.",
                "[the rapid drafting method](references/rapid-prototyping.md)",
            ),
            "story": (
                "Story planning owns anti-skip selection and remedy placement; rapid "
                "drafting owns the sequence, evidence interpretation, and wording.",
                "[the rapid anti-skip method]"
                "(rapid-prototyping.md#use-the-five-move-anti-skip-intro)",
            ),
            "steering": (
                "Use a truthful narrator stance and observed proof, place the literal "
                "remedy before detailed case exposition, and never attribute "
                "participant inner states or invent research chronology.",
                "[the rapid anti-skip owner]"
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "rapid-prototyping.md#use-the-five-move-anti-skip-intro)",
            ),
        }
        for consumer, contracts in consumer_contracts.items():
            for contract in contracts:
                with self.subTest(consumer=consumer, contract=contract):
                    self.assertIn(contract, sources[consumer])

        self.assertIn(
            "### Use the five-move anti-skip intro",
            RAPID_MD.read_text(encoding="utf-8"),
        )

    def test_anti_skip_speed_preserves_conversational_logic(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Move through the first four jobs as soon as the conversation logically "
            "allows, but no sooner.",
            "The defense must answer the opening question instead of appearing as a "
            "free-floating reaction.",
            "Introduce the case by stating why it challenges that defense before "
            "giving the minimum factual teaser.",
            "Speed comes from cutting detail, not from deleting the connective "
            "sentence that gives the next beat a referent and a reason to exist.",
        )

        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, rapid)

    def test_natural_package_has_distinct_line_and_loop_owners(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "blueprint": " ".join(
                BLUEPRINT_WORKFLOW_MD.read_text(encoding="utf-8").split()
            ),
            "rubric": " ".join(RUBRIC_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(STEERING_MD.read_text(encoding="utf-8").split()),
        }
        rapid_contracts = (
            "### Keep story devices inside the conversation",
            "Natural conversational causality outranks every retention device.",
            "Engineer the structure underneath, but make the surface sound like one "
            "person naturally following a thought.",
            "A mini-hook is welcome in the intro or body when it is also the "
            "truthful connective to the next thought and the next line pays it "
            "immediately.",
            "Never add a generic curiosity phrase or force a mini-hook to satisfy a "
            "cadence.",
        )
        story_contracts = (
            "## Plan loops without withholding clarity",
            "An intro already tends to open the title question, the featured case, "
            "the explanation promise, and the remedy promise.",
            "Treat those as candidates, not a quota.",
            "Open another loop only when the viewer can still track the current "
            "thought and the Script Blueprint extended appendix's body logic map "
            "names its exact payoff.",
            "Never withhold prerequisite clarity to manufacture suspense.",
            "Use no fixed loop count.",
        )

        for contract in rapid_contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, sources["rapid"])
            for consumer in ("skill", "story", "blueprint", "rubric", "steering"):
                with self.subTest(consumer=consumer, excluded=contract):
                    self.assertNotIn(contract, sources[consumer])

        for contract in story_contracts:
            with self.subTest(owner="story", contract=contract):
                self.assertIn(contract, sources["story"])
            for consumer in ("skill", "rapid", "blueprint", "rubric", "steering"):
                with self.subTest(consumer=consumer, excluded=contract):
                    self.assertNotIn(contract, sources[consumer])

        owner_links = {
            "skill": (
                "(references/rapid-prototyping.md"
                "#keep-story-devices-inside-the-conversation)",
                "(references/story-and-hook-method.md"
                "#plan-loops-without-withholding-clarity)",
            ),
            "blueprint": (
                "(rapid-prototyping.md"
                "#keep-story-devices-inside-the-conversation)",
                "(story-and-hook-method.md"
                "#plan-loops-without-withholding-clarity)",
            ),
            "rubric": (
                "(story-and-hook-method.md"
                "#plan-loops-without-withholding-clarity)",
            ),
            "steering": (
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "rapid-prototyping.md#keep-story-devices-inside-the-conversation)",
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "story-and-hook-method.md#plan-loops-without-withholding-clarity)",
            ),
        }
        for consumer, links in owner_links.items():
            for link in links:
                with self.subTest(consumer=consumer, link=link):
                    self.assertIn(link, sources[consumer])

        retired_rule = "reserve most loops and mini-hooks for the body"
        for source_name, source in sources.items():
            with self.subTest(source=source_name, retired=retired_rule):
                self.assertNotIn(retired_rule, source.lower())

        fixed_cadence_patterns = (
            r"(?:roughly\s+)?every\s+~?\s*60[–-]90\s+seconds",
            r"roughly every ten to twenty spoken seconds",
        )
        for source_name, source in sources.items():
            for pattern in fixed_cadence_patterns:
                with self.subTest(source=source_name, retired_pattern=pattern):
                    self.assertIsNone(re.search(pattern, source, flags=re.IGNORECASE))

    def test_investigation_challenge_bridge_is_real_and_reserved(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contract = (
            "The challenge must be epistemically real, never manufactured drama "
            "or an invented personal event."
        )

        self.assertIn("investigation challenge", story)
        self.assertIn(contract, story)
        self.assertNotIn(contract, skill)
        self.assertNotIn(contract, rapid)
        self.assertIn(
            "For the detailed progression schema and structural story rules, "
            "follow the story and hook method.",
            skill,
        )
        self.assertIn(
            "[the story and hook method](references/story-and-hook-method.md)",
            skill,
        )
        self.assertIn("Derived from the structural story owner", rapid)
        self.assertIn(
            "[Build every story across the complete script]"
            "(story-and-hook-method.md#build-every-story-across-the-complete-script)",
            rapid,
        )

    def test_observable_resistance_can_disarm_the_immunity_defense(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        resistance = (
            "Treat measured skepticism, lower trust ratings, expertise, training, "
            "or prior warning as sufficient observable resistance; do not require "
            "proof of the participants' exact inner monologue."
        )
        invention_boundary = (
            "Do not invent thoughts, motives, or quotations for the people in the case."
        )
        allowed_comparison = (
            "narrator's former belief is his own voiced stance, confirmed by "
            "Martin at review."
        )

        for contract in (resistance, invention_boundary, allowed_comparison):
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, sources["rapid"])
            for consumer in ("skill", "story", "steering"):
                with self.subTest(consumer=consumer, contract=contract):
                    self.assertNotIn(contract, sources[consumer])

        self.assertIn(
            "Never invent factual scene details such as dialogue, weather, motives, "
            "thoughts, chronology, or sensory detail.",
            sources["skill"],
        )
        self.assertIn(
            "ground the disarm in observed behavior rather than attributed inner states",
            sources["skill"],
        )
        self.assertIn(
            "Selection may rely on observed behavior, never attributed participant "
            "thoughts or invented narrator history.",
            sources["story"],
        )
        self.assertIn(
            "never attribute participant inner states or invent research chronology",
            sources["steering"],
        )

    def test_quality_rubric_scores_anti_skip_promise_placement(self) -> None:
        rubric = " ".join(
            (SKILL_ROOT / "references/quality-rubric.md")
            .read_text(encoding="utf-8")
            .split()
        )
        self.assertIn(
            "A problem-led opening also scores 0 when it develops the proof case "
            "before stating the remedy promise.",
            rubric,
        )
        self.assertIn(
            "When an immunity defense is predictable, full credit requires [the "
            "five-move anti-skip sequence]"
            "(rapid-prototyping.md#use-the-five-move-anti-skip-intro) and places the "
            "remedy promise before "
            "detailed case exposition.",
            rubric,
        )

    def test_opening_proof_case_is_clear_on_first_hearing(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())

        first_hearing_contract = (
            "Test every factual hook as `intended goal → visible score or proxy → "
            "shortcut → absurd outcome`."
        )
        failure_contract = (
            "If a first-hearing listener must ask why the score improved, replace the "
            "example with a clearer documented case instead of adding a mechanism "
            "lecture to the hook."
        )
        joke_contract = (
            "The listener must understand the causal link before the punchline; humor "
            "may compress the consequence, but it never supplies missing logic."
        )

        for contract in (
            first_hearing_contract,
            failure_contract,
            joke_contract,
        ):
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )
        self.assertIn(
            "[the rapid drafting method]"
            "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
            story,
        )

    def test_enduring_failure_uses_an_early_case_and_current_echo(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())

        temporal_bridge = (
            "For an enduring failure pattern, pair one vivid early warning with one "
            "compact current echo that demonstrates persistence and present relevance."
        )
        echo_boundary = (
            "Keep the echo to the same causal mechanism; do not open a second full "
            "story or turn two examples into a universal claim."
        )
        callback_contract = (
            "Carry the opening's concrete vocabulary into the viewer application and "
            "final line when it clarifies the lesson; do not force a callback that "
            "makes the explanation less direct."
        )

        for contract in (temporal_bridge, echo_boundary, callback_contract):
            with self.subTest(owner="story", contract=contract):
                self.assertIn(contract, story)

        self.assertIn(
            "Preserve the Story engine, causal chain, selected moves, evidence "
            "boundaries, loops, and payoffs",
            rapid,
        )

    def test_rapid_viewer_promise_is_literal_and_joke_free(self) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        for contract in (
            "Write the by-end promise as a literal learning contract voiced as "
            "sharing, not lecturing",
            "Keep jokes, comic images, metaphors, and colorful callbacks out of the "
            "promise sentence",
            "never let the sharing voice smuggle in claims the evidence does not "
            "support",
            "Humor may surround the promise, but it must not complicate what the "
            "viewer will learn.",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, rapid)

    def test_rapid_research_event_names_known_date_and_institution(self) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        self.assertIn(
            "For a research-event opening, include the supplied or verified year and "
            "responsible institution or team when available.",
            rapid,
        )
        self.assertIn(
            "Do not replace a known attribution with generic ‘scientists’ or invent "
            "a university, city, lab, location, or affiliation.",
            rapid,
        )

    def test_rapid_adds_useful_informational_tidbits_without_trivia(self) -> None:
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        for contract in (
            "When a compact verified fact can deepen a concept without slowing the "
            "story, add one short informational tidbit.",
            "Use the tidbit to reveal an origin, scale, reversal, or consequence.",
            "Do not add decorative trivia that merely interrupts the story.",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, rapid)

    def test_examples_follow_a_real_world_consequence_chain(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        consequence_chain = (
            "goal → measure or target → changed behavior → improved number → "
            "damaged goal and human cost"
        )

        contracts = (
            "For each substantial point, prefer a compact documented real-world "
            "case already available within the factual boundary.",
            consequence_chain,
            "Earn humor from the mechanism, incentive, or institution, then state "
            "plainly what got worse and who absorbed the cost.",
            "If no suitable verified case is available, use a clearly labeled "
            "hypothetical; never make a plausible example sound historical.",
            "Prefer a documented real-world case for each substantial point and make "
            "its damaged goal and human cost explicit.",
        )
        for contract in contracts:
            with self.subTest(owner="story", contract=contract):
                self.assertIn(contract, story)

        self.assertIn("Derived from the structural story owner", rapid)
        self.assertIn(
            "[Build every story across the complete script]"
            "(story-and-hook-method.md#build-every-story-across-the-complete-script)",
            rapid,
        )

    def test_viewer_vulnerability_claims_require_direct_observed_proof(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(
                (SKILL_ROOT / "references/rapid-prototyping.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "story": " ".join(
                (SKILL_ROOT / "references/story-and-hook-method.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "brand": " ".join(
                (REPO_ROOT / "BRAND.md").read_text(encoding="utf-8").split()
            ),
        }

        contracts = {
            "skill": (
                "Do not ask the viewer to accept a material vulnerability claim on "
                "theory, analogy, or a hypothetical alone.",
                "A hypothetical may explain how a demonstrated mechanism works; it "
                "cannot prove that the mechanism affects real people.",
                "Treat any statement or implication that knowledge, intelligence, "
                "expertise, training, or skepticism fails to protect someone as a "
                "material vulnerability claim, even when phrased as a modest "
                "observation, question, or transition.",
            ),
            "rapid": (
                "observed case → exact result → comfortable defense defeated → scope "
                "boundary → episode mechanism",
                "If the opening says informed, trained, expert, or skeptical people "
                "are still vulnerable, prove that exact claim with a documented "
                "observed case involving that population.",
                "No matching observed case means no anti-immunity claim: use the "
                "allowed targeted proof-case lookup, narrow the relevance, or return "
                "the evidence gap instead of drafting around it.",
            ),
            "story": (
                "Evidence that people followed wrong AI advice does not by itself "
                "prove sycophancy.",
            ),
            "steering": (
                "When an opening says informed, trained, expert, or skeptical viewers "
                "can still be affected, earn that relevance with a documented "
                "observed case involving the claimed population.",
            ),
            "brand": (
                "Do not ask the audience to accept a real-world vulnerability or "
                "consequence from theory alone.",
            ),
        }

        for source_name, required in contracts.items():
            for contract in required:
                with self.subTest(source=source_name, contract=contract):
                    self.assertIn(contract, sources[source_name])

    def test_adjacent_cases_require_an_explicit_inference_bridge(self) -> None:
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        architecture = " ".join(
            ARCHITECTURE_MD.read_text(encoding="utf-8").split()
        )
        bridge = (
            "case → exact takeaway → why it matters here → remaining question → "
            "next evidence"
        )

        self.assertIn(bridge, story)
        self.assertIn(
            "A scope boundary is not a transition.",
            story,
        )
        self.assertIn(
            "For every proof case, state what it proves, why the episode needs that "
            "fact, what it does not explain, and how the next evidence resolves the "
            "remaining question.",
            architecture,
        )

    def test_proof_handoffs_lead_with_the_positive_takeaway(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Lead with the positive takeaway; never begin the bridge with “this "
            "study did not…” or an equivalent disclaimer.",
            "Use the limitation only after the viewer knows why the case belongs.",
        )

        for contract in contracts:
            with self.subTest(owner="story", contract=contract):
                self.assertIn(contract, story)

        self.assertIn("Derived from the structural story owner", rapid)
        self.assertIn(
            "[Build every story across the complete script]"
            "(story-and-hook-method.md#build-every-story-across-the-complete-script)",
            rapid,
        )

    def test_punchlines_stay_short_and_separate_from_explanation(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Separate setup from punchline.",
            "Keep a standalone punchline to one short spoken sentence—usually no "
            "more than 12 words.",
            "If the joke needs a relative clause or a second sentence to explain "
            "it, rewrite it.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )
        self.assertIn(
            "[the rapid drafting method]"
            "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
            story,
        )

    def test_narration_uses_the_friendly_conversation_format(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        contracts = (
            "Write like a smart friend on a walk sharing something he dug into, "
            "not like a presenter, paper abstract, conference talk, or legal "
            "disclaimer.",
            "fact → plain reaction → why it matters → next question",
            "Use contractions, direct address, and brief controlled hyperbole when "
            "they sound natural.",
            "Friendly does not mean filler, invented dialogue, weakened caveats, or "
            "jokes inside the learning promise.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, sources["rapid"])
            for consumer in ("skill", "story", "steering"):
                with self.subTest(consumer=consumer, contract=contract):
                    self.assertNotIn(contract, sources[consumer])

        self.assertIn(
            "Run the spoken-readability and walking-conversation checks on "
            "`blueprint/script.raw.md` only.",
            sources["skill"],
        )
        self.assertIn(
            "The narrator stays a peer, never above the viewer.",
            sources["steering"],
        )
        self.assertIn(
            "[the rapid voice owner]"
            "(../.agents/skills/writing-whp-youtube-scripts/references/"
            "rapid-prototyping.md#write-for-speech-and-momentum)",
            sources["steering"],
        )
        self.assertIn(
            "## Write for speech and momentum",
            RAPID_MD.read_text(encoding="utf-8"),
        )

    def test_voice_keeps_factual_precision_without_emotional_sterilization(
        self,
    ) -> None:
        sources = {
            "brand": " ".join(
                (REPO_ROOT / "BRAND.md").read_text(encoding="utf-8").split()
            ),
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        core_principle = (
            "Precision controls what we claim. Personality controls how we say it."
        )

        for source_name in ("brand", "rapid", "steering"):
            with self.subTest(source=source_name):
                self.assertIn(core_principle, sources[source_name])

        voice_contracts = (
            "Write like a well-educated best friend with a brutal sense of humor.",
            "Do not confuse factual precision with sterile vocabulary.",
            "Blunt judgment, emotionally loaded everyday words, and controlled "
            "hyperbole are allowed when they make the stakes clearer and the "
            "underlying claim remains supportable.",
            "Judge the decision, behavior, mechanism, or institution—not a person's "
            "inherent worth.",
        )
        for contract in voice_contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, sources["rapid"])
            for consumer in ("skill", "story", "steering"):
                with self.subTest(consumer=consumer, contract=contract):
                    self.assertNotIn(contract, sources[consumer])

        steering_contracts = (
            "The narrator stays a peer, never above the viewer.",
            "Claim personal research chronology only when Martin supplied or "
            "confirmed it.",
            "First-person narrator reactions and direct-address check-ins are "
            "optional tools used only when the approved plan and material earn "
            "them; neither is a per-beat quota.",
            "Emotional directness and humor may sharpen supported stakes, but they "
            "never lower the evidence bar or target vulnerable people.",
            "[the rapid voice owner]"
            "(../.agents/skills/writing-whp-youtube-scripts/references/"
            "rapid-prototyping.md#write-for-speech-and-momentum)",
        )
        for contract in steering_contracts:
            with self.subTest(source="steering", contract=contract):
                self.assertIn(contract, sources["steering"])

    def test_source_label_studies_keep_the_item_source_and_outcome_visible(
        self,
    ) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "For a source-label experiment, narrate the visible chain with the "
            "story's locked nouns: `item or question → claimed source → "
            "participant objective or outcome`.",
            "If researchers labeled human-written material as AI-generated, state "
            "what was real, what was only a label, and what human behavior the "
            "manipulation tested before interpreting the result.",
            "Attach every correct-or-incorrect count to its stable noun; never "
            "leave the listener guessing which item or final outcome was wrong.",
            "Separate what the case proves about human response from what later "
            "evidence proves about AI behavior.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )
        self.assertIn(
            "[the rapid drafting method]"
            "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
            story,
        )

    def test_story_uses_the_fewest_elements_that_preserve_causal_truth(
        self,
    ) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Use the fewest story elements that preserve the causal truth.",
            "Remove or collapse technical inputs, intermediate objects, roles, and "
            "counts when the mechanism remains accurate without them.",
            "Keep separate only the entities the listener must distinguish to "
            "understand the manipulation and result.",
            "An accurate detail does not earn narration time merely because it "
            "appears in the source.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )
        self.assertIn(
            "[the rapid drafting method]"
            "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
            story,
        )

    def test_story_compression_preserves_trust_clarity_and_magnetism(
        self,
    ) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Tell the smallest story that preserves trust, causal clarity, and "
            "surprise.",
            "Every story element must earn its place by increasing trust, "
            "first-hearing clarity, or magnetism; otherwise cut or collapse it.",
            "Open a documented story with a compact trust anchor: verified date "
            "and place when available, plus the relevant person, team, or "
            "institution when it adds credibility or orientation.",
            "Make the stages audible without sounding like slide labels.",
            "Use natural connective language that explains what changes next—such "
            "as “So that was the setup,” “Then researchers changed one thing,” "
            "or “And this is the kicker”—and vary it to fit the story.",
            "Do not march through repeated “Here was…” labels or expose the "
            "outline as meta-commentary.",
            "A transition should explain what changes next, not merely announce "
            "the section.",
            "When a result creates a clean comic opening, add one short punchline "
            "that sharpens the mechanism, consequence, or AHA; skip it when it "
            "competes with the lesson.",
            "Do not simplify past the causal hinge, material caveat, or evidence "
            "boundary.",
            "Spend the attention you save on the surprising turn, consequence, "
            "or AHA that carries the lesson.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )
        self.assertIn(
            "[the rapid drafting method]"
            "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
            story,
        )

    def test_story_compression_preserves_causal_completeness(
        self,
    ) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Compression removes clutter, never connective tissue.",
            "Before naming a result, introduce every actor, group, task, goal, "
            "success criterion, metric, and comparison it depends on.",
            "For an experiment, preserve this causal-completeness sequence: "
            "`participants → exact task → group split → changed variable → "
            "measured result → meaning`.",
            "State the task as an observable action with a success criterion, "
            "then report the result in the same concrete vocabulary.",
            "Name both the metric and the comparator in every comparison.",
            "Do not replace a concrete noun from the setup with an undefined "
            "abstraction in the result.",
            "Distinguish an expressed reaction from an effective behavioral "
            "response; do not call the reaction absent when an attitude changed "
            "but performance did not.",
            "Prefer a concrete real-world analogy whose roles and action map "
            "point for point to the mechanism.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )
        self.assertIn(
            "[the rapid drafting method]"
            "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
            story,
        )

    def test_story_uses_causal_minimum_and_locked_vocabulary(
        self,
    ) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Preserve the causal minimum, not the procedural maximum.",
            "A teaser and its developed case have different detail budgets.",
            "In an anti-skip disarm, state only the relevant qualification or "
            "resistance and the fact that it failed to protect; defer the task, "
            "group split, metric, and comparator to the developed case.",
            "Describe a participant task by its audience-facing objective and "
            "success condition, not by response controls or interface options "
            "that do not advance the story.",
            "Lock the story vocabulary before drafting: give each entity one "
            "stable spoken name, and do not switch synonyms unless the narration "
            "explicitly introduces the relationship.",
            "Use the broadest truthful role label that keeps different actors "
            "easy to distinguish; preserve a narrower title only when it matters "
            "to the causal claim.",
            "Describe the changed variable with nouns already established in the "
            "story.",
            "State a measurement as the measured object plus the measured "
            "property, such as `diagnoses → trustworthiness`.",
            "Name the container in a learning promise: write “By the end of this "
            "video” rather than leaving “by the end” without a referent.",
            "Compress a formal task to its practical purpose only when the "
            "paraphrase preserves the scored objective and does not invent a "
            "different instruction.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )
        self.assertIn(
            "[the rapid drafting method]"
            "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
            story,
        )

    def test_structural_story_contract_lives_in_story_owner(
        self,
    ) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        contracts = (
            "Apply these story-construction rules to every beat and developed "
            "example in the complete script, not only to the opening.",
            "Before a surprising result, state the outcome the viewer should "
            "reasonably expect when that expectation is necessary to understand "
            "why the result matters.",
            "Reveal the result in direct contrast to that expectation.",
            "After the result, use at most one mechanism-mapped punchline and one "
            "precise takeaway before moving forward.",
            "Do not restate the same result through a stack of analogies, "
            "paraphrases, and thesis lines.",
            "When consecutive cases prove different parts of the argument, name "
            "each case's distinct proof job before combining them.",
            "The synthesis may combine established findings; it must not make "
            "either case appear to prove the other case's claim.",
            "Prefer everyday spoken language over research-administration phrases "
            "when both preserve the same claim.",
            "End each beat once: choose the strongest closing image or joke, state "
            "one exact lesson, and transition.",
        )

        for contract in contracts:
            with self.subTest(owner="story", contract=contract):
                self.assertIn(contract, story)

        self.assertIn(
            "For the detailed progression schema and structural story rules, "
            "follow the story and hook method.",
            skill,
        )
        self.assertIn(
            "[the story and hook method](references/story-and-hook-method.md)",
            skill,
        )
        self.assertIn("Derived from the structural story owner", rapid)
        self.assertIn(
            "[Build every story across the complete script]"
            "(story-and-hook-method.md#build-every-story-across-the-complete-script)",
            rapid,
        )

        rubric = " ".join(
            RUBRIC_MD.read_text(encoding="utf-8").split()
        )
        rubric_contracts = (
            "When an expectation is needed",
            "one mechanism-mapped punchline and one exact takeaway",
            "Adjacent cases keep their proof jobs distinct",
            "each beat closes once",
        )
        for contract in rubric_contracts:
            with self.subTest(source="rubric", contract=contract):
                self.assertIn(contract, rubric)

    def test_spoken_readability_is_a_pre_delivery_hard_gate(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        contracts = (
            "Readability is a delivery gate, not a post-draft editorial audit.",
            "A sentence above 25 spoken words fails and must be rewritten before "
            "delivery.",
            "Every sentence from 21 through 25 spoken words requires a "
            "first-hearing review.",
            "A shorter sentence also fails when difficult vocabulary and multiple "
            "relationships make it hard to process.",
            "A sentence of any length fails when a first-hearing listener cannot "
            "identify who did what, what changed, and why it matters.",
            "Split difficult sentences without deleting evidence boundaries, "
            "connective tissue, humor, or personality.",
        )

        for contract in contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, sources["rapid"])
            for consumer in ("skill", "story", "steering"):
                with self.subTest(consumer=consumer, contract=contract):
                    self.assertNotIn(contract, sources[consumer])

        for contract in (
            "Spoken readability is mandatory before returning the Script Blueprint "
            "intro, draft narration, or final narration. Run it on each stage's "
            "`script.raw.md`.",
            "Use 25 spoken words as a hard ceiling. Send every 21–25-word line "
            "through first-hearing review, and reject shorter lines when actor, "
            "action, relationship, or consequence remains unclear.",
            "> Detailed line-level owner: [the rapid drafting method]"
            "(references/rapid-prototyping.md).",
        ):
            with self.subTest(source="skill", contract=contract):
                self.assertIn(contract, sources["skill"])

        for contract in (
            "Story planning retains structural and evidence-boundary responsibility; "
            "rapid drafting owns line-level voice, speech, and readability.",
            "[the rapid spoken-delivery method]"
            "(rapid-prototyping.md#write-for-speech-and-momentum)",
            "[its readability gate]"
            "(rapid-prototyping.md#pass-the-spoken-readability-delivery-gate)",
        ):
            with self.subTest(source="story", contract=contract):
                self.assertIn(contract, sources["story"])

        for contract in (
            "Keep the 25-word ceiling and first-hearing review as permanent delivery "
            "requirements; detailed line-level checks live in",
            "[the rapid spoken-readability owner]"
            "(../.agents/skills/writing-whp-youtube-scripts/references/"
            "rapid-prototyping.md#pass-the-spoken-readability-delivery-gate)",
        ):
            with self.subTest(source="steering", contract=contract):
                self.assertIn(contract, sources["steering"])

        rapid_raw = RAPID_MD.read_text(encoding="utf-8")
        for heading in (
            "## Write for speech and momentum",
            "## Pass the spoken-readability delivery gate",
        ):
            with self.subTest(target="rapid", heading=heading):
                self.assertIn(heading, rapid_raw)

        rubric = " ".join(
            (SKILL_ROOT / "references/quality-rubric.md")
            .read_text(encoding="utf-8")
            .split()
        )
        for contract in (
            "No spoken sentence exceeds 25 words.",
            "Every 21–25-word sentence has passed a first-hearing review.",
            "Shorter sentences still fail when vocabulary, structure, or unclear "
            "relationships make them difficult to process.",
        ):
            with self.subTest(source="rubric", contract=contract):
                self.assertIn(contract, rubric)

        command = (
            'python3 scripts/check_spoken_readability.py -- "<resolved-script-path>"'
        )
        self.assertIn(command, SKILL_MD.read_text(encoding="utf-8"))

    def test_narrator_voice_is_earned_and_research_chronology_is_truthful(
        self,
    ) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        rapid = sources["rapid"]
        steering = sources["steering"]

        for forbidden in (
            "Does each major beat carry at least one first-person narrator reaction "
            "and one direct-address check-in",
            "Each major beat carries a first-person narrator reaction and a "
            "direct-address check-in",
        ):
            for source_name, source in sources.items():
                with self.subTest(source=source_name, forbidden=forbidden):
                    self.assertNotIn(forbidden, source)

        quota = (
            r"\b(?:(?:each|every) (?:major )?beat|"
            r"per[- ](?:major[- ])?beat)\b"
        )
        voice = r"\b(?:first-person|direct-address)\b"
        mandate = (
            r"\b(?:carries|contains|includes|requires|needs|has|have|must|should|"
            r"mandatory|required|quota)\b"
        )
        span = r"(?:(?!\b(?:neither|not|optional)\b).){0,160}"
        mandatory_quota_patterns = (
            quota + span + mandate + span + voice,
            quota + span + voice + span + mandate,
            voice + span + mandate + span + quota,
            voice + span + quota + span + mandate,
            r"\bat least one " + voice + span + quota,
        )
        for forbidden_example in (
            "Per-beat first-person reactions are mandatory.",
            "Direct-address check-ins are required in every major beat.",
            "Every major beat must carry a first-person narrator reaction.",
        ):
            with self.subTest(forbidden_example=forbidden_example):
                self.assertTrue(
                    any(
                        re.search(
                            pattern,
                            forbidden_example,
                            flags=re.IGNORECASE,
                        )
                        for pattern in mandatory_quota_patterns
                    )
                )

        for source_name, source in sources.items():
            for pattern in mandatory_quota_patterns:
                with self.subTest(source=source_name, pattern=pattern):
                    self.assertIsNone(re.search(pattern, source, flags=re.IGNORECASE))

        self.assertIn(
            "Use a first-person narrator reaction or direct-address check-in only "
            "when the approved plan and material earn it; neither is required in "
            "every major beat.",
            rapid,
        )
        self.assertIn(
            "First-person narrator reactions and direct-address check-ins are "
            "optional tools used only when the approved plan and material earn "
            "them; neither is a per-beat quota.",
            steering,
        )

        anti_skip_claim = "sent the narrator digging"
        anti_skip_guard = (
            "Say that the result sent the narrator digging only when Martin supplied "
            "or confirmed that chronology; otherwise state only how the observed "
            "result changes the episode question."
        )
        stance_claim = (
            "I assumed X → then I ran into Y and dug in → here's what I found"
        )
        stance_guard = (
            "Use that stance arc only when Martin supplied or confirmed the research "
            "chronology; otherwise keep the peer voice without claiming when or why "
            "the digging happened."
        )
        for claim, guard in (
            (anti_skip_claim, anti_skip_guard),
            (stance_claim, stance_guard),
        ):
            with self.subTest(claim=claim):
                claim_index = rapid.index(claim)
                guard_index = rapid.index(guard)
                self.assertLess(claim_index, guard_index)
                self.assertLess(guard_index - claim_index, 700)

        self.assertIn(
            "Claim personal research chronology only when Martin supplied or "
            "confirmed it.",
            steering,
        )

    def test_complete_episode_promise_names_understanding_and_response(
        self,
    ) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(
                (SKILL_ROOT / "references/rapid-prototyping.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "story": " ".join(
                (SKILL_ROOT / "references/story-and-hook-method.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        contract = (
            "A complete-episode promise must name both the understanding the "
            "viewer will gain and the concrete response they will be able to use."
        )

        # The story method owns the promise contract; SKILL.md and STEERING.md repeat
        # it as always-loaded gates. The rapid method states the same requirement in
        # its own drafting words rather than a third verbatim copy.
        for source_name in ("skill", "story", "steering"):
            with self.subTest(source=source_name):
                self.assertIn(contract, sources[source_name])
        with self.subTest(source="rapid"):
            self.assertIn(
                "make that promise reflect both halves of the approved contract: the "
                "new understanding and the concrete response the viewer will be able "
                "to use.",
                sources["rapid"],
            )
            self.assertNotIn(contract, sources["rapid"])

    def test_case_selection_prefers_western_audience_proximity_after_proof_fit(
        self,
    ) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(
                (SKILL_ROOT / "references/rapid-prototyping.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "architecture": " ".join(
                (SKILL_ROOT / "references/script-architecture.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }
        preference = (
            "Prefer a well-supported Western case when one can perform the same "
            "proof job clearly."
        )
        fallback = (
            "Use the strongest non-Western case when no Western candidate passes "
            "the evidence, causal-fit, consequence, and spoken-clarity gates."
        )

        for source_name, source_text in sources.items():
            with self.subTest(source=source_name):
                self.assertIn(preference, source_text)
                self.assertIn(fallback, source_text)

    def test_worldwide_patterns_use_novel_cases_then_a_global_montage(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())

        main_contract = (
            "For a worldwide pattern, prefer a strong lesser-known case for the "
            "developed story when it offers useful surprise, then use a short "
            "montage of recognizable cases to demonstrate global scope."
        )
        detailed_contract = (
            "After the developed examples, name roughly three familiar cases with "
            "years in one compact line, spread across regions when possible, and "
            "give only enough context to reveal the shared pattern rather than "
            "opening three new stories."
        )
        priority_contract = (
            "Evidence quality, causal fit, human consequence, and factual support "
            "remain gates; novelty and recognition serve different narrative jobs."
        )

        for contract in (main_contract, detailed_contract, priority_contract):
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

    def test_unfamiliar_names_are_prepared_and_introduced(self) -> None:
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        core_contract = (
            "Prepare every unfamiliar proper name before first use, then identify "
            "it and explain its relevance; never drop a name as if the viewer "
            "missed an earlier introduction."
        )
        detailed_contract = (
            "Use `prepare the new idea or role → give the name → identify the "
            "person, institution, place, or concept → explain why it matters here`."
        )
        cold_name_warning = (
            "A sentence such as ‘Donald Campbell warned’ is incomplete when the "
            "viewer has not met him; first signal the harsher phenomenon, name "
            "Campbell's law, and identify Campbell in plain language."
        )
        for contract in (core_contract, detailed_contract, cold_name_warning):
            with self.subTest(owner="rapid", contract=contract):
                self.assertIn(contract, rapid)

    def test_complete_narration_closes_with_a_declarative_lesson(self) -> None:
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        contract = (
            "Close a complete narration with a declarative line that resolves the "
            "central question and states the lesson; do not end on an unanswered "
            "question alone."
        )
        self.assertIn(contract, story)
        self.assertIn(contract, rapid)

    def test_compact_promise_gives_questions_the_viewer_can_ask_ai(self) -> None:
        rapid = (
            SKILL_ROOT / "references/rapid-prototyping.md"
        ).read_text(encoding="utf-8")
        spoken_example = " ".join(
            line.removeprefix("> ").strip()
            for line in rapid.splitlines()
            if line.startswith(">")
        )
        self.assertIn(
            "By the end of this video, you will understand how an AI can satisfy "
            "your words while missing your goal, and you will know four questions "
            "you can ask it to check whether its answer addresses your real "
            "problem.",
            spoken_example,
        )
        self.assertIn(
            "When the promise asks an AI to help audit its own answer, describe the "
            "questions as a way to surface gaps or help check the result, not as proof "
            "that the answer is correct.",
            " ".join(rapid.split()),
        )

    def test_phase_two_maps_each_factual_statement_to_an_adjacent_source(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        research = " ".join(
            (SKILL_ROOT / "references/research-and-rights.md")
            .read_text(encoding="utf-8")
            .split()
        )
        format_text = " ".join(
            (SKILL_ROOT / "references/annotated-script-format.md")
            .read_text(encoding="utf-8")
            .split()
        )
        template = " ".join(
            (SKILL_ROOT / "assets/annotated-script-template.md")
            .read_text(encoding="utf-8")
            .split()
        )
        contract = (
            "Map every factual narration sentence or separable factual clause to at "
            "least one `F-###` ID in the matching appendix beat's `#### Claims` "
            "section."
        )
        self.assertIn(contract, skill)
        self.assertIn(contract, format_text)
        # The format owns the mapping contract; the research method routes to it.
        self.assertIn(
            "exactly as [the annotated script format]"
            "(annotated-script-format.md#numbered-narration-only-beats) requires. That "
            "file owns the claim-mapping and inline-indicator contract; this method "
            "owns only which evidence earns the mapping.",
            research,
        )
        self.assertIn(
            "Do not add evidence source markers to scoped prototypes unless Martin "
            "explicitly asks.",
            skill,
        )
        self.assertIn(
            "Quote the supported narration wording in each claim entry so the source "
            "mapping stays visible outside the spoken narration.",
            format_text,
        )
        self.assertIn(
            "Supports narration: “In a 2022 experiment, bumblebees had an "
            "unobstructed path to food.",
            template,
        )
        # The worked Claims entry quotes only the factual sentences it supports and
        # stops at the criteria result; interpretation and viewer-application lines
        # make no empirical claim, so they are named as unmapped instead of quoted.
        self.assertIn(
            "The researchers said this met their operational play criteria.” — "
            "`VERIFIED`. The following interpretation and viewer-application lines "
            "make no separate empirical claim and carry no indicator.",
            template,
        )
        claims_quote = template.split("Supports narration: “", 1)[1].split("” —", 1)[0]
        self.assertNotIn("That does not tell us what a bee feels", claims_quote)
        self.assertNotIn("they cannot reveal the animal's inner experience", claims_quote)

    def test_phase_two_factual_claims_have_clickable_inline_source_indicators(
        self,
    ) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "research": " ".join(
                (SKILL_ROOT / "references/research-and-rights.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "format": " ".join(
                (SKILL_ROOT / "references/annotated-script-format.md")
                .read_text(encoding="utf-8")
                .split()
            ),
            "template": (
                SKILL_ROOT / "assets/annotated-script-template.md"
            ).read_text(encoding="utf-8"),
        }
        core_contract = (
            "Append a visible `[F-###](Original URL)` indicator immediately after every "
            "mapped factual narration sentence or separable factual clause."
        )
        non_spoken_contract = (
            "Treat inline evidence indicators as review annotations, not spoken words; "
            "exclude them from narration extraction, word count, table reads, and "
            "teleprompter output."
        )
        for source_name in ("skill", "format"):
            with self.subTest(source=source_name, contract="core"):
                self.assertIn(core_contract, sources[source_name])
            with self.subTest(source=source_name, contract="non-spoken"):
                self.assertIn(non_spoken_contract, sources[source_name])
        with self.subTest(source="research", contract="delegates"):
            self.assertNotIn(core_contract, sources["research"])
        marker = "[F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)"
        template_narration = sources["template"].split(
            "## 1. The detour\n", 1
        )[1].split("\n## Appendix", 1)[0]
        worked_narration = " ".join(
            line.removeprefix("> ").strip()
            for line in template_narration.splitlines()
            if line.startswith("> ")
        )
        required_placements = (
            "In a 2022 experiment, bumblebees had an unobstructed path to "
            f"food. {marker}",
            "Some detoured into an object area, contacted wooden balls, and rolled "
            f"them repeatedly without a food reward. {marker}",
            "The researchers said this met their operational play criteria. "
            f"{marker}",
        )
        for placement in required_placements:
            with self.subTest(template_placement=placement):
                self.assertIn(placement, worked_narration)
        # Only the three factual sentences carry indicators: the interpretation clause
        # and the viewer-application lines make no empirical efficacy claim.
        forbidden_placements = (
            f"That does not tell us what a bee feels {marker}",
            f"inner experience. {marker}",
        )
        for placement in forbidden_placements:
            with self.subTest(template_forbidden=placement):
                self.assertNotIn(placement, worked_narration)
        self.assertEqual(worked_narration.count(marker), 3)

    def test_rapid_hook_supports_an_honest_question_first_entry(self) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        self.assertIn(
            "Use the strongest honest entry: question-first or event-first.",
            rapid,
        )
        self.assertIn(
            "A question-first opening asks a precise viewer-level question the "
            "episode can answer",
            rapid,
        )
        self.assertIn(
            "Ground it immediately in the concrete event.",
            rapid,
        )
        self.assertIn(
            "question → event → joke → paradox → meaning → viewer relevance → "
            "by-end promise",
            rapid,
        )
        self.assertIn(
            "Do not use words such as ‘lies,’ ‘cheats,’ or ‘wants’ as literal "
            "claims of intent",
            rapid,
        )

    def test_rapid_opening_uses_plain_syntax_in_its_first_two_sentences(self) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        self.assertIn(
            "For a generated episode opening or full narration, keep each of the "
            "first two spoken sentences to one idea.",
            rapid,
        )
        self.assertIn(
            "Use everyday words and syntax; replace technical compound phrases when "
            "simpler wording preserves meaning.",
            rapid,
        )

    def test_rapid_opening_does_not_front_load_technical_setup_labels(self) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        self.assertIn(
            "Do not spend either opening sentence on a technical setup label such "
            "as ‘simulated block-stacking experiment.’",
            rapid,
        )
        self.assertIn(
            "State the human-readable premise first; move experimental qualifiers "
            "and mechanism detail after the hook.",
            rapid,
        )

    def test_rapid_quality_check_repeats_the_opening_guardrails(self) -> None:
        rapid = (
            SKILL_ROOT / "references/rapid-prototyping.md"
        ).read_text(encoding="utf-8")
        checklist = " ".join(
            rapid.split("## Rapid quality check\n", 1)[1]
            .split("\n## Common mistakes", 1)[0]
            .split()
        )
        self.assertIn(
            "If the opening starts with a question, can the episode answer it, and "
            "does the concrete event follow immediately?",
            checklist,
        )
        self.assertIn(
            "Do the first two spoken sentences each carry one idea in plain syntax?",
            checklist,
        )
        self.assertIn(
            "Are technical setup labels and mechanism detail held until after the hook?",
            checklist,
        )

    def test_requested_iteration_telemetry_is_honest_and_separate(self) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        for contract in (
            "When Martin requests iteration telemetry, record each visible task's "
            "elapsed time.",
            "Use runtime-reported token usage when available; otherwise report "
            "`unavailable`.",
            "Do not estimate or invent a precise token count.",
            "Keep telemetry separate from the requested artifact and narration.",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, rapid)

    def test_supplied_selection_context_avoids_unnecessary_canonical_reload(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        self.assertIn(
            "When a scoped review, selection rewrite, or alternatives request supplies "
            "the artifact, selection, surrounding context, and narrative job, use "
            "those inputs directly; do not reread canonical project files unless the "
            "request changes channel policy or lacks needed context.",
            skill,
        )

    def test_compact_example_demonstrates_a_first_hearing_causal_hook(self) -> None:
        rapid = (
            SKILL_ROOT / "references/rapid-prototyping.md"
        ).read_text(encoding="utf-8")
        example = rapid.split("## Compact worked example\n", 1)[1].split(
            "\n## Rapid quality check", 1
        )[0]
        normalized_example = " ".join(example.split())
        spoken_example = " ".join(
            line[1:].lstrip()
            for line in example.splitlines()
            if line.startswith(">")
        )
        self.assertTrue(
            spoken_example.startswith(
                "How can an AI follow the rules—and completely fail the job?"
            )
        )
        self.assertIn(
            "In 2016, OpenAI trained an AI to play a boat-racing game.",
            spoken_example,
        )
        self.assertIn("three targets that kept reappearing", spoken_example)
        self.assertIn("It did not win the race. It won the spreadsheet.", spoken_example)
        self.assertIn("In 2025, OpenAI reported", spoken_example)
        self.assertNotIn("block-stacking", normalized_example)
        self.assertNotIn("red block", normalized_example)

    def test_rapid_factual_boundary_forbids_inferred_cognition_and_result_state(
        self,
    ) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        self.assertIn(
            "Do not infer cognition, intent, understanding, or misunderstanding",
            rapid,
        )
        self.assertIn(
            "Do not infer a final physical state or orientation from an action verb",
            rapid,
        )
        self.assertIn(
            "Repeat only the supplied action and outcome unless another state is "
            "explicitly established",
            rapid,
        )

    def test_creative_approval_gate_precedes_production(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        gate = (
            "Remain in the Draft stage until Martin explicitly approves the premise, voice, "
            "hook, story direction, and complete narration or directly requests "
            "evidence-backed finalization."
        )
        preserve = (
            "Preserve the approved prototype as the voice baseline; research may "
            "narrow claims but must not silently replace its structure or personality."
        )
        self.assertIn(gate, skill)
        self.assertIn(preserve, skill)
        self.assertLess(
            skill.index(gate),
            skill.index("## Final stage — evidence and production"),
        )

    def test_complete_narration_precedes_editorial_and_timing_audits(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )

        contracts = {
            "skill": (
                "Complete and show Martin the whole narration before running any "
                "editorial, retention, or timing audit.",
                "Treat timing as a post-draft diagnostic, not a drafting gate.",
                "Report audit concerns and tradeoffs separately before rewriting the "
                "narration; never silently cut context to satisfy an audit.",
            ),
            "rapid": (
                "When the request is for a complete script, finish the whole narration "
                "internally and pass the spoken-readability delivery gate. Then show it "
                "before any editorial, retention, or timing audit.",
                "Do not remove setup, referents, causality, examples, humor, viewer "
                "relevance, or the learning promise merely to satisfy an unseen clock.",
                "After Martin reviews the complete narration, report audit concerns "
                "separately before proposing a rewrite.",
            ),
        }
        for source_name, source_contracts in contracts.items():
            source = {"skill": skill, "rapid": rapid}[source_name]
            for contract in source_contracts:
                with self.subTest(source=source_name, contract=contract):
                    self.assertIn(contract, source)

    def test_final_format_separates_numbered_narration_from_appendix(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        format_text = " ".join(
            (SKILL_ROOT / "references/annotated-script-format.md")
            .read_text(encoding="utf-8")
            .split()
        )
        template = (
            SKILL_ROOT / "assets/annotated-script-template.md"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "Complete `final/script.raw.md` for spoken delivery, pass the spoken-readability "
            "delivery gate on raw, and show it to Martin before auditing it.",
            skill,
        )
        self.assertIn(
            "Build `final/script.extended.md` as the synchronized editorial and "
            "production view. Keep purpose and evidence annotations plus all metadata "
            "and production material there, with a final appendix whose beat entries "
            "match the raw narration beat numbers and titles.",
            skill,
        )
        self.assertIn("Numbered narration-only beats", format_text)
        self.assertIn("Beat-matched production appendix", format_text)
        self.assertRegex(template, r"(?m)^## 1\. ")
        self.assertIn("\n## Appendix\n", template)
        appendix = template.split("\n## Appendix\n", 1)[1]
        self.assertTrue(appendix.lstrip().startswith("### Script metadata\n"))
        main_script = template.split("\n## Appendix\n", 1)[0]
        for forbidden in (
            "**Status:**",
            "**Time:**",
            "### Claims",
            "### Visual",
            "### Story function",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, main_script)

    def test_annotated_format_owns_only_the_final_extended_appendix(self) -> None:
        format_text = normalize_text(FORMAT_MD.read_text(encoding="utf-8"))
        template = TEMPLATE_MD.read_text(encoding="utf-8")

        for contract in (
            "This reference owns only the complete `final/script.extended.md` appendix.",
            "`final/script.raw.md` owns every spoken word and all storytelling markup.",
            "Validate the raw/extended pair first",
            "[Script Artifact Pair](script-artifact-pair.md)",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, format_text)

        self.assertIn(
            "[MAIN HOOK | LOCKED WORDING —",
            template,
        )
        self.assertRegex(
            template,
            r"(?m)^\[[A-Z0-9 -]+(?: \| [A-Z0-9 -]+)* — [^\]]+\]$",
        )
        self.assertLess(
            template.index("[MAIN HOOK | LOCKED WORDING —"),
            template.index("\n## Appendix\n"),
        )

    def test_phase_two_keeps_existing_production_resources(self) -> None:
        skill = SKILL_MD.read_text(encoding="utf-8")
        for resource in (
            "references/story-and-hook-method.md",
            "references/research-and-rights.md",
            "references/annotated-script-format.md",
            "assets/annotated-script-template.md",
            "references/quality-rubric.md",
            "scripts/validate_annotated_script.py",
        ):
            with self.subTest(resource=resource):
                self.assertIn(resource, skill)

        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )
        self.assertIn(
            "Use this three-candidate comparison only in the Final stage or when Martin "
            "explicitly requests opening options or a scored comparison.",
            story,
        )
        self.assertIn(
            "Otherwise generate the single requested opening unless Martin asks for "
            "alternatives.",
            story,
        )

    def test_required_package_files_exist(self) -> None:
        required = {
            "SKILL.md",
            "agents/openai.yaml",
            "assets/annotated-script-template.md",
            "references/annotated-script-format.md",
            "references/quality-rubric.md",
            "references/rapid-prototyping.md",
            "references/research-and-rights.md",
            "references/script-architecture.md",
            "references/story-and-hook-method.md",
            "scripts/validate_annotated_script.py",
        }
        missing = sorted(path for path in required if not (SKILL_ROOT / path).is_file())
        self.assertEqual(missing, [])
        expected_openai = (
            b"interface:\n"
            b'  display_name: "WHP YouTube Script Writer"\n'
            b'  short_description: "Architect, prototype, and finalize WHP scripts"\n'
            b'  default_prompt: "Use $writing-whp-youtube-scripts to architect, '
            b'prototype, refine, or production-finalize a Why Humans Play episode '
            b'script."\n'
        )
        self.assertEqual(
            (SKILL_ROOT / "agents" / "openai.yaml").read_bytes(),
            expected_openai,
        )

    def test_frontmatter_is_portable_and_description_is_trigger_only(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        match = re.match(r"\A---\n(.*?)\n---\n", text, re.DOTALL)
        self.assertIsNotNone(match)
        keys = {
            line.split(":", 1)[0].strip()
            for line in match.group(1).splitlines()
            if ":" in line and not line.startswith(" ")
        }
        self.assertEqual(keys, {"name", "description"})
        self.assertIn("name: writing-whp-youtube-scripts", match.group(1))
        self.assertRegex(match.group(1), r"description: ['\"]?Use when ")

    def test_core_has_no_required_vendor_specific_syntax_or_local_paths(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        format_text = (
            SKILL_ROOT / "references" / "annotated-script-format.md"
        ).read_text(encoding="utf-8")
        forbidden = (
            "/home/",
            "/Users/",
            "~/",
            "file://",
            ".codex/",
            "functions.",
            "mcp__",
            "${CLAUDE_SKILL_DIR}",
            "allowed-tools:",
            "context: fork",
        )
        self.assertEqual([token for token in forbidden if token in text], [])
        self.assertIsNone(re.search(r"(?i)\b[a-z]:[\\/]", text))
        resolve_instruction = (
            "Resolve the target script path to an absolute path at runtime before "
            "changing to the skill directory."
        )
        safe_command = (
            'python3 scripts/validate_annotated_script.py -- "<resolved-script-path>"'
        )
        legacy_command = "python3 scripts/validate_annotated_script.py <script-path>"
        dynamic_target_instruction = (
            "The dynamically resolved target path may be absolute; pass it as one "
            "quoted argument after `--`."
        )
        for source_name, source_text in (
            ("SKILL.md", text),
            ("references/annotated-script-format.md", format_text),
        ):
            with self.subTest(source=source_name):
                self.assertNotIn(legacy_command, source_text)
                self.assertIn(resolve_instruction, source_text)
                self.assertIn(safe_command, source_text)
                self.assertIn("Do not hardcode the skill package path", source_text)
                self.assertIn(dynamic_target_instruction, source_text)
                self.assertLess(
                    source_text.index(resolve_instruction),
                    source_text.index(safe_command),
                )

    def test_relative_markdown_resources_exist(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        targets = re.findall(r"\[[^]]+\]\(([^)]+)\)", text)
        local = [
            target.partition("#")[0]
            for target in targets
            if "://" not in target
            and not target.startswith("#")
            and target != "Original URL"
        ]
        # Document order follows the episode pipeline: scoped work, architecture,
        # progression, blueprint, draft, then final-stage routing.
        expected = [
            "../choosing-whp-video-topic/references/research-method.md",
            "references/rapid-prototyping.md",
            "references/script-architecture.md",
            "references/story-and-hook-method.md",
            "references/research-and-rights.md",
            "references/rapid-prototyping.md",
            "references/story-and-hook-method.md",
            "references/script-artifact-pair.md",
            "references/script-blueprint-workflow.md",
            "references/rapid-prototyping.md",
            "references/rapid-prototyping.md",
            "references/research-and-rights.md",
            "references/rapid-prototyping.md",
            "references/research-and-rights.md",
            "references/annotated-script-format.md",
            "assets/annotated-script-template.md",
            "references/quality-rubric.md",
            "references/lesson-distillation.md",
        ]
        self.assertEqual(local, expected)
        resolved_skill_root = SKILL_ROOT.resolve(strict=True)
        for target in local:
            relative_target = Path(target)
            self.assertFalse(relative_target.is_absolute())
            resolved_target = (SKILL_ROOT / relative_target).resolve(strict=True)
            self.assertTrue(resolved_target.is_file())
            if ".." in relative_target.parts:
                self.assertEqual(
                    target,
                    "../choosing-whp-video-topic/references/research-method.md",
                )
                self.assertTrue(
                    resolved_target.is_relative_to(
                        resolved_skill_root.parent
                    )
                )
            else:
                self.assertTrue(
                    resolved_target.is_relative_to(resolved_skill_root)
                )

    def test_supporting_narrative_throughline_contract_is_distributed(self) -> None:
        story = STORY_METHOD_MD.read_text(encoding="utf-8")
        format_text = FORMAT_MD.read_text(encoding="utf-8")
        template = TEMPLATE_MD.read_text(encoding="utf-8")

        self.assertIn("supporting narrative throughline", story.lower())
        normalized_story = " ".join(story.split())
        story_contracts = (
            "The episode's argument remains the spine; the supporting narrative "
            "throughline is a sidecar, not the center of the story.",
            "Every return must reveal new information, reinterpret an earlier detail, "
            "raise the stakes, demonstrate a mechanism, apply the viewer tool, or pay "
            "off the opening loop.",
            "Do not claim that the throughline case proves a mechanism established by "
            "separate evidence.",
        )
        for contract in story_contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, normalized_story)

        format_contract = " ".join(format_text.split())
        self.assertIn(
            "When no candidate earns the role, use `NONE` and explain why",
            format_contract,
        )

        for anchor in (
            "### Narrative throughline audit",
            "FOUND",
            "NONE",
            "Beat map",
            "Absence reason",
        ):
            with self.subTest(record="format", anchor=anchor):
                self.assertIn(anchor, format_text)
        for anchor in (
            "### Narrative throughline audit",
            "NONE",
            "Beat map",
            "Absence reason",
        ):
            with self.subTest(record="template", anchor=anchor):
                self.assertIn(anchor, template)

    def test_supporting_throughline_has_one_structural_owner(self) -> None:
        sources = {
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }

        owner_anchors = (
            "person → ordinary goal → obstacle → consequential choice → outcome → changed meaning",
            "1. **Hook:**",
            "3. **Recurrence:**",
            "4. **Evidence boundary:**",
            "5. **Payoff:**",
        )
        for anchor in owner_anchors:
            with self.subTest(owner="story", anchor=anchor):
                self.assertTrue(
                    anchor in sources["story"],
                    f"story owner is missing detailed anchor: {anchor}",
                )
            for consumer in ("rapid", "steering"):
                with self.subTest(consumer=consumer, forbidden_owner_anchor=anchor):
                    self.assertFalse(
                        anchor in sources[consumer],
                        f"{consumer} copies story-owner anchor: {anchor}",
                    )

        mirrored_selection_detail = {
            "rapid": (
                "Look for a person with an ordinary goal, a real obstacle, a "
                "consequential choice, and an outcome that sharpens the final lesson."
            ),
            "steering": (
                "Prefer a candidate with an ordinary goal, a real obstacle, a "
                "consequential choice, and an outcome that sharpens the final lesson."
            ),
        }
        for consumer, detail in mirrored_selection_detail.items():
            with self.subTest(consumer=consumer, forbidden_selection_detail=detail):
                self.assertFalse(
                    detail in sources[consumer],
                    f"{consumer} mirrors throughline selection detail: {detail}",
                )

    def test_supporting_throughline_integration_contracts_are_phase_owned(
        self,
    ) -> None:
        def h2_section(text: str, heading: str) -> str:
            marker = f"## {heading}\n"
            start = text.index(marker) + len(marker)
            remainder = text[start:]
            next_heading = re.search(r"^## ", remainder, flags=re.MULTILINE)
            return remainder if next_heading is None else remainder[: next_heading.start()]

        rapid_text = RAPID_MD.read_text(encoding="utf-8")
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        format_text = " ".join(FORMAT_MD.read_text(encoding="utf-8").split())
        apply_section = " ".join(
            h2_section(
                rapid_text,
                "Apply the approved progression while drafting",
            ).split()
        )
        humor_section = " ".join(
            h2_section(rapid_text, "Make humor carry meaning").split()
        )

        realization_contract = (
            "When the approved Story Progression Plan selects a supporting narrative "
            "throughline, realize only its mapped returns. Each return must perform its "
            "approved new-information, reinterpretation, stakes, demonstration, "
            "application, or payoff job. Do not reselect the sidecar during drafting or "
            "let its case stand in for separate mechanism evidence. If the approved plan "
            "records `NONE`, keep the argument direct."
        )
        with self.subTest(integration="rapid owns draft-time realization"):
            self.assertTrue(
                realization_contract in apply_section,
                "rapid realization contract is outside its approved-progression section",
            )
            self.assertFalse(
                realization_contract in humor_section,
                "rapid realization contract still lives in the humor section",
            )
            self.assertEqual(
                " ".join(rapid_text.split()).count(realization_contract),
                1,
                "rapid realization contract must appear exactly once",
            )

        circular_story_intro = (
            "Populate this section from the approved plan's Throughline decision. "
            "Planning chooses the sidecar; drafting realizes its mapped returns."
        )
        planning_direction = (
            "During story-progression planning, use this method to produce the plan's "
            "Throughline decision. When a candidate passes, record the selected sidecar "
            "and its mapped returns; when none passes, record `NONE` and the reason. "
            "Drafting later consumes that approved mapping and does not choose again."
        )
        with self.subTest(integration="story produces the plan decision"):
            self.assertFalse(
                circular_story_intro in story,
                "story owner still describes its own output as an approved input",
            )
            self.assertTrue(
                planning_direction in story,
                "story owner is missing the planning-to-record-to-drafting direction",
            )

        unconditional_record = (
            "After metadata, add this transparent story-structure record for every "
            "`FULL-SCRIPT`:"
        )
        plan_gated_record = (
            "After metadata, add this transparent story-structure record for every "
            "`FULL-SCRIPT` entering the Final stage through the plan gate:"
        )
        with self.subTest(integration="audit record is plan gated"):
            self.assertFalse(
                unconditional_record in format_text,
                "format still requires the throughline audit for every FULL-SCRIPT",
            )
            self.assertTrue(
                plan_gated_record in format_text,
                "format is missing the plan-gated FULL-SCRIPT scope",
            )
            self.assertTrue(
                "Do not fabricate or backfill a plan for a legacy script"
                in format_text,
                "format lost the no-backfill legacy rule",
            )

    def test_detailed_story_rules_are_not_verbatim_mirrors(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
        story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
        steering = " ".join(
            (REPO_ROOT / "whp-youtube/STEERING.md")
            .read_text(encoding="utf-8")
            .split()
        )

        structural_owner_anchors = (
            "Before a surprising result, state the outcome the viewer should reasonably expect",
            "case → exact takeaway → why it matters here → remaining question → next evidence",
            "The challenge must be epistemically real, never manufactured drama",
            "For an enduring failure pattern, pair one vivid early warning with one "
            "compact current echo that demonstrates persistence and present relevance.",
            "goal → measure or target → changed behavior → improved number → "
            "damaged goal and human cost",
        )
        drafting_owner_anchors = (
            "Tell the smallest story that preserves trust, causal clarity, and surprise.",
            "Compression removes clutter, never connective tissue.",
            "Preserve the causal minimum, not the procedural maximum.",
            "Test every factual hook as `intended goal → visible score or proxy → "
            "shortcut → absurd outcome`.",
            "Separate setup from punchline.",
        )
        drafting_owner_consumer_exclusions = (
            "intriguing question → narrator's former defense → evidence that "
            "overturned it → early remedy promise → real case",
            "Treat measured skepticism, lower trust ratings, expertise, training, "
            "or prior warning as sufficient observable resistance; do not require "
            "proof of the participants' exact inner monologue.",
            "Readability is a delivery gate, not a post-draft editorial audit.",
            "Write like a smart friend on a walk sharing something he dug into, "
            "not like a presenter, paper abstract, conference talk, or legal "
            "disclaimer.",
            "fact → plain reaction → why it matters → next question",
            "Write like a well-educated best friend with a brutal sense of humor.",
        )

        for anchor in structural_owner_anchors:
            with self.subTest(owner="story", anchor=anchor):
                self.assertIn(anchor, story)
                self.assertNotIn(anchor, skill)
                self.assertNotIn(anchor, rapid)
                self.assertNotIn(anchor, steering)

        for anchor in drafting_owner_anchors:
            with self.subTest(owner="rapid", anchor=anchor):
                self.assertIn(anchor, rapid)
                self.assertNotIn(anchor, skill)
                self.assertNotIn(anchor, story)

        for anchor in drafting_owner_consumer_exclusions:
            with self.subTest(owner="rapid", exclusive_anchor=anchor):
                self.assertIn(anchor, rapid)
                self.assertNotIn(anchor, skill)
                self.assertNotIn(anchor, story)
                self.assertNotIn(anchor, steering)

        self.assertIn(
            "Derived from the structural story owner",
            rapid,
        )
        self.assertIn(
            "For line-level case narration, spoken compression, and humor, read",
            story,
        )

    def test_story_owner_cross_links_target_declared_headings(self) -> None:
        story = STORY_METHOD_MD.read_text(encoding="utf-8")
        rapid = RAPID_MD.read_text(encoding="utf-8")
        steering = (REPO_ROOT / "whp-youtube/STEERING.md").read_text(
            encoding="utf-8"
        )
        cross_links = (
            (
                "rapid",
                rapid,
                "[Plan story progression before beats]"
                "(story-and-hook-method.md#plan-story-progression-before-beats)",
                "story",
                story,
                "## Plan story progression before beats",
            ),
            (
                "rapid",
                rapid,
                "[Build every story across the complete script]"
                "(story-and-hook-method.md#build-every-story-across-the-complete-script)",
                "story",
                story,
                "## Build every story across the complete script",
            ),
            (
                "story",
                story,
                "[the rapid drafting method]"
                "(rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
                "rapid",
                rapid,
                "## Apply the approved progression while drafting",
            ),
            (
                "story",
                story,
                "[the rapid anti-skip method]"
                "(rapid-prototyping.md#use-the-five-move-anti-skip-intro)",
                "rapid",
                rapid,
                "### Use the five-move anti-skip intro",
            ),
            (
                "steering",
                steering,
                "[the structural story owner]"
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "story-and-hook-method.md#plan-story-progression-before-beats)",
                "story",
                story,
                "## Plan story progression before beats",
            ),
            (
                "steering",
                steering,
                "[the rapid drafting owner]"
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "rapid-prototyping.md#apply-the-approved-progression-while-drafting)",
                "rapid",
                rapid,
                "## Apply the approved progression while drafting",
            ),
            (
                "steering",
                steering,
                "[the rapid anti-skip owner]"
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "rapid-prototyping.md#use-the-five-move-anti-skip-intro)",
                "rapid",
                rapid,
                "### Use the five-move anti-skip intro",
            ),
            (
                "story",
                story,
                "[the rapid spoken-delivery method]"
                "(rapid-prototyping.md#write-for-speech-and-momentum)",
                "rapid",
                rapid,
                "## Write for speech and momentum",
            ),
            (
                "story",
                story,
                "[its readability gate]"
                "(rapid-prototyping.md#pass-the-spoken-readability-delivery-gate)",
                "rapid",
                rapid,
                "## Pass the spoken-readability delivery gate",
            ),
            (
                "steering",
                steering,
                "[the rapid spoken-readability owner]"
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "rapid-prototyping.md#pass-the-spoken-readability-delivery-gate)",
                "rapid",
                rapid,
                "## Pass the spoken-readability delivery gate",
            ),
        )

        for source_name, source, link, target_name, target, heading in cross_links:
            with self.subTest(source=source_name, link=link):
                self.assertIn(link, source)
            with self.subTest(target=target_name, heading=heading):
                self.assertIn(heading, target)

    def test_explicit_walking_blueprint_requires_memory_first_delivery_gate(
        self,
    ) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
            "rubric": " ".join(
                RUBRIC_MD.read_text(encoding="utf-8").split()
            ),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md").read_text(
                    encoding="utf-8"
                ).split()
            ),
        }
        explicit_trigger = (
            "When Martin explicitly requests a walking-vlog, walk-and-talk, "
            "from-memory, or no-teleprompter Script Blueprint, run the memory-first "
            "delivery pass before returning it."
        )

        for source_name in ("skill", "rapid", "steering"):
            with self.subTest(source=source_name, contract="explicit trigger"):
                self.assertIn(explicit_trigger, sources[source_name])

        self.assertIn(
            "For an explicitly requested walking-vlog Script Blueprint, a top delivery "
            "score requires every flagged number and quotation to have a deliberate, "
            "documented spoken treatment that preserves the factual boundary and can "
            "be reproduced naturally from memory.",
            sources["rubric"],
        )

    def test_memory_first_walking_pass_has_one_detailed_owner(self) -> None:
        rapid_text = RAPID_MD.read_text(encoding="utf-8")
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "rapid": " ".join(rapid_text.split()),
            "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
            "rubric": " ".join(RUBRIC_MD.read_text(encoding="utf-8").split()),
            "steering": " ".join(
                (REPO_ROOT / "whp-youtube/STEERING.md")
                .read_text(encoding="utf-8")
                .split()
            ),
        }

        with self.subTest(owner="rapid", contract="declared heading"):
            heading = "### Run the memory-first walking-vlog pass"
            self.assertTrue(
                heading in rapid_text,
                f"rapid owner is missing declared heading: {heading}",
            )

        consumer_contracts = {
            "skill": (
                "When Martin explicitly requests a walking-vlog, walk-and-talk, "
                "from-memory, or no-teleprompter Script Blueprint, run the memory-first "
                "delivery pass before returning it. This is a focused delivery "
                "check, not a production audit. Follow "
                "[the rapid memory-first owner](references/rapid-prototyping.md"
                "#run-the-memory-first-walking-vlog-pass)."
            ),
            "story": (
                "For memory-first delivery, follow "
                "[the memory-first walking-vlog pass]"
                "(rapid-prototyping.md#run-the-memory-first-walking-vlog-pass)."
            ),
            "rubric": (
                "For an explicitly requested walking-vlog Script Blueprint, a top delivery "
                "score requires every flagged number and quotation to have a "
                "deliberate, documented spoken treatment that preserves the factual "
                "boundary and can be reproduced naturally from memory."
            ),
            "steering": (
                "Source accuracy and spoken reproducibility are separate decisions; "
                "detailed execution lives in "
                "[the memory-first walking-vlog owner]"
                "(../.agents/skills/writing-whp-youtube-scripts/references/"
                "rapid-prototyping.md#run-the-memory-first-walking-vlog-pass)."
            ),
        }
        for consumer, contract in consumer_contracts.items():
            with self.subTest(consumer=consumer, contract="concise local contract"):
                self.assertTrue(
                    contract in sources[consumer],
                    f"{consumer} is missing its concise local contract: {contract}",
                )

        detailed_contracts = (
            "Classify each number as claim-carrying or texture.",
            "round texture sample sizes to a truthful conversational magnitude",
            "Use a verbatim quotation in narration only when its exact wording earns "
            "the memory cost.",
            "Replace research-admin wording and outline transitions with language "
            "Martin could reproduce naturally after one hearing.",
        )
        for contract in detailed_contracts:
            with self.subTest(owner="rapid", contract=contract):
                self.assertTrue(
                    contract in sources["rapid"],
                    f"rapid owner is missing detailed contract: {contract}",
                )
            for consumer in ("skill", "story", "rubric", "steering"):
                with self.subTest(
                    consumer=consumer,
                    forbidden_detailed_contract=contract,
                ):
                    self.assertFalse(
                        contract in sources[consumer],
                        f"{consumer} copies rapid-owner contract: {contract}",
                    )

    def test_skill_entrypoint_stays_below_progressive_disclosure_limit(self) -> None:
        self.assertLessEqual(len(SKILL_MD.read_text(encoding="utf-8").splitlines()), 500)

    def test_claude_discovery_is_one_relative_symlink_to_the_canonical_package(self) -> None:
        self.assertTrue(CLAUDE_LINK.is_symlink())
        link_target = CLAUDE_LINK.readlink()
        self.assertEqual(
            link_target.as_posix(),
            "../../.agents/skills/writing-whp-youtube-scripts",
        )
        self.assertFalse(link_target.is_absolute())
        self.assertEqual(
            CLAUDE_LINK.resolve(strict=True),
            SKILL_ROOT.resolve(strict=True),
        )


class SkillAmendmentTests(unittest.TestCase):
    """Guard the field-tested amendments: kill-testing, widening, naming,
    the first-sentence gate, blueprint packaging, and the retell sentence."""

    def test_architecture_owns_the_mine_and_kill_test_procedure(self) -> None:
        architecture = " ".join(
            (SKILL_ROOT / "references/script-architecture.md")
            .read_text(encoding="utf-8")
            .split()
        )
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())

        self.assertIn("## Mine and kill-test connections", architecture)
        self.assertIn(
            "The earned reframe is built from a surviving connection, never the "
            "reverse.",
            architecture,
        )
        self.assertIn(
            "independent adversarial refuters whose default verdict is refuted",
            architecture,
        )
        self.assertIn(
            "Record every killed or corrected candidate in the killed-connections "
            "register with its cause of death",
            architecture,
        )
        self.assertIn(
            "Verify the surviving connections' load-bearing bridges against primary "
            "sources immediately, not at the final stage",
            architecture,
        )
        self.assertIn(
            "Do not present an architecture whose reframe has no kill-tested "
            "connection behind it.",
            architecture,
        )
        self.assertIn(
            "Then mine candidate connections from the inventory and kill-test them "
            "adversarially; build the reframe only from survivors, with bridges "
            "verified and kills registered.",
            skill,
        )


    def test_application_widening_pass_is_owned_and_bounded(self) -> None:
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())

        self.assertIn("After the primary application lands, widen it.", story)
        self.assertIn(
            "Admit at most three; each must map to a named evidence row, voice its "
            "own boundary, and require no new unverified claim.",
            story,
        )
        self.assertIn(
            "A transfer that needs fresh evidence is a new episode, not an ending.",
            story,
        )
        self.assertIn(
            "Then widen the application with up to three adjacent-audience transfers "
            "that existing evidence rows already support.",
            skill,
        )


    def test_concept_naming_rule_is_owned_by_the_rapid_method(self) -> None:
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )

        self.assertIn("### Name concepts in the audience's game vocabulary", rapid)
        self.assertIn(
            "Generate candidates from at least three different ontological "
            "categories",
            rapid,
        )
        self.assertIn(
            "Enumerate WHP's home ontology first: the parts of a game.",
            rapid,
        )
        self.assertIn(
            "Force one candidate that breaks the incumbent's sentence frame on "
            "purpose",
            rapid,
        )
        self.assertIn(
            "Prefer the human, warm term over the mechanical, precise one whenever "
            "the meaning survives.",
            rapid,
        )


    def test_first_sentence_gate_is_owned_by_the_story_method(self) -> None:
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        blueprint = " ".join(
            (SKILL_ROOT / "references/script-blueprint-workflow.md")
            .read_text(encoding="utf-8")
            .split()
        )

        self.assertIn("## Gate the first sentence", story)
        self.assertIn("**T1 — Viewer in the sentence.**", story)
        self.assertIn("**T2 — Unclosable gap.**", story)
        self.assertIn("**T3 — Edge placement.**", story)
        self.assertIn(
            "**T4 — Stakes and certainty inside the sentence.**", story
        )
        self.assertIn("A presumed failure state caps T1 at 1", story)
        self.assertIn(
            "Any 0 on T1–T3 kills the line regardless of total; those are flaws "
            "of the question itself.",
            story,
        )
        self.assertIn("a title is a first sentence read in the feed", story)
        self.assertIn(
            "a line that fails the gate is replaced, not reworded around its "
            "dead test",
            story,
        )
        self.assertIn("Does the first sentence pass the story owner's", rapid)
        self.assertIn(
            "The raw intro's first sentence must survive the story owner's",
            blueprint,
        )


    def test_packaging_is_owned_by_the_blueprint_stage(self) -> None:
        workflow = " ".join(
            (SKILL_ROOT / "references/script-blueprint-workflow.md")
            .read_text(encoding="utf-8")
            .split()
        )
        pair_owner = " ".join(
            (SKILL_ROOT / "references/script-artifact-pair.md")
            .read_text(encoding="utf-8")
            .split()
        )
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())

        self.assertIn("## Design the packaging with the intro", workflow)
        self.assertIn(
            "Write fifteen to twenty title candidates and never ship the first "
            "one.",
            workflow,
        )
        self.assertIn(
            "Score every title candidate with the story owner's",
            workflow,
        )
        self.assertIn(
            "The thumbnail shows the tension; the title tells it; they must not "
            "repeat each other.",
            workflow,
        )
        self.assertIn(
            "at least two distinct thumbnail routes",
            workflow,
        )
        self.assertIn(
            "Every question the packaging opens must be answered in the video.",
            workflow,
        )
        self.assertIn("the packaging record", pair_owner)
        self.assertIn("the episode's packaging record in its appendix", skill)

        import validate_script_pair as pair_validator

        _, blueprint_headings = pair_validator.STAGE_APPENDIX_CONTRACTS[
            "blueprint"
        ]
        self.assertIn("### Packaging", blueprint_headings)


    def test_earned_reframe_requires_a_retell_sentence(self) -> None:
        architecture = " ".join(
            (SKILL_ROOT / "references/script-architecture.md")
            .read_text(encoding="utf-8")
            .split()
        )
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())

        self.assertIn("State the reframe's retell sentence:", architecture)
        self.assertIn(
            "the single conversational sentence a viewer would actually say "
            "to a friend to pass the insight on",
            architecture,
        )
        self.assertIn(
            "If no honest sentence survives that test, the reframe is not "
            "yet sharp enough to script.",
            architecture,
        )
        self.assertIn(
            "carries the retell sentence — or its approved evolution — as a "
            "locked line",
            architecture,
        )
        self.assertIn(
            "the reframe's retell sentence, each beat's punchline and "
            "exact-lesson line",
            skill,
        )


class StatusVocabularyOwnershipTests(unittest.TestCase):
    """Guard the vocabularies that previously drifted between files."""

    def test_claim_statuses_match_the_validator(self) -> None:
        import validate_annotated_script as validator

        format_text = FORMAT_MD.read_text(encoding="utf-8")
        research = (SKILL_ROOT / "references/research-and-rights.md").read_text(
            encoding="utf-8"
        )

        for status in validator.CLAIM_STATUSES:
            with self.subTest(status=status):
                self.assertIn(f"`{status}`", format_text)
                self.assertIn(f"`{status}`", research)

    def test_asset_statuses_match_the_validator(self) -> None:
        import validate_annotated_script as validator

        format_text = FORMAT_MD.read_text(encoding="utf-8")
        research = (SKILL_ROOT / "references/research-and-rights.md").read_text(
            encoding="utf-8"
        )

        for status in validator.FIXED_ASSET_STATUSES:
            with self.subTest(status=status):
                self.assertIn(f"`{status}`", format_text)
                self.assertIn(f"`{status}`", research)

    def test_readiness_states_match_the_validator(self) -> None:
        import validate_annotated_script as validator

        format_text = FORMAT_MD.read_text(encoding="utf-8")

        for state in validator.READINESS_STATES:
            with self.subTest(state=state):
                self.assertIn(f"`{state}`", format_text)

    def test_only_metadata_uses_the_bare_status_label(self) -> None:
        for path in (FORMAT_MD, TEMPLATE_MD):
            with self.subTest(document=path.name):
                text = path.read_text(encoding="utf-8")
                progression = text.split("### Approved story progression", 1)[1].split(
                    "###", 1
                )[0]
                throughline = text.split("### Narrative throughline audit", 1)[1].split(
                    "###", 1
                )[0]
                self.assertIn("**Plan status:**", progression)
                self.assertNotIn("**Status:**", progression)
                self.assertIn("**Throughline status:**", throughline)
                self.assertNotIn("**Status:**", throughline)


if __name__ == "__main__":
    unittest.main()
