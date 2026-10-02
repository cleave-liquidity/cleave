"use client";

import React, { useEffect, useRef, useState } from "react";
import { STAR_NODES } from "./heroStars";

export interface HeroVisualProps {
  activeStage?: number;
  onSelectStage?: (stage: number) => void;
  isSplitLayout?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering model
// React renders the *static* SVG tree once (and again only when the stage
// changes). Everything that moves every frame — sphere lattice, stars, vault
// cube, mini-planet geometry, camera — is written straight to the DOM from a
// single rAF loop. No setState per frame, no reconciliation, no SVG filters
// (glows are radial-gradient discs, which are cheap on Safari / low-end GPUs).
// ─────────────────────────────────────────────────────────────────────────────

const R = 345;
const DEG = Math.PI / 180;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
/** Frame-rate independent exponential approach factor. */
const decay = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

const CUBE_VERTICES: ReadonlyArray<readonly [number, number, number]> = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const CUBE_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const LAT_ANGLES = [-68, -52, -36, -20, -4, 12, 28, 44, 60, 72];
const LAT_STROKE = LAT_ANGLES.map((deg) => (Math.abs(deg) <= 6 ? 1.2 : 0.65));
const MERIDIAN_COUNT = 16; // full great circles → 8 visible on the near side
const MERIDIAN_SAMPLES: number[] = [];
for (let deg = -90; deg <= 90; deg += 5) MERIDIAN_SAMPLES.push(deg * DEG);

const S_OUTER = 70;
const S_INNER = 36;

// Cinematic camera targets per stage.
const CAMERA_STAGES = [
  { scale: 0.88, x: 30, y: 0 }, // 0 overview
  { scale: 1.62, x: 230, y: -390 }, // 1 fixed yield (diamond)
  { scale: 1.62, x: -350, y: 210 }, // 2 long yield (bio-particle)
  { scale: 1.75, x: 60, y: 320 }, // 3 split engine (prisms)
  { scale: 1.62, x: -260, y: -390 }, // 4 USDG vault (gyroscope)
] as const;

const CAM0: { scale: number; x: number; y: number } = CAMERA_STAGES[0];

const DRAG_THRESHOLD_PX = 5;
const ROT_X_MIN = -45;
const ROT_X_MAX = 50;

// ─── DOM registry ────────────────────────────────────────────────────────────
type El<T extends Element> = T | null;

interface SceneDom {
  cam: El<SVGGElement>;
  fixedRing: El<SVGGElement>;
  longRing: El<SVGGElement>;
  lats: El<SVGEllipseElement>[];
  merFront: El<SVGPathElement>;
  merBack: El<SVGPathElement>;
  starCore: El<SVGCircleElement>[];
  starHalo: El<SVGCircleElement>[];
  starHidden: boolean[];
  cubeEdges: El<SVGLineElement>[];
  innerEdges: El<SVGLineElement>[];
  cubeNodes: El<SVGCircleElement>[];
  cubeGlows: El<SVGCircleElement>[];
  diamond: El<SVGPolygonElement>[];
  bio: El<SVGPathElement>;
  spores: El<SVGCircleElement>[];
  prismTopPoly: El<SVGPolygonElement>;
  prismTopEdges: El<SVGPathElement>;
  prismBotPoly: El<SVGPolygonElement>;
  prismBotEdges: El<SVGPathElement>;
  gyro: El<SVGGElement>[];
  vaultFront: El<SVGPathElement>;
  vaultBack: El<SVGPathElement>;
}

const createDom = (): SceneDom => ({
  cam: null,
  fixedRing: null,
  longRing: null,
  lats: [],
  merFront: null,
  merBack: null,
  starCore: [],
  starHalo: [],
  starHidden: [],
  cubeEdges: [],
  innerEdges: [],
  cubeNodes: [],
  cubeGlows: [],
  diamond: [],
  bio: null,
  spores: [],
  prismTopPoly: null,
  prismTopEdges: null,
  prismBotPoly: null,
  prismBotEdges: null,
  gyro: [],
  vaultFront: null,
  vaultBack: null,
});

const setA = (el: Element | null, name: string, value: number | string) => {
  if (el) el.setAttribute(name, typeof value === "number" ? String(Math.round(value * 100) / 100) : value);
};
const r2 = (n: number) => Math.round(n * 100) / 100;

function createSim() {
  return {
    // orientation (degrees)
    currentX: 18, currentY: 0, targetX: 18, targetY: 0,
    velocityX: 0, velocityY: 0,
    tiltX: 0, tiltY: 0, hoverTiltX: 0, hoverTiltY: 0,
    // pointer (normalised −1…1) for parallax + orbit bias
    ptrTX: 0, ptrTY: 0, ptrX: 0, ptrY: 0,
    // camera
    camScale: CAM0.scale, camPanX: CAM0.x, camPanY: CAM0.y,
    targetScale: CAM0.scale, targetPanX: CAM0.x, targetPanY: CAM0.y,
    // orbit emphasis (eased)
    fixedOp: 0.72, longOp: 0.72,
    stage: 0,
    // drag / tap
    isDragging: false, pressed: false, moved: false, pointerId: -1,
    downX: 0, downY: 0, dragStartX: 0, dragStartY: 0, rotAtDragX: 0, rotAtDragY: 0,
    lastX: 0, lastY: 0, lastT: 0,
    downStage: -1, downReset: false,
    reduced: false,
    };
}

// ─── Per-frame painters ──────────────────────────────────────────────────────

/** Transparent planet lattice: latitudes, near/far meridians, constellation. */
function paintLattice(dom: SceneDom, rotX: number, rotY: number) {
  const tilt = rotX * DEG;
  const rY = rotY * DEG;
  const sinT = Math.sin(tilt);
  const cosT = Math.cos(tilt);

  LAT_ANGLES.forEach((deg, i) => {
    const el = dom.lats[i];
    if (!el) return;
    const lat = deg * DEG;
    const cosLat = Math.cos(lat);
    const rx = R * cosLat;
    const op = clamp(0.38 + 0.42 * cosLat, 0.18, 0.85);
    setA(el, "cy", -R * Math.sin(lat) * cosT);
    setA(el, "rx", rx);
    setA(el, "ry", Math.max(0.1, rx * Math.abs(sinT)));
    setA(el, "opacity", LAT_STROKE[i] > 1 ? op * 1.35 : op);
  });

  // Meridians are split exactly where they cross the visible limb, so the
  // near/far styling moves continuously instead of flipping per meridian.
  let front = "";
  let back = "";
  for (let m = 0; m < MERIDIAN_COUNT; m++) {
    const lon = (m * 360) / MERIDIAN_COUNT * DEG + rY;
    const sinLon = Math.sin(lon);
    const cosLon = Math.cos(lon);
    let px = 0;
    let py = 0;
    let pz = 0;
    let side: boolean | null = null; // true = near side
    for (let i = 0; i < MERIDIAN_SAMPLES.length; i++) {
      const phi = MERIDIAN_SAMPLES[i];
      const cosPhi = Math.cos(phi);
      const Y = R * Math.sin(phi);
      const Z = R * cosPhi * cosLon;
      const x = R * cosPhi * sinLon;
      const y = -(Y * cosT - Z * sinT);
      const z = Y * sinT + Z * cosT;
      const near = z >= 0;
      if (i === 0) {
        side = near;
        const seg = `M${r2(x)} ${r2(y)}`;
        if (near) front += seg;
        else back += seg;
      } else {
        if (near !== side) {
          const t = pz / (pz - z);
          const cx = lerp(px, x, t);
          const cy = lerp(py, y, t);
          const close = `L${r2(cx)} ${r2(cy)}`;
          const open = `M${r2(cx)} ${r2(cy)}`;
          if (side) {
            front += close;
            back += open;
          } else {
            back += close;
            front += open;
          }
          side = near;
        }
        const seg = `L${r2(x)} ${r2(y)}`;
        if (near) front += seg;
        else back += seg;
      }
      px = x;
      py = y;
      pz = z;
    }
  }
  setA(dom.merFront, "d", front);
  setA(dom.merBack, "d", back);

  // Constellation nodes — fade smoothly through the limb (no pop in/out).
  for (let i = 0; i < STAR_NODES.length; i++) {
    const lat = STAR_NODES[i][0];
    const lon = STAR_NODES[i][1];
    const phi = lat * DEG;
    const theta = lon * DEG + rY;
    const X = R * Math.cos(phi) * Math.sin(theta);
    const Y = R * Math.sin(phi);
    const Z = R * Math.cos(phi) * Math.cos(theta);
    const y = -(Y * cosT - Z * sinT);
    const z = Y * sinT + Z * cosT;
    const fade = smooth((z + 70) / 100);
    const op = clamp(((z + R) / (2 * R)) * 1.15, 0.15, 0.98) * fade;
    // Far-side stars are fully faded: skip the DOM writes (halves per-frame style work).
    if (op < 0.004 && dom.starHidden[i]) continue;
    dom.starHidden[i] = op < 0.004;
    const core = dom.starCore[i];
    const halo = dom.starHalo[i];
    setA(core, "cx", X);
    setA(core, "cy", y);
    setA(core, "opacity", op);
    setA(halo, "cx", X);
    setA(halo, "cy", y);
    setA(halo, "opacity", op * 0.28);
  }
}

/** Cryptographic vault core: nested cube + tesseract struts. */
function paintCore(dom: SceneDom, rotX: number, rotY: number) {
  const rx = rotX * DEG;
  const ry = rotY * DEG;
  const cosRx = Math.cos(rx);
  const sinRx = Math.sin(rx);
  const cosRy = Math.cos(ry);
  const sinRy = Math.sin(ry);

  const project = (vx: number, vy: number, vz: number, s: number) => {
    const x = vx * s;
    const y = vy * s;
    const z = vz * s;
    const x1 = x * cosRy + z * sinRy;
    const z1 = -x * sinRy + z * cosRy;
    return { x: x1, y: y * cosRx - z1 * sinRx, z: y * sinRx + z1 * cosRx };
  };
  const outer = CUBE_VERTICES.map(([a, b, c]) => project(a, b, c, S_OUTER));
  const inner = CUBE_VERTICES.map(([a, b, c]) => project(a, b, c, S_INNER));
  // Depth → 0 (far) … 1 (near), continuous so edges never snap.
  const depth = (z: number) => smooth((z + 40) / 80);

  const line = (el: SVGLineElement | null, a: { x: number; y: number }, b: { x: number; y: number }, k: number, op: [number, number], sw: [number, number]) => {
    if (!el) return;
    setA(el, "x1", a.x);
    setA(el, "y1", a.y);
    setA(el, "x2", b.x);
    setA(el, "y2", b.y);
    setA(el, "opacity", lerp(op[0], op[1], k));
    setA(el, "stroke-width", lerp(sw[0], sw[1], k));
  };

  CUBE_EDGES.forEach(([i, j], n) => {
    const k = depth((outer[i].z + outer[j].z) / 2);
    line(dom.cubeEdges[n], outer[i], outer[j], k, [0.35, 0.85], [0.7, 1.2]);
  });
  for (let i = 0; i < 8; i++) {
    const k = depth((outer[i].z + inner[i].z) / 2);
    line(dom.cubeEdges[12 + i], outer[i], inner[i], k, [0.2, 0.55], [0.75, 0.75]);
  }
  CUBE_EDGES.forEach(([i, j], n) => {
    const k = depth((inner[i].z + inner[j].z) / 2);
    line(dom.innerEdges[n], inner[i], inner[j], k, [0.25, 0.7], [0.5, 0.9]);
  });
  for (let i = 0; i < 8; i++) {
    const v = outer[i];
    const k = depth(v.z);
    const node = dom.cubeNodes[i];
    setA(node, "cx", v.x);
    setA(node, "cy", v.y);
    setA(node, "r", lerp(1.4, 2.5, k));
    setA(node, "opacity", lerp(0.4, 0.9, k));
    const glow = dom.cubeGlows[i];
    setA(glow, "cx", v.x);
    setA(glow, "cy", v.y);
    setA(glow, "opacity", k * 0.8);
  }
}

/** Mini-planet geometry (diamond, bio-membrane, prisms, gyroscope, vault cube). */
function paintMini(dom: SceneDom, t: number) {
  // 1. Fixed yield — crystal octahedron
  const dRotY = t * 1.8;
  const dRotX = 0.38;
  const cDY = Math.cos(dRotY);
  const sDY = Math.sin(dRotY);
  const cDX = Math.cos(dRotX);
  const sDX = Math.sin(dRotX);
  const pd = (x: number, y: number, z: number) => {
    const x1 = x * cDY + z * sDY;
    const z1 = -x * sDY + z * cDY;
    return { x: x1, y: y * cDX - z1 * sDX, z: y * sDX + z1 * cDX };
  };
  const dS = 12;
  const dH = 15;
  const top = pd(0, -dH, 0);
  const bot = pd(0, dH, 0);
  const right = pd(dS, 0, 0);
  const left = pd(-dS, 0, 0);
  const frontV = pd(0, 0, dS);
  const backV = pd(0, 0, -dS);
  const facets = [
    [top, right, frontV], [top, frontV, left], [top, left, backV], [top, backV, right],
    [bot, frontV, right], [bot, left, frontV], [bot, backV, left], [bot, right, backV],
  ];
  facets.forEach((tri, idx) => {
    const el = dom.diamond[idx];
    if (!el) return;
    const cp = (tri[1].x - tri[0].x) * (tri[2].y - tri[0].y) - (tri[1].y - tri[0].y) * (tri[2].x - tri[0].x);
    const isFront = cp > 0;
    el.setAttribute(
      "points",
      `${tri[0].x.toFixed(1)},${tri[0].y.toFixed(1)} ${tri[1].x.toFixed(1)},${tri[1].y.toFixed(1)} ${tri[2].x.toFixed(1)},${tri[2].y.toFixed(1)}`
    );
    el.setAttribute(
      "fill",
      isFront ? (idx % 2 === 0 ? "rgba(220,240,255,0.45)" : "rgba(169,200,238,0.28)") : "rgba(80,120,180,0.08)"
    );
    el.setAttribute("stroke", isFront ? (idx % 2 === 0 ? "#FFFFFF" : "#A9C8EE") : "rgba(169,200,238,0.2)");
    el.setAttribute("stroke-width", isFront ? "0.95" : "0.45");
  });

  // 2. Long yield — undulating membrane + orbiting spores
  const bioR = 13;
  const n = 16;
  let bio = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rm = bioR + 2.4 * Math.sin(a * 3 + t * 4.2) + 1.6 * Math.cos(a * 2 - t * 3.1);
    bio += `${i === 0 ? "M" : "L"}${(Math.cos(a) * rm).toFixed(1)} ${(Math.sin(a) * rm).toFixed(1)}`;
  }
  setA(dom.bio, "d", bio + "Z");
  const spore = (el: SVGCircleElement | null, a: number, rx: number, ry: number, skew: number, rFar: number, rNear: number, oFar: number, oNear: number) => {
    if (!el) return;
    const s = Math.sin(a);
    const k = smooth((s + 0.25) / 0.5);
    setA(el, "cx", Math.cos(a) * rx);
    setA(el, "cy", s * ry + Math.cos(a) * skew);
    setA(el, "r", lerp(rFar, rNear, k));
    setA(el, "opacity", lerp(oFar, oNear, k));
  };
  spore(dom.spores[0], t * 3.2, 20, 8, -3, 1.1, 1.8, 0.4, 0.95);
  spore(dom.spores[1], -t * 2.6 + 1.8, 23, 10, 5, 1.2, 2.0, 0.35, 0.9);
  spore(dom.spores[2], t * 4.0 + 3.5, 16, 7, -6, 1.0, 1.6, 0.3, 0.9);

  // 3. Split engine — cleaving prisms
  const sRot = t * 2.2;
  const sH = 11;
  const sR = 10;
  const sGap = 2.2;
  const cS = Math.cos(sRot);
  const sS = Math.sin(sRot);
  const pp = (x: number, y: number, z: number) => {
    const z1 = -x * sS + z * cS;
    return { x: x * cS + z * sS, y: y * 0.92 - z1 * 0.28 };
  };
  const ang = [0, 2.094, 4.188];
  const prism = (sign: 1 | -1, poly: SVGPolygonElement | null, edges: SVGPathElement | null) => {
    const base = ang.map((a) => pp(sR * Math.cos(a), sign * (sGap + sH), sR * Math.sin(a)));
    const apex = pp(0, sign * sGap, 0);
    setA(poly, "points", base.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
    setA(edges, "d", base.map((p) => `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${apex.x.toFixed(1)} ${apex.y.toFixed(1)}`).join(""));
  };
  prism(-1, dom.prismTopPoly, dom.prismTopEdges);
  prism(1, dom.prismBotPoly, dom.prismBotEdges);

  // 4. USDG vault — gyroscope + shield cube
  const gT = t * 1.5;
  setA(dom.gyro[0], "transform", `rotate(${((gT * 55) % 360).toFixed(2)}) scale(1 0.4)`);
  setA(dom.gyro[1], "transform", `rotate(${((-gT * 42) % 360).toFixed(2)}) scale(0.42 1)`);
  setA(dom.gyro[2], "transform", `rotate(${((gT * 28 + 45) % 360).toFixed(2)}) scale(1 0.55)`);

  const vR = 9;
  const cA = t * 1.6;
  const cC = Math.cos(cA);
  const sC = Math.sin(cA);
  const cv = CUBE_VERTICES.map(([a, b, c]) => {
    const x = a * vR;
    const y = b * vR;
    const z = c * vR;
    const z1 = -x * sC + z * cC;
    return { x: x * cC + z * sC, y: y * 0.88 - z1 * 0.32, z: z1 };
  });
  let vf = "";
  let vb = "";
  CUBE_EDGES.forEach(([i, j]) => {
    const seg = `M${cv[i].x.toFixed(1)} ${cv[i].y.toFixed(1)}L${cv[j].x.toFixed(1)} ${cv[j].y.toFixed(1)}`;
    if ((cv[i].z + cv[j].z) / 2 > 0) vf += seg;
    else vb += seg;
  });
  setA(dom.vaultFront, "d", vf);
  setA(dom.vaultBack, "d", vb);
}

// ─── Small presentational helpers ────────────────────────────────────────────

function Glow({ r, id, opacity = 1 }: { r: number; id: string; opacity?: number }) {
  return <circle r={r} fill={`url(#${id})`} opacity={opacity} pointerEvents="none" />;
}

/** Radar ping that fades in/out with the stage. Wrapper owns opacity, circle owns the animation. */
function PingRing({ color, active }: { color: string; active: boolean }) {
  return (
    <g className="pin-fade" style={{ opacity: active ? 0.6 : 0 }} pointerEvents="none">
      <circle r="44" fill="none" stroke={color} strokeWidth="1.2" className="pin-ping" />
    </g>
  );
}

function PinBadge({
  active,
  visible,
  width,
  bg,
  color,
  title,
  sub,
}: {
  active: boolean;
  visible: boolean;
  width: number;
  bg: string;
  color: string;
  title: string;
  sub: string;
}) {
  return (
    <g transform="translate(32 -16)" pointerEvents="none" className="select-none">
      <g className="pin-badge" style={{ opacity: visible ? 1 : 0 }}>
        <rect
          width={width}
          height="30"
          rx="4"
          fill={bg}
          stroke={active ? color : `${color}59`}
          strokeWidth={active ? 1.4 : 0.9}
        />
        <circle cx="10" cy="11" r="2.5" fill={color} className={active ? "pin-pulse" : undefined} />
        <text x="18" y="14" fill={color} className="mono text-[9.5px] font-semibold tracking-[0.14em]">
          {title}
        </text>
        <text x="18" y="24" fill="#8E929B" className="mono text-[7.5px] tracking-[0.1em]">
          {sub}
        </text>
      </g>
    </g>
  );
}

/** Orbiting satellite whose glow stays round inside a vertically squashed orbit group. */
function Satellite({
  orbit,
  squash,
  duration,
  delay,
  core,
  glowId,
  glowR,
}: {
  orbit: number;
  squash: number;
  duration: string;
  delay: string;
  core: number;
  glowId: string;
  glowR: number;
}) {
  return (
    <g className="spin" style={{ animationDuration: duration, animationDelay: delay }}>
      <g transform={`translate(${orbit} 0)`}>
        <g className="spin rev" style={{ animationDuration: duration, animationDelay: delay }}>
          {/* Undo the orbit's non-uniform squash so the body is a true circle. */}
          <g transform={`scale(1 ${r2(1 / squash)})`}>
            <circle r={glowR} fill={`url(#${glowId})`} />
            <circle r={core} fill="#FFFFFF" />
          </g>
        </g>
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function HeroVisual({ activeStage = 0, onSelectStage, isSplitLayout = true }: HeroVisualProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onSelectRef = useRef(onSelectStage);
  useEffect(() => {
    onSelectRef.current = onSelectStage;
  }, [onSelectStage]);
  const kickRef = useRef<() => void>(() => {});

  const domRef = useRef(createDom());
  const sRef = useRef(createSim());


  // Stage → camera target.
  useEffect(() => {
    const s = sRef.current;
    const c = CAMERA_STAGES[activeStage] ?? CAMERA_STAGES[0];
    s.stage = activeStage;
    s.targetScale = c.scale;
    s.targetPanX = c.x;
    s.targetPanY = c.y;
    if (s.reduced) {
      s.camScale = c.scale;
      s.camPanX = c.x;
      s.camPanY = c.y;
    }
    kickRef.current();
  }, [activeStage]);

  // Animation loop (visibility-aware, reduced-motion-aware, dt-based).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const dom = domRef.current;
    const s = sRef.current;

    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    s.reduced = reducedMq.matches;

    let raf = 0;
    let last = 0;
    let inView = true;

    const canRun = () => inView && !document.hidden;

    const paint = (now: number) => {
      const t = s.reduced ? 0 : now * 0.001;
      const parX = clamp(s.ptrX * 2.5, -3, 3);
      const parY = clamp(s.ptrY * 2.5, -3, 3);
      const cx = (isSplitLayout ? 890 : 720) + parX + s.camPanX;
      const cy = 470 + parY + s.camPanY;
      setA(dom.cam, "transform", `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${s.camScale.toFixed(4)})`);
      setA(dom.fixedRing, "opacity", s.fixedOp);
      setA(dom.longRing, "opacity", s.longOp);
      paintLattice(dom, s.currentX, s.currentY);
      paintCore(dom, s.currentX, s.currentY);
      paintMini(dom, t);
    };

    const step = (dt: number) => {
      const reduced = s.reduced;
      if (!s.isDragging) {
        if (!reduced) s.targetY += 2.4 * dt;
        // Inertia: 0.92/frame @60Hz, expressed per-second so 120Hz matches.
        const keep = Math.exp(-5 * dt);
        s.velocityX *= keep;
        s.velocityY *= keep;
        s.targetX = clamp(s.targetX + s.velocityX * dt * 25, ROT_X_MIN, ROT_X_MAX);
        s.targetY += s.velocityY * dt * 25;
      }

      // Hover tilt eases in/out (and out of the way while dragging) — never snaps.
      const tiltGoalX = s.isDragging || reduced ? 0 : s.hoverTiltX;
      const tiltGoalY = s.isDragging || reduced ? 0 : s.hoverTiltY;
      const tiltF = decay(6, dt);
      s.tiltX += (tiltGoalX - s.tiltX) * tiltF;
      s.tiltY += (tiltGoalY - s.tiltY) * tiltF;

      const rotF = decay(s.isDragging ? 18 : 4.5, dt);
      s.currentX += (s.targetX + s.tiltX - s.currentX) * rotF;
      s.currentY += (s.targetY + s.tiltY - s.currentY) * rotF;

      // Camera: exponential decay, identical at 60 / 120 Hz.
      if (reduced) {
        s.camScale = s.targetScale;
        s.camPanX = s.targetPanX;
        s.camPanY = s.targetPanY;
      } else {
        const camF = decay(3.5, dt);
        s.camScale += (s.targetScale - s.camScale) * camF;
        s.camPanX += (s.targetPanX - s.camPanX) * camF;
        s.camPanY += (s.targetPanY - s.camPanY) * camF;
      }

      const ptrF = decay(5, dt);
      s.ptrX += (s.ptrTX - s.ptrX) * ptrF;
      s.ptrY += (s.ptrTY - s.ptrY) * ptrF;

      const fixedBias = Math.max(0, -s.ptrX);
      const longBias = Math.max(0, s.ptrX);
      const fixedGoal = s.stage === 1 ? 1 : s.stage === 2 ? 0.35 : 0.72 + fixedBias * 0.28;
      const longGoal = s.stage === 2 ? 1 : s.stage === 1 ? 0.35 : 0.72 + longBias * 0.28;
      const opF = decay(5, dt);
      s.fixedOp += (fixedGoal - s.fixedOp) * opF;
      s.longOp += (longGoal - s.longOp) * opF;
    };

    const settled = () =>
      !s.isDragging &&
      Math.abs(s.targetX + s.tiltX - s.currentX) < 0.005 &&
      Math.abs(s.targetY + s.tiltY - s.currentY) < 0.005 &&
      Math.abs(s.targetScale - s.camScale) < 0.0005 &&
      Math.abs(s.targetPanX - s.camPanX) < 0.05 &&
      Math.abs(s.targetPanY - s.camPanY) < 0.05 &&
      Math.abs(s.velocityX) + Math.abs(s.velocityY) < 0.01 &&
      Math.abs(s.ptrTX - s.ptrX) + Math.abs(s.ptrTY - s.ptrY) < 0.002;

    const frame = (now: number) => {
      raf = 0;
      if (!canRun()) return;
      const dt = clamp((now - last) / 1000, 0, 0.05) || 0.016;
      last = now;
      step(dt);
      paint(now);
      // Reduced motion: render only while something is actually changing.
      if (s.reduced && settled()) return;
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf || !canRun()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const setPaused = () => {
      svg.dataset.paused = canRun() ? "false" : "true";
      if (canRun()) kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        setPaused();
      },
      { threshold: 0 }
    );
    io.observe(svg);
    document.addEventListener("visibilitychange", setPaused);

    const onReducedChange = (e: MediaQueryListEvent) => {
      s.reduced = e.matches;
      kick();
    };
    reducedMq.addEventListener("change", onReducedChange);

    // Snap camera to the current stage on mount (also covers remount mid-scroll).
    const c = CAMERA_STAGES[s.stage] ?? CAMERA_STAGES[0];
    s.camScale = c.scale;
    s.camPanX = c.x;
    s.camPanY = c.y;
    paint(performance.now());
    kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      kickRef.current = () => {};
      io.disconnect();
      document.removeEventListener("visibilitychange", setPaused);
      reducedMq.removeEventListener("change", onReducedChange);
    };
  }, [isSplitLayout]);

  // ─── Pointer input ─────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = sRef.current;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const target = e.target as Element;
    const pin = target.closest("[data-stage]") as SVGElement | null;
    s.pressed = true;
    s.moved = false;
    s.pointerId = e.pointerId;
    s.downX = e.clientX;
    s.downY = e.clientY;
    s.downStage = pin ? Number(pin.dataset.stage) : -1;
    s.downReset = !!target.closest("[data-reset]");
  };

  const beginDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = sRef.current;
    s.isDragging = true;
    s.dragStartX = e.clientX;
    s.dragStartY = e.clientY;
    s.rotAtDragX = s.targetX;
    s.rotAtDragY = s.targetY;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = performance.now();
    s.velocityX = 0;
    s.velocityY = 0;
    if (svgRef.current) svgRef.current.style.cursor = "grabbing";
    // Capture only once a real drag starts so taps on pins still reach them.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = sRef.current;
    if (s.pressed && e.pointerId === s.pointerId) {
      if (!s.isDragging) {
        if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) < DRAG_THRESHOLD_PX) return;
        s.moved = true;
        beginDrag(e);
      }
      const now = performance.now();
      const dt = Math.max((now - s.lastT) / 1000, 0.001);
      s.targetX = clamp(s.rotAtDragX - (e.clientY - s.dragStartY) * 0.24, ROT_X_MIN, ROT_X_MAX);
      s.targetY = s.rotAtDragY + (e.clientX - s.dragStartX) * 0.38;
      s.velocityX = -((e.clientY - s.lastY) / dt) * 0.015;
      s.velocityY = ((e.clientX - s.lastX) / dt) * 0.022;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = now;
      kickRef.current();
      return;
    }
    if (e.pointerType === "touch") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    s.hoverTiltX = -ny * 3.8;
    s.hoverTiltY = nx * 4.6;
    s.ptrTX = nx;
    s.ptrTY = ny;
    kickRef.current();
  };

  const endPress = (e: React.PointerEvent<SVGSVGElement>, cancelled: boolean) => {
    const s = sRef.current;
    if (!s.pressed || e.pointerId !== s.pointerId) return;
    const wasTap = !s.moved && !cancelled;
    s.pressed = false;
    s.isDragging = false;
    if (svgRef.current) svgRef.current.style.cursor = "";
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (wasTap) {
      if (s.downStage > 0) onSelectRef.current?.(s.downStage);
      else if (s.downReset) {
        s.targetX = 18;
        s.targetY = 0;
        s.velocityX = 0;
        s.velocityY = 0;
      }
    }
    s.downStage = -1;
    s.downReset = false;
    kickRef.current();
  };

  const handlePointerLeave = () => {
    const s = sRef.current;
    s.hoverTiltX = 0;
    s.hoverTiltY = 0;
    s.ptrTX = 0;
    s.ptrTY = 0;
    kickRef.current();
  };

  const fixedActive = activeStage === 1;
  const longActive = activeStage === 2;
  const engineActive = activeStage === 3;
  const vaultsActive = activeStage === 4;
  const overview = activeStage === 0;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1440 940"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endPress(e, false)}
      onPointerCancel={(e) => endPress(e, true)}
      onPointerLeave={handlePointerLeave}
      className="hero-svg absolute top-0 left-0 w-full h-full z-0 select-none cursor-grab"
      // Horizontal drags rotate the planet; vertical swipes still scroll the page on touch.
      style={{ touchAction: "pan-y" }}
    >
      <defs>
        <radialGradient id="skyGrad" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#0B1322" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#050812" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#020304" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="behindOrangeGlow" cx="42%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#F0A85C" stopOpacity="0.28" />
          <stop offset="38%" stopColor="#E07434" stopOpacity="0.14" />
          <stop offset="72%" stopColor="#2A0B02" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#030304" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="behindCyanGlow" cx="42%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#A9C8EE" stopOpacity="0.32" />
          <stop offset="38%" stopColor="#6BA3E8" stopOpacity="0.16" />
          <stop offset="72%" stopColor="#102542" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#030304" stopOpacity="0" />
        </radialGradient>

        {/* Filter-free glows: cheap radial discs instead of feGaussianBlur. */}
        {[
          ["glowWhite", "#FFFFFF"],
          ["glowIce", "#A9C8EE"],
          ["glowAmber", "#F0A85C"],
          ["glowMint", "#34D399"],
        ].map(([id, color]) => (
          <radialGradient key={id} id={id}>
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="35%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}

        <radialGradient id="masterPlanetBody" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1E3250" stopOpacity="0.4" />
          <stop offset="35%" stopColor="#0E1B2E" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#050B14" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#020408" stopOpacity="0.8" />
        </radialGradient>
        <linearGradient id="topRimArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="pclipSphere">
          <circle cx="0" cy="0" r="345" />
        </clipPath>
        <linearGradient id="meteorTailA" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#DDE8F8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>

        <radialGradient id="miniPlanetFixed" cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="20%" stopColor="#C8DCF8" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#2A4B7C" stopOpacity="0.92" />
          <stop offset="88%" stopColor="#08101E" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#04070E" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="miniPlanetLong" cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFF4E6" stopOpacity="0.95" />
          <stop offset="20%" stopColor="#F5A65B" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#7E3710" stopOpacity="0.92" />
          <stop offset="88%" stopColor="#1E0A03" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#0C0401" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="miniPlanetSplit" cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="22%" stopColor="#D5E2F2" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#222B3A" stopOpacity="0.92" />
          <stop offset="90%" stopColor="#080C14" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#030508" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="miniPlanetVault" cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#E6FFFA" stopOpacity="0.95" />
          <stop offset="20%" stopColor="#34D399" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#0D5337" stopOpacity="0.92" />
          <stop offset="88%" stopColor="#031A10" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#010A06" stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Full-screen gesture capture surface */}
      <rect width="1440" height="940" fill="transparent" pointerEvents="all" />
      <rect width="1440" height="940" fill="url(#skyGrad)" pointerEvents="none" />

      {/* Distant black hole */}
      <g transform="translate(160 145)" opacity="0.35" pointerEvents="none">
        <circle r="42" fill="#010204" />
        <g className="spin" style={{ animationDuration: "85s" }}>
          <circle r="52" fill="none" stroke="#2A3546" strokeWidth="0.8" strokeDasharray="14 12" opacity="0.4" />
          <circle r="68" fill="none" stroke="#A9C8EE" strokeWidth="0.5" strokeDasharray="4 18" opacity="0.25" />
          <circle cx="52" cy="0" r="1.5" fill="#A9C8EE" opacity="0.7" />
        </g>
      </g>

      {/* Shooting meteors */}
      {[
        { t: "translate(1180 140) rotate(-32)", delay: "0.8s", dur: "8.5s", len: 160, sw: 2.2, r: 2.6, halo: "#A9C8EE" },
        { t: "translate(380 90) rotate(-26)", delay: "4.8s", dur: "10.5s", len: 180, sw: 2.0, r: 2.8, halo: "#DDE8F8" },
        { t: "translate(980 340) rotate(-35)", delay: "8.2s", dur: "12s", len: 130, sw: 1.6, r: 2.0, halo: null },
      ].map((m) => (
        <g key={m.t} transform={m.t} pointerEvents="none">
          <g className="shoot" style={{ animationDelay: m.delay, animationDuration: m.dur }}>
            <line x1="0" y1="0" x2={-m.len} y2="0" stroke="url(#meteorTailA)" strokeWidth={m.sw} strokeLinecap="round" />
            <Glow r={m.r * 4} id="glowWhite" opacity={0.7} />
            <circle r={m.r} fill="#FFFFFF" />
            {m.halo && <circle r={m.r * 2.1} fill={m.halo} opacity="0.4" />}
          </g>
        </g>
      ))}

      {/* ===== Cinematic camera: transform is driven by the rAF loop ===== */}
      <g ref={(el) => { domRef.current.cam = el; }} transform={`translate(${(isSplitLayout ? 890 : 720) + CAM0.x} 470) scale(${CAM0.scale})`}>
        <circle r="420" fill="url(#behindCyanGlow)" className="pin-fade" style={{ opacity: fixedActive ? 1 : 0 }} pointerEvents="none" />
        <circle r="420" fill="url(#behindOrangeGlow)" className="pin-fade" style={{ opacity: longActive ? 1 : fixedActive ? 0 : 0.7 }} pointerEvents="none" />

        {/* ── Master planet ── */}
        <g pointerEvents="none">
          <circle r="345" fill="url(#masterPlanetBody)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" opacity={0.7} />

          <g clipPath="url(#pclipSphere)">
            {LAT_ANGLES.map((_, i) => (
              <ellipse key={`lat-${i}`} ref={(el) => { domRef.current.lats[i] = el; }} cx="0" fill="none" stroke="#FFFFFF" strokeWidth={LAT_STROKE[i]} />
            ))}
            <path ref={(el) => { domRef.current.merBack = el; }} fill="none" stroke="#FFFFFF" strokeWidth="0.45" opacity="0.16" strokeLinecap="round" strokeLinejoin="round" />
            <path ref={(el) => { domRef.current.merFront = el; }} fill="none" stroke="#FFFFFF" strokeWidth="0.85" opacity="0.42" strokeLinecap="round" strokeLinejoin="round" />

            {STAR_NODES.map(([, , r, col, twinkle, delay], i) => (
              <g key={`star-${i}`} className={twinkle ? "tw" : undefined} style={twinkle ? { animationDelay: `${delay}s` } : undefined}>
                <circle ref={(el) => { domRef.current.starHalo[i] = el; }} r={r * 2.2} fill={col} opacity="0" />
                <circle ref={(el) => { domRef.current.starCore[i] = el; }} r={r} fill={col} opacity="0" />
              </g>
            ))}
          </g>

          <path d="M -325 115 A 345 345 0 0 1 115 -325" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="2.4" strokeLinecap="round" />
          <g opacity="0.45" stroke="#FFFFFF" strokeWidth="1">
            <line x1="-345" y1="0" x2="-330" y2="0" />
            <line x1="345" y1="0" x2="330" y2="0" />
            <line x1="0" y1="-345" x2="0" y2="-330" />
            <line x1="0" y1="345" x2="0" y2="330" />
          </g>

          {/* ── Vault core ── */}
          <g>
            <g transform="rotate(35) scale(1 0.42)">
              <circle r="115" fill="none" stroke="#FFFFFF" strokeWidth="0.65" strokeDasharray="8 10" className="pin-fade-slow" style={{ opacity: engineActive ? 0.85 : 0.28 }} />
            </g>
            <g transform="rotate(-40) scale(1 0.38)">
              <circle r="92" fill="none" stroke="#A9C8EE" strokeWidth="0.6" strokeDasharray="5 8" className="pin-fade-slow" style={{ opacity: engineActive ? 0.9 : 0.3 }} />
            </g>

            {Array.from({ length: 20 }, (_, i) => (
              <line key={`ce-${i}`} ref={(el) => { domRef.current.cubeEdges[i] = el; }} stroke="#ECEDEA" />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
              <line key={`ci-${i}`} ref={(el) => { domRef.current.innerEdges[i] = el; }} stroke="#F0A85C" />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <g key={`cn-${i}`}>
                <circle ref={(el) => { domRef.current.cubeGlows[i] = el; }} r="9" fill="url(#glowWhite)" opacity="0" />
                <circle ref={(el) => { domRef.current.cubeNodes[i] = el; }} fill="#FFFFFF" />
              </g>
            ))}

            {/* Nucleus */}
            <circle r="12" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.35" strokeDasharray="3 3" />
            <Glow r={26} id="glowWhite" opacity={0.9} />
            <circle r="5.5" fill="#FFFFFF" />
            <g className="pin-fade-slow" style={{ opacity: engineActive ? 0.5 : 0.25 }}>
              <Glow r={30} id="glowAmber" />
            </g>

            {/* Laser split vector */}
            <g pointerEvents="none" className="pin-fade" style={{ opacity: engineActive ? 1 : 0 }}>
              <line x1="-12" y1="0" x2="-120" y2="0" stroke="#A9C8EE" strokeWidth="6" opacity="0.22" strokeLinecap="round" />
              <line x1="-12" y1="0" x2="-120" y2="0" stroke="#A9C8EE" strokeWidth="1.8" />
              <polygon points="-120,-4 -130,0 -120,4" fill="#A9C8EE" />
              <text x="-136" y="4" textAnchor="end" className="mono text-[9px] tracking-[0.18em]" fill="#A9C8EE">PT (PRINCIPAL)</text>
              <line x1="12" y1="0" x2="120" y2="0" stroke="#F0A85C" strokeWidth="6" opacity="0.22" strokeLinecap="round" />
              <line x1="12" y1="0" x2="120" y2="0" stroke="#F0A85C" strokeWidth="1.8" />
              <polygon points="120,-4 130,0 120,4" fill="#F0A85C" />
              <text x="136" y="4" textAnchor="start" className="mono text-[9px] tracking-[0.18em]" fill="#F0A85C">YT (YIELD)</text>
            </g>

            <text x="0" y="98" textAnchor="middle" className="mono text-[8px] tracking-[0.24em] select-none pin-fade-slow" fill="#ECEDEA" style={{ opacity: engineActive ? 0.9 : 0.45 }}>
              USDG · SPLIT VAULT CORE
            </text>
          </g>
        </g>

        {/* Stage 4 tactical HUD */}
        <g pointerEvents="none" className="pin-fade" style={{ opacity: vaultsActive ? 1 : 0 }}>
          <circle r="220" fill="none" stroke="#34D399" strokeWidth="0.6" opacity="0.35" strokeDasharray="8 12" />
          <g stroke="#34D399" strokeWidth="1.2" opacity="0.6">
            <line x1="-360" y1="0" x2="-330" y2="0" />
            <line x1="330" y1="0" x2="360" y2="0" />
            <line x1="0" y1="-360" x2="0" y2="-330" />
            <line x1="0" y1="330" x2="0" y2="360" />
          </g>
        </g>

        {/* Outer orbital system */}
        <g transform="rotate(-8) scale(1 0.22)" pointerEvents="none">
          <circle r="390" fill="none" stroke="#A9C8EE" strokeWidth="0.55" opacity="0.3" strokeDasharray="6 14" />
          <Satellite orbit={390} squash={0.22} duration="19s" delay="-3s" core={3.2} glowId="glowIce" glowR={16} />
        </g>

        {/* Fixed-yield orbit (ice) — opacity driven by the loop */}
        <g ref={(el) => { domRef.current.fixedRing = el; }} transform="rotate(-15) scale(1 0.23)" pointerEvents="none" opacity="0.72">
          <circle r="428" fill="none" stroke="#A9C8EE" strokeWidth="0.6" opacity="0.35" />
          <circle r="445" fill="none" stroke="#A9C8EE" strokeWidth="1.6" opacity="0.8" />
          <circle className="ringflow" r="445" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeDasharray="180 80 40 80" opacity="0.9" style={{ animationDuration: "55s" }} />
          <circle r="462" fill="none" stroke="#A9C8EE" strokeWidth="0.8" opacity="0.4" />
          <circle className="ringflow" r="462" fill="none" stroke="#DDE8F8" strokeWidth="0.6" strokeDasharray="2 12" opacity="0.6" style={{ animationDuration: "75s" }} />
          <Satellite orbit={445} squash={0.23} duration="26s" delay="-6.5s" core={5} glowId="glowIce" glowR={30} />
        </g>

        {/* Long-yield orbit (amber) */}
        <g ref={(el) => { domRef.current.longRing = el; }} transform="rotate(-15) scale(1 0.23)" pointerEvents="none" opacity="0.72">
          <circle r="525" fill="none" stroke="#F0A85C" strokeWidth="0.6" opacity="0.35" />
          <circle r="545" fill="none" stroke="#F0A85C" strokeWidth="1.8" opacity="0.8" />
          <circle className="ringflow" r="545" fill="none" stroke="#FFF2D6" strokeWidth="2.5" strokeDasharray="240 100 50 100" opacity="0.9" style={{ animationDuration: "42s" }} />
          <circle r="568" fill="none" stroke="#F0A85C" strokeWidth="0.8" opacity="0.4" />
          <circle className="ringflow" r="568" fill="none" stroke="#F0A85C" strokeWidth="0.6" strokeDasharray="4 16" opacity="0.5" style={{ animationDuration: "60s" }} />
          <Satellite orbit={545} squash={0.23} duration="38s" delay="-14s" core={5.5} glowId="glowAmber" glowR={32} />
        </g>

        {/* Sweeping outer ring */}
        <g transform="rotate(-26) scale(1 0.25)" pointerEvents="none">
          <circle r="650" fill="none" stroke="#ECEDEA" strokeWidth="0.75" opacity="0.25" />
          <circle className="ringflow" r="650" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="300 160 40 100" opacity="0.85" style={{ animationDuration: "32s" }} />
        </g>

        {/* Grand cosmic orbits */}
        <g pointerEvents="none" opacity="0.7">
          <g transform="rotate(-22) scale(1 0.26)">
            <circle r="860" fill="none" stroke="#A9C8EE" strokeWidth="0.75" strokeDasharray="14 18 4 18" opacity="0.32" />
            <circle className="ringflow" r="860" fill="none" stroke="#DDE8F8" strokeWidth="1.4" strokeDasharray="360 220 80 180" opacity="0.6" style={{ animationDuration: "78s" }} />
            <g className="spin" style={{ animationDuration: "64s", animationDelay: "-18s" }}>
              <g transform="translate(860 0)">
                <g transform="scale(1 3.85)">
                  <circle r="14" fill="url(#glowIce)" />
                  <circle r="3" fill="#FFFFFF" />
                </g>
                <text x="14" y="3" fill="#A9C8EE" className="mono text-[8px] tracking-[0.2em]" opacity="0.5">ORBIT-IX · 0x860</text>
              </g>
            </g>
          </g>
          <g transform="rotate(16) scale(1 0.21)">
            <circle r="1120" fill="none" stroke="#F0A85C" strokeWidth="0.65" strokeDasharray="8 24" opacity="0.28" />
            <circle className="ringflow" r="1120" fill="none" stroke="#FFF2D6" strokeWidth="1.2" strokeDasharray="420 300 60 200" opacity="0.5" style={{ animationDuration: "96s" }} />
            <g className="spin" style={{ animationDuration: "88s", animationDelay: "-32s" }}>
              <g transform="translate(1120 0)">
                <g transform="scale(1 4.76)">
                  <circle r="16" fill="url(#glowAmber)" />
                  <circle r="3.2" fill="#FFFFFF" />
                </g>
                <text x="16" y="3" fill="#F0A85C" className="mono text-[8px] tracking-[0.2em]" opacity="0.5">PERIHELION · 11.2 AU</text>
              </g>
            </g>
          </g>
          <g transform="rotate(-38) scale(1 0.18)">
            <circle r="1420" fill="none" stroke="#ECEDEA" strokeWidth="0.5" strokeDasharray="3 16" opacity="0.22" />
            <circle className="ringflow" r="1420" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="500 400 100 300" opacity="0.45" style={{ animationDuration: "140s" }} />
          </g>
        </g>

        {/* ── Pin 1 · Fixed yield — diamond ── */}
        <g className="pin cursor-pointer pointer-events-auto" data-stage="1" transform="translate(-100 240)">
          <g className="pin-fade" style={{ opacity: overview || fixedActive ? 1 : 0.25 }}>
            <PingRing color="#A9C8EE" active={fixedActive} />
            <g transform="rotate(-26) scale(1 0.32)" opacity="0.65">
              <path d="M -46 0 A 46 46 0 0 1 46 0" fill="none" stroke="#A9C8EE" strokeWidth="1.2" strokeDasharray="6 8" />
            </g>
            <circle r="34" fill="#A9C8EE" className="pin-fade-slow" style={{ opacity: fixedActive ? 0.22 : 0.08 }} />
            <circle r="26" fill="url(#miniPlanetFixed)" stroke="#A9C8EE" strokeWidth="1.2" className="pin-fade-slow" style={{ opacity: fixedActive ? 1 : 0.85 }} />
            <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />
            <g transform="rotate(-26) scale(1 0.32)" opacity="0.85">
              <path d="M -46 0 A 46 46 0 0 0 46 0" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
              <circle cx="44" cy="0" r="6" fill="url(#glowWhite)" />
              <circle cx="44" cy="0" r="2.2" fill="#FFFFFF" />
            </g>
            <g className="pin-body">
              {Array.from({ length: 8 }, (_, i) => (
                <polygon key={i} ref={(el) => { domRef.current.diamond[i] = el; }} strokeLinejoin="round" />
              ))}
              <Glow r={7} id="glowWhite" />
              <circle r="1.8" fill="#FFFFFF" />
              <circle r="4" fill="#A9C8EE" opacity="0.3" />
            </g>
            <PinBadge active={fixedActive} visible={overview || fixedActive} width={132} bg="rgba(4,9,18,0.92)" color="#A9C8EE" title="FIXED · 6.42%" sub="SENIOR TRANCHE" />
          </g>
        </g>

        {/* ── Pin 2 · Long yield — bio-particle ── */}
        <g className="pin cursor-pointer pointer-events-auto" data-stage="2" transform="translate(260 -130)">
          <g className="pin-fade" style={{ opacity: overview || longActive ? 1 : 0.25 }}>
            <PingRing color="#F0A85C" active={longActive} />
            <g transform="rotate(32) scale(1 0.32)" opacity="0.65">
              <path d="M -48 0 A 48 48 0 0 1 48 0" fill="none" stroke="#F0A85C" strokeWidth="1.2" strokeDasharray="6 8" />
            </g>
            <circle r="34" fill="#F0A85C" className="pin-fade-slow" style={{ opacity: longActive ? 0.22 : 0.08 }} />
            <circle r="26" fill="url(#miniPlanetLong)" stroke="#F0A85C" strokeWidth="1.2" className="pin-fade-slow" style={{ opacity: longActive ? 1 : 0.85 }} />
            <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />
            <g transform="rotate(32) scale(1 0.32)" opacity="0.85">
              <path d="M -48 0 A 48 48 0 0 0 48 0" fill="none" stroke="#FFF2D6" strokeWidth="1.4" />
              <circle cx="46" cy="0" r="6" fill="url(#glowWhite)" />
              <circle cx="46" cy="0" r="2.2" fill="#FFFFFF" />
            </g>
            <g className="pin-body">
              <path ref={(el) => { domRef.current.bio = el; }} fill="rgba(240,168,92,0.32)" stroke="#F0A85C" strokeWidth="1.1" strokeLinejoin="round" />
              <Glow r={11} id="glowAmber" />
              <circle r="3.6" fill="rgba(255,242,214,0.92)" />
              <circle r="1.6" fill="#FFFFFF" />
              {[0, 1, 2].map((i) => (
                <circle key={i} ref={(el) => { domRef.current.spores[i] = el; }} fill={i === 1 ? "#FFFFFF" : "#F0A85C"} />
              ))}
            </g>
            <PinBadge active={longActive} visible={overview || longActive} width={136} bg="rgba(16,8,3,0.92)" color="#F0A85C" title="LONG · FLOATING" sub="JUNIOR TRANCHE" />
          </g>
        </g>

        {/* ── Pin 3 · Split engine — prisms ── */}
        <g className="pin cursor-pointer pointer-events-auto" data-stage="3" transform="translate(0 -190)">
          <g className="pin-fade" style={{ opacity: overview || engineActive ? 1 : 0.25 }}>
            <PingRing color="#FFFFFF" active={engineActive} />
            <circle r="36" fill="none" stroke="#ECEDEA" strokeWidth="0.7" strokeDasharray="4 8" opacity="0.4" />
            <circle r="34" fill="#ECEDEA" className="pin-fade-slow" style={{ opacity: engineActive ? 0.2 : 0.06 }} />
            <circle r="26" fill="url(#miniPlanetSplit)" stroke="#ECEDEA" strokeWidth="1.2" className="pin-fade-slow" style={{ opacity: engineActive ? 1 : 0.85 }} />
            <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />
            <g className="pin-body">
              <polygon ref={(el) => { domRef.current.prismTopPoly = el; }} fill="rgba(169,200,238,0.35)" stroke="#A9C8EE" strokeWidth="0.8" />
              <path ref={(el) => { domRef.current.prismTopEdges = el; }} fill="none" stroke="#A9C8EE" strokeWidth="0.9" />
              <polygon ref={(el) => { domRef.current.prismBotPoly = el; }} fill="rgba(240,168,92,0.35)" stroke="#F0A85C" strokeWidth="0.8" />
              <path ref={(el) => { domRef.current.prismBotEdges = el; }} fill="none" stroke="#F0A85C" strokeWidth="0.9" />
              <line x1="-15" y1="0" x2="15" y2="0" stroke="#FFFFFF" strokeWidth="5" opacity="0.25" strokeLinecap="round" />
              <line x1="-15" y1="0" x2="15" y2="0" stroke="#FFFFFF" strokeWidth="1.8" />
              <Glow r={8} id="glowWhite" />
              <circle r="2.2" fill="#FFFFFF" />
            </g>
            <PinBadge active={engineActive} visible={overview || engineActive} width={132} bg="rgba(8,10,16,0.92)" color="#ECEDEA" title="SPLIT ENGINE" sub="TRANCHE CLEAVER" />
          </g>
        </g>

        {/* ── Pin 4 · Live vaults — gyroscope ── */}
        <g className="pin cursor-pointer pointer-events-auto" data-stage="4" transform="translate(200 240)">
          <g className="pin-fade" style={{ opacity: overview || vaultsActive ? 1 : 0.25 }}>
            <PingRing color="#34D399" active={vaultsActive} />
            <circle r="34" fill="#34D399" className="pin-fade-slow" style={{ opacity: vaultsActive ? 0.22 : 0.08 }} />
            <circle r="26" fill="url(#miniPlanetVault)" stroke="#34D399" strokeWidth="1.2" className="pin-fade-slow" style={{ opacity: vaultsActive ? 1 : 0.85 }} />
            <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />
            <g className="pin-body">
              <g ref={(el) => { domRef.current.gyro[0] = el; }}>
                <ellipse rx="18" ry="18" fill="none" stroke="#34D399" strokeWidth="0.85" opacity="0.7" strokeDasharray="4 4" />
              </g>
              <g ref={(el) => { domRef.current.gyro[1] = el; }}>
                <ellipse rx="17" ry="17" fill="none" stroke="#A7F3D0" strokeWidth="0.8" opacity="0.65" strokeDasharray="3 5" />
              </g>
              <g ref={(el) => { domRef.current.gyro[2] = el; }}>
                <ellipse rx="16" ry="16" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.5" strokeDasharray="2 4" />
              </g>
              <path ref={(el) => { domRef.current.vaultBack = el; }} fill="none" stroke="rgba(52,211,153,0.35)" strokeWidth="0.5" />
              <path ref={(el) => { domRef.current.vaultFront = el; }} fill="none" stroke="#34D399" strokeWidth="0.95" />
              <Glow r={8} id="glowWhite" />
              <circle r="2.4" fill="#FFFFFF" />
              <circle r="5" fill="#34D399" opacity="0.35" />
            </g>
            <PinBadge active={vaultsActive} visible={overview || vaultsActive} width={132} bg="rgba(3,14,10,0.92)" color="#34D399" title="USDG VAULT" sub="DELTA-NEUTRAL" />
          </g>
        </g>
      </g>

      {/* Right-edge perspective hint */}
      <g transform="translate(1412 630)" className="pointer-events-none select-none">
        <text transform="rotate(90)" textAnchor="middle" className="mono text-[9px] tracking-[0.26em]" fill="#8E929B" opacity="0.55">
          DRAG OR MOVE TO EXPLORE PERSPECTIVE
        </text>
      </g>

      {/* Orientation reset */}
      <g transform="translate(1392 880)" className="cursor-pointer group pointer-events-auto" data-reset="">
        <circle r="18" fill="rgba(10,12,18,0.75)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.9" className="group-hover:stroke-white transition-colors" />
        <path d="M -5 -2 A 6 6 0 1 1 -3 5 L -1 3 M -3 5 L -3 1" fill="none" stroke="#ECEDEA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      </g>
    </svg>
  );
}
