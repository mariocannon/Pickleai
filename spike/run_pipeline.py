"""
run_pipeline.py — end-to-end: video clip -> measured metrics -> coaching report.

    export ANTHROPIC_API_KEY=sk-ant-...
    pip install -r requirements.txt
    python run_pipeline.py clip.mp4 --shot third_shot_drop --skill 3.0
"""

import argparse
import json

import coach
import extract_metrics


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--shot", default="third_shot_drop")
    ap.add_argument("--skill", type=float, default=3.0)
    ap.add_argument("--note", default="")
    args = ap.parse_args()

    print("→ extracting metrics from clip (pose estimation)…")
    metrics = extract_metrics.extract(args.video, args.shot, args.skill, args.note)
    print(json.dumps(metrics, indent=2))

    print("\n→ coaching (Claude reasoning over the metrics)…")
    report = coach.coach(metrics)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
