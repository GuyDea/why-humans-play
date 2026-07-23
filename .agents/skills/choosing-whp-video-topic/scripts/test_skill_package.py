from __future__ import annotations

import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SKILL_MD = SKILL_ROOT / "SKILL.md"
RESEARCH_METHOD = SKILL_ROOT / "references/research-method.md"
OUTPUT_CONTRACT = SKILL_ROOT / "references/output-contract.md"


class TopicSkillPackageTests(unittest.TestCase):
    def test_problem_led_candidates_start_from_the_widest_specific_pain(self) -> None:
        sources = {
            "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
            "research": " ".join(
                RESEARCH_METHOD.read_text(encoding="utf-8").split()
            ),
            "output": " ".join(
                OUTPUT_CONTRACT.read_text(encoding="utf-8").split()
            ),
        }

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
        for source_name in ("skill", "research"):
            for contract in core_contracts:
                with self.subTest(source=source_name, contract=contract):
                    self.assertIn(contract, sources[source_name])

        candidate_fields = (
            "target viewer",
            "lived moment",
            "human cost",
            "reach or recurrence",
            "surface explanation",
            "hidden game or mechanism",
            "new understanding",
            "usable response",
        )
        for source_name in ("skill", "research"):
            for field in candidate_fields:
                with self.subTest(source=source_name, field=field):
                    self.assertIn(field, sources[source_name].lower())

        for dimension in (
            "reach",
            "recognition",
            "frequency",
            "consequence",
            "unresolvedness",
        ):
            with self.subTest(dimension=dimension):
                self.assertIn(dimension, sources["research"].lower())
        self.assertIn(
            "Treat these as separate evidence-backed dimensions; do not multiply them "
            "into a fabricated market-size number.",
            sources["research"],
        )

        self.assertGreaterEqual(
            sources["output"].count("Audience pain or shared tension"),
            2,
        )
        candidate_shape = (
            "intended viewer | Audience pain or shared tension | recognizable moment | "
            "human stake or cost, where applicable"
        )
        self.assertIn(candidate_shape, sources["output"])
        self.assertNotIn(
            "Audience pain or shared tension | lived moment and human cost",
            sources["output"],
        )

    def test_finalists_require_a_first_hearing_opening_proof_case(self) -> None:
        skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
        research = " ".join(RESEARCH_METHOD.read_text(encoding="utf-8").split())

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

        for source_name, source in (("skill", skill), ("research", research)):
            with self.subTest(source=source_name):
                self.assertIn(core_contract, source)
                self.assertIn(failure_contract, source)
                self.assertIn(persistence_contract, source)


if __name__ == "__main__":
    unittest.main()
