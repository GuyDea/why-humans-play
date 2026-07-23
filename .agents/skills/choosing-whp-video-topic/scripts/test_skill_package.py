from __future__ import annotations

import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SKILL_MD = SKILL_ROOT / "SKILL.md"
RESEARCH_METHOD = SKILL_ROOT / "references/research-method.md"


class TopicSkillPackageTests(unittest.TestCase):
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
