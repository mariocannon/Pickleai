"""
worker.py — PickleAI analysis worker.

Polls Supabase for uploaded videos, runs the pipeline (extract metrics -> Claude
coaching), writes the report, and flips the video's status. Run it anywhere with
network access to Supabase — a laptop, a VM, a container.

    pip install -r requirements.txt
    export SUPABASE_URL=https://<ref>.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=...       # server secret, never in the browser
    export ANTHROPIC_API_KEY=sk-ant-...
    python worker.py                # real extraction (needs mediapipe + opencv)
    PICKLEAI_MOCK_EXTRACTOR=1 python worker.py  # demo mode: plausible metrics, real coaching

Mock mode exists so the *product loop* (upload -> processing -> report) can be
demonstrated end-to-end before the ML stack is installed; the coaching call is
still real.
"""

import json
import os
import random
import sys
import tempfile
import time
import traceback
from pathlib import Path

from supabase import create_client

# Reuse the proven spike pipeline.
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "spike"))
import coach  # noqa: E402

POLL_SECONDS = 5
MOCK = os.environ.get("PICKLEAI_MOCK_EXTRACTOR") == "1"


def sb():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def mock_metrics(shot_type: str, note: str | None, skill: float) -> dict:
    """Plausible measured metrics so the loop can run without the ML stack."""
    shaky = random.random() < 0.5
    knee = random.uniform(150, 162) if shaky else random.uniform(126, 140)
    backswing = random.uniform(48, 60) if shaky else random.uniform(24, 34)
    long_pct = random.choice([17, 20, 25]) if shaky else random.choice([0, 4, 8])
    kitchen_pct = 100 - long_pct - random.choice([25, 33, 40] if shaky else [17, 21, 25])
    return {
        "clip_id": "worker_mock",
        "shot_type": shot_type,
        "player_context": {
            "skill_level": skill,
            "goal": "",
            "handedness": "right",
            "note": note or "",
        },
        "clip_meta": {
            "duration_s": 45,
            "fps": 30,
            "reps_detected": random.randint(4, 8),
            "view_angle": "side",
            "tracking_confidence": round(random.uniform(0.8, 0.93), 2),
        },
        "aggregate_metrics": {
            "knee_flexion_deg_at_contact": {
                "mean": round(knee), "std": 6, "ideal_range": [120, 140],
                "note": "smaller = deeper bend; measured at ball contact",
            },
            "paddle_face_angle_deg_at_contact": {
                "mean": round(random.uniform(56, 68)), "std": 7, "ideal_range": [55, 70],
                "note": "degrees open from vertical",
            },
            "backswing_length_cm": {
                "mean": round(backswing), "std": 9, "ideal_range": [20, 35],
                "note": "paddle travel behind hip; longer adds pace",
            },
            "weight_transfer_score": {
                "value": round(random.uniform(0.4, 0.55) if shaky else random.uniform(0.7, 0.85), 2),
                "ideal_min": 0.7, "note": "back-to-front weight shift into the shot",
            },
            "recovery_to_kitchen_score": {
                "value": round(random.uniform(0.35, 0.55) if shaky else random.uniform(0.72, 0.88), 2),
                "ideal_min": 0.75, "note": "how consistently player advances after the shot",
            },
            "shot_outcome": {
                "landing_zone_pct": {
                    "kitchen": kitchen_pct,
                    "mid_court": 100 - kitchen_pct - long_pct,
                    "long": long_pct,
                },
                "note": "where shots landed across reps; kitchen = ideal",
            },
        },
        "per_rep_flags": [],
    }


def real_metrics(video_path: str, shot_type: str, note: str | None, skill: float) -> dict:
    import extract_metrics  # heavy deps imported only when needed

    return extract_metrics.extract(video_path, shot_type, skill, note or "")


def process_one(client) -> bool:
    """Claim and process one queued video. Returns False when the queue is empty."""
    queued = (
        client.table("videos")
        .select("id, user_id, storage_path, shot_type, note")
        .eq("status", "uploaded")
        .order("created_at")
        .limit(1)
        .execute()
    )
    if not queued.data:
        return False
    video = queued.data[0]

    # Atomic claim — another worker may have grabbed it.
    claim = (
        client.table("videos")
        .update({"status": "processing"})
        .eq("id", video["id"])
        .eq("status", "uploaded")
        .execute()
    )
    if not claim.data:
        return True

    print(f"→ processing video {video['id']} ({video['shot_type']})")
    try:
        prof = (
            client.table("profiles")
            .select("skill_level")
            .eq("id", video["user_id"])
            .single()
            .execute()
        )
        skill = float(prof.data.get("skill_level") or 3.0)

        if MOCK:
            metrics = mock_metrics(video["shot_type"], video.get("note"), skill)
        else:
            blob = client.storage.from_("videos").download(video["storage_path"])
            suffix = Path(video["storage_path"]).suffix or ".mp4"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                f.write(blob)
                tmp = f.name
            try:
                metrics = real_metrics(tmp, video["shot_type"], video.get("note"), skill)
            finally:
                os.unlink(tmp)

        report = coach.coach(metrics)

        client.table("analyses").insert(
            {
                "video_id": video["id"],
                "user_id": video["user_id"],
                "summary": report.get("overall_summary"),
                "confidence": report.get("confidence"),
                "confidence_note": report.get("confidence_note"),
                "scores": report.get("scores"),
                "top_fixes": report.get("top_fixes"),
                "encouragement": report.get("encouragement"),
                "metrics": metrics,
                "model_meta": {"coach_model": coach.MODEL, "mock_extractor": MOCK},
            }
        ).execute()
        client.table("videos").update({"status": "done"}).eq("id", video["id"]).execute()
        print(f"✓ done {video['id']}")
    except Exception as e:  # noqa: BLE001 — worker must survive bad clips
        traceback.print_exc()
        client.table("videos").update(
            {
                "status": "failed",
                "error": f"We couldn't read this clip ({type(e).__name__}). "
                         "A side-on angle with your whole body in frame works best.",
            }
        ).eq("id", video["id"]).execute()
        # A failed clip shouldn't cost an analysis — refund the quota claim.
        sub = (
            client.table("subscriptions")
            .select("used_this_period")
            .eq("user_id", video["user_id"])
            .single()
            .execute()
        )
        used = int(sub.data.get("used_this_period") or 0)
        if used > 0:
            client.table("subscriptions").update(
                {"used_this_period": used - 1}
            ).eq("user_id", video["user_id"]).execute()
    return True


def main() -> None:
    print(f"PickleAI worker up (mock_extractor={MOCK}); polling every {POLL_SECONDS}s")
    client = sb()
    while True:
        try:
            had_work = process_one(client)
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            had_work = False
        if not had_work:
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
