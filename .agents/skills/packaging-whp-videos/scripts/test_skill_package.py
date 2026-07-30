#!/usr/bin/env python3
"""Structural tests for the packaging-whp-videos skill package."""
from __future__ import annotations

import py_compile
import re
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL_MD = SKILL_ROOT / "SKILL.md"
REFERENCES = {
    name: SKILL_ROOT / "references" / f"{name}.md"
    for name in (
        "craft-doctrine",
        "outlier-research",
        "package-method",
        "thumbnail-production",
        "evaluation",
        "post-publish",
    )
}
TEMPLATE_MD = SKILL_ROOT / "assets" / "packaging-record-template.md"
SCRIPTS = [
    SKILL_ROOT / "scripts" / name
    for name in (
        "gen_thumbnails.py",
        "contact_sheet.py",
        "feed_mockup.py",
        "saliency_score.py",
    )
]
BLUEPRINT_WORKFLOW_MD = (
    REPO_ROOT
    / ".agents/skills/writing-whp-youtube-scripts/references/script-blueprint-workflow.md"
)
STEERING_MD = REPO_ROOT / "whp-youtube" / "STEERING.md"
CLAUDE_LINK = REPO_ROOT / ".claude" / "skills" / SKILL_ROOT.name


def normalized(path: Path) -> str:
    return " ".join(path.read_text(encoding="utf-8").split())


class PackageStructureTests(unittest.TestCase):
    def test_frontmatter_has_name_and_trigger_description(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        match = re.match(r"---\n(.*?)\n---\n", text, re.DOTALL)
        self.assertIsNotNone(match, "SKILL.md must open with YAML frontmatter")
        front = match.group(1)
        self.assertIn("name: packaging-whp-videos", front)
        self.assertIn('description: "Use when', front)
        self.assertLessEqual(len(front), 1024)

    def test_all_reference_files_exist_and_are_linked(self) -> None:
        skill = SKILL_MD.read_text(encoding="utf-8")
        for name, path in REFERENCES.items():
            with self.subTest(reference=name):
                self.assertTrue(path.is_file(), f"missing {path}")
                self.assertIn(f"references/{name}.md", skill)
        self.assertTrue(TEMPLATE_MD.is_file())
        self.assertIn("assets/packaging-record-template.md", skill)

    def test_scripts_compile(self) -> None:
        for path in SCRIPTS:
            with self.subTest(script=path.name):
                self.assertTrue(path.is_file(), f"missing {path}")
                py_compile.compile(str(path), doraise=True)

    def test_claude_skills_symlink_resolves_here(self) -> None:
        self.assertTrue(CLAUDE_LINK.is_symlink(), f"missing symlink {CLAUDE_LINK}")
        self.assertEqual(CLAUDE_LINK.resolve(), SKILL_ROOT.resolve())


class PackageUnitContractTests(unittest.TestCase):
    def test_skill_pins_the_package_unit_and_caps(self) -> None:
        skill = normalized(SKILL_MD)
        self.assertIn(
            "The package is the unit: one title and one thumbnail concept "
            "conceived, scored, evaluated, and selected **together**",
            skill,
        )
        self.assertIn("The thumbnail shows the tension; the title tells it", skill)
        self.assertIn(
            "at most 3 winning packages advance to rendering; each renders 5 "
            "variants from the same prompt",
            skill,
        )
        self.assertIn("The three winners are the Test & Compare trio", skill)
        self.assertIn("the final package choice is Martin's", skill)

    def test_method_pins_candidate_volume_and_route_diversity(self) -> None:
        method = normalized(REFERENCES["package-method"])
        self.assertIn("Ideate 15–20 packages", method)
        self.assertIn("Score each package as a unit", method)
        self.assertIn("Select three winners", method)
        self.assertIn("distinct thumbnail routes", method)

    def test_evaluation_pins_cold_panel_and_honesty_check(self) -> None:
        evaluation = normalized(REFERENCES["evaluation"])
        self.assertIn("one fresh-context subagent per persona", evaluation.lower())
        self.assertIn("Expected payoff", evaluation)
        self.assertIn("honesty check", evaluation.lower())
        self.assertIn("It predicts gaze, not clicks", evaluation)

    def test_doctrine_grades_evidence_and_flags_folklore(self) -> None:
        doctrine = normalized(REFERENCES["craft-doctrine"])
        for marker in ("`[strong]`", "`[moderate]`", "`[folklore]`"):
            with self.subTest(marker=marker):
                self.assertIn(marker, doctrine)
        self.assertIn("Folklore — never load-bearing", doctrine)
        self.assertIn("watch-time per impression", doctrine)


class IntegrationTests(unittest.TestCase):
    def test_blueprint_workflow_routes_to_this_skill(self) -> None:
        workflow = normalized(BLUEPRINT_WORKFLOW_MD)
        self.assertIn("packaging-whp-videos", workflow)

    def test_steering_names_the_landed_skill(self) -> None:
        steering = normalized(STEERING_MD)
        self.assertIn("packaging-whp-videos", steering)


if __name__ == "__main__":
    unittest.main()
