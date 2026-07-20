"""
coach.py — the coaching step of the PickleAI pipeline.

Takes structured, MEASURED metrics (from extract_metrics.py) and asks Claude to reason
over them using the coaching rubric, returning a structured coaching report.

This is the link the spike exists to de-risk: does the model turn numbers into good,
grounded coaching? Run it against data/sample_metrics_weak.json and _strong.json and
compare the outputs.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python coach.py data/sample_metrics_weak.json
"""

import json
import os
import sys
from pathlib import Path

from anthropic import Anthropic

MODEL = "claude-sonnet-5"  # good quality/cost balance for this step; swap as needed
PROMPT_PATH = Path(__file__).parent / "prompts" / "coaching_system_prompt.md"


def load_system_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def coach(metrics: dict, model: str = MODEL) -> dict:
    """Send measured metrics to Claude and return a structured coaching report."""
    client = Anthropic()  # reads ANTHROPIC_API_KEY from env

    system_prompt = load_system_prompt()
    user_content = (
        "Here are the measured metrics for one clip. Analyze them and return the "
        "coaching report as JSON per your instructions.\n\n"
        f"```json\n{json.dumps(metrics, indent=2)}\n```"
    )

    resp = client.messages.create(
        model=model,
        max_tokens=1500,
        temperature=0.4,  # low: we want grounded, consistent coaching, not creative riffs
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
    )

    text = resp.content[0].text.strip()
    # The prompt asks for pure JSON; be tolerant of stray code fences just in case.
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python coach.py <metrics.json>", file=sys.stderr)
        sys.exit(1)
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("error: set ANTHROPIC_API_KEY first", file=sys.stderr)
        sys.exit(1)

    metrics = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    report = coach(metrics)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
