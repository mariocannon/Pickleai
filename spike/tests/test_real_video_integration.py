"""
Real-video integration test: real MediaPipe pose on real frames of a real human.

The unit tests pin down the signal math on synthetic trajectories; this test proves the
actual pipeline — video decode -> PoseLandmarker -> landmarks -> contact detection ->
eval contract — on a video built from a real photograph of a person (mediapipe-assets,
Apache-2.0). The person translates across the frame in three sharp bursts at known
times, so the expected "contacts" are ground truth: the extractor must find all three
within the eval harness's timing tolerance, at high confidence. A person-free control
video must produce zero confidence — the abstain path.

Needs mediapipe + opencv and (first run only) network to fetch the test photo and the
~6 MB pose model; skips cleanly when either is unavailable.

Run:  python -m unittest tests.test_real_video_integration -v   (from spike/; ~30 s)
"""

import math
import sys
import unittest
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None

import extract_metrics as em  # noqa: E402

ASSETS = Path(__file__).parent / "assets"          # gitignored
PERSON_URL = "https://storage.googleapis.com/mediapipe-assets/pose.jpg"
BURSTS = [3.0, 6.0, 9.0]
FPS, DURATION_S = 30, 12.0
TIMING_TOL_S = 0.30  # same bar the eval harness holds real clips to


def _fetch(url: str, dest: Path) -> Path:
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest)
    return dest


def _smoothstep(t, t0, width=0.12):
    return 1.0 / (1.0 + math.exp(-4.0 * (t - t0) / width))


def _build_burst_video(person_img: Path, out_path: Path) -> Path:
    """Real human photo sliding across a canvas in sharp bursts at BURSTS times."""
    person = cv2.imread(str(person_img))
    h, w = person.shape[:2]
    canvas_w = w + 400
    vw = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"mp4v"),
                         FPS, (canvas_w, h))
    for i in range(int(DURATION_S * FPS)):
        t = i / FPS
        x = int(sum(_smoothstep(t, tc) for tc in BURSTS) / len(BURSTS) * 380)
        canvas = np.full((h, canvas_w, 3), 120, np.uint8)
        canvas[:, x:x + w] = person
        vw.write(canvas)
    vw.release()
    return out_path


def _build_empty_video(out_path: Path) -> Path:
    """Same canvas, no human — the extractor must refuse to be confident."""
    vw = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"mp4v"),
                         FPS, (640, 480))
    for _ in range(int(4 * FPS)):
        vw.write(np.full((480, 640, 3), 120, np.uint8))
    vw.release()
    return out_path


@unittest.skipIf(em.mp is None, "mediapipe/opencv not installed")
class TestRealVideoExtraction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            person = _fetch(PERSON_URL, ASSETS / "pose.jpg")
            em._ensure_model()
        except OSError as e:
            raise unittest.SkipTest(f"cannot fetch test assets (offline?): {e}")
        cls.burst_video = _build_burst_video(person, ASSETS / "real_person_bursts.mp4")
        cls.empty_video = _build_empty_video(ASSETS / "no_person.mp4")

    def test_real_pose_recovers_known_motion_events(self):
        out = em.extract_for_eval(str(self.burst_video))
        contacts = out["predicted_contacts"]
        self.assertEqual(len(contacts), len(BURSTS),
                         f"expected {len(BURSTS)} events, got {contacts}")
        for pred, truth in zip(contacts, BURSTS):
            self.assertLessEqual(abs(pred["t"] - truth), TIMING_TOL_S,
                                 f"event at {pred['t']}s, truth {truth}s")
        self.assertGreaterEqual(out["tracking_confidence"], 0.8)
        # the person in the photo stands with legs nearly straight
        for pred in contacts:
            self.assertGreater(pred["knee_deg"], 145)

    def test_coaching_contract_from_real_video(self):
        metrics = em.extract(str(self.burst_video), "third_shot_drop", 3.0)
        self.assertEqual(metrics["clip_meta"]["reps_detected"], len(BURSTS))
        self.assertEqual(len(metrics["per_rep"]), len(BURSTS))
        self.assertIsNotNone(
            metrics["aggregate_metrics"]["knee_flexion_deg_at_contact"]["mean"])

    def test_no_person_means_no_confidence_and_no_contacts(self):
        out = em.extract_for_eval(str(self.empty_video))
        self.assertEqual(out["predicted_contacts"], [])
        self.assertLessEqual(out["tracking_confidence"], 0.1)


if __name__ == "__main__":
    unittest.main()
