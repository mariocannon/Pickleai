import Link from "next/link";
import { TelestratorPanel } from "@/components/TelestratorPanel";
import { SampleAnalysis } from "@/components/SampleAnalysis";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <>
      <nav className="land-nav">
        <div className="wrap land-nav-in">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            PickleAI
          </Link>
          <div className="land-links">
            <a href="#how">How it works</a>
            <a href="#sample">Sample analysis</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <ThemeToggle />
            <Link className="btn btn-primary btn-sm" href="/login">
              Analyze free
            </Link>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow" style={{ marginBottom: 20 }}>
              AI coaching · built for pickleball
            </p>
            <h1 className="display">
              Your personal
              <br />
              pickleball coach.
              <br />
              <span className="hl">In your pocket.</span>
            </h1>
            <p className="lede">
              Upload a clip of your game. Get pro-level feedback, drills, and a plan to
              improve — in minutes, not $100 an hour.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <Link className="btn btn-primary" href="/login">
                Analyze my first clip free →
              </Link>
              <a className="btn btn-ghost" href="#sample">
                See a sample analysis
              </a>
            </div>
            <div className="trust">
              <span><b>✓</b> No coach required</span>
              <span><b>✓</b> Works with any phone video</span>
              <span><b>✓</b> Cancel anytime</span>
            </div>
          </div>
          <TelestratorPanel />
        </div>
      </header>

      <section className="band band-alt" id="how">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">The workflow</p>
            <h2 className="display">Three steps to a better game.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <span className="idx">STEP 01</span>
              <h3>Upload</h3>
              <p>Drop in a clip from your phone — a serve, a dink rally, a full point. Any angle, any court.</p>
            </div>
            <div className="step">
              <span className="idx">STEP 02</span>
              <h3>We analyze</h3>
              <p>Our AI maps your body mechanics, timing, positioning, and shot selection against a pickleball coaching rubric.</p>
            </div>
            <div className="step">
              <span className="idx">STEP 03</span>
              <h3>You improve</h3>
              <p>Get the three fixes that matter most, drills to groove them, and progress tracked across every upload.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="sample">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Show, don&apos;t tell</p>
            <h2 className="display">This is what you get back.</h2>
            <p>
              Pick a shot to see a real report. Every fix is specific, ranked by impact,
              and paired with a drill.
            </p>
          </div>
          <SampleAnalysis />
        </div>
      </section>

      <section className="band band-alt" id="pricing">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: "center", marginLeft: "auto", marginRight: "auto" }}>
            <p className="eyebrow">Pricing</p>
            <h2 className="display">Less than one lesson a month.</h2>
            <p>Start with a free analysis — no card required. Upgrade when you want more.</p>
          </div>
          <div className="price-grid">
            <div className="plan">
              <span className="pname">Free trial</span>
              <div className="amt">$0</div>
              <div className="quota">1 full analysis · one time</div>
              <ul>
                <li>One complete coaching report</li>
                <li>Top fixes + drills</li>
                <li>No credit card</li>
              </ul>
              <Link className="btn btn-ghost" href="/login">Start free</Link>
            </div>
            <div className="plan featured">
              <span className="tag">Most popular</span>
              <span className="pname">Starter</span>
              <div className="amt">
                $14<small>/mo</small>
              </div>
              <div className="quota">10 analyses / month</div>
              <ul>
                <li>Full reports + all shot types</li>
                <li>Drills for every fix</li>
                <li>History + progress tracking</li>
                <li>Email when analysis is ready</li>
              </ul>
              <Link className="btn btn-primary" href="/login">Choose Starter</Link>
            </div>
            <div className="plan">
              <span className="pname">Pro</span>
              <div className="amt">
                $28<small>/mo</small>
              </div>
              <div className="quota">30 analyses / month</div>
              <ul>
                <li>Everything in Starter</li>
                <li>Priority processing</li>
                <li>Longer clips + full-rally analysis</li>
                <li>Deeper progress analytics</li>
              </ul>
              <Link className="btn btn-ghost" href="/login">Choose Pro</Link>
            </div>
          </div>
          <p className="mono" style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.82rem", marginTop: 22 }}>
            Save ~2 months on annual billing · Cancel anytime, no lock-in
          </p>
        </div>
      </section>

      <section className="band" id="faq">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Good questions</p>
            <h2 className="display">Before you upload.</h2>
          </div>
          <div className="faq">
            <div>
              <details>
                <summary>What kind of video works?</summary>
                <p>Any phone video. A side or back angle where the whole point is visible works best — but don&apos;t overthink it, just film and upload.</p>
              </details>
              <details>
                <summary>How accurate is it, really?</summary>
                <p>It&apos;s strong on technique, timing, and positioning — the mechanics a coach would flag. When a clip is too dark or far to read confidently, we tell you instead of guessing.</p>
              </details>
              <details>
                <summary>Do I need special equipment?</summary>
                <p>No. Just your phone and a way to prop it up. No sensors, no wearables.</p>
              </details>
            </div>
            <div>
              <details>
                <summary>Is my video private?</summary>
                <p>Yes — private by default. Only you see your clips and reports, and you can delete any of them anytime.</p>
              </details>
              <details>
                <summary>Can this replace my coach?</summary>
                <p>Think of it as your coach between lessons: instant feedback whenever you play, at a fraction of the cost. Many players use both.</p>
              </details>
              <details>
                <summary>What skill levels is it for?</summary>
                <p>Beginner through advanced — from your first dinks to fine-tuning a 4.5 third-shot drop. Feedback adapts to your level.</p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <section className="band" style={{ textAlign: "center" }}>
        <div className="wrap">
          <p className="eyebrow" style={{ marginBottom: 18 }}>Stop guessing</p>
          <h2 className="display" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>Start improving.</h2>
          <p style={{ color: "var(--ink-2)", fontSize: "1.1rem", margin: "16px auto 28px", maxWidth: "44ch" }}>
            Your next breakthrough is one clip away. See what a coach would see — for free.
          </p>
          <Link className="btn btn-primary" href="/login" style={{ fontSize: "1.05rem", padding: "15px 26px" }}>
            Analyze my first clip free →
          </Link>
        </div>
      </section>

      <footer className="land-footer">
        <div className="wrap land-footer-in">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            PickleAI
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
