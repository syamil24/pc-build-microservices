import { useState } from "react";
import type { Product } from "./types";

type Slot = { code: string; name: string };

type Props = {
  slots: Slot[];
  picked: Record<string, Product | undefined>;
  active: string;
  onSelect: (code: string) => void;
};

function Blades({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g className="rig-fan" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i}
          d={`M ${cx} ${cy} q ${r * 0.72} ${-r * 0.26} ${r} ${-r * 0.78} q ${-r * 0.58} ${r * 0.3} ${-r} ${r * 0.78}`}
          fill="#46536b"
          transform={`rotate(${i * 51.4} ${cx} ${cy})`} />
      ))}
    </g>
  );
}

export default function RigCase({ slots, picked, active, onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const label = (code: string) => slots.find((slot) => slot.code === code)?.name ?? code;
  const shown = hover ?? active;

  function zone(code: string, labelText: string, children: JSX.Element, check: { x: number; y: number }) {
    const product = picked[code];
    const cls = "rig-zone" + (product ? " filled" : "") + (active === code ? " on" : "");
    return (
      <g className={cls} role="button" tabIndex={0}
         aria-label={`${label(code)} slot${product ? ": " + product.name : ", empty"}`}
         onMouseEnter={() => setHover(code)} onMouseLeave={() => setHover(null)}
         onFocus={() => setHover(code)} onBlur={() => setHover(null)}
         onClick={() => onSelect(code)}
         onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(code); } }}>
        {children}
        <text className="rig-tag" x={check.x} y={check.y + 22} textAnchor="middle">{labelText}</text>
        <g className="zone-check" transform={`translate(${check.x} ${check.y})`}>
          <circle r="9" />
          <path d="M -4 0 l 2.6 2.8 L 4.5 -3" />
        </g>
      </g>
    );
  }

  return (
    <div className="rig-wrap panel">
      <svg className="rig" viewBox="0 0 360 560" aria-label="Interactive PC case">
        <defs>
          <linearGradient id="rig-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#151a24" />
            <stop offset="1" stopColor="#0a0d13" />
          </linearGradient>
        </defs>

        {zone("CASE", "CASE", (
          <>
            <rect className="zone-shape" x="34" y="24" width="292" height="512" rx="18" fill="url(#rig-glass)" />
            <rect className="zone-glass" x="52" y="44" width="216" height="372" rx="10" />
          </>
        ), { x: 56, y: 38 })}

        {/* motherboard tray */}
        {zone("MOTHERBOARD", "BOARD", (
          <rect className="zone-shape" x="64" y="60" width="188" height="340" rx="8" />
        ), { x: 246, y: 70 })}

        {zone("CPU", "CPU", (
          <>
            <rect className="zone-shape" x="80" y="80" width="76" height="76" rx="8" />
            <rect className="zone-inset" x="92" y="92" width="52" height="52" rx="5" />
          </>
        ), { x: 80, y: 84 })}

        {zone("COOLING", "COOLER", (
          <>
            <circle className="zone-shape" cx="118" cy="118" r="46" />
            <Blades cx={118} cy={118} r={34} />
            <circle className="zone-hub" cx="118" cy="118" r="10" />
          </>
        ), { x: 162, y: 96 })}

        {zone("RAM", "RAM", (
          <>
            <rect className="zone-shape" x="170" y="74" width="76" height="96" rx="6" />
            <rect className="zone-inset" x="178" y="82" width="12" height="80" rx="3" />
            <rect className="zone-inset" x="196" y="82" width="12" height="80" rx="3" />
            <rect className="zone-inset" x="214" y="82" width="12" height="80" rx="3" />
            <rect className="zone-inset" x="232" y="82" width="12" height="80" rx="3" />
          </>
        ), { x: 170, y: 78 })}

        {zone("GPU", "GPU", (
          <>
            <rect className="zone-shape" x="74" y="196" width="172" height="56" rx="7" />
            <circle className="zone-inset" cx="106" cy="224" r="16" />
            <circle className="zone-inset" cx="150" cy="224" r="16" />
            <rect className="zone-inset" x="186" y="208" width="52" height="32" rx="4" />
          </>
        ), { x: 74, y: 200 })}

        {zone("STORAGE", "DRIVE", (
          <>
            <rect className="zone-shape" x="74" y="272" width="120" height="46" rx="6" />
            <rect className="zone-inset" x="82" y="280" width="66" height="30" rx="4" />
          </>
        ), { x: 74, y: 276 })}

        {zone("PSU", "PSU", (
          <>
            <rect className="zone-shape" x="52" y="430" width="272" height="90" rx="10" />
            <circle className="zone-inset" cx="96" cy="475" r="24" />
            <rect className="zone-inset" x="140" y="452" width="120" height="14" rx="4" />
            <rect className="zone-inset" x="140" y="476" width="88" height="14" rx="4" />
          </>
        ), { x: 318, y: 436 })}

        {/* decorative front fans, rgb strip, power led */}
        <g aria-hidden="true">
          <circle cx="292" cy="120" r="26" fill="#0d1118" stroke="#2c3547" strokeWidth="2" />
          <Blades cx={292} cy={120} r={19} />
          <circle cx="292" cy="204" r="26" fill="#0d1118" stroke="#2c3547" strokeWidth="2" />
          <Blades cx={292} cy={204} r={19} />
          <rect className="rig-rgb" x="318" y="60" width="6" height="320" rx="3" fill="#d6ff3f" />
          <circle className="rig-led" cx="310" cy="516" r="5" fill="#d6ff3f" />
          <rect x="120" y="536" width="40" height="10" rx="4" fill="#232a37" />
          <rect x="200" y="536" width="40" height="10" rx="4" fill="#232a37" />
        </g>
      </svg>
      <div className="rig-caption" aria-live="polite">
        <strong>{label(shown)}</strong>
        <span className="muted">
          {picked[shown] ? picked[shown]!.name : "Empty slot - hover a part, then click to browse options"}
        </span>
      </div>
    </div>
  );
}
