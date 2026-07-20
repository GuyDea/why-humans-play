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
        expected_openai = (
            b"interface:\n"
            b'  display_name: "WHP YouTube Script Writer"\n'
            b'  short_description: "Write rigorous, production-annotated WHP scripts"\n'
            b'  default_prompt: "Use $writing-whp-youtube-scripts to develop a '
            b'story-led, source-audited Why Humans Play episode script."\n'
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
            if "://" not in target and not target.startswith("#")
        ]
        expected = [
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
