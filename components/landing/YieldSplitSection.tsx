"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";

// Timeline coordinate bounds in SVG (1440 x 600)
const START_X = 420;
const END_X = 1200;
const BASE_Y = 330;

// Milestone dates along the timeline
const MILESTONES = [
  { x: 420, label: "TODAY", date: "02 Oct 2026" },
  { x: 554, label: "NOV", date: "15 Nov 2026" },
  { x: 687, label: "DEC", date: "15 Dec 2026" },
  { x: 826, label: "JAN", date: "15 Jan 2027" },
  { x: 964, label: "FEB", date: "15 Feb 2027" },
  { x: 1089, label: "MAR", date: "10 Mar 2027" },
  { x: 1200, label: "MATURITY", date: "26 Mar 2027" },
];

export function YieldSplitSection() {
  // Current split position (from START_X = 420 to END_X = 1200)
  const [splitX, setSplitX] = useState<number>(START_X);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Normalized progress: 0.0 = Today (fully split) -> 1.0 = Maturity (fully zipped / unified)
  const progress = Math.max(0, Math.min(1, (splitX - START_X) / (END_X - START_X)));

  // Current simulated stats
  const daysLeft = Math.round(175 * (1 - progress));
  const daysElapsed = 175 - daysLeft;
  const currentPtPrice = (0.941 + progress * (1.0 - 0.941)).toFixed(3);
  const yieldStreamed = (progress * 0.059).toFixed(3);
  const isFullZipped = progress >= 0.98;

  // Approximate current date string
  const currentDateStr = useMemo(() => {
    if (progress <= 0.02) return "02 Oct 2026";
    if (progress >= 0.98) return "26 Mar 2027";
    // Interpolate date
    const d = new Date(2026, 9, 2); // Oct 2, 2026
    d.setDate(d.getDate() + Math.round(progress * 175));
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [progress]);

  // Convert pointer event clientX to SVG viewBox coordinate (0..1440)
  const updateSplitFromClientX = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 1440 / rect.width;
    const svgX = (clientX - rect.left) * scaleX;
    const clamped = Math.max(START_X, Math.min(END_X, svgX));
    setSplitX(clamped);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateSplitFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return;
    updateSplitFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Generate dynamic smooth paths based on splitX
  const { pathUnified, pathFixed, pathLong, fixedEndPt, longEndPt } = useMemo(() => {
    // 1. Unified line: from x=0 to x=splitX
    const unified = `M 0 ${BASE_Y} L ${splitX} ${BASE_Y}`;

    // If fully zipped (at or very near maturity), lines merge completely into straight line
    if (splitX >= END_X - 6) {
      return {
        pathUnified: `M 0 ${BASE_Y} L ${END_X} ${BASE_Y}`,
        pathFixed: `M ${END_X} ${BASE_Y} L ${END_X} ${BASE_Y}`,
        pathLong: `M ${END_X} ${BASE_Y} L ${END_X} ${BASE_Y}`,
        fixedEndPt: { x: END_X, y: BASE_Y },
        longEndPt: { x: END_X, y: BASE_Y },
      };
    }

    // 2. Fixed Yield path: ramps up from (splitX, 330) toward y=232 -> y=214
    const fixedPts: string[] = [`M ${splitX} ${BASE_Y}`];
    const longPts: string[] = [`M ${splitX} ${BASE_Y}`];

    const step = 14;
    for (let x = splitX + step; x <= END_X; x += step) {
      const normTotal = (x - START_X) / (END_X - START_X);
      const targetFixedY = 232 - normTotal * 18;

      // Smooth ease ramp from splitX
      const rampFixed = Math.min(1, (x - splitX) / 85);
      const smoothFixed = rampFixed * rampFixed * (3 - 2 * rampFixed);
      const yFixed = BASE_Y + (targetFixedY - BASE_Y) * smoothFixed;
      fixedPts.push(`L ${x.toFixed(1)} ${yFixed.toFixed(1)}`);

      // Long yield wave
      const wave = Math.sin((x - START_X) / 38) * 26 + Math.cos((x - START_X) / 72) * 12;
      const targetLongY = 430 + wave;
      const rampLong = Math.min(1, (x - splitX) / 95);
      const smoothLong = rampLong * rampLong * (3 - 2 * rampLong);
      const yLong = BASE_Y + (targetLongY - BASE_Y) * smoothLong;
      longPts.push(`L ${x.toFixed(1)} ${yLong.toFixed(1)}`);
    }

    // Ensure ending exactly at END_X
    const finalNorm = 1;
    const finalFixedY = 232 - finalNorm * 18;
    fixedPts.push(`L ${END_X} ${finalFixedY}`);

    const finalLongWave = Math.sin((END_X - START_X) / 38) * 26 + Math.cos((END_X - START_X) / 72) * 12;
    const finalLongY = 430 + finalLongWave;
    longPts.push(`L ${END_X} ${finalLongY}`);

    return {
      pathUnified: unified,
      pathFixed: fixedPts.join(" "),
      pathLong: longPts.join(" "),
      fixedEndPt: { x: END_X, y: finalFixedY },
      longEndPt: { x: END_X, y: finalLongY },
    };
  }, [splitX]);

  return (
    <section
      id="how"
      className="relative pt-20 sm:pt-28 lg:pt-36 pb-0 select-none overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(169,200,238,0.05) 0%, transparent 70%)",
      }}
    >
      {/* Top divider with ambient glow */}
      <div className="relative h-px max-w-full mx-0 mb-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-96 h-12 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 100% 100%, rgba(169,200,238,0.14), transparent 70%)",
          }}
        />
      </div>

      {/* Section Header */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 sm:gap-10 items-end mt-12">
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-ice shrink-0" />
            01 — THE SPLIT ENGINE
          </div>
          <h2 className="m-0 text-[34px] sm:text-[46px] lg:text-[58px] leading-[1.05] font-normal tracking-[-0.035em] text-balance">
            One asset.
            <br />
            <span className="text-foreground">Two ways to own its yield.</span>
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px] sm:text-[17px] leading-[1.6] text-muted font-light">
            USDG in a lending vault earns a rate that changes daily. We split that position:
            one side holds steady to maturity, the other rides the rate.
          </p>

          {/* Interactive Zipper Control & Preset buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase mr-1">
              Timeline:
            </span>
            <button
              type="button"
              onClick={() => setSplitX(START_X)}
              className={`mono text-[10px] tracking-[0.1em] px-2.5 py-1 border transition-all ${
                progress <= 0.05
                  ? "border-ice bg-ice/15 text-ice font-medium"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
              }`}
            >
              Today (Fully Split)
            </button>
            <button
              type="button"
              onClick={() => setSplitX(START_X + (END_X - START_X) * 0.5)}
              className={`mono text-[10px] tracking-[0.1em] px-2.5 py-1 border transition-all ${
                progress > 0.4 && progress < 0.6
                  ? "border-ice bg-ice/15 text-ice font-medium"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
              }`}
            >
              Mid-term (50%)
            </button>
            <button
              type="button"
              onClick={() => setSplitX(END_X)}
              className={`mono text-[10px] tracking-[0.1em] px-2.5 py-1 border transition-all ${
                isFullZipped
                  ? "border-amber bg-amber/15 text-amber font-medium"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
              }`}
            >
              Maturity (Zipped / Flat)
            </button>
          </div>
        </div>
      </div>

      {/* Live Simulation Stats Bar */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 mt-8 flex items-center justify-end gap-4 flex-wrap">
        <div className="mono flex items-center gap-4 text-[11px] tracking-[0.12em] text-muted">
          <div>
            DATE: <span className="text-foreground font-medium">{currentDateStr}</span>
          </div>
          <div>
            REMAINING: <span className="text-ice font-medium">{daysLeft}d</span>
          </div>
          <div>
            PT VALUE: <span className="text-ice font-medium">${currentPtPrice}</span>
          </div>
          <div>
            STREAMED: <span className="text-amber font-medium">${yieldStreamed}</span>
          </div>
        </div>
      </div>

      {/* ─── YIELD SPLIT INTERACTIVE SVG DIAGRAM ─── */}
      <div className="mt-4 sm:mt-6 overflow-x-auto no-scrollbar">
        <div className="min-w-[900px] lg:min-w-full">
          <svg
            ref={svgRef}
            viewBox="0 0 1440 600"
            className="block w-full h-auto cursor-default"
            role="img"
            aria-label="Interactive Yield Split Zipper Diagram"
          >
            <defs>
              {/* Radial gradient for glowing slider handle */}
              <radialGradient id="handleGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(169,200,238,0.5)" />
                <stop offset="60%" stopColor="rgba(169,200,238,0.15)" />
                <stop offset="100%" stopColor="rgba(169,200,238,0)" />
              </radialGradient>
              <radialGradient id="handleGlowAmber" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(240,168,92,0.6)" />
                <stop offset="60%" stopColor="rgba(240,168,92,0.15)" />
                <stop offset="100%" stopColor="rgba(240,168,92,0)" />
              </radialGradient>
              {/* Vertical line glow */}
              <linearGradient id="splitLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(169,200,238,0)" />
                <stop offset="30%" stopColor="rgba(169,200,238,0.25)" />
                <stop offset="50%" stopColor="rgba(236,237,234,0.6)" />
                <stop offset="70%" stopColor="rgba(240,168,92,0.25)" />
                <stop offset="100%" stopColor="rgba(240,168,92,0)" />
              </linearGradient>
            </defs>

            {/* Vertical milestone grid lines */}
            <g stroke="rgba(236,237,234,0.06)" strokeWidth="1">
              {MILESTONES.slice(0, -1).map((m) => (
                <path key={m.label} d={`M ${m.x} 120 V 550`} />
              ))}
            </g>

            {/* Baseline horizontal rule */}
            <path d="M 0 550 H 1440" stroke="rgba(236,237,234,0.12)" strokeWidth="1" />

            {/* Month labels along bottom */}
            <g className="mono" fontSize="11" letterSpacing="0.12em" fill="#6F7471">
              {MILESTONES.slice(0, -1).map((m) => (
                <text
                  key={m.label}
                  x={m.x}
                  y="576"
                  textAnchor="middle"
                  fill={splitX >= m.x ? "#ECEDEA" : "#6F7471"}
                  fontWeight={splitX >= m.x ? "500" : "400"}
                >
                  {m.label}
                </text>
              ))}
            </g>

            {/* Maturity line at x=1200 */}
            <path
              d={`M ${END_X} 110 V 550`}
              stroke={isFullZipped ? "#F0A85C" : "rgba(236,237,234,0.45)"}
              strokeWidth={isFullZipped ? "1.8" : "1"}
              strokeDasharray={isFullZipped ? "none" : "3 6"}
            />
            <g className="mono" fontSize="12" letterSpacing="0.14em">
              <text x={END_X + 16} y="130" fill={isFullZipped ? "#F0A85C" : "#ECEDEA"}>
                MATURITY
              </text>
              <text x={END_X + 16} y="150" fill="#8E9390">
                26 MAR 2027
              </text>
            </g>

            {/* 1. Unified USDG Line (before splitX) */}
            <path
              d={pathUnified}
              stroke="#ECEDEA"
              strokeWidth={isFullZipped ? "2.5" : "2"}
              fill="none"
              strokeLinecap="round"
            />
            {/* Flow dots on unified line */}
            <path
              d={pathUnified}
              stroke="#ECEDEA"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              className="flow slow"
            />

            {/* Left label: USDG Lending Vault */}
            <g className="mono" fontSize="12" letterSpacing="0.12em">
              <text x="40" y="306" fill="#ECEDEA">
                USDG LENDING VAULT
              </text>
              <text x="40" y="360" fill="#8E9390">
                COLLATERAL · 1.00 USDG
              </text>
            </g>

            {/* 2. Fixed Yield Path (Ice blue) */}
            {!isFullZipped && (
              <>
                <path
                  d={pathFixed}
                  stroke="#A9C8EE"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={pathFixed}
                  stroke="#A9C8EE"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  className="flow"
                />
                {/* Fixed yield labels */}
                <g className="mono" fontSize="11" letterSpacing="0.12em">
                  <text
                    x={Math.max(splitX + 60, 560)}
                    y="204"
                    fill="#A9C8EE"
                    opacity={progress > 0.85 ? 0.3 : 1}
                  >
                    FIXED YIELD · APY 6.42%
                  </text>
                  <text x={END_X + 16} y={fixedEndPt.y - 4} fill="#A9C8EE">
                    PAYS 1 : 1
                  </text>
                  <text x={END_X + 16} y={fixedEndPt.y + 16} fill="#A9C8EE">
                    IN USDG
                  </text>
                </g>
                <circle cx={END_X} cy={fixedEndPt.y} r="5" fill="#A9C8EE" />
              </>
            )}

            {/* 3. Long Yield Path (Amber waves) */}
            {!isFullZipped && (
              <>
                <path
                  d={pathLong}
                  stroke="#F0A85C"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={pathLong}
                  stroke="#F0A85C"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  className="flow"
                />
                {/* Long yield labels */}
                <g className="mono" fontSize="11" letterSpacing="0.12em">
                  <text
                    x={Math.max(splitX + 60, 560)}
                    y="508"
                    fill="#F0A85C"
                    opacity={progress > 0.85 ? 0.3 : 1}
                  >
                    LONG YIELD · FLOATS WITH THE RATE
                  </text>
                  <text x={END_X + 16} y={longEndPt.y - 2} fill="#F0A85C">
                    YIELD PAID OUT
                  </text>
                  <text x={END_X + 16} y={longEndPt.y + 18} fill="#F0A85C">
                    ENDS AT ZERO
                  </text>
                </g>
                <circle
                  cx={END_X}
                  cy={longEndPt.y}
                  r="5"
                  fill="none"
                  stroke="#F0A85C"
                  strokeWidth="1.8"
                />
              </>
            )}

            {/* Reunited at Maturity Indicator when fully zipped */}
            {isFullZipped && (
              <g className="mono" fontSize="12" letterSpacing="0.14em">
                <circle cx={END_X} cy={BASE_Y} r="7" fill="#34D399" />
                <circle cx={END_X} cy={BASE_Y} r="18" fill="none" stroke="#34D399" strokeWidth="1" strokeDasharray="3 3" />
                <text x={END_X + 24} y={BASE_Y - 8} fill="#34D399" fontWeight="600">
                  REUNITED AT MATURITY
                </text>
                <text x={END_X + 24} y={BASE_Y + 14} fill="#ECEDEA">
                  1 PT + 1 YT = 1 USDG REDEEMED
                </text>
              </g>
            )}

            {/* 4. DRAGGABLE ZIPPER HANDLE (At splitX) */}
            <g
              transform={`translate(${splitX} 0)`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="cursor-ew-resize group select-none pointer-events-auto"
            >
              {/* Invisible wide hit area for easy drag */}
              <rect x="-30" y="100" width="60" height="460" fill="transparent" />

              {/* Vertical highlight line through handle */}
              <line
                x1="0"
                y1="120"
                x2="0"
                y2="550"
                stroke="url(#splitLineGrad)"
                strokeWidth={isDragging ? "2" : "1.2"}
                strokeDasharray="2 4"
              />

              {/* Ambient handle glow */}
              <circle
                cx="0"
                cy={BASE_Y}
                r={isDragging ? "36" : "28"}
                fill={isFullZipped ? "url(#handleGlowAmber)" : "url(#handleGlow)"}
                className="transition-all duration-200"
              />

              {/* Outer reticle circle */}
              <circle
                cx="0"
                cy={BASE_Y}
                r={isDragging ? "20" : "16"}
                fill="#0A0C10"
                stroke={isDragging ? "#FFFFFF" : isFullZipped ? "#F0A85C" : "#A9C8EE"}
                strokeWidth="1.6"
                className="transition-all duration-150"
              />

              {/* Rotating zipper notches */}
              <circle
                cx="0"
                cy={BASE_Y}
                r="11"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Center core dot */}
              <circle
                cx="0"
                cy={BASE_Y}
                r="5"
                fill={isFullZipped ? "#F0A85C" : "#ECEDEA"}
              />
            </g>
          </svg>
        </div>
      </div>

      {/* ─── SUMMARY INVARIANT CARDS BELOW ─── */}
      <div className="max-w-[1240px] mx-auto mt-6 px-4 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-3 border-t border-white/10">
        <div className="flex flex-col gap-3 py-8 sm:py-10 md:border-r border-b md:border-b-0 border-white/10 md:pr-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ice shrink-0" />
              <span className="text-[16px] text-ice font-medium">Fixed Yield (PT)</span>
            </div>
            <span className="mono text-[13px] text-ice">${currentPtPrice}</span>
          </div>
          <span className="text-[14px] sm:text-[15px] leading-[1.6] text-muted font-light">
            Worth exactly 1 USDG at maturity, bought below 1 today. The gap is your locked
            return upfront with zero liquidation.
          </span>
          <div className="mono text-[11px] tracking-[0.12em] text-muted-dark mt-1 flex justify-between">
            <span>APY: 6.42% LOCKED</span>
            <span>MATURES: 1.00 USDG</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 py-8 sm:py-10 md:border-r border-b md:border-b-0 border-white/10 md:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
              <span className="text-[16px] text-amber font-medium">Long Yield (YT)</span>
            </div>
            <span className="mono text-[13px] text-amber">
              +{((progress * 0.059) / 0.059 * 100).toFixed(0)}% paid
            </span>
          </div>
          <span className="text-[14px] sm:text-[15px] leading-[1.6] text-muted font-light">
            Collects streaming yield until maturity, then ends at zero. You win if
            the variable rate stays above break-even.
          </span>
          <div className="mono text-[11px] tracking-[0.12em] text-muted-dark mt-1 flex justify-between">
            <span>CLAIMED: ${yieldStreamed}</span>
            <span>LEVERAGE: ~16.9x</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 py-8 sm:py-10 md:pl-10">
          <span className="mono text-[12px] text-muted-dark tracking-[0.14em] uppercase">
            Conservation Invariant
          </span>
          <span className="mono text-[22px] text-foreground leading-[1.3]">
            <span className="text-ice">1 PT</span> +{" "}
            <span className="text-amber">1 YT</span>
            <br />
            = 1 USDG Vault
          </span>
          <span className="mono text-[11px] tracking-[0.1em] text-muted-dark">
            {isFullZipped
              ? "STATUS: MATURITY REACHED — 100% COLLATERAL REDEEMABLE"
              : "STATUS: ACTIVE SPLIT — NO PROTOCOL DEBT OR MARGIN CALL"}
          </span>
        </div>
      </div>
    </section>
  );
}
