from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from validate_script_pair import EVIDENCE_RE, resolve_pair, validate_pair


RAW = """# Episode

## 1. Opening

> <u>**Could this happen to you?**</u>

> *But the next result changed the question.*
"""

EXTENDED = """# Episode

## 1. Opening

[MAIN HOOK | LOCKED WORDING — Opens the central personal-risk question.]

> <u>**Could this happen to you?**</u>

[MINI-HOOK — Turns the opening into the next evidence need.]

> *But the next result changed the question.*

## Appendix

### Blueprint metadata

- **Status:** BLUEPRINT

### Factual boundary and unresolved dependencies

- No unresolved dependency changes the opening promise.

### Intro design record

The opening asks the central question.

### Body logic map

- Beat 02 develops the evidence.

### Promise and loop payoff map

- L-01 pays in Beat 02.

### Approval state

- Awaiting blueprint approval.
"""

DRIFT_ERROR = "extended narration does not exactly match raw"


class ScriptPairTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def make_pair(
        self,
        raw: str = RAW,
        extended: str = EXTENDED,
        *,
        stage: str = "blueprint",
    ) -> Path:
        stage_dir = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / stage
        )
        stage_dir.mkdir(parents=True)
        (stage_dir / "script.raw.md").write_text(raw, encoding="utf-8")
        (stage_dir / "script.extended.md").write_text(
            extended,
            encoding="utf-8",
        )
        return stage_dir

    def run_cli(
        self,
        target: Path,
        *flags: str,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT_DIR / "validate_script_pair.py"),
                *flags,
                str(target),
            ],
            cwd=self.tempdir.name,
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )

    def make_symlink(
        self,
        link: Path,
        target: Path,
        *,
        target_is_directory: bool = False,
    ) -> None:
        try:
            link.symlink_to(target, target_is_directory=target_is_directory)
        except (NotImplementedError, OSError) as exc:
            self.skipTest(f"symlink creation is unavailable: {exc}")

    def test_resolves_either_file_or_stage_directory(self) -> None:
        stage_dir = self.make_pair()
        for target in (
            stage_dir,
            stage_dir / "script.raw.md",
            stage_dir / "script.extended.md",
        ):
            with self.subTest(target=target):
                pair = resolve_pair(target)
                self.assertEqual(pair.stage, "blueprint")
                self.assertEqual(pair.episode_id, "ep001-example")

    def test_rejects_invalid_episode_stage_and_filename(self) -> None:
        invalid = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "episode-1-example"
            / "blueprint",
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / "predraft",
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / "blueprint"
            / "other.md",
        )
        for target in invalid:
            with self.subTest(target=target):
                with self.assertRaises(ValueError):
                    resolve_pair(target)

    def test_reports_either_missing_pair_half(self) -> None:
        stage_dir = self.make_pair()
        contents = {
            "script.raw.md": RAW,
            "script.extended.md": EXTENDED,
        }
        for filename in contents:
            with self.subTest(filename=filename):
                path = stage_dir / filename
                path.unlink()
                with self.assertRaises(FileNotFoundError):
                    resolve_pair(stage_dir)
                path.write_text(contents[filename], encoding="utf-8")

    def test_rejects_extra_entries_in_an_active_stage(self) -> None:
        stage_dir = self.make_pair()
        (stage_dir / "notes.md").write_text("No sidecars.", encoding="utf-8")

        with self.assertRaises(ValueError):
            resolve_pair(stage_dir)

    def test_stage_symlink_loop_is_a_cli_input_error(self) -> None:
        episode_dir = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
        )
        episode_dir.mkdir(parents=True)
        stage_dir = episode_dir / "blueprint"
        self.make_symlink(stage_dir, stage_dir, target_is_directory=True)

        result = self.run_cli(stage_dir, "--json")

        self.assertEqual(result.returncode, 2, result.stderr)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["ok"])
        self.assertEqual(len(payload["errors"]), 1)
        self.assertIn("cannot validate input", payload["errors"][0]["message"])
        self.assertNotIn("Traceback", result.stderr)

    def test_pair_halves_may_not_be_symlinks(self) -> None:
        stage_dir = self.make_pair()
        contents = {
            "script.raw.md": RAW,
            "script.extended.md": EXTENDED,
        }
        counterparts = {
            "script.raw.md": "script.extended.md",
            "script.extended.md": "script.raw.md",
        }
        for filename, counterpart in counterparts.items():
            with self.subTest(filename=filename):
                path = stage_dir / filename
                path.unlink()
                self.make_symlink(path, stage_dir / counterpart)
                try:
                    with self.assertRaisesRegex(
                        ValueError,
                        "pair file cannot be a symlink",
                    ):
                        resolve_pair(stage_dir)
                finally:
                    path.unlink(missing_ok=True)
                    path.write_text(contents[filename], encoding="utf-8")

    def test_stage_symlink_and_file_target_resolve_to_same_pair(self) -> None:
        stage_dir = self.make_pair()
        alias_episode = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep002-alias"
        )
        alias_episode.mkdir(parents=True)
        alias_stage = alias_episode / "blueprint"
        self.make_symlink(alias_stage, stage_dir, target_is_directory=True)

        from_stage = resolve_pair(alias_stage)
        from_file = resolve_pair(alias_stage / "script.raw.md")

        self.assertEqual(from_stage, from_file)
        self.assertEqual(from_stage.stage_dir, stage_dir.resolve())
        self.assertEqual(from_stage.episode_id, "ep001-example")

    def test_non_pair_symlink_cannot_redirect_to_a_pair_file(self) -> None:
        stage_dir = self.make_pair()
        other = Path(self.tempdir.name) / "other.md"
        self.make_symlink(other, stage_dir / "script.raw.md")

        with self.assertRaises(ValueError):
            resolve_pair(other)

    def test_accepts_annotations_and_evidence_without_narration_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace(
                "Could this happen to you?",
                "Could this happen to you? [F-001](https://example.com)",
            )
        )

        self.assertEqual(validate_pair(resolve_pair(stage_dir)), [])

    def test_evidence_scan_is_linear_on_a_long_non_indicator_line(self) -> None:
        line = " " * 50_000 + "not-an-indicator\r\n"

        started = time.perf_counter()
        projected = EVIDENCE_RE.sub("", line)
        elapsed = time.perf_counter() - started

        self.assertEqual(projected, line)
        self.assertLess(
            elapsed,
            1.0,
            f"evidence scan took {elapsed:.3f}s for 50,000 spaces",
        )

    def test_evidence_removal_keeps_line_endings(self) -> None:
        for line_ending in ("\n", "\r\n"):
            with self.subTest(line_ending=repr(line_ending)):
                line = (
                    "Evidence-backed words \t"
                    "[F-001](https://example.com)"
                    f"{line_ending}"
                )
                self.assertEqual(
                    EVIDENCE_RE.sub("", line),
                    f"Evidence-backed words{line_ending}",
                )

    def test_reports_spoken_or_formatting_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace("next result", "later result")
        )

        self.assertEqual(validate_pair(resolve_pair(stage_dir)), [DRIFT_ERROR])

    def test_reports_paragraph_spacing_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace(
                "> *But the next result",
                "\n> *But the next result",
            )
        )

        self.assertEqual(validate_pair(resolve_pair(stage_dir)), [DRIFT_ERROR])

    def test_cli_accepts_stage_or_either_pair_file(self) -> None:
        stage_dir = self.make_pair()
        for target in (
            stage_dir,
            stage_dir / "script.raw.md",
            stage_dir / "script.extended.md",
        ):
            with self.subTest(target=target):
                result = self.run_cli(target)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(
                    result.stdout,
                    "PASS: script pair is exactly synchronized\n",
                )

    def test_cli_json_accepts_separator_before_target(self) -> None:
        stage_dir = self.make_pair()

        result = self.run_cli(stage_dir / "script.raw.md", "--json", "--")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            {"ok": True, "errors": []},
        )

    def test_cli_validation_errors_return_1(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace("next result", "later result")
        )

        result = self.run_cli(stage_dir, "--json")

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            {
                "ok": False,
                "errors": [{"message": DRIFT_ERROR, "line": None}],
            },
        )

    def test_cli_missing_pair_returns_2(self) -> None:
        target = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / "blueprint"
        )

        result = self.run_cli(target, "--json")

        self.assertEqual(result.returncode, 2, result.stderr)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["ok"])
        self.assertEqual(len(payload["errors"]), 1)
        self.assertIn("cannot validate input", payload["errors"][0]["message"])
        self.assertIsNone(payload["errors"][0]["line"])

    def test_cli_invalid_utf8_pair_half_returns_2(self) -> None:
        stage_dir = self.make_pair()
        (stage_dir / "script.extended.md").write_bytes(b"\xff")

        result = self.run_cli(stage_dir, "--json")

        self.assertEqual(result.returncode, 2, result.stderr)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["ok"])
        self.assertEqual(len(payload["errors"]), 1)
        self.assertIn("cannot validate input", payload["errors"][0]["message"])
        self.assertIsNone(payload["errors"][0]["line"])
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
