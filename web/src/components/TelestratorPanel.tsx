/** The hero's pose-analysis panel — the product, drawn as SVG. */
export function TelestratorPanel() {
  return (
    <div className="panel">
      <div className="panel-top">
        <span
          aria-hidden
          style={{ width: 9, height: 9, borderRadius: "50%", background: "#e5484d" }}
        />
        <span className="lbl">clip_04 · third-shot drop</span>
        <span className="grade">ANALYZED ✓</span>
      </div>
      <div className="frame">
        <svg viewBox="0 0 400 275" aria-label="Pose-estimation overlay of a player hitting a third-shot drop">
          <path d="M20 250 L150 150 L360 150 L392 250 Z" fill="none" stroke="var(--court)" strokeWidth="1" opacity=".45" />
          <path d="M70 205 L340 205" stroke="var(--optic)" strokeWidth="1.4" opacity=".5" />
          <path d="M250 120 Q300 40 360 96" fill="none" stroke="var(--teal)" strokeWidth="2" strokeDasharray="4 5" opacity=".9" />
          <circle cx="360" cy="96" r="6" fill="var(--optic)" stroke="var(--optic-ink)" strokeWidth=".6" />
          <g stroke="var(--teal-bright)" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M150 92 L156 150" />
            <path d="M150 92 L182 112" />
            <path d="M182 112 L214 128" />
            <path d="M156 150 L142 198" />
            <path d="M142 198 L149 250" />
            <path d="M156 150 L186 194" />
            <path d="M186 194 L203 248" />
          </g>
          <g stroke="var(--optic)" strokeWidth="3" strokeLinecap="round">
            <path d="M214 128 L238 108" />
            <ellipse cx="244" cy="102" rx="9" ry="12" fill="none" transform="rotate(-32 244 102)" />
          </g>
          <g fill="var(--optic)" stroke="var(--optic-ink)" strokeWidth=".5">
            <circle cx="150" cy="78" r="10" />
            <circle cx="150" cy="92" r="4" />
            <circle cx="182" cy="112" r="4" />
            <circle cx="214" cy="128" r="4" />
            <circle cx="156" cy="150" r="4" />
            <circle cx="142" cy="198" r="4" />
            <circle cx="149" cy="250" r="4" />
            <circle cx="186" cy="194" r="4" />
            <circle cx="203" cy="248" r="4" />
          </g>
        </svg>
        <div className="callout" style={{ top: "14%", right: "5%" }}>
          PADDLE ANGLE&nbsp;<span className="ok">62° ✓ soft</span>
        </div>
        <div className="callout" style={{ top: "46%", left: "4%" }}>
          CONTACT&nbsp;OUT FRONT <span className="ok">✓</span>
        </div>
        <div className="callout" style={{ bottom: "11%", right: "8%" }}>
          KNEE BEND&nbsp;<span className="warn">SHALLOW</span>
        </div>
      </div>
      <div className="panel-foot">
        <div className="stat"><div className="n">7.8</div><div className="k">Technique</div></div>
        <div className="stat"><div className="n">6.4</div><div className="k">Footwork</div></div>
        <div className="stat"><div className="n">8.1</div><div className="k">Contact</div></div>
        <div className="stat"><div className="n">3</div><div className="k">Fixes</div></div>
      </div>
    </div>
  );
}
