"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";

export interface HeroVisualProps {
  pointerX?: number;
  parallaxX?: number;
  parallaxY?: number;
  activeStage?: number;
  onSelectStage?: (stage: number) => void;
  isSplitLayout?: boolean;
}

const R = 345;

const RAW_STAR_NODES = [
  {
    lat: 70.05,
    lon: 0.0,
    r: 2.4,
    col: "#FFFFFF",
    twinkle: true,
    delay: "0.0s",
  },
  {
    lat: 66.96,
    lon: 137.51,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.2s",
  },
  {
    lat: 64.21,
    lon: 275.02,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "0.5s",
  },
  {
    lat: 61.72,
    lon: 52.52,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "0.8s",
  },
  {
    lat: 59.41,
    lon: 190.03,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "1.0s",
  },
  {
    lat: 57.25,
    lon: 327.54,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.2s",
  },
  {
    lat: 55.21,
    lon: 105.05,
    r: 1.8,
    col: "#FFE2C4",
    twinkle: true,
    delay: "1.5s",
  },
  {
    lat: 53.27,
    lon: 242.55,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.8s",
  },
  {
    lat: 51.42,
    lon: 20.06,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.0s",
  },
  {
    lat: 49.63,
    lon: 157.57,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "2.2s",
  },
  {
    lat: 47.91,
    lon: 295.08,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "2.5s",
  },
  {
    lat: 46.25,
    lon: 72.59,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.8s",
  },
  {
    lat: 44.63,
    lon: 210.09,
    r: 1.8,
    col: "#A9C8EE",
    twinkle: true,
    delay: "3.0s",
  },
  {
    lat: 43.06,
    lon: 347.6,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.2s",
  },
  {
    lat: 41.53,
    lon: 125.11,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "3.5s",
  },
  {
    lat: 40.03,
    lon: 262.62,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "3.8s",
  },
  {
    lat: 38.56,
    lon: 40.12,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.0s",
  },
  {
    lat: 37.13,
    lon: 177.63,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.2s",
  },
  {
    lat: 35.72,
    lon: 315.14,
    r: 1.8,
    col: "#DDE8F8",
    twinkle: true,
    delay: "0.5s",
  },
  {
    lat: 34.33,
    lon: 92.65,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.8s",
  },
  {
    lat: 32.97,
    lon: 230.16,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "1.0s",
  },
  {
    lat: 31.63,
    lon: 7.66,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "1.2s",
  },
  {
    lat: 30.31,
    lon: 145.17,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "1.5s",
  },
  {
    lat: 29.0,
    lon: 282.68,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.8s",
  },
  {
    lat: 27.71,
    lon: 60.19,
    r: 2.4,
    col: "#FFFFFF",
    twinkle: true,
    delay: "2.0s",
  },
  {
    lat: 26.44,
    lon: 197.69,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.2s",
  },
  {
    lat: 25.18,
    lon: 335.2,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "2.5s",
  },
  {
    lat: 23.93,
    lon: 112.71,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "2.8s",
  },
  {
    lat: 22.7,
    lon: 250.22,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "3.0s",
  },
  {
    lat: 21.48,
    lon: 27.73,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.2s",
  },
  {
    lat: 20.26,
    lon: 165.23,
    r: 1.8,
    col: "#FFE2C4",
    twinkle: true,
    delay: "3.5s",
  },
  {
    lat: 19.06,
    lon: 302.74,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.8s",
  },
  {
    lat: 17.86,
    lon: 80.25,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.0s",
  },
  {
    lat: 16.68,
    lon: 217.76,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "0.2s",
  },
  {
    lat: 15.5,
    lon: 355.26,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "0.5s",
  },
  {
    lat: 14.32,
    lon: 132.77,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.8s",
  },
  {
    lat: 13.15,
    lon: 270.28,
    r: 1.8,
    col: "#A9C8EE",
    twinkle: true,
    delay: "1.0s",
  },
  {
    lat: 11.99,
    lon: 47.79,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.2s",
  },
  {
    lat: 10.84,
    lon: 185.3,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "1.5s",
  },
  {
    lat: 9.68,
    lon: 322.8,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "1.8s",
  },
  {
    lat: 8.54,
    lon: 100.31,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.0s",
  },
  {
    lat: 7.39,
    lon: 237.82,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.2s",
  },
  {
    lat: 6.25,
    lon: 15.33,
    r: 1.8,
    col: "#DDE8F8",
    twinkle: true,
    delay: "2.5s",
  },
  {
    lat: 5.11,
    lon: 152.83,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.8s",
  },
  {
    lat: 3.97,
    lon: 290.34,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "3.0s",
  },
  {
    lat: 2.84,
    lon: 67.85,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "3.2s",
  },
  {
    lat: 1.7,
    lon: 205.36,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "3.5s",
  },
  {
    lat: 0.57,
    lon: 342.86,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.8s",
  },
  {
    lat: -0.57,
    lon: 120.37,
    r: 2.4,
    col: "#FFFFFF",
    twinkle: true,
    delay: "0.0s",
  },
  {
    lat: -1.7,
    lon: 257.88,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.2s",
  },
  {
    lat: -2.84,
    lon: 35.39,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "0.5s",
  },
  {
    lat: -3.97,
    lon: 172.9,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "0.8s",
  },
  {
    lat: -5.11,
    lon: 310.4,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "1.0s",
  },
  {
    lat: -6.25,
    lon: 87.91,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.2s",
  },
  {
    lat: -7.39,
    lon: 225.42,
    r: 1.8,
    col: "#FFE2C4",
    twinkle: true,
    delay: "1.5s",
  },
  {
    lat: -8.54,
    lon: 2.93,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.8s",
  },
  {
    lat: -9.68,
    lon: 140.43,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.0s",
  },
  {
    lat: -10.84,
    lon: 277.94,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "2.2s",
  },
  {
    lat: -11.99,
    lon: 55.45,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "2.5s",
  },
  {
    lat: -13.15,
    lon: 192.96,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.8s",
  },
  {
    lat: -14.32,
    lon: 330.47,
    r: 1.8,
    col: "#A9C8EE",
    twinkle: true,
    delay: "3.0s",
  },
  {
    lat: -15.5,
    lon: 107.97,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.2s",
  },
  {
    lat: -16.68,
    lon: 245.48,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "3.5s",
  },
  {
    lat: -17.86,
    lon: 22.99,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "3.8s",
  },
  {
    lat: -19.06,
    lon: 160.5,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.0s",
  },
  {
    lat: -20.26,
    lon: 298.0,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.2s",
  },
  {
    lat: -21.48,
    lon: 75.51,
    r: 1.8,
    col: "#DDE8F8",
    twinkle: true,
    delay: "0.5s",
  },
  {
    lat: -22.7,
    lon: 213.02,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.8s",
  },
  {
    lat: -23.93,
    lon: 350.53,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "1.0s",
  },
  {
    lat: -25.18,
    lon: 128.04,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "1.2s",
  },
  {
    lat: -26.44,
    lon: 265.54,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "1.5s",
  },
  {
    lat: -27.71,
    lon: 43.05,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.8s",
  },
  {
    lat: -29.0,
    lon: 180.56,
    r: 2.4,
    col: "#FFFFFF",
    twinkle: true,
    delay: "2.0s",
  },
  {
    lat: -30.31,
    lon: 318.07,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.2s",
  },
  {
    lat: -31.63,
    lon: 95.57,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "2.5s",
  },
  {
    lat: -32.97,
    lon: 233.08,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "2.8s",
  },
  {
    lat: -34.33,
    lon: 10.59,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "3.0s",
  },
  {
    lat: -35.72,
    lon: 148.1,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.2s",
  },
  {
    lat: -37.13,
    lon: 285.61,
    r: 1.8,
    col: "#FFE2C4",
    twinkle: true,
    delay: "3.5s",
  },
  {
    lat: -38.56,
    lon: 63.11,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.8s",
  },
  {
    lat: -40.03,
    lon: 200.62,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.0s",
  },
  {
    lat: -41.53,
    lon: 338.13,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "0.2s",
  },
  {
    lat: -43.06,
    lon: 115.64,
    r: 1.3,
    col: "#DDE8F8",
    twinkle: false,
    delay: "0.5s",
  },
  {
    lat: -44.63,
    lon: 253.14,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "0.8s",
  },
  {
    lat: -46.25,
    lon: 30.65,
    r: 1.8,
    col: "#A9C8EE",
    twinkle: true,
    delay: "1.0s",
  },
  {
    lat: -47.91,
    lon: 168.16,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "1.2s",
  },
  {
    lat: -49.63,
    lon: 305.67,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "1.5s",
  },
  {
    lat: -51.42,
    lon: 83.18,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "1.8s",
  },
  {
    lat: -53.27,
    lon: 220.68,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.0s",
  },
  {
    lat: -55.21,
    lon: 358.19,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.2s",
  },
  {
    lat: -57.25,
    lon: 135.7,
    r: 1.8,
    col: "#DDE8F8",
    twinkle: true,
    delay: "2.5s",
  },
  {
    lat: -59.41,
    lon: 273.21,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "2.8s",
  },
  {
    lat: -61.72,
    lon: 50.71,
    r: 1.3,
    col: "#A9C8EE",
    twinkle: false,
    delay: "3.0s",
  },
  {
    lat: -64.21,
    lon: 188.22,
    r: 1.8,
    col: "#FFFFFF",
    twinkle: true,
    delay: "3.2s",
  },
  {
    lat: -66.96,
    lon: 325.73,
    r: 1.3,
    col: "#FFE2C4",
    twinkle: false,
    delay: "3.5s",
  },
  {
    lat: -70.05,
    lon: 103.24,
    r: 1.3,
    col: "#FFFFFF",
    twinkle: false,
    delay: "3.8s",
  },
];

// 3D Cube Definition (for Split Engine Tesseract Vault Core)
const CUBE_VERTICES = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];

const CUBE_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0], // back square
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4], // front square
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7], // connectors
];

export function HeroVisual({
  pointerX = 0,
  parallaxX = 0,
  parallaxY = 0,
  activeStage = 0,
  onSelectStage,
  isSplitLayout = true,
}: HeroVisualProps) {
  const [renderRot, setRenderRot] = useState({ x: 18, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Physics and interaction state ref for 60fps butter-smooth Apple-like animation
  const stateRef = useRef({
    currentX: 18,
    currentY: 0,
    targetX: 18,
    targetY: 0,
    velocityX: 0,
    velocityY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    rotAtDragStartX: 18,
    rotAtDragStartY: 0,
    hoverTiltX: 0,
    hoverTiltY: 0,
    lastMoveX: 0,
    lastMoveY: 0,
    lastMoveTime: 0,
  });

  // 60FPS Continuous Animation Loop with Apple-style Fluid Inertia & Spring Easing
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      const s = stateRef.current;

      if (!s.isDragging) {
        // Continuous auto-rotation keeps the celestial object alive
        s.targetY += 2.4 * dt;

        // Apply decay to release velocity (inertia)
        s.velocityX *= 0.92;
        s.velocityY *= 0.92;
        s.targetX += s.velocityX * dt * 25;
        s.targetY += s.velocityY * dt * 25;
        s.targetX = Math.max(-45, Math.min(50, s.targetX));

        // Apple-style spring ease towards target + hover tilt
        const springFactor = 0.075;
        s.currentX += (s.targetX + s.hoverTiltX - s.currentX) * springFactor;
        s.currentY += (s.targetY + s.hoverTiltY - s.currentY) * springFactor;
      } else {
        // Direct responsive tracking with elastic ease during drag
        s.currentX += (s.targetX - s.currentX) * 0.28;
        s.currentY += (s.targetY - s.currentY) * 0.28;
      }

      setRenderRot({
        x: s.currentX,
        y: s.currentY,
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Reset orientation button handler
  const handleResetOrientation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const s = stateRef.current;
    s.targetX = 18;
    s.targetY = 0;
    s.velocityX = 0;
    s.velocityY = 0;
    s.hoverTiltX = 0;
    s.hoverTiltY = 0;
  }, []);

  // Pointer drag & hover interaction handlers (Active across entire hero canvas)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    const s = stateRef.current;
    s.isDragging = true;
    s.dragStartX = e.clientX;
    s.dragStartY = e.clientY;
    s.rotAtDragStartX = s.currentX;
    s.rotAtDragStartY = s.currentY;
    s.lastMoveX = e.clientX;
    s.lastMoveY = e.clientY;
    s.lastMoveTime = performance.now();
    s.velocityX = 0;
    s.velocityY = 0;

    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (s.isDragging) {
      const now = performance.now();
      const dt = Math.max((now - s.lastMoveTime) / 1000, 0.001);
      const dx = e.clientX - s.dragStartX;
      const dy = e.clientY - s.dragStartY;

      s.targetX = Math.max(-45, Math.min(50, s.rotAtDragStartX - dy * 0.24));
      s.targetY = s.rotAtDragStartY + dx * 0.38;

      s.velocityX = -((e.clientY - s.lastMoveY) / dt) * 0.015;
      s.velocityY = ((e.clientX - s.lastMoveX) / dt) * 0.022;

      s.lastMoveX = e.clientX;
      s.lastMoveY = e.clientY;
      s.lastMoveTime = now;
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      s.hoverTiltX = -ny * 3.8;
      s.hoverTiltY = nx * 4.6;
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    const s = stateRef.current;
    s.isDragging = false;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handlePointerLeave = useCallback(() => {
    const s = stateRef.current;
    s.hoverTiltX = 0;
    s.hoverTiltY = 0;
  }, []);

  // Stage-based visual state & subtle camera breathing
  const fixedActive = activeStage === 1;
  const longActive = activeStage === 2;
  const engineActive = activeStage === 3;
  const vaultsActive = activeStage === 4;

  const fixedBias = Math.max(0, -pointerX);
  const longBias = Math.max(0, pointerX);
  const fixedOp = fixedActive
    ? 1.0
    : longActive
      ? 0.35
      : 0.72 + fixedBias * 0.28;
  const longOp = longActive ? 1.0 : fixedActive ? 0.35 : 0.72 + longBias * 0.28;

  // Camera zoom & pan focusing precisely on points of interest per stage
  const cameraConfig = useMemo(() => {
    switch (activeStage) {
      case 1: // Fixed Yield: zooms and pans towards Fixed Yield Ice-Blue Orbit & Pin
        return { scale: 1.28, panX: 110, panY: -90 };
      case 2: // Long Yield: zooms and pans towards Long Yield Amber Orbit & Pin
        return { scale: 1.28, panX: -130, panY: 70 };
      case 3: // Split Engine: plunges deep into the central 3D Vault Cube / Tesseract
        return { scale: 1.48, panX: 0, panY: 0 };
      case 4: // Live Vaults: frames the USDG Vault pin and tactical HUD
        return { scale: 1.16, panX: -70, panY: -70 };
      case 0: // Grand Master Planet (Macro cosmic overview)
      default:
        return { scale: 1.0, panX: 0, panY: 0 };
    }
  }, [activeStage]);

  // Compute 3D geometry of Transparent Planet Lattice (Master Sphere)
  const { latitudes, meridians, starNodes } = useMemo(() => {
    const tilt = (renderRot.x * Math.PI) / 180;
    const rotY = (renderRot.y * Math.PI) / 180;
    const sinTilt = Math.sin(tilt);
    const cosTilt = Math.cos(tilt);

    // Latitudes
    const latAngles = [-68, -52, -36, -20, -6, 6, 20, 36, 52, 68];
    const lats = latAngles.map((deg) => {
      const latRad = (deg * Math.PI) / 180;
      const y = -R * Math.sin(latRad) * sinTilt;
      const rx = R * Math.cos(latRad);
      const ry = Math.max(0.1, rx * Math.abs(sinTilt));
      const op = Math.max(0.18, Math.min(0.85, 0.42 + 0.38 * Math.cos(latRad)));
      const isEquator = Math.abs(deg) <= 6;
      return {
        cy: Number(y.toFixed(2)),
        cx: 0,
        rx: Number(rx.toFixed(2)),
        ry: Number(ry.toFixed(2)),
        opacity: isEquator
          ? Number((op * 1.35).toFixed(2))
          : Number(op.toFixed(2)),
        strokeWidth: isEquator ? 1.1 : 0.65,
      };
    });

    // Longitudes
    const merAngles = [0, 20, 40, 60, 80, 100, 120, 140, 160];
    const mers = merAngles.map((deg) => {
      const lonRad = (deg * Math.PI) / 180 + rotY;
      const normLon = Math.sin(lonRad);
      const rx = Math.max(0.1, R * Math.abs(normLon));
      const ry = R;
      const isFront = Math.cos(lonRad) >= 0;
      return {
        angle: Number((renderRot.x * 0.28).toFixed(1)),
        rx: Number(rx.toFixed(2)),
        ry: Number(ry.toFixed(2)),
        opacity: isFront ? 0.48 : 0.2,
        strokeWidth: isFront ? 0.85 : 0.5,
      };
    });

    // Star nodes
    const nodes = RAW_STAR_NODES.map((n) => {
      const phi = (n.lat * Math.PI) / 180;
      const theta = (n.lon * Math.PI) / 180 + rotY;
      const X = R * Math.cos(phi) * Math.sin(theta);
      const Y = R * Math.sin(phi);
      const Z = R * Math.cos(phi) * Math.cos(theta);
      const Yrot = Y * cosTilt - Z * sinTilt;
      const Zrot = Y * sinTilt + Z * cosTilt;
      const isFront = Zrot > -25;
      const depthFactor = (Zrot + R) / (2 * R);
      const op = Math.max(0.15, Math.min(0.98, depthFactor * 1.15));

      return {
        x: Number(X.toFixed(2)),
        y: Number((-Yrot).toFixed(2)),
        r: n.r,
        col: fixedActive ? "#A9C8EE" : longActive ? "#F0A85C" : n.col,
        twinkle: n.twinkle,
        delay: n.delay,
        opacity: isFront ? Number(op.toFixed(2)) : 0,
      };
    });

    return { latitudes: lats, meridians: mers, starNodes: nodes };
  }, [renderRot, fixedActive, longActive]);

  // Compute 3D Vault Core (Wireframe Cube + Tesseract inside the transparent planet)
  const { cubeEdges, innerEdges, cubeCornerNodes } = useMemo(() => {
    const rx = (renderRot.x * Math.PI) / 180;
    const ry = (renderRot.y * Math.PI) / 180;
    const cosRx = Math.cos(rx);
    const sinRx = Math.sin(rx);
    const cosRy = Math.cos(ry);
    const sinRy = Math.sin(ry);

    const projectVertex = (
      vx: number,
      vy: number,
      vz: number,
      scale: number,
    ) => {
      const x = vx * scale;
      const y = vy * scale;
      const z = vz * scale;
      const x1 = x * cosRy + z * sinRy;
      const z1 = -x * sinRy + z * cosRy;
      const y1 = y * cosRx - z1 * sinRx;
      const z2 = y * sinRx + z1 * cosRx;
      return {
        x: Number(x1.toFixed(2)),
        y: Number(y1.toFixed(2)),
        z: Number(z2.toFixed(2)),
      };
    };

    const S_OUTER = engineActive ? 80 : 68;
    const outerVertices = CUBE_VERTICES.map(([vx, vy, vz]) =>
      projectVertex(vx, vy, vz, S_OUTER),
    );

    const S_INNER = engineActive ? 42 : 35;
    const innerVertices = CUBE_VERTICES.map(([vx, vy, vz]) =>
      projectVertex(vx, vy, vz, S_INNER),
    );

    const outerEdgesProj = CUBE_EDGES.map(([i1, i2]) => {
      const v1 = outerVertices[i1];
      const v2 = outerVertices[i2];
      const avgZ = (v1.z + v2.z) / 2;
      const isFront = avgZ > 0;
      return {
        x1: v1.x,
        y1: v1.y,
        x2: v2.x,
        y2: v2.y,
        opacity: isFront ? 0.85 : 0.35,
        strokeWidth: isFront ? 1.2 : 0.7,
      };
    });

    const innerEdgesProj = CUBE_EDGES.map(([i1, i2]) => {
      const v1 = innerVertices[i1];
      const v2 = innerVertices[i2];
      const avgZ = (v1.z + v2.z) / 2;
      const isFront = avgZ > 0;
      return {
        x1: v1.x,
        y1: v1.y,
        x2: v2.x,
        y2: v2.y,
        opacity: isFront ? 0.7 : 0.25,
        strokeWidth: isFront ? 0.9 : 0.5,
      };
    });

    // Struts connecting outer to inner corners (Tesseract box)
    const strutEdges = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const o = outerVertices[i];
      const inn = innerVertices[i];
      return {
        x1: o.x,
        y1: o.y,
        x2: inn.x,
        y2: inn.y,
        opacity: (o.z + inn.z) / 2 > 0 ? 0.55 : 0.2,
        strokeWidth: 0.75,
      };
    });

    return {
      cubeEdges: [...outerEdgesProj, ...strutEdges],
      innerEdges: innerEdgesProj,
      cubeCornerNodes: outerVertices,
    };
  }, [renderRot, engineActive]);

  // Positioning: On desktop split layout, center celestial object at x: 890
  const celestialCx = isSplitLayout ? 890 : 720;
  const celestialCy = 470;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1440 940"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Interactive 3D transparent multi-celestial world with smooth cinematic camera zoom, cryptographic vault core, rich moving star orbits, and seamless gesture inertia."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`absolute top-0 left-0 w-full h-full z-0 select-none touch-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <defs>
        {/* Full-screen background hit surface */}
        <radialGradient id="skyGrad" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#0B1322" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#050812" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#020304" stopOpacity="0" />
        </radialGradient>

        {/* Dynamic ambient backlight corona behind the planet */}
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

        {/* Soft glowing filter for star nodes and celestial satellites */}
        <filter id="starGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* High-intensity bloom filter for major star bodies & vault core */}
        <filter
          id="majorStarGlow"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="5.0"
            result="bigBlur"
          />
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="1.8"
            result="tightBlur"
          />
          <feMerge>
            <feMergeNode in="bigBlur" />
            <feMergeNode in="tightBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Directional Lighting Mask: Bright crisp white at top-left, fading to dark at bottom-right */}
        <linearGradient
          id="planetLightGrad"
          x1="18%"
          y1="0%"
          x2="42%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="32%" stopColor="#FFFFFF" stopOpacity="0.88" />
          <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
        </linearGradient>
        <mask id="planetMeshMask">
          <rect
            x="-1000"
            y="-1000"
            width="2000"
            height="2000"
            fill="url(#planetLightGrad)"
          />
        </mask>

        {/* Top-left razor-sharp crescent rim arc lighting */}
        <linearGradient id="topRimArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Pure spherical clip path */}
        <clipPath id="pclipSphere">
          <circle cx="0" cy="0" r="345" />
        </clipPath>

        {/* Depth Clip for Orbits */}
        <clipPath id="oback">
          <rect x="-1400" y="-1400" width="2800" height="1400" />
        </clipPath>
        <clipPath id="ofront">
          <rect x="-1400" y="0" width="2800" height="1400" />
        </clipPath>

        {/* Shooting Meteor Tail Gradients */}
        <linearGradient id="meteorTailA" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#DDE8F8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Full-Screen Gesture Capture Background */}
      <rect width="1440" height="940" fill="transparent" pointerEvents="all" />

      {/* Subtle deep cosmic sky background */}
      <rect
        width="1440"
        height="940"
        fill="url(#skyGrad)"
        pointerEvents="none"
      />

      {/* Top-Left Distant Black Hole Feature */}
      <g transform="translate(160 145)" opacity="0.35" pointerEvents="none">
        <circle r="42" fill="#010204" />
        <g className="spin" style={{ animationDuration: "85s" }}>
          <circle
            r="52"
            fill="none"
            stroke="#2A3546"
            strokeWidth="0.8"
            strokeDasharray="14 12"
            opacity="0.4"
          />
          <circle
            r="68"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="0.5"
            strokeDasharray="4 18"
            opacity="0.25"
          />
          <circle cx="52" cy="0" r="1.5" fill="#A9C8EE" opacity="0.7" />
        </g>
      </g>

      {/* Active Shooting Meteors */}
      <g transform="translate(1180 140) rotate(-32)" pointerEvents="none">
        <g
          className="shoot"
          style={{ animationDelay: "0.8s", animationDuration: "8.5s" }}
        >
          <line
            x1="0"
            y1="0"
            x2="-160"
            y2="0"
            stroke="url(#meteorTailA)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle
            cx="0"
            cy="0"
            r="2.6"
            fill="#FFFFFF"
            filter="url(#starGlow)"
          />
          <circle cx="0" cy="0" r="5.5" fill="#A9C8EE" opacity="0.45" />
        </g>
      </g>

      <g transform="translate(380 90) rotate(-26)" pointerEvents="none">
        <g
          className="shoot"
          style={{ animationDelay: "4.8s", animationDuration: "10.5s" }}
        >
          <line
            x1="0"
            y1="0"
            x2="-180"
            y2="0"
            stroke="url(#meteorTailA)"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          <circle
            cx="0"
            cy="0"
            r="2.8"
            fill="#FFFFFF"
            filter="url(#starGlow)"
          />
          <circle cx="0" cy="0" r="6" fill="#DDE8F8" opacity="0.4" />
        </g>
      </g>

      <g transform="translate(980 340) rotate(-35)" pointerEvents="none">
        <g
          className="shoot"
          style={{ animationDelay: "8.2s", animationDuration: "12s" }}
        >
          <line
            x1="0"
            y1="0"
            x2="-130"
            y2="0"
            stroke="url(#meteorTailA)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle
            cx="0"
            cy="0"
            r="2.0"
            fill="#FFFFFF"
            filter="url(#starGlow)"
          />
        </g>
      </g>

      {/* ============================================================== */}
      {/* CINEMATIC CAMERA SYSTEM: Smooth Zoom & Pan Per Planet Stage     */}
      {/* ============================================================== */}
      <g
        transform={`translate(${celestialCx + parallaxX + cameraConfig.panX} ${celestialCy + parallaxY + cameraConfig.panY}) scale(${cameraConfig.scale})`}
        style={{
          transition: "transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Soft diffuse corona behind planet */}
        <circle
          r="420"
          fill={fixedActive ? "url(#behindCyanGlow)" : "url(#behindOrangeGlow)"}
          style={{ transition: "fill 0.6s ease-out" }}
          pointerEvents="none"
        />

        {/* Moving Orbital System (Back of Planet) */}
        <g
          transform="rotate(-8) scale(1 0.22)"
          clipPath="url(#oback)"
          pointerEvents="none"
        >
          <circle
            r="390"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="0.55"
            opacity="0.3"
            strokeDasharray="6 14"
          />
          <g
            className="spin"
            style={{ animationDuration: "19s", animationDelay: "-3s" }}
          >
            <g transform="translate(390 0)">
              <g
                className="spin rev"
                style={{ animationDuration: "19s", animationDelay: "-3s" }}
              >
                <circle r="3.2" fill="#FFFFFF" filter="url(#starGlow)" />
                <circle r="8" fill="#A9C8EE" opacity="0.35" />
              </g>
            </g>
          </g>
        </g>

        {/* Fixed Yield Orbit Track (Ice Blue, -15 deg) - Back */}
        <g
          transform="rotate(-15) scale(1 0.23)"
          clipPath="url(#oback)"
          pointerEvents="none"
        >
          <circle
            r="428"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="0.6"
            opacity="0.35"
          />
          <circle
            r="445"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="1.6"
            opacity={fixedOp}
          />
          <circle
            className="ringflow"
            r="445"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeDasharray="180 80 40 80"
            opacity={fixedOp}
            style={{ animationDuration: "55s" }}
          />
          <circle
            r="462"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <circle
            className="ringflow"
            r="462"
            fill="none"
            stroke="#DDE8F8"
            strokeWidth="0.6"
            strokeDasharray="2 12"
            opacity="0.6"
            style={{ animationDuration: "75s" }}
          />
        </g>

        {/* Celestial Orbit Track (+24 deg) - Back */}
        <g
          transform="rotate(24) scale(1 0.24)"
          clipPath="url(#oback)"
          pointerEvents="none"
        >
          <circle
            r="490"
            fill="none"
            stroke="#ECEDEA"
            strokeWidth="0.65"
            opacity="0.25"
            strokeDasharray="10 16"
          />
          <g
            className="spin"
            style={{ animationDuration: "22s", animationDelay: "-5s" }}
          >
            <g transform="translate(490 0)">
              <g
                className="spin rev"
                style={{ animationDuration: "22s", animationDelay: "-5s" }}
              >
                <circle r="3.8" fill="#FFFFFF" filter="url(#starGlow)" />
                <circle r="10" fill="#DDE8F8" opacity="0.35" />
              </g>
            </g>
          </g>
        </g>

        {/* Long Yield Orbit Track (Amber, -15 deg) - Back */}
        <g
          transform="rotate(-15) scale(1 0.23)"
          clipPath="url(#oback)"
          pointerEvents="none"
        >
          <circle
            r="525"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="0.6"
            opacity="0.35"
          />
          <circle
            r="545"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="1.8"
            opacity={longOp}
          />
          <circle
            className="ringflow"
            r="545"
            fill="none"
            stroke="#FFF2D6"
            strokeWidth="2.5"
            strokeDasharray="240 100 50 100"
            opacity={longOp}
            style={{ animationDuration: "42s" }}
          />
          <circle
            r="568"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <circle
            className="ringflow"
            r="568"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="0.6"
            strokeDasharray="4 16"
            opacity="0.5"
            style={{ animationDuration: "60s" }}
          />
        </g>

        {/* Sweeping Celestial Outer Ring (-26 deg) - Back */}
        <g
          transform="rotate(-26) scale(1 0.25)"
          clipPath="url(#oback)"
          pointerEvents="none"
        >
          <circle
            r="650"
            fill="none"
            stroke="#ECEDEA"
            strokeWidth="0.75"
            opacity="0.25"
          />
          <circle
            className="ringflow"
            r="650"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeDasharray="300 160 40 100"
            opacity="0.85"
            style={{ animationDuration: "32s" }}
          />
        </g>

        {/* ============================================================== */}
        {/* MONUMENTAL HD WIREFRAME SPHERICAL PLANET BODY (R = 345)        */}
        {/* (Crisp, High-Tech, Monumental Sphere - Always Recognizable)     */}
        {/* ============================================================== */}
        <g pointerEvents="none">
          {/* Outer boundary circle with subtle stage glow */}
          <circle
            r="345"
            fill="none"
            stroke={
              fixedActive
                ? "#A9C8EE"
                : longActive
                  ? "#F0A85C"
                  : "rgba(255,255,255,0.12)"
            }
            strokeWidth={fixedActive || longActive ? "1.4" : "0.8"}
            opacity={fixedActive || longActive ? "0.6" : "0.3"}
            style={{
              transition: "stroke 0.6s ease-out, stroke-width 0.6s ease-out",
            }}
          />

          {/* Crisp Wireframe Net with Directional Lighting */}
          <g clipPath="url(#pclipSphere)">
            <g mask="url(#planetMeshMask)">
              {/* Latitudes */}
              {latitudes.map((lat, i) => (
                <ellipse
                  key={`lat-${i}`}
                  cx={lat.cx}
                  cy={lat.cy}
                  rx={lat.rx}
                  ry={lat.ry}
                  fill="none"
                  stroke={
                    fixedActive ? "#DDE8F8" : longActive ? "#FFE2C4" : "#FFFFFF"
                  }
                  strokeWidth={lat.strokeWidth}
                  opacity={lat.opacity}
                  style={{ transition: "stroke 0.5s ease-out" }}
                />
              ))}

              {/* Longitude Meridians */}
              {meridians.map((mer, i) => (
                <ellipse
                  key={`mer-${i}`}
                  cx={0}
                  cy={0}
                  rx={mer.rx}
                  ry={mer.ry}
                  transform={`rotate(${mer.angle})`}
                  fill="none"
                  stroke={
                    fixedActive ? "#DDE8F8" : longActive ? "#FFE2C4" : "#FFFFFF"
                  }
                  strokeWidth={mer.strokeWidth}
                  opacity={mer.opacity}
                  style={{ transition: "stroke 0.5s ease-out" }}
                />
              ))}

              {/* Star Constellation Nodes on Surface */}
              {starNodes.map(
                (st, i) =>
                  st.opacity > 0 && (
                    <g key={`star-${i}`}>
                      <circle
                        cx={st.x}
                        cy={st.y}
                        r={st.r}
                        fill={st.col}
                        opacity={st.opacity}
                        className={st.twinkle ? "tw" : undefined}
                        style={
                          st.twinkle ? { animationDelay: st.delay } : undefined
                        }
                      />
                      <circle
                        cx={st.x}
                        cy={st.y}
                        r={st.r * 2.2}
                        fill={st.col}
                        opacity={st.opacity * 0.28}
                      />
                    </g>
                  ),
              )}
            </g>
          </g>

          {/* Top-Left Razor-Sharp Crescent Rim Arc Lighting */}
          <path
            d="M -325 115 A 345 345 0 0 1 115 -325"
            fill="none"
            stroke="url(#topRimArcGrad)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Outer boundary tick marks */}
          <g opacity="0.35">
            <line
              x1="-345"
              y1="0"
              x2="-335"
              y2="0"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
            <line
              x1="345"
              y1="0"
              x2="335"
              y2="0"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="-345"
              x2="0"
              y2="-335"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="345"
              x2="0"
              y2="335"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
          </g>

          {/* ============================================================== */}
          {/* 3D CRYPTOGRAPHIC YIELD VAULT CORE (Zupiter-Style Rotating Box)  */}
          {/* ============================================================== */}
          <g>
            {/* Concentric Gimbal Gyroscope Rings inside sphere */}
            <g transform="rotate(35) scale(1 0.42)">
              <circle
                r="115"
                fill="none"
                stroke={
                  fixedActive ? "#A9C8EE" : longActive ? "#F0A85C" : "#FFFFFF"
                }
                strokeWidth="0.65"
                opacity={engineActive ? 0.85 : 0.28}
                strokeDasharray="8 10"
              />
            </g>
            <g transform="rotate(-40) scale(1 0.38)">
              <circle
                r="92"
                fill="none"
                stroke={
                  fixedActive ? "#A9C8EE" : longActive ? "#F0A85C" : "#A9C8EE"
                }
                strokeWidth="0.6"
                opacity={engineActive ? 0.9 : 0.3}
                strokeDasharray="5 8"
              />
            </g>

            {/* 3D Wireframe Cube Edges */}
            {cubeEdges.map((e, idx) => (
              <line
                key={`cube-e-${idx}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={
                  engineActive
                    ? "#A9C8EE"
                    : fixedActive
                      ? "#A9C8EE"
                      : longActive
                        ? "#F0A85C"
                        : "#FFFFFF"
                }
                strokeWidth={e.strokeWidth}
                opacity={
                  engineActive ? Math.min(1, e.opacity * 1.5) : e.opacity
                }
              />
            ))}

            {/* Inner Tesseract Edges */}
            {innerEdges.map((e, idx) => (
              <line
                key={`cube-in-${idx}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={
                  engineActive
                    ? "#F0A85C"
                    : fixedActive
                      ? "#DDE8F8"
                      : longActive
                        ? "#FFF2D6"
                        : "#DDE8F8"
                }
                strokeWidth={e.strokeWidth}
                opacity={
                  engineActive ? Math.min(1, e.opacity * 1.6) : e.opacity
                }
              />
            ))}

            {/* Outer Cube Corner Vertices with Micro Nodes */}
            {cubeCornerNodes.map((v, idx) => (
              <circle
                key={`cube-node-${idx}`}
                cx={v.x}
                cy={v.y}
                r={v.z > 0 ? (engineActive ? 3.0 : 2.4) : 1.4}
                fill={v.z > 0 ? "#FFFFFF" : "#8E929B"}
                opacity={v.z > 0 ? 0.9 : 0.4}
                filter={v.z > 0 ? "url(#starGlow)" : undefined}
              />
            ))}

            {/* Radiant Central Yield Token Nucleus (USDG Anchor) */}
            <circle
              r="12"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.6"
              opacity="0.35"
              strokeDasharray="3 3"
            />
            <circle r="5.5" fill="#FFFFFF" filter="url(#majorStarGlow)" />
            <circle
              r="16"
              fill={
                fixedActive
                  ? "#A9C8EE"
                  : longActive
                    ? "#F0A85C"
                    : engineActive
                      ? "#A9C8EE"
                      : "#F0A85C"
              }
              opacity={engineActive ? 0.5 : 0.25}
              filter="url(#starGlow)"
            />

            {/* Laser Split Vector (Active in Stage 3) */}
            {engineActive && (
              <g>
                <line
                  x1="-12"
                  y1="0"
                  x2="-120"
                  y2="0"
                  stroke="#A9C8EE"
                  strokeWidth="1.8"
                  filter="url(#starGlow)"
                />
                <polygon points="-120,-4 -130,0 -120,4" fill="#A9C8EE" />
                <text
                  x="-136"
                  y="4"
                  textAnchor="end"
                  className="mono text-[9px] tracking-[0.18em]"
                  fill="#A9C8EE"
                >
                  PT (PRINCIPAL)
                </text>

                <line
                  x1="12"
                  y1="0"
                  x2="120"
                  y2="0"
                  stroke="#F0A85C"
                  strokeWidth="1.8"
                  filter="url(#starGlow)"
                />
                <polygon points="120,-4 130,0 120,4" fill="#F0A85C" />
                <text
                  x="136"
                  y="4"
                  textAnchor="start"
                  className="mono text-[9px] tracking-[0.18em]"
                  fill="#F0A85C"
                >
                  YT (YIELD)
                </text>
              </g>
            )}

            {/* Micro Technical Sub-label under Core */}
            <text
              x="0"
              y="98"
              textAnchor="middle"
              className="mono text-[8px] tracking-[0.24em] select-none"
              fill="#ECEDEA"
              opacity={engineActive ? 0.9 : 0.45}
            >
              USDG · SPLIT VAULT CORE
            </text>
          </g>
        </g>

        {/* Tactical HUD Overlay for Stage 4 */}
        {vaultsActive && (
          <g
            pointerEvents="none"
            className="transition-opacity duration-700 ease-out"
          >
            <circle
              r="220"
              fill="none"
              stroke="#34D399"
              strokeWidth="0.6"
              opacity="0.35"
              strokeDasharray="8 12"
            />
            <line
              x1="-360"
              y1="0"
              x2="-330"
              y2="0"
              stroke="#34D399"
              strokeWidth="1.2"
              opacity="0.6"
            />
            <line
              x1="330"
              y1="0"
              x2="360"
              y2="0"
              stroke="#34D399"
              strokeWidth="1.2"
              opacity="0.6"
            />
            <line
              x1="0"
              y1="-360"
              x2="0"
              y2="-330"
              stroke="#34D399"
              strokeWidth="1.2"
              opacity="0.6"
            />
            <line
              x1="0"
              y1="330"
              x2="0"
              y2="360"
              stroke="#34D399"
              strokeWidth="1.2"
              opacity="0.6"
            />
          </g>
        )}

        {/* Moving Orbital System (Foreground - in Front of Planet) */}
        <g
          transform="rotate(-8) scale(1 0.22)"
          clipPath="url(#ofront)"
          pointerEvents="none"
        >
          <circle
            r="390"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="0.55"
            opacity="0.3"
            strokeDasharray="6 14"
          />
          <g
            className="spin"
            style={{ animationDuration: "19s", animationDelay: "-3s" }}
          >
            <g transform="translate(390 0)">
              <g
                className="spin rev"
                style={{ animationDuration: "19s", animationDelay: "-3s" }}
              >
                <circle r="3.2" fill="#FFFFFF" filter="url(#starGlow)" />
                <circle r="8" fill="#A9C8EE" opacity="0.35" />
              </g>
            </g>
          </g>
        </g>

        {/* Fixed Yield Orbit Track (Ice Blue, -15 deg) - Front */}
        <g
          transform="rotate(-15) scale(1 0.23)"
          clipPath="url(#ofront)"
          pointerEvents="none"
        >
          <circle
            r="428"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="0.6"
            opacity="0.35"
          />
          <circle
            r="445"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="1.6"
            opacity={fixedOp}
          />
          <circle
            className="ringflow"
            r="445"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeDasharray="180 80 40 80"
            opacity={fixedOp}
            style={{ animationDuration: "55s" }}
          />
          <circle
            r="462"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <circle
            className="ringflow"
            r="462"
            fill="none"
            stroke="#DDE8F8"
            strokeWidth="0.6"
            strokeDasharray="2 12"
            opacity="0.6"
            style={{ animationDuration: "75s" }}
          />

          {/* Primary Fixed Yield Star Satellite */}
          <g
            className="spin"
            style={{ animationDuration: "26s", animationDelay: "-6.5s" }}
          >
            <g transform="translate(445 0)">
              <g
                className="spin rev"
                style={{ animationDuration: "26s", animationDelay: "-6.5s" }}
              >
                <circle r="5.0" fill="#FFFFFF" filter="url(#majorStarGlow)" />
                <circle r="14" fill="#A9C8EE" opacity="0.45" />
                <circle r="24" fill="#A9C8EE" opacity="0.18" />
              </g>
            </g>
          </g>
        </g>

        {/* Long Yield Orbit Track (Amber, -15 deg) - Front */}
        <g
          transform="rotate(-15) scale(1 0.23)"
          clipPath="url(#ofront)"
          pointerEvents="none"
        >
          <circle
            r="525"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="0.6"
            opacity="0.35"
          />
          <circle
            r="545"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="1.8"
            opacity={longOp}
          />
          <circle
            className="ringflow"
            r="545"
            fill="none"
            stroke="#FFF2D6"
            strokeWidth="2.5"
            strokeDasharray="240 100 50 100"
            opacity={longOp}
            style={{ animationDuration: "42s" }}
          />
          <circle
            r="568"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <circle
            className="ringflow"
            r="568"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="0.6"
            strokeDasharray="4 16"
            opacity="0.5"
            style={{ animationDuration: "60s" }}
          />

          {/* Primary Long Yield Star Satellite */}
          <g
            className="spin"
            style={{ animationDuration: "38s", animationDelay: "-14s" }}
          >
            <g transform="translate(545 0)">
              <g
                className="spin rev"
                style={{ animationDuration: "38s", animationDelay: "-14s" }}
              >
                <circle r="5.5" fill="#FFFFFF" filter="url(#majorStarGlow)" />
                <circle r="15" fill="#F0A85C" opacity="0.45" />
                <circle r="26" fill="#F0A85C" opacity="0.18" />
              </g>
            </g>
          </g>
        </g>

        {/* Sweeping Outer Celestial Ring (-26 deg) - Front */}
        <g
          transform="rotate(-26) scale(1 0.25)"
          clipPath="url(#ofront)"
          pointerEvents="none"
        >
          <circle
            r="650"
            fill="none"
            stroke="#ECEDEA"
            strokeWidth="0.75"
            opacity="0.25"
          />
          <circle
            className="ringflow"
            r="650"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeDasharray="300 160 40 100"
            opacity="0.85"
            style={{ animationDuration: "32s" }}
          />
        </g>

        {/* ============================================================== */}
        {/* INTERACTIVE PINS (Cleanly Positioned on the Right Side)        */}
        {/* ============================================================== */}

        {/* Pin 1: Fixed Yield (+ FIXED 6.42%) */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(-100 240)"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(1);
          }}
        >
          {fixedActive && (
            <circle
              r="26"
              fill="none"
              stroke="#A9C8EE"
              strokeWidth="1.2"
              opacity="0.5"
              className="animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
          )}
          <circle
            r="16"
            fill="rgba(6,10,18,0.75)"
            stroke="#A9C8EE"
            strokeWidth={fixedActive ? "1.6" : "0.9"}
            opacity={fixedActive ? 1 : 0.6}
          />
          <circle
            r="10"
            fill={fixedActive ? "#A9C8EE" : "#0F192C"}
            opacity="0.8"
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill={fixedActive ? "#030304" : "#A9C8EE"}
            className="mono text-[10px] font-bold select-none"
          >
            +
          </text>
          <text
            x="24"
            y="4"
            textAnchor="start"
            fill="#A9C8EE"
            className="mono text-[10px] tracking-[0.16em] select-none font-medium"
          >
            FIXED · 6.42%
          </text>
        </g>

        {/* Pin 2: Long Yield (+ LONG FLOATING) */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(260 -130)"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(2);
          }}
        >
          {longActive && (
            <circle
              r="26"
              fill="none"
              stroke="#F0A85C"
              strokeWidth="1.2"
              opacity="0.5"
              className="animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
          )}
          <circle
            r="16"
            fill="rgba(18,12,6,0.75)"
            stroke="#F0A85C"
            strokeWidth={longActive ? "1.6" : "0.9"}
            opacity={longActive ? 1 : 0.6}
          />
          <circle
            r="10"
            fill={longActive ? "#F0A85C" : "#2C1B0F"}
            opacity="0.8"
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill={longActive ? "#030304" : "#F0A85C"}
            className="mono text-[10px] font-bold select-none"
          >
            +
          </text>
          <text
            x="24"
            y="4"
            textAnchor="start"
            fill="#F0A85C"
            className="mono text-[10px] tracking-[0.16em] select-none font-medium"
          >
            LONG · FLOATING
          </text>
        </g>

        {/* Pin 3: Vault Core (+ SPLIT ENGINE) */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(0 -190)"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(3);
          }}
        >
          {engineActive && (
            <circle
              r="24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              opacity="0.5"
              className="animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
          )}
          <circle
            r="15"
            fill="rgba(8,10,14,0.75)"
            stroke="#ECEDEA"
            strokeWidth={engineActive ? "1.6" : "0.8"}
            opacity={engineActive ? 1 : 0.5}
          />
          <circle
            r="9"
            fill={engineActive ? "#FFFFFF" : "#1A2230"}
            opacity="0.8"
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill={engineActive ? "#030304" : "#FFFFFF"}
            className="mono text-[9px] font-bold select-none"
          >
            +
          </text>
          <text
            x="22"
            y="4"
            textAnchor="start"
            fill="#ECEDEA"
            className="mono text-[9px] tracking-[0.18em] select-none"
          >
            SPLIT ENGINE
          </text>
        </g>

        {/* Pin 4: Live Market (+ USDG VAULT) */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(200 240)"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(4);
          }}
        >
          {vaultsActive && (
            <circle
              r="24"
              fill="none"
              stroke="#34D399"
              strokeWidth="1.2"
              opacity="0.5"
              className="animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
          )}
          <circle
            r="15"
            fill="rgba(8,10,14,0.75)"
            stroke="#34D399"
            strokeWidth={vaultsActive ? "1.6" : "0.8"}
            opacity={vaultsActive ? 1 : 0.5}
          />
          <circle
            r="9"
            fill={vaultsActive ? "#34D399" : "#1A2230"}
            opacity="0.8"
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill={vaultsActive ? "#030304" : "#34D399"}
            className="mono text-[9px] font-bold select-none"
          >
            +
          </text>
          <text
            x="22"
            y="4"
            textAnchor="start"
            fill="#ECEDEA"
            className="mono text-[9px] tracking-[0.18em] select-none"
          >
            USDG VAULT
          </text>
        </g>
      </g>

      {/* ============================================================== */}
      {/* RIGHT-EDGE TECHNICAL PERSPECTIVE & RESET CONTROLS (Zupiter)     */}
      {/* ============================================================== */}
      <g
        transform="translate(1412 630)"
        className="pointer-events-none select-none"
      >
        <text
          x="0"
          y="0"
          transform="rotate(90)"
          textAnchor="middle"
          className="mono text-[9px] tracking-[0.26em]"
          fill="#8E929B"
          opacity="0.55"
        >
          DRAG OR MOVE TO EXPLORE PERSPECTIVE
        </text>
      </g>

      {/* Orientation Reset Button (Bottom Right) */}
      <g
        transform="translate(1392 880)"
        className="cursor-pointer group pointer-events-auto"
        onClick={handleResetOrientation}
      >
        <circle
          r="18"
          fill="rgba(10,12,18,0.75)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.9"
          className="group-hover:stroke-white transition-colors"
        />
        <path
          d="M -5 -2 A 6 6 0 1 1 -3 5 L -1 3 M -3 5 L -3 1"
          fill="none"
          stroke="#ECEDEA"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      </g>
    </svg>
  );
}
