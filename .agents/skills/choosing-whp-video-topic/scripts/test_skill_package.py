from __future__ import annotations

import re
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL_MD = SKILL_ROOT / "SKILL.md"
RESEARCH_METHOD = SKILL_ROOT / "references/research-method.md"
OUTPUT_CONTRACT = SKILL_ROOT / "references/output-contract.md"
CHANNEL_STEERING = REPO_ROOT / "whp-youtube/STEERING.md"
TOPIC_STEERING = REPO_ROOT / "docs/steering/whp-video-topic-skill.md"
SCRIPT_SKILL_ROOT = (
    REPO_ROOT / ".agents/skills/writing-whp-youtube-scripts"
)
SCRIPT_SKILL_MD = SCRIPT_SKILL_ROOT / "SKILL.md"
OWNER_HEADING = "## Subject-to-angle development"
OWNER_FRAGMENT = "subject-to-angle-development"
MARKDOWN_LINK_PATTERN = re.compile(
    r"(?<!!)\[[^\]\n]+\]\(\s*"
    r"(?P<destination><[^>\n]+>|[^)\s]+)"
    r"(?:\s+(?:\"[^\"]*\"|'[^']*'|\([^)]*\)))?\s*\)"
)


def _markdown_heading_level(line: str) -> int | None:
    marker, separator, _ = line.partition(" ")
    if (
        separator
        and 1 <= len(marker) <= 6
        and marker == "#" * len(marker)
    ):
        return len(marker)
    return None


def _extract_markdown_section(markdown: str, heading: str) -> str:
    heading_level = _markdown_heading_level(heading)
    if heading_level is None:
        raise AssertionError(f"not an ATX Markdown heading: {heading}")

    lines = markdown.splitlines()
    heading_indexes = [
        index for index, line in enumerate(lines) if line == heading
    ]
    if len(heading_indexes) != 1:
        raise AssertionError(
            f"expected exactly one {heading!r}; found {len(heading_indexes)}"
        )

    start = heading_indexes[0]
    end = len(lines)
    for index in range(start + 1, len(lines)):
        next_level = _markdown_heading_level(lines[index])
        if next_level is not None and next_level <= heading_level:
            end = index
            break
    return "\n".join(lines[start:end]).rstrip() + "\n"


def _markdown_link_destinations(markdown: str) -> tuple[str, ...]:
    destinations = []
    for match in MARKDOWN_LINK_PATTERN.finditer(markdown):
        destination = match.group("destination")
        if destination.startswith("<") and destination.endswith(">"):
            destination = destination[1:-1]
        destinations.append(destination)
    return tuple(destinations)


def _resolved_owner_links(
    source_path: Path,
    markdown: str,
) -> tuple[Path, ...]:
    expected_owner_path = RESEARCH_METHOD.resolve()
    owner_links = []
    for destination in _markdown_link_destinations(markdown):
        target_ref, separator, fragment = destination.partition("#")
        if not separator or not target_ref:
            continue
        target_path = (source_path.parent / target_ref).resolve()
        if (
            target_path == expected_owner_path
            and fragment == OWNER_FRAGMENT
        ):
            owner_links.append(target_path)
    return tuple(owner_links)


def _extract_bounded_text(
    text: str,
    start_marker: str,
    end_marker: str,
) -> str:
    if text.count(start_marker) != 1:
        raise AssertionError(
            f"expected exactly one start marker: {start_marker}"
        )
    if text.count(end_marker) != 1:
        raise AssertionError(
            f"expected exactly one end marker: {end_marker}"
        )

    start = text.index(start_marker)
    end = text.index(end_marker, start + len(start_marker))
    if end <= start:
        raise AssertionError(
            f"end marker must follow start marker: {end_marker}"
        )
    return text[start:end]


class TopicSkillPackageTests(unittest.TestCase):
    def test_subject_to_angle_method_has_one_detailed_owner(self) -> None:
        research_text = RESEARCH_METHOD.read_text(encoding="utf-8")
        owner_text = _extract_markdown_section(
            research_text,
            OWNER_HEADING,
        )
        owner = " ".join(owner_text.split())
        synthetic_owner = _extract_markdown_section(
            (
                f"{OWNER_HEADING}\ninside-owner\n"
                "## Later method\noutside-owner\n"
            ),
            OWNER_HEADING,
        )
        self.assertNotIn("outside-owner", synthetic_owner)

        consumer_paths = {
            "topic skill": SKILL_MD,
            "output contract": OUTPUT_CONTRACT,
            "channel steering": CHANNEL_STEERING,
            "topic steering": TOPIC_STEERING,
            "script skill": SCRIPT_SKILL_MD,
        }
        recorded_paths = set(consumer_paths.values())
        for path in sorted(SKILL_ROOT.rglob("*.md")):
            if path == RESEARCH_METHOD or path in recorded_paths:
                continue
            relative_path = path.relative_to(SKILL_ROOT)
            consumer_paths[f"topic package/{relative_path}"] = path
            recorded_paths.add(path)
        for path in sorted(SCRIPT_SKILL_ROOT.rglob("*.md")):
            if path in recorded_paths:
                continue
            relative_path = path.relative_to(SCRIPT_SKILL_ROOT)
            consumer_paths[f"script package/{relative_path}"] = path
            recorded_paths.add(path)
        consumers = {
            name: " ".join(path.read_text(encoding="utf-8").split())
            for name, path in consumer_paths.items()
        }

        owner_only_markers = (
            "A subject is search territory, not an angle.",
            "### Find the specific human nerve",
            "Run a bounded audience-language scan before selecting the nerve.",
            "In [specific moment], I fear/want/wonder [specific concern], because "
            "[human stake].",
            "Run the `Choose what?` test.",
            "recognizable-moment test",
            "personal-stake test",
            "evidence-breadth test",
            "Choose the strongest supported nerve, not the most dramatic one.",
            "Never invent suffering merely to intensify a subject.",
            "### Prove mechanism and promise fit",
            "mechanism-fit test",
            "title-to-payoff test",
            "Use `feel` or `seem` when the evidence explains an appearance rather than "
            "an objective condition.",
            "Never preserve a strong click by handing scripting an undeliverable "
            "promise.",
            "The handoff must bound both the payoff and its limits.",
            "### Worked example: Popularity",
            "Why Does It Feel Like Everyone Has More Friends Than You?",
        )
        for marker in owner_only_markers:
            with self.subTest(owner_marker=marker):
                self.assertTrue(
                    marker in owner,
                    f"subject-to-angle owner is missing marker: {marker}",
                )
            for consumer_name, consumer in consumers.items():
                with self.subTest(
                    consumer=consumer_name,
                    forbidden_owner_marker=marker,
                ):
                    self.assertFalse(
                        marker in consumer,
                        f"{consumer_name} copies owner-only marker: {marker}",
                    )

        legacy_owner_details = (
            "Before choosing a mechanism for a problem-led candidate, generate and "
            "compare the specific lived painpoints first. Prioritize the widest "
            "specific, recognizable, recurring pain that credible evidence supports, "
            "not the broadest subject label. Do not begin with a technical mechanism "
            "and manufacture human relevance afterward.",
            "For each problem-led candidate, record:",
            "the exact **lived moment** in which the problem appears;",
            "the **hidden game or mechanism** that can explain it;",
            "Use the mechanism as the explanation of a supported human problem, not "
            "as a substitute for one.",
            "For every promising subject, create at least two materially different "
            "angles. Build each angle with this editorial bridge:",
            "Make the entry point, tension, human stake, earned payoff, evidence path, "
            "and intended viewer concrete.",
        )
        for detail in legacy_owner_details:
            for consumer_name, consumer in consumers.items():
                with self.subTest(
                    consumer=consumer_name,
                    forbidden_legacy_owner_detail=detail,
                ):
                    self.assertFalse(
                        detail in consumer,
                        f"{consumer_name} copies legacy owner detail: {detail}",
                    )

        self.assertTrue(owner_text.startswith(f"{OWNER_HEADING}\n"))
        self.assertEqual(
            (
                "../owner.md#subject-to-angle-development",
            ),
            _markdown_link_destinations(
                "[Equivalent label]"
                "(<../owner.md#subject-to-angle-development>)"
            ),
        )
        self.assertEqual(
            (),
            _markdown_link_destinations(
                "`../owner.md#subject-to-angle-development`"
            ),
        )
        self.assertEqual(
            (RESEARCH_METHOD.resolve(),),
            _resolved_owner_links(
                SKILL_MD,
                (
                    "[Equivalent label]"
                    "(<references/research-method.md"
                    "#subject-to-angle-development>)"
                ),
            ),
        )
        self.assertEqual(
            (),
            _resolved_owner_links(
                SKILL_MD,
                "[Owner](#subject-to-angle-development)",
            ),
        )
        self.assertEqual(
            (),
            _resolved_owner_links(
                SKILL_MD,
                "`references/research-method.md"
                "#subject-to-angle-development`",
            ),
        )

        link_consumers = {
            "topic skill": SKILL_MD,
            "channel steering": CHANNEL_STEERING,
            "topic steering": TOPIC_STEERING,
        }
        for consumer_name, consumer_path in link_consumers.items():
            consumer_text = consumer_path.read_text(encoding="utf-8")
            owner_links = _resolved_owner_links(
                consumer_path,
                consumer_text,
            )

            with self.subTest(consumer=consumer_name):
                self.assertTrue(
                    owner_links,
                    f"{consumer_name} lacks a resolvable owner link; "
                    f"destinations={_markdown_link_destinations(consumer_text)}",
                )
                for target_path in owner_links:
                    self.assertTrue(
                        target_path.is_file(),
                        f"{consumer_name} owner target does not exist: {target_path}",
                    )
                    linked_owner = _extract_markdown_section(
                        target_path.read_text(encoding="utf-8"),
                        OWNER_HEADING,
                    )
                    self.assertTrue(
                        linked_owner.startswith(f"{OWNER_HEADING}\n"),
                        f"{consumer_name} target lacks {OWNER_HEADING}",
                    )

    def test_subject_to_angle_owner_defines_the_complete_human_nerve_gate(
        self,
    ) -> None:
        owner_text = _extract_markdown_section(
            RESEARCH_METHOD.read_text(encoding="utf-8"),
            OWNER_HEADING,
        )
        find_nerve_text = _extract_markdown_section(
            owner_text,
            "### Find the specific human nerve",
        )
        find_nerve = " ".join(find_nerve_text.split())
        candidate_record = " ".join(
            _extract_bounded_text(
                find_nerve_text,
                "For each problem-led candidate, record:",
                "Then record the bridge the episode would need to earn:",
            ).split()
        )
        bridge_record = " ".join(
            _extract_bounded_text(
                find_nerve_text,
                "Then record the bridge the episode would need to earn:",
                "For non-problem-led candidates, use the same fields",
            ).split()
        )
        promise_fit = " ".join(
            _extract_markdown_section(
                owner_text,
                "### Prove mechanism and promise fit",
            ).split()
        )
        popularity = " ".join(
            _extract_markdown_section(
                owner_text,
                "### Worked example: Popularity",
            ).split()
        )
        popularity_record = " ".join(
            _extract_bounded_text(
                popularity,
                "A stronger candidate route is:",
                "Here the title uses perception language",
            ).split()
        )

        core_contracts = (
            "Before choosing a mechanism for a problem-led candidate, generate and "
            "compare the specific lived painpoints first.",
            "Prioritize the widest specific, recognizable, recurring pain that "
            "credible evidence supports, not the broadest subject label.",
            "Do not begin with a technical mechanism and manufacture human relevance "
            "afterward.",
            "For wonder-, history-, and explicit-game-led candidates, use a widely "
            "shared mystery, desire, or tension instead of requiring suffering.",
        )
        for contract in core_contracts:
            with self.subTest(find_nerve_contract=contract):
                self.assertIn(contract, find_nerve)

        candidate_record_fields = (
            "target viewer",
            "lived moment",
            "human cost",
            "reach or recurrence",
        )
        for field in candidate_record_fields:
            with self.subTest(candidate_record_field=field):
                self.assertIn(field, candidate_record.lower())

        bridge_record_fields = (
            "surface explanation",
            "hidden game or mechanism",
            "new understanding",
            "usable response",
        )
        for field in bridge_record_fields:
            with self.subTest(bridge_record_field=field):
                self.assertIn(field, bridge_record.lower())

        for dimension in (
            "reach",
            "recognition",
            "frequency",
            "consequence",
            "unresolvedness",
        ):
            with self.subTest(find_nerve_dimension=dimension):
                self.assertIn(dimension, find_nerve.lower())
        self.assertIn(
            "Treat these as separate evidence-backed dimensions; do not multiply them "
            "into a fabricated market-size number.",
            find_nerve,
        )

        find_nerve_contracts = (
            "Run a bounded audience-language scan before selecting the nerve.",
            "Generate at least three materially different candidate nerves",
            "In [specific moment], I fear/want/wonder [specific concern], because "
            "[human stake].",
            "recognizable-moment test",
            "personal-stake test",
            "evidence-breadth test",
            "Choose the strongest supported nerve, not the most dramatic one.",
            "Never invent suffering merely to intensify a subject.",
        )
        for contract in find_nerve_contracts:
            with self.subTest(find_nerve_contract=contract):
                self.assertIn(contract, find_nerve)

        promise_fit_contracts = (
            "mechanism-fit test",
            "title-to-payoff test",
            "Use `feel` or `seem` when the evidence explains an appearance rather than "
            "an objective condition.",
            "The handoff must bound both the payoff and its limits.",
        )
        for contract in promise_fit_contracts:
            with self.subTest(promise_fit_contract=contract):
                self.assertIn(contract, promise_fit)

        popularity_record_contracts = (
            "Am I less wanted than everyone around me?",
            "Why Does It Feel Like Everyone Has More Friends Than You?",
            "highly connected people are overrepresented in comparison sets",
            "popular people appear in more people's worlds",
        )
        for contract in popularity_record_contracts:
            with self.subTest(popularity_record_contract=contract):
                self.assertIn(contract, popularity_record)

        popularity_boundary_contracts = (
            "method illustration",
            "require verification in a real topic run",
        )
        for contract in popularity_boundary_contracts:
            with self.subTest(popularity_boundary_contract=contract):
                self.assertIn(contract, popularity)

        output_schema = " ".join(
            OUTPUT_CONTRACT.read_text(encoding="utf-8").split()
        )

        self.assertGreaterEqual(
            output_schema.count("Audience pain or shared tension"),
            2,
        )
        candidate_shape = (
            "intended viewer | primary script goal | Audience pain or shared tension | "
            "recognizable moment | human stake or cost, where applicable"
        )
        self.assertIn(candidate_shape, output_schema)
        self.assertNotIn(
            "Audience pain or shared tension | lived moment and human cost",
            output_schema,
        )

    def test_finalists_require_a_first_hearing_opening_proof_case(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        research = " ".join(
            _extract_markdown_section(
                RESEARCH_METHOD.read_text(encoding="utf-8"),
                OWNER_HEADING,
            ).split()
        )

        core_contract = (
            "Before an angle becomes a finalist, identify one documented opening proof "
            "case whose intended goal, visible measure, shortcut, and absurd outcome can "
            "be told in a few plain sentences."
        )
        failure_contract = (
            "If a first-hearing listener would still ask why the measure improved, find "
            "a clearer case or lower the angle's opening potential; do not rescue a weak "
            "hook with a technical lecture."
        )
        persistence_contract = (
            "For a long-lived mechanism, identify one compact current echo that shows "
            "the pattern still matters without opening a second full story or claiming "
            "that every system behaves the same way."
        )

        self.assertIn("### Test the opening proof case", research)
        for contract in (
            core_contract,
            failure_contract,
            persistence_contract,
        ):
            with self.subTest(owner_contract=contract):
                self.assertIn(contract, research)
                self.assertNotIn(contract, skill)

        self.assertIn(
            "Carry each advancing finalist forward with the owner's documented opening "
            "proof case and any applicable current echo.",
            skill,
        )

    def test_operations_section_scopes_gate_check_and_forbids_source_reading(
        self,
    ) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())

        scoping_contracts = (
            "## Operations",
            "judge only the single supplied idea against the six named hard gates",
            "The output schema is always supplied by the caller",
            "output shape is always supplied by the caller",
        )
        for contract in scoping_contracts:
            with self.subTest(scoping=contract):
                self.assertIn(contract, skill)

        source_prohibitions = (
            "Never read repository source code.",
            "or any other search over `script-creator/`",
            "never hunt for schemas, registries, prompts, or operation definitions",
        )
        for contract in source_prohibitions:
            with self.subTest(prohibition=contract):
                self.assertIn(contract, skill)

        fast_fail_contracts = (
            "Quick gate-check needs one specific candidate topic",
            "`status`: `declined`",
            "`verdict`: `unknown`",
        )
        for contract in fast_fail_contracts:
            with self.subTest(fast_fail=contract):
                self.assertIn(contract, skill)

        for gate in (
            "game_play_centrality",
            "human_revelation",
            "recognized_payoff",
            "evidence_path",
            "production_reality",
            "portfolio_fit",
        ):
            with self.subTest(gate=gate):
                self.assertIn(gate, skill)


if __name__ == "__main__":
    unittest.main()
