"""
Unit tests for the extractor's signal math — no mediapipe, no video, no network.

Strategy: build synthetic FrameSample trajectories that imitate a player hitting reps
(wrist bursts at known times, knee dips at contact), then assert the detectors recover
the ground truth. This pins down the math; eval/evaluate.py + real labeled clips pin
down real-world accuracy.

Run:  python -m unittest discover -s tests -v   (from spike/)
"""

import json
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from extract_metrics import (  # noqa: E402
    Contact,
    Extraction,
    FrameSample,
    angle,
    coaching_contract,
    detect_contacts,
    detect_handedness,
    eval_contract,
    tracking_confidence,
)

FPS = 15.0


def smoothstep(t: float, t0: float, width: float) -> float:
    """0->1 transition centered at t0; its derivative (speed) peaks exactly at t0."""
    x = (t - t0) / width
    return 1.0 / (1.0 + math.exp(-4.0 * x))


def synthetic_swing_clip(contact_times, duration_s=12.0, active_side="right",
                         knee_at_contact=130.0, knee_baseline=165.0,
                         visibility=0.95, frames_sampled=None) -> Extraction:
    """A fake rally: the active wrist lunges 0.6 torso-lengths at each contact time,
    and the knees dip toward knee_at_contact around contact."""
    ex = Extraction()
    n = int(duration_s * FPS)
    ex.frames_sampled = frames_sampled if frames_sampled is not None else n
    idle_side = "left" if active_side == "right" else "right"
    torso = 0.25

    for i in range(n):
        t = i / FPS
        swing = sum(smoothstep(t, tc, 0.12) for tc in contact_times)
        knee = knee_baseline
        for tc in contact_times:
            dip = math.exp(-((t - tc) ** 2) / (2 * 0.15 ** 2))
            knee = min(knee, knee_baseline - (knee_baseline - knee_at_contact) * dip)
        ex.frames.append(FrameSample(
            t=t,
            wrist={active_side: (0.4 + 0.6 * torso * swing, 0.5),
                   idle_side: (0.45, 0.5)},
            knee_deg={"left": knee, "right": knee},
            visibility={"left": visibility, "right": visibility},
            torso_len=torso,
        ))
    return ex


class TestAngle(unittest.TestCase):
    def test_straight_leg_is_180(self):
        self.assertAlmostEqual(angle((0, 0), (0, 1), (0, 2)), 180.0, delta=0.01)

    def test_right_angle_is_90(self):
        self.assertAlmostEqual(angle((1, 0), (0, 0), (0, 1)), 90.0, places=3)


class TestContactDetection(unittest.TestCase):
    def test_finds_each_rep_at_the_right_time(self):
        truth = [3.0, 6.0, 9.0]
        ex = synthetic_swing_clip(truth)
        contacts = detect_contacts(ex, "right")
        self.assertEqual(len(contacts), 3)
        for c, t_true in zip(contacts, truth):
            self.assertLessEqual(abs(c.t - t_true), 0.15,
                                 f"contact at {c.t}s, expected ~{t_true}s")

    def test_knee_angle_read_at_contact_not_baseline(self):
        ex = synthetic_swing_clip([4.0], knee_at_contact=128.0, knee_baseline=168.0)
        contacts = detect_contacts(ex, "right")
        self.assertEqual(len(contacts), 1)
        self.assertLess(abs(contacts[0].knee_deg - 128.0), 5.0)

    def test_refractory_window_merges_double_peaks(self):
        # two bursts 0.4s apart = one swing + follow-through, not two reps
        ex = synthetic_swing_clip([5.0, 5.4])
        self.assertEqual(len(detect_contacts(ex, "right")), 1)

    def test_quiet_clip_has_no_contacts(self):
        ex = synthetic_swing_clip([])
        self.assertEqual(detect_contacts(ex, "right"), [])

    def test_too_short_clip_has_no_contacts(self):
        ex = Extraction()
        self.assertEqual(detect_contacts(ex, "right"), [])


class TestHandedness(unittest.TestCase):
    def test_detects_left_handed_player(self):
        ex = synthetic_swing_clip([3.0, 6.0], active_side="left")
        self.assertEqual(detect_handedness(ex), "left")

    def test_defaults_to_right_when_ambiguous(self):
        ex = synthetic_swing_clip([])
        self.assertEqual(detect_handedness(ex), "right")


class TestTrackingConfidence(unittest.TestCase):
    def test_clean_clip_scores_high(self):
        ex = synthetic_swing_clip([3.0], visibility=0.95)
        self.assertGreaterEqual(tracking_confidence(ex, "right"), 0.85)

    def test_missing_pose_frames_cut_confidence(self):
        # pose found in only half the sampled frames -> confidence ~halves
        ex = synthetic_swing_clip([3.0], visibility=0.95)
        ex.frames_sampled = len(ex.frames) * 2
        self.assertLessEqual(tracking_confidence(ex, "right"), 0.55)

    def test_low_visibility_cuts_confidence(self):
        ex = synthetic_swing_clip([3.0], visibility=0.30)
        self.assertLessEqual(tracking_confidence(ex, "right"), 0.35)

    def test_nearly_empty_clip_collapses(self):
        ex = synthetic_swing_clip([], duration_s=0.2)
        self.assertLessEqual(tracking_confidence(ex, "right"), 0.4)

    def test_no_frames_is_zero(self):
        self.assertEqual(tracking_confidence(Extraction(), "right"), 0.0)


class TestContracts(unittest.TestCase):
    def _extract(self):
        ex = synthetic_swing_clip([3.0, 6.0, 9.0])
        contacts = detect_contacts(ex, "right")
        conf = tracking_confidence(ex, "right")
        return ex, contacts, conf

    def test_eval_contract_matches_harness_schema(self):
        _, contacts, conf = self._extract()
        out = eval_contract("clip_x", contacts, conf)
        out = json.loads(json.dumps(out))  # must be JSON-serializable
        self.assertEqual(out["clip_id"], "clip_x")
        self.assertEqual(len(out["predicted_contacts"]), 3)
        for p in out["predicted_contacts"]:
            self.assertIsInstance(p["t"], float)
            self.assertIsInstance(p["knee_deg"], float)
            self.assertIsNone(p["paddle_face"])   # Tier-2: PENDING in the harness
            self.assertIsNone(p["landing_zone"])  # Tier-3: PENDING in the harness

    def test_coaching_contract_aggregates_reps(self):
        ex, contacts, conf = self._extract()
        out = coaching_contract("clip_x", ex, contacts, conf, "right",
                                "third_shot_drop", 3.0, "")
        json.dumps(out)
        self.assertEqual(out["clip_meta"]["reps_detected"], 3)
        self.assertEqual(len(out["per_rep"]), 3)
        knee = out["aggregate_metrics"]["knee_flexion_deg_at_contact"]
        self.assertIsNotNone(knee["mean"])
        self.assertEqual(out["clip_meta"]["tracking_confidence"], conf)
        self.assertEqual(out["per_rep_flags"], [])

    def test_no_contacts_is_flagged_not_faked(self):
        ex = synthetic_swing_clip([])
        out = coaching_contract("clip_q", ex, [], 0.9, "right", "dink", 3.0, "")
        json.dumps(out)
        self.assertEqual(out["clip_meta"]["reps_detected"], 0)
        knee = out["aggregate_metrics"]["knee_flexion_deg_at_contact"]
        self.assertIsNone(knee["mean"])
        self.assertTrue(out["per_rep_flags"])


class TestContactDataclass(unittest.TestCase):
    def test_contact_fields(self):
        c = Contact(t=1.0, knee_deg=140.0, peak_speed=3.2)
        self.assertEqual((c.t, c.knee_deg, c.peak_speed), (1.0, 140.0, 3.2))


if __name__ == "__main__":
    unittest.main()
