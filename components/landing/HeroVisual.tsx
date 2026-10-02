"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

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
    "lat": 70.05,
    "lon": 0.0,
    "r": 2.4,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "0.0s"
  },
  {
    "lat": 66.96,
    "lon": 137.51,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.2s"
  },
  {
    "lat": 64.21,
    "lon": 275.02,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "0.5s"
  },
  {
    "lat": 61.72,
    "lon": 52.52,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "0.8s"
  },
  {
    "lat": 59.41,
    "lon": 190.03,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "1.0s"
  },
  {
    "lat": 57.25,
    "lon": 327.54,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.2s"
  },
  {
    "lat": 55.21,
    "lon": 105.05,
    "r": 1.8,
    "col": "#FFE2C4",
    "twinkle": true,
    "delay": "1.5s"
  },
  {
    "lat": 53.27,
    "lon": 242.55,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.8s"
  },
  {
    "lat": 51.42,
    "lon": 20.06,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.0s"
  },
  {
    "lat": 49.63,
    "lon": 157.57,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "2.2s"
  },
  {
    "lat": 47.91,
    "lon": 295.08,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "2.5s"
  },
  {
    "lat": 46.25,
    "lon": 72.59,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.8s"
  },
  {
    "lat": 44.63,
    "lon": 210.09,
    "r": 1.8,
    "col": "#A9C8EE",
    "twinkle": true,
    "delay": "3.0s"
  },
  {
    "lat": 43.06,
    "lon": 347.6,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.2s"
  },
  {
    "lat": 41.53,
    "lon": 125.11,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "3.5s"
  },
  {
    "lat": 40.03,
    "lon": 262.62,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "3.8s"
  },
  {
    "lat": 38.56,
    "lon": 40.12,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.0s"
  },
  {
    "lat": 37.13,
    "lon": 177.63,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.2s"
  },
  {
    "lat": 35.72,
    "lon": 315.14,
    "r": 1.8,
    "col": "#DDE8F8",
    "twinkle": true,
    "delay": "0.5s"
  },
  {
    "lat": 34.33,
    "lon": 92.65,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.8s"
  },
  {
    "lat": 32.97,
    "lon": 230.16,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "1.0s"
  },
  {
    "lat": 31.63,
    "lon": 7.66,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "1.2s"
  },
  {
    "lat": 30.31,
    "lon": 145.17,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "1.5s"
  },
  {
    "lat": 29.0,
    "lon": 282.68,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.8s"
  },
  {
    "lat": 27.71,
    "lon": 60.19,
    "r": 2.4,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "2.0s"
  },
  {
    "lat": 26.44,
    "lon": 197.69,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.2s"
  },
  {
    "lat": 25.18,
    "lon": 335.2,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "2.5s"
  },
  {
    "lat": 23.93,
    "lon": 112.71,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "2.8s"
  },
  {
    "lat": 22.7,
    "lon": 250.22,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "3.0s"
  },
  {
    "lat": 21.48,
    "lon": 27.73,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.2s"
  },
  {
    "lat": 20.26,
    "lon": 165.23,
    "r": 1.8,
    "col": "#FFE2C4",
    "twinkle": true,
    "delay": "3.5s"
  },
  {
    "lat": 19.06,
    "lon": 302.74,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.8s"
  },
  {
    "lat": 17.86,
    "lon": 80.25,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.0s"
  },
  {
    "lat": 16.68,
    "lon": 217.76,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "0.2s"
  },
  {
    "lat": 15.5,
    "lon": 355.26,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "0.5s"
  },
  {
    "lat": 14.32,
    "lon": 132.77,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.8s"
  },
  {
    "lat": 13.15,
    "lon": 270.28,
    "r": 1.8,
    "col": "#A9C8EE",
    "twinkle": true,
    "delay": "1.0s"
  },
  {
    "lat": 11.99,
    "lon": 47.79,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.2s"
  },
  {
    "lat": 10.84,
    "lon": 185.3,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "1.5s"
  },
  {
    "lat": 9.68,
    "lon": 322.8,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "1.8s"
  },
  {
    "lat": 8.54,
    "lon": 100.31,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.0s"
  },
  {
    "lat": 7.39,
    "lon": 237.82,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.2s"
  },
  {
    "lat": 6.25,
    "lon": 15.33,
    "r": 1.8,
    "col": "#DDE8F8",
    "twinkle": true,
    "delay": "2.5s"
  },
  {
    "lat": 5.11,
    "lon": 152.83,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.8s"
  },
  {
    "lat": 3.97,
    "lon": 290.34,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "3.0s"
  },
  {
    "lat": 2.84,
    "lon": 67.85,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "3.2s"
  },
  {
    "lat": 1.7,
    "lon": 205.36,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "3.5s"
  },
  {
    "lat": 0.57,
    "lon": 342.86,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.8s"
  },
  {
    "lat": -0.57,
    "lon": 120.37,
    "r": 2.4,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "0.0s"
  },
  {
    "lat": -1.7,
    "lon": 257.88,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.2s"
  },
  {
    "lat": -2.84,
    "lon": 35.39,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "0.5s"
  },
  {
    "lat": -3.97,
    "lon": 172.9,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "0.8s"
  },
  {
    "lat": -5.11,
    "lon": 310.4,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "1.0s"
  },
  {
    "lat": -6.25,
    "lon": 87.91,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.2s"
  },
  {
    "lat": -7.39,
    "lon": 225.42,
    "r": 1.8,
    "col": "#FFE2C4",
    "twinkle": true,
    "delay": "1.5s"
  },
  {
    "lat": -8.54,
    "lon": 2.93,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.8s"
  },
  {
    "lat": -9.68,
    "lon": 140.43,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.0s"
  },
  {
    "lat": -10.84,
    "lon": 277.94,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "2.2s"
  },
  {
    "lat": -11.99,
    "lon": 55.45,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "2.5s"
  },
  {
    "lat": -13.15,
    "lon": 192.96,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.8s"
  },
  {
    "lat": -14.32,
    "lon": 330.47,
    "r": 1.8,
    "col": "#A9C8EE",
    "twinkle": true,
    "delay": "3.0s"
  },
  {
    "lat": -15.5,
    "lon": 107.97,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.2s"
  },
  {
    "lat": -16.68,
    "lon": 245.48,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "3.5s"
  },
  {
    "lat": -17.86,
    "lon": 22.99,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "3.8s"
  },
  {
    "lat": -19.06,
    "lon": 160.5,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.0s"
  },
  {
    "lat": -20.26,
    "lon": 298.0,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.2s"
  },
  {
    "lat": -21.48,
    "lon": 75.51,
    "r": 1.8,
    "col": "#DDE8F8",
    "twinkle": true,
    "delay": "0.5s"
  },
  {
    "lat": -22.7,
    "lon": 213.02,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.8s"
  },
  {
    "lat": -23.93,
    "lon": 350.53,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "1.0s"
  },
  {
    "lat": -25.18,
    "lon": 128.04,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "1.2s"
  },
  {
    "lat": -26.44,
    "lon": 265.54,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "1.5s"
  },
  {
    "lat": -27.71,
    "lon": 43.05,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.8s"
  },
  {
    "lat": -29.0,
    "lon": 180.56,
    "r": 2.4,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "2.0s"
  },
  {
    "lat": -30.31,
    "lon": 318.07,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.2s"
  },
  {
    "lat": -31.63,
    "lon": 95.57,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "2.5s"
  },
  {
    "lat": -32.97,
    "lon": 233.08,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "2.8s"
  },
  {
    "lat": -34.33,
    "lon": 10.59,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "3.0s"
  },
  {
    "lat": -35.72,
    "lon": 148.1,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.2s"
  },
  {
    "lat": -37.13,
    "lon": 285.61,
    "r": 1.8,
    "col": "#FFE2C4",
    "twinkle": true,
    "delay": "3.5s"
  },
  {
    "lat": -38.56,
    "lon": 63.11,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.8s"
  },
  {
    "lat": -40.03,
    "lon": 200.62,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.0s"
  },
  {
    "lat": -41.53,
    "lon": 338.13,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "0.2s"
  },
  {
    "lat": -43.06,
    "lon": 115.64,
    "r": 1.3,
    "col": "#DDE8F8",
    "twinkle": false,
    "delay": "0.5s"
  },
  {
    "lat": -44.63,
    "lon": 253.14,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "0.8s"
  },
  {
    "lat": -46.25,
    "lon": 30.65,
    "r": 1.8,
    "col": "#A9C8EE",
    "twinkle": true,
    "delay": "1.0s"
  },
  {
    "lat": -47.91,
    "lon": 168.16,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "1.2s"
  },
  {
    "lat": -49.63,
    "lon": 305.67,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "1.5s"
  },
  {
    "lat": -51.42,
    "lon": 83.18,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "1.8s"
  },
  {
    "lat": -53.27,
    "lon": 220.68,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.0s"
  },
  {
    "lat": -55.21,
    "lon": 358.19,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.2s"
  },
  {
    "lat": -57.25,
    "lon": 135.7,
    "r": 1.8,
    "col": "#DDE8F8",
    "twinkle": true,
    "delay": "2.5s"
  },
  {
    "lat": -59.41,
    "lon": 273.21,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "2.8s"
  },
  {
    "lat": -61.72,
    "lon": 50.71,
    "r": 1.3,
    "col": "#A9C8EE",
    "twinkle": false,
    "delay": "3.0s"
  },
  {
    "lat": -64.21,
    "lon": 188.22,
    "r": 1.8,
    "col": "#FFFFFF",
    "twinkle": true,
    "delay": "3.2s"
  },
  {
    "lat": -66.96,
    "lon": 325.73,
    "r": 1.3,
    "col": "#FFE2C4",
    "twinkle": false,
    "delay": "3.5s"
  },
  {
    "lat": -70.05,
    "lon": 103.24,
    "r": 1.3,
    "col": "#FFFFFF",
    "twinkle": false,
    "delay": "3.8s"
  }
];

// 3D Cube Definition (for Split Engine Tesseract Vault Core)
const CUBE_VERTICES = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1],
];

const CUBE_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0], // back square
  [4, 5], [5, 6], [6, 7], [7, 4], // front square
  [0, 4], [1, 5], [2, 6], [3, 7], // connectors
];

export function HeroVisual({
  pointerX = 0,
  parallaxX = 0,
  parallaxY = 0,
  activeStage = 0,
  onSelectStage,
  isSplitLayout = true,
}: HeroVisualProps) {
  const [renderState, setRenderState] = useState({
    rotX: 18,
    rotY: 0,
    camScale: 0.88,
    camPanX: 30,
    camPanY: 0,
    time: 0,
  });
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
    camScale: 0.88,
    camPanX: 30,
    camPanY: 0,
    targetScale: 0.88,
    targetPanX: 30,
    targetPanY: 0,
    time: 0,
  });

  // Smoothly update camera targets per stage (No stutter, perfectly centered on right viewport)
  useEffect(() => {
    const s = stateRef.current;
    switch (activeStage) {
      case 1: // Fixed Yield 3D Diamond Planet (-100, 240)
        s.targetScale = 1.62;
        s.targetPanX = 230;
        s.targetPanY = -390;
        break;
      case 2: // Long Yield 3D Bio-Particle Planet (260, -130)
        s.targetScale = 1.62;
        s.targetPanX = -350;
        s.targetPanY = 210;
        break;
      case 3: // Split Engine 3D Prisms & Quantum Laser (0, -190)
        s.targetScale = 1.75;
        s.targetPanX = 60;
        s.targetPanY = 320;
        break;
      case 4: // Live USDG Vault 3D Gyroscope (200, 240)
        s.targetScale = 1.62;
        s.targetPanX = -260;
        s.targetPanY = -390;
        break;
      case 0: // Macro Universe Overview
      default:
        s.targetScale = 0.88;
        s.targetPanX = 30;
        s.targetPanY = 0;
        break;
    }
  }, [activeStage]);

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

        // Smooth spring ease towards target + hover tilt (frame-rate independent)
        const springFactor = 1 - Math.exp(-4.5 * dt);
        s.currentX += (s.targetX + s.hoverTiltX - s.currentX) * springFactor;
        s.currentY += (s.targetY + s.hoverTiltY - s.currentY) * springFactor;
      } else {
        // Direct responsive tracking with elastic ease during drag
        const dragFactor = 1 - Math.exp(-18 * dt);
        s.currentX += (s.targetX - s.currentX) * dragFactor;
        s.currentY += (s.targetY - s.currentY) * dragFactor;
      }

      // Continuous mathematical spring for camera (zero glitch, frame-rate independent)
      const camSpring = 1 - Math.exp(-3.5 * dt);
      s.camScale += (s.targetScale - s.camScale) * camSpring;
      s.camPanX += (s.targetPanX - s.camPanX) * camSpring;
      s.camPanY += (s.targetPanY - s.camPanY) * camSpring;
      s.time = now * 0.001;

      setRenderState({
        rotX: s.currentX,
        rotY: s.currentY,
        camScale: s.camScale,
        camPanX: s.camPanX,
        camPanY: s.camPanY,
        time: s.time,
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
  const fixedOp = fixedActive ? 1.0 : longActive ? 0.35 : 0.72 + fixedBias * 0.28;
  const longOp = longActive ? 1.0 : fixedActive ? 0.35 : 0.72 + longBias * 0.28;

  // Compute 3D geometry of Transparent Planet Lattice (Master Sphere)
  const { latitudes, meridians, starNodes } = useMemo(() => {
    const tilt = (renderState.rotX * Math.PI) / 180;
    const rotY = (renderState.rotY * Math.PI) / 180;
    const sinTilt = Math.sin(tilt);
    const cosTilt = Math.cos(tilt);

    // Latitudes (Parallel circles on the tilted sphere)
    const latAngles = [-68, -52, -36, -20, -4, 12, 28, 44, 60, 72];
    const lats = latAngles.map((deg) => {
      const latRad = (deg * Math.PI) / 180;
      const cosLat = Math.cos(latRad);
      const sinLat = Math.sin(latRad);

      const cy = -R * sinLat * cosTilt;
      const rx = R * cosLat;
      const ry = Math.max(0.1, rx * Math.abs(sinTilt));
      const isEquator = Math.abs(deg) <= 6;
      const op = Math.max(0.18, Math.min(0.85, 0.38 + 0.42 * cosLat));
      return {
        cy: Number(cy.toFixed(2)),
        cx: 0,
        rx: Number(rx.toFixed(2)),
        ry: Number(ry.toFixed(2)),
        opacity: isEquator ? Number((op * 1.35).toFixed(2)) : Number(op.toFixed(2)),
        strokeWidth: isEquator ? 1.2 : 0.65,
      };
    });

    // Longitude Meridians (Passing smoothly through both poles with 3D projection)
    const merAngles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
    const phiSamples: number[] = [];
    for (let deg = -90; deg <= 90; deg += 5) {
      phiSamples.push(deg);
    }

    const mers = merAngles.map((deg) => {
      const lonRad = (deg * Math.PI) / 180 + rotY;
      const cosLon = Math.cos(lonRad);
      const sinLon = Math.sin(lonRad);

      // Determine front vs back orientation using equatorial normal
      const isFront = cosLon * cosTilt >= -0.15;

      let d = "";
      for (let i = 0; i < phiSamples.length; i++) {
        const phi = (phiSamples[i] * Math.PI) / 180;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        const X = R * cosPhi * sinLon;
        const Y = R * sinPhi;
        const Z = R * cosPhi * cosLon;

        const Yrot = Y * cosTilt - Z * sinTilt;
        const sx = Number(X.toFixed(1));
        const sy = Number((-Yrot).toFixed(1));

        d += i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`;
      }

      return {
        d,
        opacity: isFront ? 0.42 : 0.16,
        strokeWidth: isFront ? 0.85 : 0.45,
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
        col: n.col,
        twinkle: n.twinkle,
        delay: n.delay,
        opacity: isFront ? Number(op.toFixed(2)) : 0,
      };
    });

    return { latitudes: lats, meridians: mers, starNodes: nodes };
  }, [renderState.rotX, renderState.rotY]);

  // Compute 3D Vault Core (Wireframe Cube + Tesseract inside the transparent planet)
  const { cubeEdges, innerEdges, cubeCornerNodes } = useMemo(() => {
    const rx = (renderState.rotX * Math.PI) / 180;
    const ry = (renderState.rotY * Math.PI) / 180;
    const cosRx = Math.cos(rx);
    const sinRx = Math.sin(rx);
    const cosRy = Math.cos(ry);
    const sinRy = Math.sin(ry);

    const projectVertex = (vx: number, vy: number, vz: number, scale: number) => {
      const x = vx * scale;
      const y = vy * scale;
      const z = vz * scale;
      const x1 = x * cosRy + z * sinRy;
      const z1 = -x * sinRy + z * cosRy;
      const y1 = y * cosRx - z1 * sinRx;
      const z2 = y * sinRx + z1 * cosRx;
      return { x: Number(x1.toFixed(2)), y: Number(y1.toFixed(2)), z: Number(z2.toFixed(2)) };
    };

    const S_OUTER = 70;
    const outerVertices = CUBE_VERTICES.map(([vx, vy, vz]) => projectVertex(vx, vy, vz, S_OUTER));

    const S_INNER = 36;
    const innerVertices = CUBE_VERTICES.map(([vx, vy, vz]) => projectVertex(vx, vy, vz, S_INNER));

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
  }, [renderState.rotX, renderState.rotY]);

  // Compute Rich 3D Real-Time Sacred Geometry for Mini-Planets
  const miniPlanets3D = useMemo(() => {
    const t = renderState.time;

    // 1. Fixed Yield: 3D Rotating Crystal Octahedron (Diamond)
    const dRotY = t * 1.8;
    const dRotX = 0.38;
    const cosDY = Math.cos(dRotY);
    const sinDY = Math.sin(dRotY);
    const cosDX = Math.cos(dRotX);
    const sinDX = Math.sin(dRotX);

    const projectDiamond = (x: number, y: number, z: number) => {
      const x1 = x * cosDY + z * sinDY;
      const z1 = -x * sinDY + z * cosDY;
      const y1 = y * cosDX - z1 * sinDX;
      const z2 = y * sinDX + z1 * cosDX;
      return { x: x1, y: y1, z: z2 };
    };

    const dSize = 12;
    const dH = 15;
    const dvTop = projectDiamond(0, -dH, 0);
    const dvBottom = projectDiamond(0, dH, 0);
    const dvRight = projectDiamond(dSize, 0, 0);
    const dvLeft = projectDiamond(-dSize, 0, 0);
    const dvFront = projectDiamond(0, 0, dSize);
    const dvBack = projectDiamond(0, 0, -dSize);

    const dFacetsRaw = [
      [dvTop, dvRight, dvFront],
      [dvTop, dvFront, dvLeft],
      [dvTop, dvLeft, dvBack],
      [dvTop, dvBack, dvRight],
      [dvBottom, dvFront, dvRight],
      [dvBottom, dvLeft, dvFront],
      [dvBottom, dvBack, dvLeft],
      [dvBottom, dvRight, dvBack],
    ];

    const diamondFacets = dFacetsRaw.map((tri, idx) => {
      const cp = (tri[1].x - tri[0].x) * (tri[2].y - tri[0].y) - (tri[1].y - tri[0].y) * (tri[2].x - tri[0].x);
      const isFront = cp > 0;
      const pts = `${tri[0].x.toFixed(1)},${tri[0].y.toFixed(1)} ${tri[1].x.toFixed(1)},${tri[1].y.toFixed(1)} ${tri[2].x.toFixed(1)},${tri[2].y.toFixed(1)}`;
      return {
        points: pts,
        isFront,
        fill: isFront ? (idx % 2 === 0 ? "rgba(220, 240, 255, 0.45)" : "rgba(169, 200, 238, 0.28)") : "rgba(80, 120, 180, 0.08)",
        stroke: isFront ? (idx % 2 === 0 ? "#FFFFFF" : "#A9C8EE") : "rgba(169, 200, 238, 0.2)",
        strokeWidth: isFront ? 0.95 : 0.45,
      };
    });

    // 2. Long Yield: Living Organic Bio-Particle (Undulating Fluid Membrane + 3D Orbiting Spores)
    const bioPoints: string[] = [];
    const bioR = 13;
    const numPoints = 16;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const rMod = bioR + 2.4 * Math.sin(angle * 3 + t * 4.2) + 1.6 * Math.cos(angle * 2 - t * 3.1);
      const px = Math.cos(angle) * rMod;
      const py = Math.sin(angle) * rMod;
      bioPoints.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    const bioPath = `M ${bioPoints[0]} ` + bioPoints.slice(1).map((p) => `L ${p}`).join(" ") + " Z";

    const spore1A = t * 3.2;
    const spore1 = {
      x: Math.cos(spore1A) * 20,
      y: Math.sin(spore1A) * 8 - Math.cos(spore1A) * 3,
      z: Math.sin(spore1A),
      r: Math.sin(spore1A) > 0 ? 1.8 : 1.1,
      op: Math.sin(spore1A) > 0 ? 0.95 : 0.4,
    };
    const spore2A = -t * 2.6 + 1.8;
    const spore2 = {
      x: Math.cos(spore2A) * 23,
      y: Math.sin(spore2A) * 10 + Math.cos(spore2A) * 5,
      z: Math.sin(spore2A),
      r: Math.sin(spore2A) > 0 ? 2.0 : 1.2,
      op: Math.sin(spore2A) > 0 ? 0.9 : 0.35,
    };
    const spore3A = t * 4.0 + 3.5;
    const spore3 = {
      x: Math.cos(spore3A) * 16,
      y: Math.sin(spore3A) * 7 - Math.cos(spore3A) * 6,
      z: Math.sin(spore3A),
      r: Math.sin(spore3A) > 0 ? 1.6 : 1.0,
      op: Math.sin(spore3A) > 0 ? 0.9 : 0.3,
    };

    // 3. Split Engine: 3D Cleaving Prisms & Quantum Laser Beam
    const sRotY = t * 2.2;
    const sH = 11;
    const sR = 10;
    const sGap = 2.2;
    const cosSY = Math.cos(sRotY);
    const sinSY = Math.sin(sRotY);

    const projectPrism = (x: number, y: number, z: number) => {
      const x1 = x * cosSY + z * sinSY;
      const z1 = -x * sinSY + z * cosSY;
      return { x: x1, y: y * 0.92 - z1 * 0.28, z: z1 };
    };

    const pt0 = projectPrism(sR * Math.cos(0), -sGap - sH, sR * Math.sin(0));
    const pt1 = projectPrism(sR * Math.cos(2.094), -sGap - sH, sR * Math.sin(2.094));
    const pt2 = projectPrism(sR * Math.cos(4.188), -sGap - sH, sR * Math.sin(4.188));
    const ptApex = projectPrism(0, -sGap, 0);

    const pb0 = projectPrism(sR * Math.cos(0), sGap + sH, sR * Math.sin(0));
    const pb1 = projectPrism(sR * Math.cos(2.094), sGap + sH, sR * Math.sin(2.094));
    const pb2 = projectPrism(sR * Math.cos(4.188), sGap + sH, sR * Math.sin(4.188));
    const pbApex = projectPrism(0, sGap, 0);

    // 4. USDG Vault: 3D Multi-Axis Gyroscope & Isometric Shield Cube
    const gTime = t * 1.5;
    const gRot1 = (gTime * 55) % 360;
    const gRot2 = (-gTime * 42) % 360;
    const gRot3 = (gTime * 28 + 45) % 360;

    const vCubeR = 9;
    const cAng = t * 1.6;
    const cosCA = Math.cos(cAng);
    const sinCA = Math.sin(cAng);
    const projectVaultCube = (x: number, y: number, z: number) => {
      const x1 = x * cosCA + z * sinCA;
      const z1 = -x * sinCA + z * cosCA;
      return { x: x1, y: y * 0.88 - z1 * 0.32, z: z1 };
    };

    const cv = [
      projectVaultCube(-vCubeR, -vCubeR, -vCubeR),
      projectVaultCube(vCubeR, -vCubeR, -vCubeR),
      projectVaultCube(vCubeR, vCubeR, -vCubeR),
      projectVaultCube(-vCubeR, vCubeR, -vCubeR),
      projectVaultCube(-vCubeR, -vCubeR, vCubeR),
      projectVaultCube(vCubeR, -vCubeR, vCubeR),
      projectVaultCube(vCubeR, vCubeR, vCubeR),
      projectVaultCube(-vCubeR, vCubeR, vCubeR),
    ];

    const vaultEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ].map(([i1, i2]) => {
      const v1 = cv[i1];
      const v2 = cv[i2];
      const isFront = (v1.z + v2.z) / 2 > 0;
      return {
        x1: v1.x,
        y1: v1.y,
        x2: v2.x,
        y2: v2.y,
        stroke: isFront ? "#34D399" : "rgba(52,211,153,0.35)",
        strokeWidth: isFront ? 0.95 : 0.5,
      };
    });

    return {
      diamondFacets,
      bioPath,
      bioSpores: [spore1, spore2, spore3],
      prismTop: { p0: pt0, p1: pt1, p2: pt2, apex: ptApex },
      prismBottom: { p0: pb0, p1: pb1, p2: pb2, apex: pbApex },
      gRot1,
      gRot2,
      gRot3,
      vaultEdges,
    };
  }, [renderState.time]);

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
        <filter id="majorStarGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.0" result="bigBlur" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="tightBlur" />
          <feMerge>
            <feMergeNode in="bigBlur" />
            <feMergeNode in="tightBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Directional Lighting Mask: Bright crisp white at top-left, fading to dark at bottom-right */}
        {/* Master Planet Glass Body Gradient */}
        <radialGradient id="masterPlanetBody" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1E3250" stopOpacity="0.4" />
          <stop offset="35%" stopColor="#0E1B2E" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#050B14" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#020408" stopOpacity="0.8" />
        </radialGradient>

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

        {/* Shooting Meteor Tail Gradients */}
        <linearGradient id="meteorTailA" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#DDE8F8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>

        {/* 3D Mini-Planet Spherical Gradients (Specular highlight, rich mantle, deep shadow) */}
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

      {/* Full-Screen Gesture Capture Background */}
      <rect width="1440" height="940" fill="transparent" pointerEvents="all" />

      {/* Subtle deep cosmic sky background */}
      <rect width="1440" height="940" fill="url(#skyGrad)" pointerEvents="none" />

      {/* Top-Left Distant Black Hole Feature */}
      <g transform="translate(160 145)" opacity="0.35" pointerEvents="none">
        <circle r="42" fill="#010204" />
        <g className="spin" style={{ animationDuration: "85s" }}>
          <circle r="52" fill="none" stroke="#2A3546" strokeWidth="0.8" strokeDasharray="14 12" opacity="0.4" />
          <circle r="68" fill="none" stroke="#A9C8EE" strokeWidth="0.5" strokeDasharray="4 18" opacity="0.25" />
          <circle cx="52" cy="0" r="1.5" fill="#A9C8EE" opacity="0.7" />
        </g>
      </g>

      {/* Active Shooting Meteors */}
      <g transform="translate(1180 140) rotate(-32)" pointerEvents="none">
        <g className="shoot" style={{ animationDelay: "0.8s", animationDuration: "8.5s" }}>
          <line x1="0" y1="0" x2="-160" y2="0" stroke="url(#meteorTailA)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2.6" fill="#FFFFFF" filter="url(#starGlow)" />
          <circle cx="0" cy="0" r="5.5" fill="#A9C8EE" opacity="0.45" />
        </g>
      </g>

      <g transform="translate(380 90) rotate(-26)" pointerEvents="none">
        <g className="shoot" style={{ animationDelay: "4.8s", animationDuration: "10.5s" }}>
          <line x1="0" y1="0" x2="-180" y2="0" stroke="url(#meteorTailA)" strokeWidth="2.0" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2.8" fill="#FFFFFF" filter="url(#starGlow)" />
          <circle cx="0" cy="0" r="6" fill="#DDE8F8" opacity="0.4" />
        </g>
      </g>

      <g transform="translate(980 340) rotate(-35)" pointerEvents="none">
        <g className="shoot" style={{ animationDelay: "8.2s", animationDuration: "12s" }}>
          <line x1="0" y1="0" x2="-130" y2="0" stroke="url(#meteorTailA)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2.0" fill="#FFFFFF" filter="url(#starGlow)" />
        </g>
      </g>

      {/* ============================================================== */}
      {/* CINEMATIC CAMERA SYSTEM: Smooth Zoom & Pan Per Planet Stage     */}
      {/* ============================================================== */}
      <g
        transform={`translate(${celestialCx + parallaxX + renderState.camPanX} ${celestialCy + parallaxY + renderState.camPanY}) scale(${renderState.camScale})`}
      >
        {/* Soft diffuse corona behind planet - layered crossfade */}
        <circle
          r="420"
          fill="url(#behindCyanGlow)"
          style={{ opacity: fixedActive ? 1 : 0, transition: "opacity 0.7s ease-out" }}
          pointerEvents="none"
        />
        <circle
          r="420"
          fill="url(#behindOrangeGlow)"
          style={{ opacity: longActive ? 1 : (fixedActive ? 0 : 0.7), transition: "opacity 0.7s ease-out" }}
          pointerEvents="none"
        />

        {/* ============================================================== */}
        {/* MONUMENTAL HD WIREFRAME SPHERICAL PLANET BODY (R = 345)        */}
        {/* (Crisp, High-Tech, Monumental Sphere - Always Recognizable)     */}
        {/* ============================================================== */}
        <g pointerEvents="none">
          {/* Master Planet Glass Body Base (gives physical spherical volume & depth) */}
          <circle
            r="345"
            fill="url(#masterPlanetBody)"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.2"
            opacity={0.7}
          />

          {/* Crisp Wireframe Net: Latitudes, Meridians & Star Nodes */}
          <g clipPath="url(#pclipSphere)">
            {/* Latitudes */}
            {latitudes.map((lat, i) => (
              <ellipse
                key={`lat-${i}`}
                cx={lat.cx}
                cy={lat.cy}
                rx={lat.rx}
                ry={lat.ry}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={lat.strokeWidth}
                opacity={lat.opacity}
              />
            ))}

            {/* Longitude Meridians (3D Curving Great Circles Converging at Poles) */}
            {meridians.map((mer, i) => (
              <path
                key={`mer-${i}`}
                d={mer.d}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={mer.strokeWidth}
                opacity={mer.opacity}
                strokeLinecap="round"
              />
            ))}

              {/* Star Constellation Nodes on Surface */}
              {starNodes.map((st, i) => (
                st.opacity > 0 && (
                  <g key={`star-${i}`}>
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={st.r}
                      fill={st.col}
                      opacity={st.opacity}
                      className={st.twinkle ? "tw" : undefined}
                      style={st.twinkle ? { animationDelay: st.delay } : undefined}
                    />
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={st.r * 2.2}
                      fill={st.col}
                      opacity={st.opacity * 0.28}
                    />
                  </g>
                )
              ))}
          </g>

          {/* Top-Left Razor-Sharp Crescent Rim Arc Lighting */}
          <path
            d="M -325 115 A 345 345 0 0 1 115 -325"
            fill="none"
            stroke="url(#topRimArcGrad)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Outer boundary cardinal tick marks */}
          <g opacity="0.45">
            <line x1="-345" y1="0" x2="-330" y2="0" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="345" y1="0" x2="330" y2="0" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="0" y1="-345" x2="0" y2="-330" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="0" y1="345" x2="0" y2="330" stroke="#FFFFFF" strokeWidth="1" />
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
                stroke="#FFFFFF"
                strokeWidth="0.65"
                style={{ opacity: engineActive ? 0.85 : 0.28, transition: "opacity 0.6s ease-out" }}
                strokeDasharray="8 10"
              />
            </g>
            <g transform="rotate(-40) scale(1 0.38)">
              <circle
                r="92"
                fill="none"
                stroke="#A9C8EE"
                strokeWidth="0.6"
                style={{ opacity: engineActive ? 0.9 : 0.3, transition: "opacity 0.6s ease-out" }}
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
                stroke="#ECEDEA"
                strokeWidth={e.strokeWidth}
                opacity={e.opacity}
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
                stroke="#F0A85C"
                strokeWidth={e.strokeWidth}
                opacity={e.opacity}
              />
            ))}

            {/* Outer Cube Corner Vertices with Micro Nodes */}
            {cubeCornerNodes.map((v, idx) => (
              <circle
                key={`cube-node-${idx}`}
                cx={v.x}
                cy={v.y}
                r={v.z > 0 ? 2.5 : 1.4}
                fill={v.z > 0 ? "#FFFFFF" : "#8E929B"}
                opacity={v.z > 0 ? 0.9 : 0.4}
                filter={v.z > 0 ? "url(#starGlow)" : undefined}
              />
            ))}

            {/* Radiant Central Yield Token Nucleus (USDG Anchor) */}
            <circle r="12" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.35" strokeDasharray="3 3" />
            <circle r="5.5" fill="#FFFFFF" filter="url(#majorStarGlow)" />
            <circle
              r="16"
              fill="#F0A85C"
              style={{
                opacity: engineActive ? 0.5 : 0.25,
                transition: "opacity 0.6s ease-out",
              }}
              filter="url(#starGlow)"
            />

            {/* Laser Split Vector (Smoothly fades in when Stage 3 is active) */}
            <g
              pointerEvents="none"
              style={{
                opacity: engineActive ? 1 : 0,
                transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <line x1="-12" y1="0" x2="-120" y2="0" stroke="#A9C8EE" strokeWidth="1.8" filter="url(#starGlow)" />
              <polygon points="-120,-4 -130,0 -120,4" fill="#A9C8EE" />
              <text x="-136" y="4" textAnchor="end" className="mono text-[9px] tracking-[0.18em]" fill="#A9C8EE">PT (PRINCIPAL)</text>

              <line x1="12" y1="0" x2="120" y2="0" stroke="#F0A85C" strokeWidth="1.8" filter="url(#starGlow)" />
              <polygon points="120,-4 130,0 120,4" fill="#F0A85C" />
              <text x="136" y="4" textAnchor="start" className="mono text-[9px] tracking-[0.18em]" fill="#F0A85C">YT (YIELD)</text>
            </g>

            {/* Micro Technical Sub-label under Core */}
            <text
              x="0"
              y="98"
              textAnchor="middle"
              className="mono text-[8px] tracking-[0.24em] select-none"
              fill="#ECEDEA"
              style={{
                opacity: engineActive ? 0.9 : 0.45,
                transition: "opacity 0.6s ease-out",
              }}
            >
              USDG · SPLIT VAULT CORE
            </text>
          </g>
        </g>

        {/* Tactical HUD Overlay for Stage 4 (Smoothly fades in when Stage 4 is active) */}
        <g
          pointerEvents="none"
          style={{
            opacity: vaultsActive ? 1 : 0,
            transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <circle r="220" fill="none" stroke="#34D399" strokeWidth="0.6" opacity="0.35" strokeDasharray="8 12" />
          <line x1="-360" y1="0" x2="-330" y2="0" stroke="#34D399" strokeWidth="1.2" opacity="0.6" />
          <line x1="330" y1="0" x2="360" y2="0" stroke="#34D399" strokeWidth="1.2" opacity="0.6" />
          <line x1="0" y1="-360" x2="0" y2="-330" stroke="#34D399" strokeWidth="1.2" opacity="0.6" />
          <line x1="0" y1="330" x2="0" y2="360" stroke="#34D399" strokeWidth="1.2" opacity="0.6" />
        </g>

        {/* Moving Orbital System (Seamless Continuous Outer Orbit) */}
        <g transform="rotate(-8) scale(1 0.22)" pointerEvents="none">
          <circle r="390" fill="none" stroke="#A9C8EE" strokeWidth="0.55" opacity="0.3" strokeDasharray="6 14" />
          <g className="spin" style={{ animationDuration: "19s", animationDelay: "-3s" }}>
            <g transform="translate(390 0)">
              <g className="spin rev" style={{ animationDuration: "19s", animationDelay: "-3s" }}>
                <circle r="3.2" fill="#FFFFFF" filter="url(#starGlow)" />
                <circle r="8" fill="#A9C8EE" opacity="0.35" />
              </g>
            </g>
          </g>
        </g>

        {/* Fixed Yield Orbit Track (Ice Blue, -15 deg) - Seamless Unbroken Track */}
        <g
          transform="rotate(-15) scale(1 0.23)"
          pointerEvents="none"
          style={{ opacity: fixedOp, transition: "opacity 0.7s ease-out" }}
        >
          <circle r="428" fill="none" stroke="#A9C8EE" strokeWidth="0.6" opacity="0.35" />
          <circle r="445" fill="none" stroke="#A9C8EE" strokeWidth="1.6" opacity="0.8" />
          <circle className="ringflow" r="445" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeDasharray="180 80 40 80" opacity="0.9" style={{ animationDuration: "55s" }} />
          <circle r="462" fill="none" stroke="#A9C8EE" strokeWidth="0.8" opacity="0.4" />
          <circle className="ringflow" r="462" fill="none" stroke="#DDE8F8" strokeWidth="0.6" strokeDasharray="2 12" opacity="0.6" style={{ animationDuration: "75s" }} />

          {/* Primary Fixed Yield Star Satellite */}
          <g className="spin" style={{ animationDuration: "26s", animationDelay: "-6.5s" }}>
            <g transform="translate(445 0)">
              <g className="spin rev" style={{ animationDuration: "26s", animationDelay: "-6.5s" }}>
                <circle r="5.0" fill="#FFFFFF" filter="url(#majorStarGlow)" />
                <circle r="14" fill="#A9C8EE" opacity="0.45" />
                <circle r="24" fill="#A9C8EE" opacity="0.18" />
              </g>
            </g>
          </g>
        </g>

        {/* Long Yield Orbit Track (Amber, -15 deg) - Seamless Unbroken Track */}
        <g
          transform="rotate(-15) scale(1 0.23)"
          pointerEvents="none"
          style={{ opacity: longOp, transition: "opacity 0.7s ease-out" }}
        >
          <circle r="525" fill="none" stroke="#F0A85C" strokeWidth="0.6" opacity="0.35" />
          <circle r="545" fill="none" stroke="#F0A85C" strokeWidth="1.8" opacity="0.8" />
          <circle className="ringflow" r="545" fill="none" stroke="#FFF2D6" strokeWidth="2.5" strokeDasharray="240 100 50 100" opacity="0.9" style={{ animationDuration: "42s" }} />
          <circle r="568" fill="none" stroke="#F0A85C" strokeWidth="0.8" opacity="0.4" />
          <circle className="ringflow" r="568" fill="none" stroke="#F0A85C" strokeWidth="0.6" strokeDasharray="4 16" opacity="0.5" style={{ animationDuration: "60s" }} />

          {/* Primary Long Yield Star Satellite */}
          <g className="spin" style={{ animationDuration: "38s", animationDelay: "-14s" }}>
            <g transform="translate(545 0)">
              <g className="spin rev" style={{ animationDuration: "38s", animationDelay: "-14s" }}>
                <circle r="5.5" fill="#FFFFFF" filter="url(#majorStarGlow)" />
                <circle r="15" fill="#F0A85C" opacity="0.45" />
                <circle r="26" fill="#F0A85C" opacity="0.18" />
              </g>
            </g>
          </g>
        </g>

        {/* Sweeping Outer Celestial Ring (-26 deg) - Seamless Unbroken Ring */}
        <g transform="rotate(-26) scale(1 0.25)" pointerEvents="none">
          <circle r="650" fill="none" stroke="#ECEDEA" strokeWidth="0.75" opacity="0.25" />
          <circle className="ringflow" r="650" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="300 160 40 100" opacity="0.85" style={{ animationDuration: "32s" }} />
        </g>

        {/* ============================================================== */}
        {/* GRAND COSMIC UNIVERSE ORBITS (Sweeping Across Deep Space)      */}
        {/* ============================================================== */}
        <g pointerEvents="none" opacity="0.7">
          {/* Deep Outer Galaxy Orbit Track (R=860, Ice Blue tilt -22 deg) */}
          <g transform="rotate(-22) scale(1 0.26)">
            <circle r="860" fill="none" stroke="#A9C8EE" strokeWidth="0.75" strokeDasharray="14 18 4 18" opacity="0.32" />
            <circle className="ringflow" r="860" fill="none" stroke="#DDE8F8" strokeWidth="1.4" strokeDasharray="360 220 80 180" opacity="0.6" style={{ animationDuration: "78s" }} />
            {/* Distant orbital beacon */}
            <g className="spin" style={{ animationDuration: "64s", animationDelay: "-18s" }}>
              <g transform="translate(860 0)">
                <circle r="3" fill="#FFFFFF" filter="url(#starGlow)" />
                <circle r="8" fill="#A9C8EE" opacity="0.4" />
                <text x="14" y="3" fill="#A9C8EE" className="mono text-[8px] tracking-[0.2em]" opacity="0.5">ORBIT-IX · 0x860</text>
              </g>
            </g>
          </g>

          {/* Expansive Hyperbolic Orbit (R=1120, Amber tilt 16 deg) */}
          <g transform="rotate(16) scale(1 0.21)">
            <circle r="1120" fill="none" stroke="#F0A85C" strokeWidth="0.65" strokeDasharray="8 24" opacity="0.28" />
            <circle className="ringflow" r="1120" fill="none" stroke="#FFF2D6" strokeWidth="1.2" strokeDasharray="420 300 60 200" opacity="0.5" style={{ animationDuration: "96s" }} />
            {/* Distant solar beacon */}
            <g className="spin" style={{ animationDuration: "88s", animationDelay: "-32s" }}>
              <g transform="translate(1120 0)">
                <circle r="3.2" fill="#FFFFFF" filter="url(#starGlow)" />
                <circle r="10" fill="#F0A85C" opacity="0.35" />
                <text x="16" y="3" fill="#F0A85C" className="mono text-[8px] tracking-[0.2em]" opacity="0.5">PERIHELION · 11.2 AU</text>
              </g>
            </g>
          </g>

          {/* Deep Space Cosmic Perimeter (R=1420, White/Ghost tilt -38 deg) */}
          <g transform="rotate(-38) scale(1 0.18)">
            <circle r="1420" fill="none" stroke="#ECEDEA" strokeWidth="0.5" strokeDasharray="3 16" opacity="0.22" />
            <circle className="ringflow" r="1420" fill="none" stroke="#FFFFFF" strokeWidth="1.0" strokeDasharray="500 400 100 300" opacity="0.45" style={{ animationDuration: "140s" }} />
          </g>
        </g>

        {/* ============================================================== */}
        {/* INTERACTIVE MINI PLANET ENTITIES (True 3D Spheres & Geometries)*/}
        {/* ============================================================== */}

        {/* Pin 1: Fixed Yield Diamond Planet (3D Crystalline Octahedron) */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(-100 240)"
          style={{
            opacity: activeStage === 0 || fixedActive ? 1 : 0.25,
            transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(1);
          }}
        >
          {/* Active Ping Radar Wave (Smoothly fades in/out) */}
          <circle
            r="44"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="1.2"
            className="animate-ping pointer-events-none"
            style={{
              animationDuration: "2.8s",
              opacity: fixedActive ? 0.6 : 0,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* Planetary Ring (Back Arc) */}
          <g transform="rotate(-26) scale(1 0.32)" opacity="0.65">
            <path d="M -46 0 A 46 46 0 0 1 46 0" fill="none" stroke="#A9C8EE" strokeWidth="1.2" strokeDasharray="6 8" />
          </g>

          {/* Atmospheric Corona & Aura */}
          <circle
            r="34"
            fill="#A9C8EE"
            style={{
              opacity: fixedActive ? 0.22 : 0.08,
              transition: "opacity 0.6s ease-out",
            }}
          />
          <circle
            r="26"
            fill="url(#miniPlanetFixed)"
            stroke="#A9C8EE"
            strokeWidth="1.2"
            style={{
              opacity: fixedActive ? 1 : 0.85,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* 3D Top-Left Crescent Rim Specular Lighting Arc */}
          <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />

          {/* Planetary Ring (Front Arc - passing across front of planet) */}
          <g transform="rotate(-26) scale(1 0.32)" opacity="0.85">
            <path d="M -46 0 A 46 46 0 0 0 46 0" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
            <circle cx="44" cy="0" r="2.2" fill="#FFFFFF" filter="url(#starGlow)" />
          </g>

          {/* 3D Real-Time Rotating Crystal Octahedron Facets */}
          <g className="transition-transform duration-500 group-hover:scale-115">
            {miniPlanets3D.diamondFacets.map((facet, idx) => (
              <polygon
                key={`diamond-facet-${idx}`}
                points={facet.points}
                fill={facet.fill}
                stroke={facet.stroke}
                strokeWidth={facet.strokeWidth}
                strokeLinejoin="round"
              />
            ))}
            {/* Sparkling Core Prism Center */}
            <circle cx="0" cy="0" r="1.8" fill="#FFFFFF" filter="url(#starGlow)" />
            <circle cx="0" cy="0" r="4" fill="#A9C8EE" opacity="0.3" />
          </g>

          {/* Planet Telemetry Badge */}
          <g
            transform="translate(32 -16)"
            className="transition-transform duration-300 group-hover:translate-x-9 select-none pointer-events-none"
            style={{
              opacity: activeStage === 0 || fixedActive ? 1 : 0,
              transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease-out",
            }}
          >
            <rect
              x="0"
              y="0"
              width="132"
              height="30"
              rx="4"
              fill="rgba(4,9,18,0.92)"
              stroke={fixedActive ? "#A9C8EE" : "rgba(169,200,238,0.35)"}
              strokeWidth={fixedActive ? "1.4" : "0.9"}
            />
            <circle cx="10" cy="11" r="2.5" fill="#A9C8EE" className={fixedActive ? "animate-pulse" : undefined} />
            <text x="18" y="14" fill="#A9C8EE" className="mono text-[9.5px] font-semibold tracking-[0.14em]">FIXED · 6.42%</text>
            <text x="18" y="24" fill="#8E929B" className="mono text-[7.5px] tracking-[0.1em]">SENIOR TRANCHE</text>
          </g>
        </g>

        {/* Pin 2: Long Yield Bio-Particle Planet (Living Organic Plasma Vortex) */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(260 -130)"
          style={{
            opacity: activeStage === 0 || longActive ? 1 : 0.25,
            transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(2);
          }}
        >
          {/* Active Ping Radar Wave (Smoothly fades in/out) */}
          <circle
            r="44"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="1.2"
            className="animate-ping pointer-events-none"
            style={{
              animationDuration: "2.8s",
              opacity: longActive ? 0.6 : 0,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* Planetary Ring (Back Arc) */}
          <g transform="rotate(32) scale(1 0.32)" opacity="0.65">
            <path d="M -48 0 A 48 48 0 0 1 48 0" fill="none" stroke="#F0A85C" strokeWidth="1.2" strokeDasharray="6 8" />
          </g>

          {/* Atmospheric Plasma Corona & 3D Shaded Sphere */}
          <circle
            r="34"
            fill="#F0A85C"
            style={{
              opacity: longActive ? 0.22 : 0.08,
              transition: "opacity 0.6s ease-out",
            }}
          />
          <circle
            r="26"
            fill="url(#miniPlanetLong)"
            stroke="#F0A85C"
            strokeWidth="1.2"
            style={{
              opacity: longActive ? 1 : 0.85,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* 3D Top-Left Crescent Rim Specular Lighting Arc */}
          <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />

          {/* Planetary Ring (Front Arc) */}
          <g transform="rotate(32) scale(1 0.32)" opacity="0.85">
            <path d="M -48 0 A 48 48 0 0 0 48 0" fill="none" stroke="#FFF2D6" strokeWidth="1.4" />
            <circle cx="46" cy="0" r="2.2" fill="#FFFFFF" filter="url(#starGlow)" />
          </g>

          {/* 3D Real-Time Living Organic Bio-Particle Membrane */}
          <g className="transition-transform duration-500 group-hover:scale-115">
            {/* Undulating cytoplasm membrane */}
            <path
              d={miniPlanets3D.bioPath}
              fill="rgba(240,168,92,0.32)"
              stroke="#F0A85C"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            {/* Core Nucleus with breathing pulse */}
            <circle cx="0" cy="0" r="3.6" fill="rgba(255,242,214,0.92)" filter="url(#starGlow)" />
            <circle cx="0" cy="0" r="1.6" fill="#FFFFFF" />

            {/* 3D-Orbiting Electron / Spore Nodes with Depth Z */}
            {miniPlanets3D.bioSpores.map((spore, idx) => (
              <circle
                key={`bio-spore-${idx}`}
                cx={spore.x}
                cy={spore.y}
                r={spore.r}
                fill={idx === 1 ? "#FFFFFF" : "#F0A85C"}
                opacity={spore.op}
                filter={spore.z > 0 ? "url(#starGlow)" : undefined}
              />
            ))}
          </g>

          {/* Planet Telemetry Badge */}
          <g
            transform="translate(32 -16)"
            className="transition-transform duration-300 group-hover:translate-x-9 select-none pointer-events-none"
            style={{
              opacity: activeStage === 0 || longActive ? 1 : 0,
              transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease-out",
            }}
          >
            <rect
              x="0"
              y="0"
              width="136"
              height="30"
              rx="4"
              fill="rgba(16,8,3,0.92)"
              stroke={longActive ? "#F0A85C" : "rgba(240,168,92,0.35)"}
              strokeWidth={longActive ? "1.4" : "0.9"}
            />
            <circle cx="10" cy="11" r="2.5" fill="#F0A85C" className={longActive ? "animate-pulse" : undefined} />
            <text x="18" y="14" fill="#F0A85C" className="mono text-[9.5px] font-semibold tracking-[0.14em]">LONG · FLOATING</text>
            <text x="18" y="24" fill="#8E929B" className="mono text-[7.5px] tracking-[0.1em]">JUNIOR TRANCHE</text>
          </g>
        </g>

        {/* Pin 3: Vault Core / Split Engine Cleaving Prism Planet */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(0 -190)"
          style={{
            opacity: activeStage === 0 || engineActive ? 1 : 0.25,
            transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(3);
          }}
        >
          {/* Active Ping Radar Wave (Smoothly fades in/out) */}
          <circle
            r="44"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            className="animate-ping pointer-events-none"
            style={{
              animationDuration: "2.8s",
              opacity: engineActive ? 0.6 : 0,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* Concentric Gimbal Target Reticle */}
          <circle r="36" fill="none" stroke="#ECEDEA" strokeWidth="0.7" strokeDasharray="4 8" opacity="0.4" />
          <circle
            r="34"
            fill="#ECEDEA"
            style={{
              opacity: engineActive ? 0.2 : 0.06,
              transition: "opacity 0.6s ease-out",
            }}
          />
          <circle
            r="26"
            fill="url(#miniPlanetSplit)"
            stroke="#ECEDEA"
            strokeWidth="1.2"
            style={{
              opacity: engineActive ? 1 : 0.85,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* 3D Top-Left Crescent Rim Specular Lighting Arc */}
          <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />

          {/* 3D Cleaving Dual Prisms & Quantum Laser Beam */}
          <g className="transition-transform duration-500 group-hover:scale-115">
            {/* Upper rotating prism */}
            <polygon
              points={`${miniPlanets3D.prismTop.p0.x},${miniPlanets3D.prismTop.p0.y} ${miniPlanets3D.prismTop.p1.x},${miniPlanets3D.prismTop.p1.y} ${miniPlanets3D.prismTop.p2.x},${miniPlanets3D.prismTop.p2.y}`}
              fill="rgba(169,200,238,0.35)"
              stroke="#A9C8EE"
              strokeWidth="0.8"
            />
            <line
              x1={miniPlanets3D.prismTop.p0.x}
              y1={miniPlanets3D.prismTop.p0.y}
              x2={miniPlanets3D.prismTop.apex.x}
              y2={miniPlanets3D.prismTop.apex.y}
              stroke="#A9C8EE"
              strokeWidth="0.9"
            />
            <line
              x1={miniPlanets3D.prismTop.p1.x}
              y1={miniPlanets3D.prismTop.p1.y}
              x2={miniPlanets3D.prismTop.apex.x}
              y2={miniPlanets3D.prismTop.apex.y}
              stroke="#A9C8EE"
              strokeWidth="0.9"
            />
            <line
              x1={miniPlanets3D.prismTop.p2.x}
              y1={miniPlanets3D.prismTop.p2.y}
              x2={miniPlanets3D.prismTop.apex.x}
              y2={miniPlanets3D.prismTop.apex.y}
              stroke="#A9C8EE"
              strokeWidth="0.9"
            />

            {/* Lower rotating prism */}
            <polygon
              points={`${miniPlanets3D.prismBottom.p0.x},${miniPlanets3D.prismBottom.p0.y} ${miniPlanets3D.prismBottom.p1.x},${miniPlanets3D.prismBottom.p1.y} ${miniPlanets3D.prismBottom.p2.x},${miniPlanets3D.prismBottom.p2.y}`}
              fill="rgba(240,168,92,0.35)"
              stroke="#F0A85C"
              strokeWidth="0.8"
            />
            <line
              x1={miniPlanets3D.prismBottom.p0.x}
              y1={miniPlanets3D.prismBottom.p0.y}
              x2={miniPlanets3D.prismBottom.apex.x}
              y2={miniPlanets3D.prismBottom.apex.y}
              stroke="#F0A85C"
              strokeWidth="0.9"
            />
            <line
              x1={miniPlanets3D.prismBottom.p1.x}
              y1={miniPlanets3D.prismBottom.p1.y}
              x2={miniPlanets3D.prismBottom.apex.x}
              y2={miniPlanets3D.prismBottom.apex.y}
              stroke="#F0A85C"
              strokeWidth="0.9"
            />
            <line
              x1={miniPlanets3D.prismBottom.p2.x}
              y1={miniPlanets3D.prismBottom.p2.y}
              x2={miniPlanets3D.prismBottom.apex.x}
              y2={miniPlanets3D.prismBottom.apex.y}
              stroke="#F0A85C"
              strokeWidth="0.9"
            />

            {/* Central vibrating quantum laser cleavage beam */}
            <line x1="-15" y1="0" x2="15" y2="0" stroke="#FFFFFF" strokeWidth="1.8" filter="url(#majorStarGlow)" />
            <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" filter="url(#starGlow)" />
          </g>

          {/* Planet Telemetry Badge */}
          <g
            transform="translate(32 -16)"
            className="transition-transform duration-300 group-hover:translate-x-9 select-none pointer-events-none"
            style={{
              opacity: activeStage === 0 || engineActive ? 1 : 0,
              transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease-out",
            }}
          >
            <rect
              x="0"
              y="0"
              width="132"
              height="30"
              rx="4"
              fill="rgba(8,10,16,0.92)"
              stroke={engineActive ? "#ECEDEA" : "rgba(236,237,234,0.35)"}
              strokeWidth={engineActive ? "1.4" : "0.9"}
            />
            <circle cx="10" cy="11" r="2.5" fill="#ECEDEA" className={engineActive ? "animate-pulse" : undefined} />
            <text x="18" y="14" fill="#ECEDEA" className="mono text-[9.5px] font-semibold tracking-[0.14em]">SPLIT ENGINE</text>
            <text x="18" y="24" fill="#8E929B" className="mono text-[7.5px] tracking-[0.1em]">TRANCHE CLEAVER</text>
          </g>
        </g>

        {/* Pin 4: Live Market / USDG Vault Gyroscope Planet */}
        <g
          className="cursor-pointer group pointer-events-auto"
          transform="translate(200 240)"
          style={{
            opacity: activeStage === 0 || vaultsActive ? 1 : 0.25,
            transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectStage?.(4);
          }}
        >
          {/* Active Ping Radar Wave (Smoothly fades in/out) */}
          <circle
            r="44"
            fill="none"
            stroke="#34D399"
            strokeWidth="1.2"
            className="animate-ping pointer-events-none"
            style={{
              animationDuration: "2.8s",
              opacity: vaultsActive ? 0.6 : 0,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* Emerald Atmospheric Corona & 3D Shaded Sphere */}
          <circle
            r="34"
            fill="#34D399"
            style={{
              opacity: vaultsActive ? 0.22 : 0.08,
              transition: "opacity 0.6s ease-out",
            }}
          />
          <circle
            r="26"
            fill="url(#miniPlanetVault)"
            stroke="#34D399"
            strokeWidth="1.2"
            style={{
              opacity: vaultsActive ? 1 : 0.85,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {/* 3D Top-Left Crescent Rim Specular Lighting Arc */}
          <path d="M -23 8 A 25 25 0 0 1 8 -23" fill="none" stroke="url(#topRimArcGrad)" strokeWidth="1.4" strokeLinecap="round" />

          {/* 3D Real-Time Multi-Axis Gyroscope & Rotating Hypercube */}
          <g className="transition-transform duration-500 group-hover:scale-115">
            {/* Gimbal Ring 1 (Yaw Axis) */}
            <g transform={`rotate(${miniPlanets3D.gRot1}) scale(1 0.4)`}>
              <ellipse rx="18" ry="18" fill="none" stroke="#34D399" strokeWidth="0.85" opacity="0.7" strokeDasharray="4 4" />
            </g>
            {/* Gimbal Ring 2 (Pitch Axis) */}
            <g transform={`rotate(${miniPlanets3D.gRot2}) scale(0.42 1)`}>
              <ellipse rx="17" ry="17" fill="none" stroke="#A7F3D0" strokeWidth="0.8" opacity="0.65" strokeDasharray="3 5" />
            </g>
            {/* Gimbal Ring 3 (Roll Axis) */}
            <g transform={`rotate(${miniPlanets3D.gRot3}) scale(1 0.55)`}>
              <ellipse rx="16" ry="16" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.5" strokeDasharray="2 4" />
            </g>

            {/* Rotating 3D Isometric Cube Shield */}
            {miniPlanets3D.vaultEdges.map((e, idx) => (
              <line
                key={`vault-cube-e-${idx}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={e.stroke}
                strokeWidth={e.strokeWidth}
              />
            ))}

            {/* Central USDG Currency Core Beacon */}
            <circle cx="0" cy="0" r="2.4" fill="#FFFFFF" filter="url(#starGlow)" />
            <circle cx="0" cy="0" r="5" fill="#34D399" opacity="0.35" />
          </g>

          {/* Planet Telemetry Badge */}
          <g
            transform="translate(32 -16)"
            className="transition-transform duration-300 group-hover:translate-x-9 select-none pointer-events-none"
            style={{
              opacity: activeStage === 0 || vaultsActive ? 1 : 0,
              transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease-out",
            }}
          >
            <rect
              x="0"
              y="0"
              width="132"
              height="30"
              rx="4"
              fill="rgba(3,14,10,0.92)"
              stroke={vaultsActive ? "#34D399" : "rgba(52,211,153,0.35)"}
              strokeWidth={vaultsActive ? "1.4" : "0.9"}
            />
            <circle cx="10" cy="11" r="2.5" fill="#34D399" className={vaultsActive ? "animate-pulse" : undefined} />
            <text x="18" y="14" fill="#34D399" className="mono text-[9.5px] font-semibold tracking-[0.14em]">USDG VAULT</text>
            <text x="18" y="24" fill="#8E929B" className="mono text-[7.5px] tracking-[0.1em]">DELTA-NEUTRAL</text>
          </g>
        </g>
      </g>

      {/* ============================================================== */}
      {/* RIGHT-EDGE TECHNICAL PERSPECTIVE & RESET CONTROLS (Zupiter)     */}
      {/* ============================================================== */}
      <g transform="translate(1412 630)" className="pointer-events-none select-none">
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
        <circle r="18" fill="rgba(10,12,18,0.75)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.9" className="group-hover:stroke-white transition-colors" />
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
