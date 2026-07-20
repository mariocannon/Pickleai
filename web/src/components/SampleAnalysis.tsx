"use client";

import { useState } from "react";

type Shot = "drop" | "dink" | "serve";

const DATA: Record<
  Shot,
  {
    label: string;
    title: string;
    score: string;
    summary: string;
    scores: [string, number][];
    fixes: [string, string, string][];
  }
> = {
  drop: {
    label: "Third-shot drop",
    title: "Third-shot drop · report",
    score: "7.4 / 10",
    summary:
      "Soft hands and a great contact point — your drop is close. Get lower and you'll take the pace off for good.",
    scores: [
      ["Technique", 78],
      ["Footwork", 64],
      ["Contact point", 81],
      ["Consistency", 70],
    ],
    fixes: [
      [
        "Bend your knees deeper",
        "Your paddle face is right, but you're reaching down with your arm instead of your legs. Sinking lower lets the shot float softer and land in the kitchen.",
        "Wall drops from a low athletic stance — 3×20",
      ],
      [
        "Slow the backswing",
        "A compact, unhurried backswing keeps the drop soft under pressure. Right now it speeds up when the ball comes fast.",
        "Shadow-swing metronome — 5 min",
      ],
      [
        "Recover to the line",
        "You admire the drop instead of moving up. Split-step, then step in toward the kitchen line every time.",
        "Drop-and-advance live reps — 4×10",
      ],
    ],
  },
  dink: {
    label: "Dink",
    title: "Dink · report",
    score: "8.0 / 10",
    summary:
      "Patient and controlled at the kitchen. Tighten your target window and you'll start winning the exchanges.",
    scores: [
      ["Technique", 82],
      ["Footwork", 71],
      ["Contact point", 84],
      ["Consistency", 76],
    ],
    fixes: [
      [
        "Aim cross-court more",
        "Most of your dinks go straight, giving your opponent easy angles. Cross-court gives you margin and pulls them wide.",
        "Cross-court dink rally — 5 min continuous",
      ],
      [
        "Stay off your heels",
        "You drift back onto your heels between dinks. Weight forward keeps you ready to attack a pop-up.",
        "Ready-position holds — 3×30s",
      ],
      [
        "Quieter paddle",
        "A little too much wrist is adding pace you don't want. Push with the shoulder, keep the wrist calm.",
        "Soft-hands catch drill — 4×15",
      ],
    ],
  },
  serve: {
    label: "Serve",
    title: "Serve · report",
    score: "6.9 / 10",
    summary:
      "Legal and consistent, but it's not pressuring anyone yet. More depth and a repeatable toss will earn free points.",
    scores: [
      ["Technique", 70],
      ["Footwork", 66],
      ["Contact point", 73],
      ["Consistency", 68],
    ],
    fixes: [
      [
        "Serve deeper",
        "Your serves land mid-court, letting returners step in. Aim for the back third to push them off the line.",
        "Deep-target zone serves — 30 reps",
      ],
      [
        "Consistent drop",
        "The release height varies serve to serve, moving your contact point around. Lock in one repeatable drop.",
        "Same-spot toss reps — 25",
      ],
      [
        "Full low-to-high swing",
        "You're arming it. Start low and swing up through contact for depth and spin without extra effort.",
        "Slow-motion swing grooving — 5 min",
      ],
    ],
  },
};

export function SampleAnalysis() {
  const [shot, setShot] = useState<Shot>("drop");
  const d = DATA[shot];

  return (
    <div className="sample-grid">
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }} aria-label="Sample shot type">
          {(Object.keys(DATA) as Shot[]).map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={shot === s}
              onClick={() => setShot(s)}
            >
              {DATA[s].label}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {d.scores.map(([lab, v]) => (
            <div className="sb" key={lab}>
              <span className="lab">{lab}</span>
              <span className="track">
                <span className="fill" style={{ width: `${v}%` }} />
              </span>
              <span className="v">{v}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, color: "var(--muted)", fontSize: "0.9rem" }}>{d.summary}</p>
      </div>

      <div className="panel" aria-live="polite">
        <div className="report-hd">
          <span className="t">{d.title}</span>
          <span className="sc">{d.score}</span>
        </div>
        <div>
          {d.fixes.map(([title, body, drill], i) => (
            <div className="fix" key={title}>
              <span className="rank">{i + 1}</span>
              <div>
                <h4>{title}</h4>
                <p>{body}</p>
                <div className="drill">{drill}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
