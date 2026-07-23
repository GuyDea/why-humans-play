from __future__ import annotations

import re
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL_MD = SKILL_ROOT / "SKILL.md"
ARCHITECTURE_MD = SKILL_ROOT / "references/script-architecture.md"
CLAUDE_LINK = REPO_ROOT / ".claude" / "skills" / SKILL_ROOT.name


class SkillPackageTests(unittest.TestCase):
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
            "material conflict in `Contradictions` and explain how it changes or "
            "bounds the status or wording.",
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

        rubric_reference_fragments = (
            "Open every cross-check and scan for conflicting origin, date, chronology, "
            "causality, or scope wording, even when it supports another subclaim.",
            "Record each material conflict in `Contradictions` and explain how it "
            "changes or bounds status or wording.",
            "A material credible conflict takes precedence over `VERIFIED`: narrow "
            "and resolve the wording, use `DISPUTED`, or omit the claim; never retain "
            "`VERIFIED` while that conflict remains.",
        )
        for fragment in rubric_reference_fragments:
            with self.subTest(contract="rubric-reference-pass", fragment=fragment):
                self.assertIn(fragment, rubric)

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
        for source_name, source_text in sources.items():
            for syntax in outcome_syntax:
                with self.subTest(source=source_name, contract=syntax):
                    self.assertIn(syntax, source_text)
            with self.subTest(source=source_name, contract="incomplete-blocks"):
                self.assertIn(unresolved_rule, source_text)
            with self.subTest(source=source_name, contract="one-syntax-only"):
                self.assertNotIn("Conflict scan incomplete —", source_text)

        split_rule = (
            "If narrated subclaims do not all meet the normal threshold for the same "
            "status, split the compound claim into separate evidence records."
        )
        corroborated_rule = (
            "Assign `CORROBORATED` only when every narrated subclaim independently "
            "meets the `CORROBORATED` threshold."
        )
        for source_name in ("research", "rubric"):
            with self.subTest(source=source_name, contract="split-compound"):
                self.assertIn(split_rule, sources[source_name])
            with self.subTest(source=source_name, contract="corroborated-compound"):
                self.assertIn(corroborated_rule, sources[source_name])
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
            "Default to Phase 1 for ideas, openings, hooks, rough drafts, short "
            "narration, humor or voice passes, and scoped refinement.",
            "Return the requested artifact directly.",
            "Do not perform web research, write an assignment contract or evidence "
            "packet, force three opening candidates, create annotated-script "
            "scaffolding, plan visuals or rights, run the production rubric, or invoke "
            "the validator unless Martin explicitly asks for that work.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, skill)

    def test_episode_scale_generation_requires_approved_architecture(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        contracts = (
            "For a new episode or a thesis-level rethink, produce and refine the "
            "script architecture before writing any opening or narration.",
            "Stop after returning the architecture. Do not draft the hook, beats, or "
            "narration until Martin explicitly approves it.",
            "Approval of a topic, title, isolated insight, or earlier script does not "
            "approve the architecture.",
            "Once Martin approves the architecture, use it as the content baseline "
            "for the first narration prototype.",
            "Preserve its central question, core answer, belief shift, insight ladder, "
            "phenomenon map, earned reframe, boundaries, payoff, and final lesson.",
            "Scoped work on existing narration does not require rebuilding the "
            "architecture unless the requested change alters the episode's central "
            "message.",
        )
        for contract in contracts:
            with self.subTest(contract=contract):
                self.assertIn(contract, skill)

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
            "Demonstrate the pattern before naming the concept",
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

    def test_opening_proof_case_is_clear_on_first_hearing(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )

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

        self.assertIn(first_hearing_contract, skill)
        for source_name, source in (("rapid", rapid), ("story", story)):
            with self.subTest(source=source_name):
                self.assertIn(first_hearing_contract, source)
                self.assertIn(failure_contract, source)
                self.assertIn(joke_contract, source)

    def test_enduring_failure_uses_an_early_case_and_current_echo(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )

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

        self.assertIn(temporal_bridge, skill)
        for source_name, source in (("rapid", rapid), ("story", story)):
            with self.subTest(source=source_name):
                self.assertIn(temporal_bridge, source)
                self.assertIn(echo_boundary, source)
                self.assertIn(callback_contract, source)

    def test_rapid_viewer_promise_is_literal_and_joke_free(self) -> None:
        rapid = " ".join(
            (
                SKILL_ROOT / "references/rapid-prototyping.md"
            ).read_text(encoding="utf-8").split()
        )
        for contract in (
            "Write the by-end promise as a literal learning contract.",
            "Keep jokes, comic images, metaphors, and colorful callbacks out of the "
            "promise sentence.",
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
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )
        consequence_chain = (
            "goal → measure or target → changed behavior → improved number → "
            "damaged goal and human cost"
        )

        self.assertIn(
            "For each substantial point, prefer a compact documented real-world "
            "case already available within the factual boundary.",
            rapid,
        )
        self.assertIn(consequence_chain, rapid)
        self.assertIn(consequence_chain, story)
        self.assertIn(
            "Earn humor from the mechanism, incentive, or institution, then state "
            "plainly what got worse and who absorbed the cost.",
            rapid,
        )
        self.assertIn(
            "If no suitable verified case is available, use a clearly labeled "
            "hypothetical; never make a plausible example sound historical.",
            rapid,
        )
        self.assertIn(
            "Prefer a documented real-world case for each substantial point and make "
            "its damaged goal and human cost explicit.",
            skill,
        )

    def test_worldwide_patterns_use_novel_cases_then_a_global_montage(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )

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

        self.assertIn(main_contract, skill)
        for source_name, source_text in (("rapid", rapid), ("story", story)):
            with self.subTest(source=source_name):
                self.assertIn(detailed_contract, source_text)
                self.assertIn(priority_contract, source_text)

    def test_unfamiliar_names_are_prepared_and_introduced(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        rapid = " ".join(
            (SKILL_ROOT / "references/rapid-prototyping.md")
            .read_text(encoding="utf-8")
            .split()
        )
        story = " ".join(
            (SKILL_ROOT / "references/story-and-hook-method.md")
            .read_text(encoding="utf-8")
            .split()
        )

        self.assertIn(
            "Prepare every unfamiliar proper name before first use, then identify "
            "it and explain its relevance; never drop a name as if the viewer "
            "missed an earlier introduction.",
            skill,
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
        for source_name, source_text in (("rapid", rapid), ("story", story)):
            with self.subTest(source=source_name):
                self.assertIn(detailed_contract, source_text)
                self.assertIn(cold_name_warning, source_text)

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
            "By the end, you will know four questions you can ask an AI to check "
            "whether its answer addresses your real problem.",
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
        self.assertIn(contract, research)
        self.assertIn(contract, format_text)
        self.assertIn(
            "Do not add these source markers to Phase 1 prototypes unless Martin "
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
        self.assertIn(
            "That does not tell us what a bee feels",
            template,
        )
        self.assertIn(
            "they cannot reveal the animal's inner experience",
            template,
        )

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
        for source_name in ("skill", "research", "format"):
            with self.subTest(source=source_name, contract="core"):
                self.assertIn(core_contract, sources[source_name])
            with self.subTest(source=source_name, contract="non-spoken"):
                self.assertIn(non_spoken_contract, sources[source_name])
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
            f"That does not tell us what a bee feels {marker}—but",
            "Those clues can sharpen the question; they cannot reveal the animal's "
            f"inner experience. {marker}",
        )
        for placement in required_placements:
            with self.subTest(template_placement=placement):
                self.assertIn(placement, worked_narration)
        self.assertEqual(worked_narration.count(marker), 5)

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
            "Remain in Phase 1 until Martin explicitly approves the premise, voice, "
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
            skill.index("## Phase 2 — Evidence and production"),
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
                "When the request is for a complete script, finish and show the whole "
                "narration before any editorial, retention, or timing audit.",
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
            "The readable script comes first as numbered beats containing only the "
            "beat heading and spoken blockquote narration.",
            skill,
        )
        self.assertIn(
            "Put all other metadata and production annotations in a final appendix whose "
            "beat entries match the narration beat numbers and titles.",
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
            "Use this three-candidate comparison only in Phase 2 or when Martin "
            "explicitly requests opening options or a scored comparison.",
            story,
        )
        self.assertIn(
            "In Phase 1, generate the single requested opening unless Martin asks for "
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
            target
            for target in targets
            if "://" not in target
            and not target.startswith("#")
            and target != "Original URL"
        ]
        expected = [
            "references/script-architecture.md",
            "references/rapid-prototyping.md",
            "references/story-and-hook-method.md",
            "references/research-and-rights.md",
            "references/annotated-script-format.md",
            "assets/annotated-script-template.md",
            "references/quality-rubric.md",
        ]
        self.assertEqual(local, expected)
        resolved_skill_root = SKILL_ROOT.resolve(strict=True)
        for target in local:
            relative_target = Path(target)
            self.assertFalse(relative_target.is_absolute())
            self.assertNotIn("..", relative_target.parts)
            resolved_target = (SKILL_ROOT / relative_target).resolve(strict=True)
            self.assertTrue(resolved_target.is_file())
            self.assertTrue(resolved_target.is_relative_to(resolved_skill_root))

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


if __name__ == "__main__":
    unittest.main()
