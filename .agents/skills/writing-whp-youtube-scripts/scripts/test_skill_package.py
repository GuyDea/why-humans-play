from __future__ import annotations

import re
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL_MD = SKILL_ROOT / "SKILL.md"
CLAUDE_LINK = REPO_ROOT / ".claude" / "skills" / SKILL_ROOT.name


class SkillPackageTests(unittest.TestCase):
    def test_required_package_files_exist(self) -> None:
        required = {
            "SKILL.md",
            "agents/openai.yaml",
            "assets/annotated-script-template.md",
            "references/annotated-script-format.md",
            "references/quality-rubric.md",
            "references/research-and-rights.md",
            "references/story-and-hook-method.md",
            "scripts/validate_annotated_script.py",
        }
        missing = sorted(path for path in required if not (SKILL_ROOT / path).is_file())
        self.assertEqual(missing, [])

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
        forbidden = (
            "/home/",
            ".codex/",
            "functions.",
            "mcp__",
            "${CLAUDE_SKILL_DIR}",
            "allowed-tools:",
            "context: fork",
        )
        self.assertEqual([token for token in forbidden if token in text], [])

    def test_relative_markdown_resources_exist(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        targets = re.findall(r"\[[^]]+\]\(([^)]+)\)", text)
        local = [target for target in targets if "://" not in target and not target.startswith("#")]
        self.assertGreaterEqual(len(local), 5)
        self.assertEqual(
            [target for target in local if not (SKILL_ROOT / target).is_file()],
            [],
        )

    def test_skill_entrypoint_stays_below_progressive_disclosure_limit(self) -> None:
        self.assertLessEqual(len(SKILL_MD.read_text(encoding="utf-8").splitlines()), 500)

    def test_claude_discovery_is_one_relative_symlink_to_the_canonical_package(self) -> None:
        self.assertTrue(CLAUDE_LINK.is_symlink())
        self.assertFalse(CLAUDE_LINK.readlink().is_absolute())
        self.assertEqual(CLAUDE_LINK.resolve(), SKILL_ROOT.resolve())


if __name__ == "__main__":
    unittest.main()
