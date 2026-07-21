from __future__ import annotations

import re
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL_MD = SKILL_ROOT / "SKILL.md"
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
        narration = template.split("### Narration\n", 1)[1].split(
            "\n### Story function", 1
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
