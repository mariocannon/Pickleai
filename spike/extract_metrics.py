"""
extract_metrics.py — the measurement step of the PickleAI pipeline.

Reference implementation: runs pose estimation over a clip and derives the structured
biomechanical metrics that the coaching step reasons over. The whole design principle is
that the LLM never sees pixels — it sees these MEASURED numbers, so its feedback is
grounded and auditable.

This is a spike-grade extractor: it demonstrates the core computations (joint angles,
contact detection, per-rep aggregation). A production version needs more robustness —
handedness/angle normalization, ball + court-line detection for shot outcome, and
per-rep segmentation tuned on real data. Those are called out with TODOs.

Usage:
    pip install mediapipe opencv-python numpy
    python extract_metrics.py clip.mp4 --shot third_shot_drop --skill 3.0
"""

import argparse
import json
import math
from dataclasses import dataclass, field

import numpy as np

try:
    import cv2
    import mediapipe as mp
except ImportError:  # keep the file importable without the heavy deps
    cv2 = None
    mp = None


# MediaPipe Pose landmark indices we care about.
L = {
    "shoulder": 12, "elbow": 14, "wrist": 16,   # right arm (paddle arm for a righty)
    "hip": 24, "knee": 26, "ankle": 28,
}


def angle(a, b, c) -> float:
    """Interior angle at joint b (degrees), given three (x, y) points."""
    ba = np.array(a) - np.array(b)
    bc = np.array(c) - np.array(b)
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return math.degrees(math.acos(np.clip(cos, -1.0, 1.0)))


@dataclass
class FrameSample:
    t: float
    knee_deg: float
    wrist_xy: tuple
    hip_xy: tuple


@dataclass
class Extraction:
    frames: list = field(default_factory=list)


def run_pose(video_path: str) -> Extraction:
    """Run MediaPipe Pose over the video and collect per-frame joint data."""
    if mp is None:
        raise RuntimeError("mediapipe/opencv not installed — pip install mediapipe opencv-python")

    pose = mp.solutions.pose.Pose(model_complexity=1, min_detection_confidence=0.5)
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    ex = Extraction()
    idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        # Sample ~10 fps — plenty for technique, cheaper to process.
        if idx % max(1, int(fps // 10)) == 0:
            res = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if res.pose_landmarks:
                lm = res.pose_landmarks.landmark
                def pt(i): return (lm[i].x, lm[i].y)
                ex.frames.append(FrameSample(
                    t=idx / fps,
                    knee_deg=angle(pt(L["hip"]), pt(L["knee"]), pt(L["ankle"])),
                    wrist_xy=pt(L["wrist"]),
                    hip_xy=pt(L["hip"]),
                ))
        idx += 1

    cap.release()
    pose.close()
    return ex


def detect_contacts(ex: Extraction) -> list:
    """Contact frames ~= local peaks in wrist speed (the forward swing through the ball)."""
    if len(ex.frames) < 3:
        return []
    speeds = [0.0]
    for i in range(1, len(ex.frames)):
        p, q = ex.frames[i - 1].wrist_xy, ex.frames[i].wrist_xy
        dt = ex.frames[i].t - ex.frames[i - 1].t or 1e-3
        speeds.append(math.dist(p, q) / dt)
    thresh = np.mean(speeds) + np.std(speeds)
    peaks = [i for i in range(1, len(speeds) - 1)
             if speeds[i] > thresh and speeds[i] >= speeds[i - 1] and speeds[i] >= speeds[i + 1]]
    return peaks


def aggregate(ex: Extraction, contacts: list, shot: str, skill: float, note: str) -> dict:
    """Roll per-frame data + contact frames up into the structured metrics contract."""
    knees = [ex.frames[i].knee_deg for i in contacts] or [f.knee_deg for f in ex.frames]
    return {
        "clip_id": "extracted",
        "shot_type": shot,
        "player_context": {"skill_level": skill, "goal": "", "handedness": "right", "note": note},
        "clip_meta": {
            "duration_s": round(ex.frames[-1].t, 1) if ex.frames else 0,
            "fps": 10, "reps_detected": len(contacts), "view_angle": "side",
            "tracking_confidence": round(min(1.0, len(ex.frames) / 60), 2),
        },
        "aggregate_metrics": {
            "knee_flexion_deg_at_contact": {
                "mean": round(float(np.mean(knees)), 1),
                "std": round(float(np.std(knees)), 1),
                "ideal_range": [120, 140],
                "note": "smaller = deeper bend; measured at ball contact",
            },
            # TODO(prod): paddle_face_angle needs paddle detection (not a body landmark).
            # TODO(prod): contact_height / contact_point need camera calibration for real cm.
            # TODO(prod): shot_outcome (landing zone) needs ball + court-line tracking.
            # Those are the parts a production extractor adds; the coaching step already
            # consumes them via the JSON contract (see data/sample_metrics_*.json).
        },
        "per_rep_flags": [],
        "_note": "spike extractor: knee flexion is fully derived; other fields need the "
                 "production detectors described in the TODOs.",
    }


def extract(video_path: str, shot: str, skill: float, note: str = "") -> dict:
    ex = run_pose(video_path)
    contacts = detect_contacts(ex)
    return aggregate(ex, contacts, shot, skill, note)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--shot", default="third_shot_drop")
    ap.add_argument("--skill", type=float, default=3.0)
    ap.add_argument("--note", default="")
    args = ap.parse_args()
    print(json.dumps(extract(args.video, args.shot, args.skill, args.note), indent=2))


if __name__ == "__main__":
    main()
